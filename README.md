# SafeVision

Sistema de detección de uso de mascarilla y casco en entornos institucionales, basado en visión artificial y computación en la nube.

## 🛡️ Descripción

SafeVision es una aplicación web que utiliza inteligencia artificial (YOLOv8) para detectar automáticamente si las personas usan mascarilla, casco o ninguno de estos elementos de seguridad. El sistema procesa video en tiempo real desde cámaras web y almacena las evidencias generadas.

## 🏗️ Arquitectura

```
┌──────────────┐     ┌──────────────────────────────────┐
│  Cámara Web  │────▶│        Servidor (FastAPI)         │
└──────────────┘     │  ┌──────────┐  ┌──────────────┐  │
                     │  │ Backend  │  │ YOLOv8       │  │
┌──────────────┐     │  │ API REST │◀▶│ OpenCV       │  │
│  Navegador   │◀───▶│  └────┬─────┘  └──────────────┘  │
│  (Operador)  │     │  ┌────┴─────┐                    │
└──────────────┘     │  │ Frontend │                    │
                     │  │ HTML/CSS │                    │
                     │  └──────────┘                    │
                     └───────┬──────────────┬───────────┘
                             │              │
                     ┌───────▼──────┐ ┌─────▼──────────┐
                     │  MongoDB     │ │  Almacenamiento │
                     │  (Registros) │ │  (Evidencias)   │
                     └──────────────┘ └────────────────┘
```

## 🚀 Tecnologías

| Componente | Tecnología |
|---|---|
| Backend | Python 3 + FastAPI |
| Visión Artificial | OpenCV + YOLOv8 (Ultralytics) |
| Frontend | HTML5 + CSS3 + JavaScript |
| Base de Datos | MongoDB |
| Almacenamiento | Local / Amazon S3 |

## 📋 Requisitos Previos

- **Python 3.9+**
- **MongoDB** (local o MongoDB Atlas)
- **pip** (gestor de paquetes de Python)
- **Cámara web** (opcional, para detección en vivo)

## ⚙️ Instalación

### 1. Clonar el repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
cd safevision
```

### 2. Crear entorno virtual

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

### 3. Instalar dependencias

```bash
pip install -r requirements.txt
```

### 4. Configurar MongoDB

Asegúrese de que MongoDB esté corriendo en `localhost:27017` o configure la variable de entorno:

```bash
# Windows PowerShell
$env:MONGO_URI = "mongodb://localhost:27017"

# Linux/Mac
export MONGO_URI="mongodb://localhost:27017"
```

### 5. Iniciar la aplicación

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 6. Acceder

Abra su navegador en: **http://localhost:8000**

**Credenciales por defecto:**
- Usuario: `admin`
- Contraseña: `admin123`

## 📸 Funcionalidades

### Pantallas

1. **Login** — Autenticación con JWT
2. **Dashboard** — Métricas del sistema, cámaras activas, alertas, actividad reciente
3. **Cámara en Vivo** — Streaming MJPEG con detección en tiempo real
4. **Detalle de Detección** — Evidencia anotada con bounding boxes, nivel de alerta, resultados

### Características

- ✅ Detección de mascarillas y cascos con YOLOv8
- ✅ Streaming de video en vivo con overlay de detección
- ✅ Captura y análisis de frames individuales
- ✅ Almacenamiento de evidencias (local o S3)
- ✅ Panel de control con métricas en tiempo real
- ✅ Diseño responsivo (desktop, tablet, móvil)
- ✅ Autenticación JWT con roles
- ✅ API REST documentada (FastAPI Swagger en `/docs`)

## 📁 Estructura del Proyecto

```
safevision/
├── backend/
│   ├── main.py              # App FastAPI
│   ├── config.py            # Configuración
│   ├── database.py          # Conexión MongoDB
│   ├── models.py            # Schemas Pydantic
│   ├── auth.py              # JWT + bcrypt
│   ├── routes/
│   │   ├── auth_routes.py
│   │   ├── dashboard_routes.py
│   │   ├── detection_routes.py
│   │   └── camera_routes.py
│   ├── services/
│   │   ├── detection_service.py
│   │   └── storage_service.py
│   └── requirements.txt
├── frontend/
│   ├── index.html           # Login
│   ├── dashboard.html       # Dashboard
│   ├── detection.html       # Detalle
│   ├── live.html            # Cámara en vivo
│   ├── css/styles.css
│   └── js/
│       ├── api.js
│       ├── login.js
│       ├── dashboard.js
│       ├── detection.js
│       └── live.js
└── README.md
```

## 🔗 API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/login` | Autenticación |
| GET | `/api/dashboard/stats` | Estadísticas del sistema |
| GET | `/api/dashboard/activity` | Actividad reciente |
| GET | `/api/detections` | Lista de detecciones |
| GET | `/api/detections/{id}` | Detalle de detección |
| POST | `/api/detections/analyze` | Analizar imagen |
| GET | `/api/camera/stream` | Stream MJPEG |
| POST | `/api/camera/capture` | Capturar frame |

## 👥 Equipo

- **Marjorie Lisseth Jiménez Jiménez** — Líder del Proyecto
- **Cristina Lisbeth Orellana Esparza** — Desarrollador

## 📚 Referencias

- [FastAPI Documentation](https://fastapi.tiangolo.com)
- [Ultralytics YOLOv8](https://docs.ultralytics.com)
- [OpenCV Documentation](https://docs.opencv.org)
- [MongoDB Documentation](https://www.mongodb.com/docs/)
- [Motor (Async MongoDB)](https://motor.readthedocs.io/)
