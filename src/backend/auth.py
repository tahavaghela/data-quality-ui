from fastapi.responses import RedirectResponse
from fastapi import Depends, HTTPException, APIRouter, Request, Cookie
from jose import jwt
from jose.exceptions import JWTError, ExpiredSignatureError, JWTClaimsError
import requests
import os
from dotenv import load_dotenv
from functools import lru_cache
from jose import jwk
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
import logging

logger = logging.getLogger(__name__)
load_dotenv()

KINDE_DOMAIN = os.getenv("KINDE_ISSUER_URL", "").replace("https://", "").rstrip("/")
KINDE_CLIENT_ID = os.getenv("CLIENT_ID")
KINDE_CLIENT_SECRET = os.getenv("CLIENT_SECRET")
KINDE_REDIRECT_URI = os.getenv("KINDE_CALLBACK_URL")
AUDIENCE = os.getenv("KINDE_AUDIENCE", KINDE_CLIENT_ID) # Default to KINDE_CLIENT_ID if KINDE_AUDIENCE is not set
DATABASE_URL = os.getenv("DATABASE_URL")

if not all([KINDE_DOMAIN, KINDE_CLIENT_ID, KINDE_CLIENT_SECRET, KINDE_REDIRECT_URI, DATABASE_URL]):
    raise RuntimeError("Missing one or more required environment variables")

engine = create_engine(DATABASE_URL, future=True)
auth_router = APIRouter()

@lru_cache()
def get_cached_jwks() -> dict:
    try:
        config_url = f"https://{KINDE_DOMAIN}/.well-known/openid-configuration"
        config_resp = requests.get(config_url)
        config_resp.raise_for_status()
        jwks_uri = config_resp.json().get("jwks_uri")
        if not jwks_uri:
            raise HTTPException(status_code=500, detail="JWKS URI not found")
        jwks_resp = requests.get(jwks_uri)
        jwks_resp.raise_for_status()
        return jwks_resp.json()
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch JWKS: {str(e)}")

def get_kinde_public_key(kid: str) -> dict | None:
    jwks = get_cached_jwks()
    for key in jwks.get("keys", []):
        if key.get("kid") == kid:
            return key
    return None

def split_full_name(full_name: str):
    parts = full_name.strip().split(" ", 1)
    first_name = parts[0]
    last_name = parts[1] if len(parts) > 1 else ""
    return first_name, last_name

def upsert_user(user_info: dict):
    full_name = user_info.get("name", "")
    first_name = user_info.get("given_name")
    last_name = user_info.get("family_name")
    if first_name is None:
        first_name, last_name = split_full_name(full_name)

    username = user_info.get("preferred_username") or user_info.get("email") or user_info.get("sub")
    email = user_info.get("email")
    kinde_id = user_info.get("sub")

    if not username or not kinde_id:
        raise HTTPException(status_code=400, detail="Missing required user info for username or Kinde ID in token payload")
    
    upsert_query = text("""
    INSERT INTO users (username, email, first_name, last_name, kinde_id)
    VALUES (:username, :email, :first_name, :last_name, :kinde_id)
    ON CONFLICT (username) DO UPDATE SET 
       email = EXCLUDED.email,
       first_name = EXCLUDED.first_name,
       last_name = EXCLUDED.last_name,
       kinde_id = EXCLUDED.kinde_id
    RETURNING username;
""")

    with engine.connect() as conn:
        try:
            result = conn.execute(upsert_query, {
                "username": username,
                "email": email,
                "first_name": first_name,
                "last_name": last_name,
                "kinde_id": kinde_id
            })
            conn.commit()
            return result.scalar_one_or_none()
        except SQLAlchemyError as e:
            conn.rollback()
            logger.error("DB upsert error for Kinde ID %s: %s", kinde_id, e, exc_info=True)
            raise HTTPException(status_code=500, detail="Database error during user upsert")

