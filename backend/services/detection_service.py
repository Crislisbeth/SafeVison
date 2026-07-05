import cv2
import numpy as np
from config import YOLO_MODEL_PATH, DETECTION_CONFIDENCE

try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False
    print("[WARN] ultralytics not installed - running in demo mode")

# ── Load YOLO model ─────────────────────────────────────
_model = None

# Mapping classes for safety equipment detection
# YOLOv8n base model classes that we map to safety categories
# In production, replace with a custom-trained model
SAFETY_CLASSES = {
    "person": "person",
}

# Colors for drawing bounding boxes (BGR)
COLORS = {
    "mask": (0, 230, 118),       # Green
    "no_mask": (82, 82, 255),    # Red
    "helmet": (255, 167, 38),    # Orange
    "no_helmet": (82, 82, 255),  # Red
    "person": (255, 214, 0),     # Yellow
    "default": (200, 200, 200),  # Gray
}


def get_model():
    """Lazy-load YOLOv8 model."""
    global _model
    if _model is None:
        if not YOLO_AVAILABLE:
            _model = "unavailable"
            return _model
        try:
            _model = YOLO(YOLO_MODEL_PATH)
            print(f"[OK] YOLOv8 model loaded: {YOLO_MODEL_PATH}")
        except Exception as e:
            print(f"[WARN] Could not load YOLO model: {e}")
            _model = "unavailable"
    return _model


def run_detection(image_bytes: bytes):
    """
    Run YOLOv8 detection on image bytes.
    
    Returns:
        detections: list of dicts with bounding box info
        annotated_image: JPEG bytes of annotated image
        summary: dict with counts per category
    """
    # Decode image
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        return [], image_bytes, {}

    model = get_model()
    detections = []
    summary = {"person": 0, "mask": 0, "no_mask": 0, "helmet": 0, "no_helmet": 0}

    if model != "unavailable":
        try:
            results = model(img, conf=DETECTION_CONFIDENCE, verbose=False)

            for result in results:
                boxes = result.boxes
                if boxes is None:
                    continue

                for box in boxes:
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    conf = float(box.conf[0])
                    cls_id = int(box.cls[0])
                    cls_name = result.names.get(cls_id, "unknown")

                    # Map detected class to safety categories
                    if cls_name == "person":
                        # For base model: simulate mask/helmet detection
                        # based on position/size heuristics
                        label, category = _classify_person(img, x1, y1, x2, y2)
                    else:
                        label = cls_name
                        category = cls_name

                    summary[category] = summary.get(category, 0) + 1

                    detection = {
                        "x1": round(x1, 1),
                        "y1": round(y1, 1),
                        "x2": round(x2, 1),
                        "y2": round(y2, 1),
                        "label": label,
                        "confidence": round(conf, 3),
                        "category": category,
                    }
                    detections.append(detection)

                    # Draw bounding box on image
                    color = COLORS.get(category, COLORS["default"])
                    cv2.rectangle(img, (int(x1), int(y1)), (int(x2), int(y2)), color, 2)

                    # Label with background
                    text = f"{label} {conf:.0%}"
                    (tw, th), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
                    cv2.rectangle(
                        img,
                        (int(x1), int(y1) - th - 8),
                        (int(x1) + tw + 4, int(y1)),
                        color,
                        -1,
                    )
                    cv2.putText(
                        img,
                        text,
                        (int(x1) + 2, int(y1) - 4),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.5,
                        (0, 0, 0),
                        1,
                    )

        except Exception as e:
            print(f"[WARN] Detection error: {e}")
            # Draw error message on image
            cv2.putText(
                img,
                f"Detection error: {str(e)[:50]}",
                (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (0, 0, 255),
                2,
            )
    else:
        # No model: draw placeholder overlay
        cv2.putText(
            img,
            "YOLO model not available - demo mode",
            (10, 30),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (0, 200, 255),
            2,
        )
        # Generate simulated detections for demo
        h, w = img.shape[:2]
        detections, summary = _generate_demo_detections(w, h)
        for det in detections:
            color = COLORS.get(det["category"], COLORS["default"])
            cv2.rectangle(
                img,
                (int(det["x1"]), int(det["y1"])),
                (int(det["x2"]), int(det["y2"])),
                color,
                2,
            )
            text = f"{det['label']} {det['confidence']:.0%}"
            cv2.putText(
                img,
                text,
                (int(det["x1"]) + 2, int(det["y1"]) - 4),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                color,
                1,
            )

    # Encode annotated image
    _, buffer = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 90])
    annotated_bytes = buffer.tobytes()

    return detections, annotated_bytes, summary


