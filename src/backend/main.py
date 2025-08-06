from fastapi import FastAPI, Request, UploadFile, File, Form, Depends, Query, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from google.cloud import storage
from google.oauth2 import service_account
from dotenv import load_dotenv
from pydantic import BaseModel
import os, json, logging, psycopg2, bcrypt
from datetime import datetime, timedelta
from auth import auth_router

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
    "SESSION_SECRET_KEY"
]
missing = [var for var in required_vars if not os.getenv(var)]
print("ENV VARS LOADED:")
for key in required_vars:
    val = os.environ.get(key)
    print(f" - {key}: {'SET' if val else 'MISSING'} {val[:20]+'...' if val else ''}")
if missing:
    logger.error(f"Missing environment variables: {', '.join(missing)}")
    # Do not crash — log only

# ------------------------------------------------------
# Initialize FastAPI app
# ------------------------------------------------------
app = FastAPI()
app.include_router(auth_router)

app.add_middleware(SessionMiddleware, secret_key=os.getenv("SESSION_SECRET_KEY", "super-secret"))
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
DATABASE_URL = os.getenv("DATABASE_URL")

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
# Routes
# ------------------------------------------------------

@app.get("/api/dashboard")
def dashboard(request: Request):
    username = request.session.get("username")
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
def get_session(request: Request):
    username = request.session.get("username")
    if not username:
        raise HTTPException(status_code=401, detail="Not logged in")
    conn = get_connection()
    with conn.cursor() as cursor:
        cursor.execute("SELECT id, username, email FROM users WHERE username = %s", (username,))
        user = cursor.fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return JSONResponse({"id": user[0], "username": user[1], "email": user[2]})

@app.post("/api/upload-files")
async def upload_files(request: Request, source_file: UploadFile = File(...), target_file: UploadFile = File(...)):
    if not bucket:
        raise HTTPException(status_code=500, detail="GCS not configured")
    username = request.session.get("username")
    if not username:
        raise HTTPException(status_code=401, detail="Not logged in")
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    folder_prefix = f"{username}/uploads/{timestamp}_"
    for file in [source_file, target_file]:
        blob = bucket.blob(f"{folder_prefix}{file.filename}")
        blob.upload_from_file(file.file, content_type=file.content_type)
    return {"message": "Files uploaded to GCS successfully"}

@app.get("/api/upload-history")
async def upload_history(request: Request, page: int = 1, search: str = None, status: str = None):
    username = request.session.get("username")
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
def reports(request: Request):
    username = request.session.get("username")
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
def report_checks(id: int, request: Request):
    username = request.session.get("username")
    conn = get_connection()
    with conn.cursor() as cursor:
        cursor.execute("SELECT checks, failed_checks_url FROM reports WHERE id = %s AND username = %s", (id, username))
        result = cursor.fetchone()
    if not result:
        raise HTTPException(status_code=404, detail="Checks not found")
    return JSONResponse({"checks": result[0], "download_url": generate_signed_url(result[1])})

@app.get("/api/reports/{id}/profiling")
def report_profiling(id: int, request: Request):
    username = request.session.get("username")
    conn = get_connection()
    with conn.cursor() as cursor:
        cursor.execute("SELECT profiling, data_profiling_url FROM reports WHERE id = %s AND username = %s", (id, username))
        result = cursor.fetchone()
    if not result:
        raise HTTPException(status_code=404, detail="Profiling not found")
    return JSONResponse({"profile": result[0], "download_url": generate_signed_url(result[1])})

@app.get("/api/reports/{id}/detailed")
def report_detailed(id: int, request: Request):
    username = request.session.get("username")
    conn = get_connection()
    with conn.cursor() as cursor:
        cursor.execute("SELECT detailedoverview, detailed_overview_url FROM reports WHERE id = %s AND username = %s", (id, username))
        result = cursor.fetchone()
    if not result:
        raise HTTPException(status_code=404, detail="Overview not found")
    return JSONResponse({"detailed_overview": result[0], "download_url": generate_signed_url(result[1])})

@app.get("/api/profile")
def get_profile(request: Request):
    username = request.session.get("username")
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
def update_password(request: Request, current_password: str = Form(...), new_password: str = Form(...), confirm_password: str = Form(...)):
    username = request.session.get("username")
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

@app.get("/api/logout")
def logout(request: Request):
    request.session.clear()
    return JSONResponse({"message": "Logged out"})

# ------------------------------------------------------
# Pub/Sub handler
# ------------------------------------------------------
class PubSubMessage(BaseModel):
    message: dict
    subscription: str = None

@app.post("/pubsub-handler")
async def pubsub_handler(payload: PubSubMessage, background_tasks: BackgroundTasks):
    try:
        import base64
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
