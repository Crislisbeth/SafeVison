from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from models import LoginRequest, LoginResponse
from auth import verify_password, create_token, hash_password
from database import get_db, AsyncSessionLocal
from models_db import User, Camera

router = APIRouter(prefix="/api", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate user and return JWT token."""
    result = await db.execute(select(User).filter(User.username == req.username))
    user = result.scalars().first()

    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    token = create_token({"sub": user.username})

    return LoginResponse(
        access_token=token,
        user={
            "username": user.username,
            "full_name": user.full_name,
            "role": user.role,
        },
    )


@router.get("/me")
async def get_me():
    """Return current authenticated user info."""
    return {"status": "ok"}


# Seed default admin user
async def seed_admin():
    """Create default admin user and cameras if none exists."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).filter(User.username == "admin"))
        existing_user = result.scalars().first()
        
        if not existing_user:
            admin_user = User(
                username="admin",
                password_hash=hash_password("admin123"),
                full_name="Administrador SafeVision",
                role="admin"
            )
            db.add(admin_user)
            await db.commit()
            print("[OK] Admin user created (admin / admin123)")

        # Seed cameras
        result = await db.execute(select(Camera))
        cameras = result.scalars().all()
        
        if len(cameras) == 0:
            default_cameras = [
                Camera(camera_id="CAM-001", name="Entrada Principal", location="Edificio A - Planta Baja", status="active"),
                Camera(camera_id="CAM-002", name="Laboratorio B", location="Edificio B - Piso 2", status="active"),
                Camera(camera_id="CAM-003", name="Taller de Ingeniería", location="Edificio C - Piso 1", status="inactive"),
            ]
            db.add_all(default_cameras)
            await db.commit()
            print("[OK] Cameras seeded (3 cameras)")