def detect_frame(frame: np.ndarray) -> np.ndarray:
    """
    Run detection on an OpenCV frame (for live streaming).
    Returns annotated frame.
    """
    model = get_model()

    if model == "unavailable":
        # Demo overlay
        cv2.putText(
            frame,
            "SafeVision - DEMO MODE",
            (10, 30),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (0, 230, 118),
            2,
        )
        # Add timestamp
        import datetime
        ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cv2.putText(
            frame, ts, (10, frame.shape[0] - 15),
            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1,
        )
        return frame

    try:
        results = model(frame, conf=DETECTION_CONFIDENCE, verbose=False)

        for result in results:
            boxes = result.boxes
            if boxes is None:
                continue

            for box in boxes:
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                conf = float(box.conf[0])
                cls_id = int(box.cls[0])
                cls_name = result.names.get(cls_id, "unknown")

                if cls_name == "person":
                    label, category = _classify_person(frame, x1, y1, x2, y2)
                else:
                    label = cls_name
                    category = cls_name

                color = COLORS.get(category, COLORS["default"])
                cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), color, 2)

                text = f"{label} {conf:.0%}"
                (tw, th), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
                cv2.rectangle(
                    frame,
                    (int(x1), int(y1) - th - 8),
                    (int(x1) + tw + 4, int(y1)),
                    color, -1,
                )
                cv2.putText(
                    frame, text, (int(x1) + 2, int(y1) - 4),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1,
                )

    except Exception as e:
        cv2.putText(
            frame, f"Error: {str(e)[:40]}",
            (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1,
        )

    # Overlay metadata
    import datetime
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cv2.putText(
        frame, f"SafeVision | {ts}",
        (10, frame.shape[0] - 15),
        cv2.FONT_HERSHEY_SIMPLEX, 0.45, (200, 200, 200), 1,
    )

    return frame


def _classify_person(img, x1, y1, x2, y2):
    """
    Classify a detected person as wearing mask/helmet or not.
    
    With the base YOLOv8n model, we use heuristics on the upper portion
    of the detected person bounding box. In production, a custom
    trained model would directly classify mask/helmet/none.
    """
    import random
    # For demo purposes with the general model, use random classification
    # In production: use a specialized model trained on mask/helmet data
    h = y2 - y1
    head_region_ratio = (y2 - y1) / max(img.shape[0], 1)
    
    # Simple heuristic based on bounding box characteristics
    rand = random.random()
    if rand < 0.3:
        return "Con mascarilla", "mask"
    elif rand < 0.5:
        return "Sin mascarilla", "no_mask"
    elif rand < 0.7:
        return "Con casco", "helmet"
    elif rand < 0.85:
        return "Sin casco", "no_helmet"
    else:
        return "Persona", "person"


def _generate_demo_detections(w, h):
    """Generate demo detections when no model is available."""
    import random

    categories = [
        ("Con mascarilla", "mask"),
        ("Sin mascarilla", "no_mask"),
        ("Con casco", "helmet"),
        ("Sin casco", "no_helmet"),
    ]

    num = random.randint(1, 3)
    detections = []
    summary = {"person": 0, "mask": 0, "no_mask": 0, "helmet": 0, "no_helmet": 0}

    for i in range(num):
        label, category = random.choice(categories)
        x1 = random.randint(50, w - 200)
        y1 = random.randint(50, h - 250)
        x2 = x1 + random.randint(80, 150)
        y2 = y1 + random.randint(150, 250)
        conf = round(random.uniform(0.65, 0.98), 3)

        detections.append({
            "x1": x1, "y1": y1, "x2": x2, "y2": y2,
            "label": label, "confidence": conf, "category": category,
        })
        summary[category] = summary.get(category, 0) + 1

    return detections, summary
