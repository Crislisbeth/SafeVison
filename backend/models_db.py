from sqlalchemy import Column, Integer, String, DateTime, JSON
from database import Base
import datetime

class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    password_hash = Column(String(128), nullable=False)
    full_name = Column(String(100))
    role = Column(String(20), default="observer")


class Detection(Base):
    __tablename__ = 'detections'

    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(String(50), index=True)
    camera_name = Column(String(100))
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    alert_level = Column(String(20))
    evidence_path = Column(String(255))
    status = Column(String(20), default="unresolved")
    summary = Column(JSON)


class Camera(Base):
    __tablename__ = 'cameras'

    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100))
    location = Column(String(255))
    status = Column(String(20), default="active")
