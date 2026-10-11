from __future__ import annotations

import base64
import io
import os
from collections import Counter, deque
from threading import Lock
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image

from db import (  # noqa: E402  (db.py loads DATABASE_URL from .env.local)
    add_review,
    clear_scans,
    create_alert,
    create_order,
    create_product,
    delete_order,
    create_scan,
    delete_conversation,
    delete_product,
    get_or_create_conversation,
    get_product,
    increment_product_views,
    is_seeded,
    list_alerts,
    list_conversations,
    list_messages,
    list_orders,
    list_products,
    list_scans,
    list_users,
    mark_conversation_read,
    mark_review_helpful,
    seed_database,
    send_message,
    update_alert,
    update_order,
    update_product,
    upsert_user,
)

try:
    from ultralytics import YOLO
except Exception as e:  # pragma: no cover
    raise RuntimeError(
        "Failed to import ultralytics. Install deps with: pip install -r yolo-service/requirements.txt"
    ) from e


def _strip_data_uri_prefix(data: str) -> str:
    if data.startswith("data:") and "," in data:
        return data.split(",", 1)[1]
    return data


def _decode_image_from_base64(data: str) -> Image.Image:
    try:
        raw = base64.b64decode(_strip_data_uri_prefix(data), validate=False)
        return Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid image payload") from e


class PredictRequest(BaseModel):
    image: str
    conf: float | None = None
    # Optional fields for live-stream stabilization (voting)
    source: str | None = None  # e.g. "camera" | "upload"
    vote: bool | None = None
    streamId: str | None = None
    voteWindow: int | None = None
    voteMin: int | None = None


