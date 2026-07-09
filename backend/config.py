import os
from dotenv import load_dotenv

load_dotenv()

# ── Database ──────────────────────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./safevision.db")

# ── JWT ──────────────────────────────────────────────────
JWT_SECRET = os.getenv("JWT_SECRET", "safevision-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# ── AWS S3 ───────────────────────────────────────────────
S3_BUCKET = os.getenv("S3_BUCKET", "")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
USE_S3 = bool(S3_BUCKET)

# ── Storage local (cuando no hay S3) ────────────────────
LOCAL_STORAGE_PATH = os.getenv("LOCAL_STORAGE_PATH", "storage/evidences")

# ── YOLOv8 ───────────────────────────────────────────────
YOLO_MODEL_PATH = os.getenv("YOLO_MODEL_PATH", "yolov8n.pt")
DETECTION_CONFIDENCE = float(os.getenv("DETECTION_CONFIDENCE", "0.45"))
