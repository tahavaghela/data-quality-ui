# main.py

from fastapi import FastAPI, Request, UploadFile, File, Form, Depends, Query, HTTPException, APIRouter, Response, Cookie, Header,Request
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from google.cloud import storage
from google.oauth2 import service_account
from dotenv import load_dotenv
from pydantic import BaseModel
import os, json, logging, psycopg2, bcrypt
from datetime import datetime, timedelta
import requests
from jose import jwt, jwk
from jose.exceptions import JWTError, ExpiredSignatureError, JWTClaimsError
from functools import lru_cache
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
import uuid
import urllib.parse
import base64
import asyncio
from starlette.concurrency import run_in_threadpool
from typing import Optional

# ------------------------------------------------------
# Pydantic models for request body validation
# ------------------------------------------------------
class PubSubMessage(BaseModel):
    """
    Model representing the structure of a Pub/Sub message.
    The 'data' field is base64 encoded.
    """
    message: dict
    subscription: str


# ------------------------------------------------------
# Load environment variables early
# ------------------------------------------------------
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

required_vars = [
    "DATABASE_URL",
    "GOOGLE_APPLICATION_CREDENTIALS_JSON",
    "BUCKET_NAME",
    "KINDE_ISSUER_URL",
    "CLIENT_ID",
    "CLIENT_SECRET",
    "KINDE_CALLBACK_URL",
    "KINDE_AUDIENCE",
    "FRONTEND_URL"
]
missing = [var for var in required_vars if not os.getenv(var)]
print("ENV VARS LOADED:")
for key in required_vars:
    val = os.environ.get(key)
    print(f" - {key}: {'SET' if val else 'MISSING'} {val[:20]+'...' if val else ''}")
if missing:
    logger.error(f"Missing environment variables: {', '.join(missing)}")

# ------------------------------------------------------
# Initialize FastAPI app
# ------------------------------------------------------
app = FastAPI()

frontend_url = os.getenv("FRONTEND_URL")
if not frontend_url:
    raise RuntimeError("FRONTEND_URL environment variable is not set. This is required.")

# Allow exact frontend URL and optionally localhost for dev.
ALLOW_ORIGINS = [frontend_url, "http://localhost:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------------------------------------------
# Authentication Configuration and Routes
# ------------------------------------------------------
KINDE_DOMAIN = os.getenv("KINDE_ISSUER_URL", "").replace("https://", "").rstrip("/")
KINDE_CLIENT_ID = os.getenv("CLIENT_ID")
KINDE_CLIENT_SECRET = os.getenv("CLIENT_SECRET")
KINDE_REDIRECT_URI = os.getenv("KINDE_CALLBACK_URL")
AUDIENCE = os.getenv("KINDE_AUDIENCE", KINDE_CLIENT_ID)
DATABASE_URL = os.getenv("DATABASE_URL")

# Check for required Kinde variables
if not all([KINDE_DOMAIN, KINDE_CLIENT_ID, KINDE_CLIENT_SECRET, KINDE_REDIRECT_URI]):
    raise RuntimeError("Missing one or more required Kinde environment variables")

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

def get_current_user_id(access_token: Optional[str] = Cookie(None), authorization: Optional[str] = Header(None)):
    """
    Decodes the JWT from the access_token cookie or Authorization header to get the user's ID.
    Accepts:
      - Cookie: access_token
      - Authorization header: Bearer <token>
    """
    token = None
    if access_token:
        token = access_token
    elif authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1]

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated. Missing access token.")

    try:
        headers = jwt.get_unverified_header(token)
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
            token,
            key=public_key,
            algorithms=[key_data.get("alg", "RS256")],
            audience=AUDIENCE,
            issuer=f"https://{KINDE_DOMAIN}"
        )
        return payload.get("sub")
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired. Please log in again.")
    except JWTClaimsError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token claims: {str(e)}")
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Token verification failed: {str(e)}")

def get_current_username(kinde_id: str = Depends(get_current_user_id)):
    """
    Fetches the username from the database based on the Kinde ID.
    """
    if not kinde_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    conn = get_connection()
    with conn.cursor() as cursor:
        cursor.execute("SELECT username FROM users WHERE kinde_id = %s", (kinde_id,))
        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="User not found in database")
        return result[0]


@auth_router.get("/login")
async def login(response: Response):
    state = str(uuid.uuid4())
    redirect_params = {
        "client_id": KINDE_CLIENT_ID,
        "response_type": "code",
        "scope": "openid profile email",
        "redirect_uri": KINDE_REDIRECT_URI,
        "state": state,
    }
    encoded_params = urllib.parse.urlencode(redirect_params)
    auth_url = f"https://{KINDE_DOMAIN}/oauth2/auth?{encoded_params}"

    # Set oauth_state cookie so we can validate it on callback.
    # This cookie must survive cross-site redirect from the browser -> Kinde -> back to backend,
    # so we use Secure + SameSite=None.
    response.set_cookie(
        key="oauth_state",
        value=state,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=300
    )
    return RedirectResponse(url=auth_url)