def verify_token(access_token: str = Cookie(None)) -> dict:
    if not access_token:
        raise HTTPException(status_code=401, detail="Missing access token cookie")

    try:
        headers = jwt.get_unverified_header(access_token)
        kid = headers.get("kid")
        if not kid:
            raise HTTPException(status_code=401, detail="Missing 'kid' in token header.")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token header.")

    key_data = get_kinde_public_key(kid)
    if not key_data:
        raise HTTPException(status_code=401, detail="Invalid token – unknown key ID")

    try:
        public_key = jwk.construct(key_data)
        payload = jwt.decode(
            access_token,
            key=public_key,
            algorithms=[key_data.get("alg", "RS256")],
            audience=AUDIENCE,
            issuer=f"https://{KINDE_DOMAIN}"
        )
        return payload
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired.")
    except JWTClaimsError as e:
        raise HTTPException(status_code=401, detail=f"Invalid claims: {str(e)}")
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Token verification failed: {str(e)}")

@auth_router.get("/callback")
async def auth_callback(
    request: Request,
    code: str,
    state: str,
    oauth_state: str = Cookie(None)
):
    if not oauth_state or oauth_state != state:
        logger.error("OAuth state mismatch: cookie=%s, received_url_param=%s", oauth_state, state)
        raise HTTPException(status_code=400, detail="Invalid state parameter or state mismatch.")

    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code")

    token_url = f"https://{KINDE_DOMAIN}/oauth2/token"
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": KINDE_REDIRECT_URI,
        "client_id": KINDE_CLIENT_ID,
        "client_secret": KINDE_CLIENT_SECRET,
        "audience": AUDIENCE, # Ensure you're sending the audience parameter in the token exchange
    }

    try:
        resp = requests.post(token_url, data=data)
        if not resp.ok:
            logger.error("❌ Token exchange failed: %s", resp.text)
            resp.raise_for_status()

        token_data = resp.json()
        id_token = token_data.get("id_token")
        access_token = token_data.get("access_token")

        if not id_token or not access_token:
            raise HTTPException(status_code=500, detail="ID or access token not returned")

        # Get header from ID token to find the kid
        id_token_headers = jwt.get_unverified_header(id_token)
        id_token_kid = id_token_headers.get("kid")
        if not id_token_kid:
            raise HTTPException(status_code=401, detail="Missing 'kid' in ID token header.")

        # Get public key for ID token verification
        id_token_key_data = get_kinde_public_key(id_token_kid)
        if not id_token_key_data:
            raise HTTPException(status_code=401, detail="Invalid ID token – unknown key ID")

        public_key_id_token = jwk.construct(id_token_key_data)

        # Decode and verify the ID token with the correct audience and issuer
        payload = jwt.decode(
            id_token,
            key=public_key_id_token,
            algorithms=[id_token_key_data.get("alg", "RS256")],
            audience=KINDE_CLIENT_ID, # The audience for the ID token is typically your client ID
            issuer=f"https://{KINDE_DOMAIN}",
            access_token=access_token
        )

        print("👀 Token payload:", payload)
        logger.info("✅ User info from ID token: %s", payload)

        final_username_for_session = upsert_user(payload)
        if not final_username_for_session:
            raise HTTPException(status_code=500, detail="Failed to retrieve username after upsert")

        request.session["username"] = final_username_for_session
        logger.info("🌟 Session username set to: %s", request.session['username'])

        response = RedirectResponse(url="/dashboard")
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            secure=True,
            samesite="lax"
        )
        response.delete_cookie(key="oauth_state", secure=True, httponly=True, samesite="lax")
        return response

    except requests.RequestException as e:
        logger.error("❌ Token exchange error: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Token exchange failed: {str(e)}")
    except JWTError as e:
        logger.error("❌ JWT decoding error: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"JWT decoding failed: {str(e)}")
    except Exception as e:
        logger.error("❌ General authentication callback error: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Authentication callback failed: {str(e)}")

@auth_router.get("/logout")
def logout(request: Request):
    request.session.clear()
    response = RedirectResponse(url="/")
    response.delete_cookie(key="access_token")
    response.delete_cookie(key="oauth_state", secure=True, httponly=True, samesite="lax")
    return response