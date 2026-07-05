from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ── Auth Schemas ─────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class UserOut(BaseModel):
    username: str
    full_name: str
    role: str


# ── Detection Schemas ───────────────────────────────────
class BoundingBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float
    label: str
    confidence: float


class DetectionResult(BaseModel):
    id: Optional[str] = None
    camera_id: str = "CAM-001"
    camera_name: str = "Cámara Principal"
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    alert_level: str = "low"  # low, medium, high
    detections: List[BoundingBox] = []
    summary: dict = {}  # {"mask": 2, "no_mask": 1, "helmet": 0, ...}
    evidence_path: str = ""
    status: str = "active"  # active, reviewed, archived


class DetectionListItem(BaseModel):
    id: str
    camera_name: str
    timestamp: datetime
    alert_level: str
    summary: dict
    status: str


# ── Dashboard Schemas ───────────────────────────────────
class DashboardStats(BaseModel):
    total_cameras: int
    active_cameras: int
    total_detections: int
    today_detections: int
    high_alerts: int
    system_status: str


class ActivityItem(BaseModel):
    id: str
    event: str
    camera: str
    time: str
    alert_level: str