@auth_router.get("/callback")
async def auth_callback(
    response: Response,
    code: str,
    state: str,
    request: Request
    ):
    oauth_state =  request.cookies.get("oauth_state")
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
        "audience": AUDIENCE,
    }

    try:
        resp = requests.post(token_url, data=data)
        if not resp.ok:
            logger.error(" Token exchange failed: %s", resp.text)
            resp.raise_for_status()

        token_data = resp.json()
        id_token = token_data.get("id_token")
        access_token = token_data.get("access_token")

        if not id_token or not access_token:
            raise HTTPException(status_code=500, detail="ID or access token not returned")

        id_token_headers = jwt.get_unverified_header(id_token)
        id_token_kid = id_token_headers.get("kid")
        if not id_token_kid:
            raise HTTPException(status_code=401, detail="Missing 'kid' in ID token header.")

        id_token_key_data = get_kinde_public_key(id_token_kid)
        if not id_token_key_data:
            raise HTTPException(status_code=401, detail="Invalid ID token – unknown key ID")

        public_key_id_token = jwk.construct(id_token_key_data)

        payload = jwt.decode(
            id_token,
            key=public_key_id_token,
            algorithms=[id_token_key_data.get("alg", "RS256")],
            audience=KINDE_CLIENT_ID,
            issuer=f"https://{KINDE_DOMAIN}",
            access_token=access_token
        )

        logger.info(" User info from ID token: %s", payload)

        await run_in_threadpool(upsert_user, payload)

        # Redirect user back to frontend callback route with cookie set.
        response = RedirectResponse(url=frontend_url + "/dashboard")
        # Set access_token cookie with secure cross-site flags so browser will send it from frontend -> backend.
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            secure=True,
            samesite="none",
            max_age=3600
        )
        # Remove oauth_state cookie (use same flags to ensure cookie is found & removed)
        response.delete_cookie(key="oauth_state", secure=True, httponly=True, samesite="none")
        return response

    except requests.RequestException as e:
        logger.error(" Token exchange error: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Token exchange failed: {str(e)}")
    except JWTError as e:
        logger.error(" JWT decoding error: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"JWT decoding failed: {str(e)}")
    except Exception as e:
        logger.error(" General authentication callback error: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Authentication callback failed: {str(e)}")

@auth_router.get("/logout")
def logout(response: Response):
    response = RedirectResponse(url=f"{frontend_url}/login")
    # Delete cookie with same flags used to set it.
    response.delete_cookie(key="access_token", httponly=True, secure=True, samesite="none")
    return response

app.include_router(auth_router, prefix="/api")

# ------------------------------------------------------
# Google Cloud Storage setup
# ------------------------------------------------------
credentials = None
storage_client = None
bucket = None
try:
    if os.getenv("GOOGLE_APPLICATION_CREDENTIALS_JSON"):
        credentials_info = json.loads(os.environ["GOOGLE_APPLICATION_CREDENTIALS_JSON"])
        credentials = service_account.Credentials.from_service_account_info(credentials_info)
        storage_client = storage.Client(credentials=credentials)
        bucket_name = os.getenv("BUCKET_NAME")
        if bucket_name:
            bucket = storage_client.bucket(bucket_name)
except Exception as e:
    logger.error(f"Failed to initialize GCS: {e}")

# ------------------------------------------------------
# Database connection
# ------------------------------------------------------
def get_connection():
    if not DATABASE_URL:
        raise HTTPException(status_code=500, detail="DATABASE_URL not configured")
    conn_url = DATABASE_URL.replace("cockroachdb+psycopg2://", "postgresql://")
    return psycopg2.connect(conn_url)

def generate_signed_url(gcs_path: str) -> str:
    if not storage_client:
        return ""
    try:
        path_parts = gcs_path.replace("gs://", "").split("/", 1)
        blob = storage_client.bucket(path_parts[0]).blob(path_parts[1])
        return blob.generate_signed_url(expiration=timedelta(minutes=60))
    except Exception as e:
        logger.error(f"Signed URL generation failed: {e}")
        return ""

# ------------------------------------------------------
# Application Routes
# All protected routes now use `get_current_username` as a dependency.
# ------------------------------------------------------
@app.get("/api/me")
async def get_me(username: str = Depends(get_current_username)):
    return {"user": username}

@app.get("/api/dashboard")
def dashboard(username: str = Depends(get_current_username)):
    conn = get_connection()
    with conn.cursor() as cursor:
        cursor.execute("""
            SELECT COUNT(*), COUNT(*) FILTER (WHERE is_valid), COUNT(*) FILTER (WHERE NOT is_valid)
            FROM validation_history WHERE username = %s
        """, (username,))
        total, successful, failed = cursor.fetchone()

        cursor.execute("""
            SELECT TO_CHAR(created_at, 'FMDay'), COUNT(*)
            FROM validation_history
            WHERE username = %s AND created_at >= CURRENT_DATE - INTERVAL '6 days'
            GROUP BY 1 ORDER BY 1
        """, (username,))
        chart = cursor.fetchall()

        cursor.execute("""
            SELECT AVG((profiling->>'time')::FLOAT)
            FROM reports WHERE username = %s AND profiling->>'time' IS NOT NULL
        """, (username,))
        avg_time = cursor.fetchone()[0] or 0

    return JSONResponse({
        "total": total,
        "successful": successful,
        "failed": failed,
        "chart_labels": [r[0] for r in chart],
        "chart_values": [r[1] for r in chart],
        "avg_time": round(avg_time, 2),
    })

@app.get("/api/session")
def get_session(username: str = Depends(get_current_username)):
    conn = get_connection()
    with conn.cursor() as cursor:
        cursor.execute("SELECT id, username, email FROM users WHERE username = %s", (username,))
        user = cursor.fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return JSONResponse({"id": user[0], "username": user[1], "email": user[2]})

# ----------------------------------------------------------------------------------
# File Upload and Database Insertion Endpoint
# ----------------------------------------------------------------------------------
async def insert_file_records(username: str, source_filename: str, target_filename: str):
    """
    Synchronous database insertion logic, to be run in a threadpool.
    """
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO validation_history (
                    username,
                    source_file_name,
                    target_file_name,
                    is_valid,
                    created_at
                ) VALUES (%s, %s, %s, %s, %s)
            """, (username, source_filename, target_filename, False, datetime.utcnow()))
            conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        if conn:
            conn.close()

@app.post("/api/upload-files")
async def upload_files(
    username: str = Depends(get_current_username),
    source_file: UploadFile = File(...),
    target_file: UploadFile = File(...)
):
    """
    Handles concurrent upload of source and target files to GCS and
    records the upload in CockroachDB.
    """
    if not bucket:
        raise HTTPException(status_code=500, detail="GCS not configured")
    
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    folder_prefix = f"{username}/uploads/{timestamp}_"
    
    # Define a helper function for uploading to GCS
    async def upload_to_gcs_task(file: UploadFile, filename: str):
        blob = bucket.blob(f"{folder_prefix}{filename}")
        file_content = await file.read()
        blob.upload_from_string(file_content, content_type=file.content_type)
        return filename

    try:
        # Upload both files concurrently using asyncio.gather
        source_filename, target_filename = await asyncio.gather(
            upload_to_gcs_task(source_file, source_file.filename),
            upload_to_gcs_task(target_file, target_file.filename)
        )
        
        # Run the blocking DB insertion in a background thread
        await run_in_threadpool(insert_file_records, username, source_filename, target_filename)

        logger.info(f"Files '{source_filename}' and '{target_filename}' uploaded and recorded for user '{username}'.")
        
        return {"message": "Files uploaded to GCS and recorded in DB successfully"}
    
    except Exception as e:
        logger.error(f"File upload or DB insertion failed for user '{username}': {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Upload failed: {e}")

@app.get("/api/upload-history")
async def upload_history(username: str = Depends(get_current_username), page: int = 1, search: str = None, status: str = None):
    conn = get_connection()
    base_query = "SELECT source_file_name, target_file_name, is_valid, created_at FROM validation_history WHERE username = %s"
    filters = [username]
    if search:
        base_query += " AND (source_file_name ILIKE %s OR target_file_name ILIKE %s)"
        filters.extend([f"%{search}%"]*2)
    if status == "success":
        base_query += " AND is_valid = TRUE"
    elif status == "failure":
        base_query += " AND is_valid = FALSE"
    base_query += " ORDER BY created_at DESC LIMIT 10 OFFSET %s"
    filters.append((page-1)*10)
    with conn.cursor() as cursor:
        cursor.execute(base_query, tuple(filters))
        rows = cursor.fetchall()
    data = [{
        "source_file_name": r[0],
        "target_file_name": r[1],
        "is_valid": r[2],
        "created_at": r[3].isoformat()
    } for r in rows]
    return JSONResponse({"records": data, "current_page": page})

@app.get("/api/reports")
def reports(username: str = Depends(get_current_username)):
    conn = get_connection()
    with conn.cursor() as cursor:
        cursor.execute("""
            SELECT id, report_date, report_name, status, data_profiling_url,
            detailed_overview_url, failed_checks_url, time,
            checks IS NOT NULL, profiling IS NOT NULL, detailedoverview IS NOT NULL
            FROM reports WHERE username = %s ORDER BY time DESC
        """, (username,))
        reports = cursor.fetchall()
    formatted = []
    for r in reports:
        formatted.append({
            "id": r[0],
            "report_date": r[1].strftime("%Y-%m-%d") if r[1] else None,
            "report_name": r[2],
            "status": "success" if r[3] == 'P' else "failure",
            "data_profiling_url": generate_signed_url(r[4]),
            "detailed_overview_url": generate_signed_url(r[5]),
            "failed_checks_url": generate_signed_url(r[6]),
            "time": r[7].strftime("%Y-%m-%d %H:%M:%S") if r[7] else None,
            "has_checks": r[8],
            "has_profiling": r[9],
            "has_detailed_overview": r[10]
        })
    return JSONResponse({"reports": formatted})

@app.get("/api/reports/{id}/checks")
def report_checks(id: int, username: str = Depends(get_current_username)):
    conn = get_connection()
    with conn.cursor() as cursor:
        cursor.execute("SELECT checks, failed_checks_url FROM reports WHERE id = %s AND username = %s", (id, username))
        result = cursor.fetchone()
    if not result:
        raise HTTPException(status_code=404, detail="Checks not found")
    return JSONResponse({"checks": result[0], "download_url": generate_signed_url(result[1])})

@app.get("/api/reports/{id}/profiling")
def report_profiling(id: int, username: str = Depends(get_current_username)):
    conn = get_connection()
    with conn.cursor() as cursor:
        cursor.execute("SELECT profiling, data_profiling_url FROM reports WHERE id = %s AND username = %s", (id, username))
        result = cursor.fetchone()
    if not result:
        raise HTTPException(status_code=404, detail="Profiling not found")
    return JSONResponse({"profile": result[0], "download_url": generate_signed_url(result[1])})

@app.get("/api/reports/{id}/detailed")
def report_detailed(id: int, username: str = Depends(get_current_username)):
    conn = get_connection()
    with conn.cursor() as cursor:
        cursor.execute("SELECT detailedoverview, detailed_overview_url FROM reports WHERE id = %s AND username = %s", (id, username))
        result = cursor.fetchone()
    if not result:
        raise HTTPException(status_code=404, detail="Overview not found")
    return JSONResponse({"detailed_overview": result[0], "download_url": generate_signed_url(result[1])})

@app.get("/api/profile")
def get_profile(username: str = Depends(get_current_username)):
    conn = get_connection()
    with conn.cursor() as cursor:
        cursor.execute("SELECT username, email, first_name, last_name FROM users WHERE username = %s", (username,))
        result = cursor.fetchone()
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
    return JSONResponse({
        "username": result[0],
        "email": result[1],
        "first_name": result[2],
        "last_name": result[3]
    })

@app.post("/api/account-settings")
def update_password(username: str = Depends(get_current_username), current_password: str = Form(...), new_password: str = Form(...), confirm_password: str = Form(...)):
    if new_password != confirm_password:
        return JSONResponse(status_code=400, content={"error": "Passwords do not match"})
    conn = get_connection()
    with conn.cursor() as cursor:
        cursor.execute("SELECT password FROM users WHERE username = %s", (username,))
        record = cursor.fetchone()
        if not record or not bcrypt.checkpw(current_password.encode(), record[0].encode()):
            return JSONResponse(status_code=403, content={"error": "Incorrect password"})
        new_hashed = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()
        cursor.execute("UPDATE users SET password = %s WHERE username = %s", (new_hashed, username))
        conn.commit()
    return JSONResponse({"message": "Password updated"})

@app.post("/pubsub-handler")
async def pubsub_handler(payload: PubSubMessage):
    try:
        message_data = base64.b64decode(payload.message["data"]).decode("utf-8")
        attributes = payload.message.get("attributes", {})
        logger.info(f"PubSub Triggered. Data: {message_data}, Attributes: {attributes}")

        blob_name = attributes.get("objectId") or json.loads(message_data).get("name")
        if not blob_name:
            raise ValueError("No blob name found in message")

        parts = blob_name.split('/')
        if len(parts) < 2:
            raise ValueError(f"Unexpected blob path: {blob_name}")

        username = parts[0]
        file_name = parts[-1]
        
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO validation_history (username, source_file_name, is_valid, created_at)
                VALUES (%s, %s, %s, %s)
            """, (username, file_name, True, datetime.utcnow()))
            conn.commit()

        return JSONResponse({"status": "ok", "blob": blob_name})
    except Exception as e:
        logger.error(f"Pub/Sub processing failed: {e}")
        return JSONResponse(status_code=500, content={"error": "Pub/Sub processing error"})

# ------------------------------------------------------
# Start server (for local dev)
# ------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8080)))
