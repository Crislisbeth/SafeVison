from fastapi import APIRouter, HTTPException
from models import LoginRequest, LoginResponse
from auth import verify_password, create_token, hash_password
from database import get_db

router = APIRouter(prefix="/api", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
async def login(req: LoginRequest):
    """Authenticate user and return JWT token."""
    db = get_db()
    user = await db.users.find_one({"username": req.username})

    if not user or not verify_password(req.password, user["password"]):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    token = create_token({"sub": user["username"]})

    return LoginResponse(
        access_token=token,
        user={
            "username": user["username"],
            "full_name": user["full_name"],
            "role": user["role"],
        },
    )


@router.get("/me")
async def get_me(current_user: dict = None):
    """Return current authenticated user info."""
    from auth import get_current_user
    from fastapi import Depends
    # This is handled via dependency in main router
    pass


# Seed default admin user
async def seed_admin():
    """Create default admin user if none exists."""
    db = get_db()
    existing = await db.users.find_one({"username": "admin"})
    if not existing:
        await db.users.insert_one(
            {
                "username": "admin",
                "password": hash_password("admin123"),
                "full_name": "Administrador SafeVision",
                "role": "admin",
            }
        )
        print("[OK] Admin user created (admin / admin123)")

    # Seed cameras
    cam_count = await db.cameras.count_documents({})
    if cam_count == 0:
        cameras = [
            {
                "camera_id": "CAM-001",
                "name": "Entrada Principal",
                "location": "Edificio A - Planta Baja",
                "status": "active",
            },
            {
                "camera_id": "CAM-002",
                "name": "Laboratorio B",
                "location": "Edificio B - Piso 2",
                "status": "active",
            },
            {
                "camera_id": "CAM-003",
                "name": "Taller de Ingeniería",
                "location": "Edificio C - Piso 1",
                "status": "inactive",
            },
        ]
        await db.cameras.insert_many(cameras)
        print("[OK] Cameras seeded (3 cameras)")
