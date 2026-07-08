# SafeVision 🛡️

Sistema de detección de uso de mascarilla y casco en entornos institucionales, utilizando visión por computadora con YOLOv8.

## Tecnologías

### Backend
- **Python** + **FastAPI** — API REST
- **OpenCV** + **YOLOv8** — Detección de objetos
- **MongoDB** (Motor) — Base de datos
- **JWT** — Autenticación

### Frontend
- **React** + **Vite** — Interfaz web SPA
- **React Router** — Navegación
- **CSS** — Design system institucional UIDE

### Control de Versiones
- **Git** + **GitHub**

## Estructura del Proyecto

```
safevision_proyecto/
├── backend/
│   ├── main.py                 ← API FastAPI (punto de entrada)
│   ├── config.py               ← Configuración (MongoDB, JWT, YOLO)
│   ├── database.py             ← Conexión MongoDB + fallback in-memory
│   ├── models.py               ← Schemas Pydantic
│   ├── auth.py                 ← Autenticación JWT + bcrypt
│   ├── requirements.txt        ← Dependencias Python
│   ├── routes/
│   │   ├── auth_routes.py      ← Login + seed admin
│   │   ├── camera_routes.py    ← Cámara en vivo (MJPEG)
│   │   ├── dashboard_routes.py ← Estadísticas
│   │   └── detection_routes.py ← CRUD de detecciones
│   └── services/
│       ├── detection_service.py ← YOLOv8 + OpenCV
│       └── storage_service.py   ← Almacenamiento de evidencias
├── frontend/
│   ├── index.html              ← HTML base
│   ├── package.json            ← Dependencias npm
│   ├── vite.config.js          ← Config Vite + proxy API
│   └── src/
│       ├── main.jsx            ← Entry point React
│       ├── App.jsx             ← Router principal
│       ├── index.css           ← Design system UIDE
│       ├── api/api.js          ← Cliente API con JWT
│       ├── context/AuthContext.jsx
│       ├── components/         ← Sidebar, Header, StatCard, Toast, etc.
│       └── pages/              ← Login, Dashboard, Live, Detection
└── .gitignore
```

## Instalación y Ejecución

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

### 3. Acceder

Abrir **http://localhost:5173/** en el navegador.

**Credenciales por defecto:**
- Usuario: `admin`
- Contraseña: `admin123`

## Funcionalidades

- ✅ **Login** con autenticación JWT
- ✅ **Dashboard** con estadísticas en tiempo real
- ✅ **Cámara en vivo** con streaming MJPEG y detección
- ✅ **Análisis de imágenes** con YOLOv8
- ✅ **Detalle de detecciones** con evidencia visual
- ✅ **Almacenamiento** de resultados y evidencias

## Equipo

- **Marjorie Lisseth Jiménez Jiménez** — Líder del Proyecto
- **Cristina Lisbeth Orellana Esparza** — Desarrollador