class Box(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float


class Detection(BaseModel):
    label: str
    confidence: float
    box: Box | None = None


class StableVote(BaseModel):
    label: str
    votes: int
    window: int
    frames: int
    ready: bool
    isStable: bool


class PredictResponse(BaseModel):
    model: str
    detections: list[Detection]
    top: Detection | None
    stable: StableVote | None = None


app = FastAPI(title="EcoSort Vision Backend")

# Allow the Next.js frontend (any origin/port) to call the DB + AI endpoints directly.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# PostgreSQL persistence endpoints (hosted on Neon or Supabase via DATABASE_URL)
# ---------------------------------------------------------------------------


@app.get("/db/health")
def db_health() -> dict[str, Any]:
    return {"ok": True, "seeded": is_seeded()}


@app.get("/db/seed-status")
def db_seed_status() -> dict[str, Any]:
    return {"ok": True, "seeded": is_seeded()}


@app.post("/db/seed")
def db_seed() -> dict[str, Any]:
    counts = seed_database()
    return {"ok": True, **counts}


@app.get("/db/users")
def db_list_users() -> dict[str, Any]:
    return {"users": list_users()}


@app.post("/db/users")
def db_upsert_user(data: dict[str, Any]) -> dict[str, Any]:
    return upsert_user(data)


@app.get("/db/products")
def db_list_products() -> dict[str, Any]:
    return {"products": list_products()}


@app.get("/db/products/{product_id}")
def db_get_product(product_id: str) -> dict[str, Any]:
    product = get_product(product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@app.post("/db/products")
def db_create_product(data: dict[str, Any]) -> dict[str, Any]:
    return create_product(data)


@app.put("/db/products/{product_id}")
def db_update_product(product_id: str, data: dict[str, Any]) -> dict[str, Any]:
    product = update_product(product_id, data)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@app.delete("/db/products/{product_id}")
def db_delete_product(product_id: str) -> dict[str, Any]:
    if not delete_product(product_id):
        raise HTTPException(status_code=404, detail="Product not found")
    return {"ok": True}


@app.post("/db/products/{product_id}/view")
def db_increment_views(product_id: str) -> dict[str, Any]:
    product = increment_product_views(product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@app.post("/db/products/{product_id}/reviews")
def db_add_review(product_id: str, data: dict[str, Any]) -> dict[str, Any]:
    product = add_review(product_id, data)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@app.post("/db/reviews/{review_id}/helpful")
def db_mark_review_helpful(review_id: str) -> dict[str, Any]:
    product = mark_review_helpful(review_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Review not found")
    return product


@app.get("/db/orders")
def db_list_orders(buyer_id: str | None = None, seller_id: str | None = None) -> dict[str, Any]:
    return {"orders": list_orders(buyer_id=buyer_id, seller_id=seller_id)}


@app.post("/db/orders")
def db_create_order(data: dict[str, Any]) -> dict[str, Any]:
    return create_order(data)


@app.patch("/db/orders/{order_id}")
def db_update_order(order_id: str, data: dict[str, Any]) -> dict[str, Any]:
    order = update_order(order_id, data)
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@app.delete("/db/orders/{order_id}")
def db_delete_order(order_id: str) -> dict[str, Any]:
    if not delete_order(order_id):
        raise HTTPException(status_code=404, detail="Order not found")
    return {"ok": True}


@app.get("/db/conversations")
def db_list_conversations(user_id: str) -> dict[str, Any]:
    return {"conversations": list_conversations(user_id)}


@app.post("/db/conversations")
def db_get_or_create_conversation(data: dict[str, Any]) -> dict[str, Any]:
    return get_or_create_conversation(data)


@app.delete("/db/conversations/{conv_id}")
def db_delete_conversation(conv_id: str) -> dict[str, Any]:
    if not delete_conversation(conv_id):
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"ok": True}


@app.get("/db/conversations/{conv_id}/messages")
def db_list_messages(conv_id: str) -> dict[str, Any]:
    return {"messages": list_messages(conv_id)}


@app.post("/db/conversations/{conv_id}/messages")
def db_send_message(conv_id: str, data: dict[str, Any]) -> dict[str, Any]:
    message = send_message(conv_id, data)
    if message is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return message


@app.post("/db/conversations/{conv_id}/read")
def db_mark_read(conv_id: str, data: dict[str, Any]) -> dict[str, Any]:
    remaining = mark_conversation_read(conv_id, data.get("userId", ""))
    return {"unreadCount": remaining}


@app.get("/db/scans")
def db_list_scans(user_id: str | None = None) -> dict[str, Any]:
    return {"scans": list_scans(user_id=user_id)}


@app.post("/db/scans")
def db_create_scan(data: dict[str, Any]) -> dict[str, Any]:
    return create_scan(data)


@app.delete("/db/scans")
def db_clear_scans() -> dict[str, Any]:
    cleared = clear_scans()
    return {"ok": True, "cleared": cleared}


@app.get("/db/alerts")
def db_list_alerts() -> dict[str, Any]:
    return {"alerts": list_alerts()}


@app.post("/db/alerts")
def db_create_alert(data: dict[str, Any]) -> dict[str, Any]:
    return create_alert(data)


@app.patch("/db/alerts/{alert_id}")
def db_update_alert(alert_id: str, data: dict[str, Any]) -> dict[str, Any]:
    alert = update_alert(alert_id, data)
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert

_model_path = os.getenv("YOLO_MODEL_PATH")
if not _model_path:
    # default: yolo-service/models/yolo_model.pt (relative to this file)
    _model_path = os.path.join(os.path.dirname(__file__), "models", "yolo_model.pt")

# Fallback to pretrained YOLOv8 model if custom model doesn't exist
# YOLOv8x (extra-large) - highest accuracy model, detects 80 COCO classes
# Model sizes: yolov8n < yolov8s < yolov8m < yolov8l < yolov8x (accuracy increases)
_use_pretrained = not os.path.exists(_model_path)
if _use_pretrained:
    _model_path = "yolov8x.pt"  # Extra-large model - highest accuracy, auto-downloads

_default_conf = float(os.getenv("YOLO_CONF", "0.25"))  # Lower default for better detection

_vote_window = int(os.getenv("YOLO_VOTE_WINDOW", "10"))
_vote_min = int(os.getenv("YOLO_VOTE_MIN", "6"))

# Buffers keyed by stream id (or source). This avoids cross-contamination between
# different camera sessions.
_vote_lock = Lock()
_vote_buffers: dict[str, deque[str]] = {}
_last_stable: dict[str, str] = {}

_NO_DETECTION = "__none__"


def _clamp01(x: float) -> float:
    return 0.0 if x < 0.0 else 1.0 if x > 1.0 else x


def get_stable_prediction(key: str, new_label: str | None, *, window: int, min_votes: int) -> StableVote:
    """Return a stable label based on majority vote over the last N frames."""
    window = max(1, int(window))
    min_votes = max(1, int(min_votes))
    with _vote_lock:
        buf = _vote_buffers.get(key)
        if buf is None:
            buf = deque(maxlen=window)
            _vote_buffers[key] = buf
        elif buf.maxlen != window:
            # Recreate buffer to match requested window.
            existing = list(buf)
            buf = deque(existing[-window:], maxlen=window)
            _vote_buffers[key] = buf

        # Count every frame. If no detection, store a sentinel.
        buf.append(new_label if new_label else _NO_DETECTION)

        if not buf:
            return StableVote(label="Thinking...", votes=0, window=window, frames=0, ready=False, isStable=False)

        vote_counts = Counter(buf)
        winner, count = vote_counts.most_common(1)[0]

        frames = len(buf)
        ready = frames >= window

        display_label = "Unknown" if winner == _NO_DETECTION else winner

        if ready and count >= min_votes:
            if winner != _NO_DETECTION:
                _last_stable[key] = winner
            return StableVote(label=display_label, votes=int(count), window=window, frames=frames, ready=True, isStable=True)

        # Optional: keep last stable label to avoid UI flicker.
        last = _last_stable.get(key)
        if last:
            return StableVote(label=last, votes=int(count), window=window, frames=frames, ready=ready, isStable=False)

        # If we've collected the full window but no class is stable, report Unknown.
        if ready:
            return StableVote(label="Unknown", votes=int(count), window=window, frames=frames, ready=True, isStable=False)

        return StableVote(label="Thinking...", votes=int(count), window=window, frames=frames, ready=ready, isStable=False)

# Allow running the backend for DB/storage work only (no model download).
_skip_model = os.getenv("ECOSORT_SKIP_MODEL", "").lower() in ("1", "true", "yes")

if _skip_model:
    yolo = None  # type: ignore[assignment]
    _load_error = "Model loading skipped (ECOSORT_SKIP_MODEL=1)"
else:
    try:
        yolo = YOLO(_model_path)
        _load_error = None
    except Exception as e:
        # If custom model failed, try pretrained YOLOv8
        if not _use_pretrained:
            try:
                _model_path = "yolov8n.pt"
                yolo = YOLO(_model_path)
                _load_error = None
            except Exception as e2:
                yolo = None  # type: ignore[assignment]
                _load_error = f"Custom model failed: {str(e)}. Pretrained also failed: {str(e2)}"
        else:
            yolo = None  # type: ignore[assignment]
            _load_error = str(e)


@app.get("/")
def root() -> dict[str, Any]:
    return {
        "service": "EcoSort Vision Backend",
        "endpoints": ["/health", "/predict", "/db/*", "/docs"],
    }


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "ok": yolo is not None,
        "modelPath": _model_path,
        "defaultConf": _default_conf,
        "voteWindow": _vote_window,
        "voteMin": _vote_min,
        "error": _load_error,
    }


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest) -> PredictResponse:
    if yolo is None:
        raise HTTPException(
            status_code=500,
            detail=f"YOLO model not loaded from '{_model_path}'. Error: {_load_error}",
        )

    img = _decode_image_from_base64(req.image)
    conf = float(req.conf) if req.conf is not None else _default_conf
    conf = _clamp01(conf)

    results = yolo.predict(img, conf=conf, verbose=False)
    if not results:
        return PredictResponse(model=os.path.basename(_model_path), detections=[], top=None)

    r0 = results[0]
    names = getattr(r0, "names", {}) or {}

    detections: list[Detection] = []
    boxes = getattr(r0, "boxes", None)

    if boxes is not None and len(boxes) > 0:
        for b in boxes:
            cls_id = int(b.cls[0].item()) if hasattr(b, "cls") else -1
            conf_score = float(b.conf[0].item()) if hasattr(b, "conf") else 0.0
            label = str(names.get(cls_id, cls_id))

            xyxy = b.xyxy[0].tolist() if hasattr(b, "xyxy") else None
            box = None
            if xyxy and len(xyxy) == 4:
                box = Box(x1=float(xyxy[0]), y1=float(xyxy[1]), x2=float(xyxy[2]), y2=float(xyxy[3]))

            detections.append(Detection(label=label, confidence=conf_score, box=box))

    detections.sort(key=lambda d: d.confidence, reverse=True)
    top = detections[0] if detections else None

    # Voting is enabled by default for camera streams; can be forced with vote=true.
    vote_enabled = bool(req.vote) if req.vote is not None else (req.source == "camera")
    stable = None
    if vote_enabled:
        vote_key = req.streamId or req.source or "default"
        window = req.voteWindow if req.voteWindow is not None else _vote_window
        min_votes = req.voteMin if req.voteMin is not None else _vote_min
        stable = get_stable_prediction(vote_key, top.label if top else None, window=window, min_votes=min_votes)

    return PredictResponse(model=os.path.basename(_model_path), detections=detections, top=top, stable=stable)
