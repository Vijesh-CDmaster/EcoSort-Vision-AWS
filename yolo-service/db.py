"""PostgreSQL persistence layer for EcoSort Vision.

Hosted Postgres (Neon or Supabase) replaces the old local SQLite file. The
connection string is read from DATABASE_URL (set it in EcoSort-Vision/.env.local
or in the environment). The row->dict helpers return camelCase shapes that match
the TypeScript types used by the Next.js frontend — the REST API exposed in
app.py is unchanged.
"""

from __future__ import annotations

import json
import os
import threading
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import psycopg
from dotenv import load_dotenv
from psycopg.rows import dict_row

# Load DATABASE_URL from the Next.js .env.local (where the Clerk keys live) and
# from a yolo-service/.env if present. load_dotenv never overrides real env vars.
_SERVICE_DIR = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.dirname(_SERVICE_DIR)
load_dotenv(os.path.join(_PROJECT_ROOT, ".env.local"))
load_dotenv(os.path.join(_SERVICE_DIR, ".env"))

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not set. Add your PostgreSQL connection string "
        "(Neon or Supabase) to EcoSort-Vision/.env.local, e.g.\n"
        'DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"\n'
        "See EcoSort-Vision/.env.example and the README for details."
    )

# Reentrant so helpers that re-query (e.g. create_product -> get_product) can be
# called from inside a locked block without deadlocking.
_lock = threading.RLock()
_conn: psycopg.Connection | None = None
_initialized = False


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _iso_ago(**kwargs: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(**kwargs)).isoformat()


def _uid() -> str:
    return str(uuid.uuid4())


def _exec_script(conn: psycopg.Connection, script: str) -> None:
    """Run a multi-statement SQL script (psycopg3 has no executescript)."""
    for statement in script.split(";"):
        if statement.strip():
            conn.execute(statement)
    conn.commit()


def _connect() -> psycopg.Connection:
    # connect_timeout so a dead/unreachable database fails fast instead of
    # hanging the backend for minutes.
    conn = psycopg.connect(DATABASE_URL, row_factory=dict_row, connect_timeout=10)
    return conn


def get_conn() -> psycopg.Connection:
    global _conn, _initialized
    with _lock:
        if _conn is None or _conn.closed:
            _conn = _connect()
        else:
            # Cheap liveness probe so we survive idle timeouts (hosted Postgres
            # terminates connections after a few minutes of inactivity).
            try:
                _conn.execute("SELECT 1").close()
            except psycopg.OperationalError:
                try:
                    _conn.close()
                except Exception:
                    pass
                _conn = _connect()
        if not _initialized:
            _create_schema(_conn)
            _initialized = True
        return _conn


def _create_schema(conn: psycopg.Connection) -> None:
    _exec_script(
        conn,
        """
        CREATE TABLE IF NOT EXISTS users (
          id          TEXT PRIMARY KEY,
          email       TEXT UNIQUE,
          name        TEXT NOT NULL,
          role        TEXT NOT NULL,          -- 'government' | 'marketplace'
          account_type TEXT,                  -- 'buyer' | 'seller' | 'both' (marketplace)
          department  TEXT,
          employee_id TEXT,
          phone       TEXT,
          address     TEXT,
          verified    INTEGER DEFAULT 0,
          eco_score   INTEGER DEFAULT 0,
          avatar      TEXT,
          created_at  TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS products (
          id               TEXT PRIMARY KEY,
          title            TEXT NOT NULL,
          description      TEXT NOT NULL DEFAULT '',
          price            REAL NOT NULL,
          original_price   REAL,
          category         TEXT NOT NULL,
          condition        TEXT NOT NULL,
          status           TEXT NOT NULL DEFAULT 'available',
          images           TEXT NOT NULL DEFAULT '[]',
          seller_name      TEXT NOT NULL,
          seller_contact   TEXT DEFAULT '',
          seller_location  TEXT DEFAULT '',
          seller_id        TEXT,
          created_at       TEXT NOT NULL,
          views            INTEGER DEFAULT 0,
          tags             TEXT DEFAULT '[]',
          is_featured      INTEGER DEFAULT 0,
          quantity         INTEGER DEFAULT 1,
          delivery_option  TEXT DEFAULT 'both',
          shipping_cost    REAL,
          eco_impact_score INTEGER DEFAULT 0,
          negotiable       INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS reviews (
          id         TEXT PRIMARY KEY,
          product_id TEXT NOT NULL,
          user_id    TEXT,
          user_name  TEXT NOT NULL,
          rating     INTEGER NOT NULL,
          comment    TEXT DEFAULT '',
          created_at TEXT NOT NULL,
          helpful    INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS orders (
          id               TEXT PRIMARY KEY,
          order_number     TEXT,
          buyer_id         TEXT,
          buyer_name       TEXT,
          seller_id        TEXT,
          items            TEXT NOT NULL DEFAULT '[]',
          total            REAL NOT NULL DEFAULT 0,
          status           TEXT DEFAULT 'processing',
          payment_status   TEXT DEFAULT 'paid',
          tracking_number  TEXT,
          shipping_address TEXT DEFAULT '',
          created_at       TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS conversations (
          id            TEXT PRIMARY KEY,
          buyer_id      TEXT,
          buyer_name    TEXT,
          seller_id     TEXT,
          seller_name   TEXT,
          participants  TEXT NOT NULL DEFAULT '[]',
          product_id    TEXT,
          product_title TEXT,
          product_image TEXT,
          created_at    TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS messages (
          id              TEXT PRIMARY KEY,
          conversation_id TEXT NOT NULL,
          sender_id       TEXT NOT NULL,
          sender_name     TEXT NOT NULL,
          content         TEXT NOT NULL,
          type            TEXT DEFAULT 'text',
          product_id      TEXT,
          read            INTEGER DEFAULT 0,
          created_at      TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS scans (
          id                    TEXT PRIMARY KEY,
          user_id               TEXT,
          timestamp             BIGINT,        -- epoch milliseconds
          source                TEXT DEFAULT 'upload',
          waste_type            TEXT,
          waste_type_confidence REAL DEFAULT 0,
          bin_suggestion        TEXT,
          bin_confidence        REAL DEFAULT 0,
          image_url             TEXT DEFAULT '',
          detections            TEXT DEFAULT '[]'
        );

        CREATE TABLE IF NOT EXISTS alerts (
          id          TEXT PRIMARY KEY,
          type        TEXT,
          description TEXT,
          severity    TEXT DEFAULT 'info',
          status      TEXT DEFAULT 'open',
          bin_id      TEXT,
          created_at  TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
        CREATE INDEX IF NOT EXISTS idx_products_seller ON products(seller_id);
        CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
        CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
        CREATE INDEX IF NOT EXISTS idx_conversations_buyer ON conversations(buyer_id);
        CREATE INDEX IF NOT EXISTS idx_conversations_seller ON conversations(seller_id);
        CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id);
        CREATE INDEX IF NOT EXISTS idx_orders_seller ON orders(seller_id);
        CREATE INDEX IF NOT EXISTS idx_scans_user ON scans(user_id);
        """,
    )


# ---------------------------------------------------------------------------
# Row -> dict helpers (camelCase, matching the frontend TypeScript types)
# ---------------------------------------------------------------------------


def _row_to_product(row: dict[str, Any], reviews: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    avg = 0.0
    if reviews is not None and reviews:
        avg = round(sum(r["rating"] for r in reviews) / len(reviews), 1)
    return {
        "id": row["id"],
        "title": row["title"],
        "description": row["description"],
        "price": row["price"],
        "originalPrice": row["original_price"],
        "category": row["category"],
        "condition": row["condition"],
        "status": row["status"],
        "images": json.loads(row["images"] or "[]"),
        "sellerName": row["seller_name"],
        "sellerContact": row["seller_contact"] or "",
        "sellerLocation": row["seller_location"] or "",
        "createdAt": row["created_at"],
        "views": row["views"] or 0,
        "tags": json.loads(row["tags"] or "[]"),
        "isFeatured": bool(row["is_featured"]),
        "quantity": row["quantity"] or 1,
        "deliveryOption": row["delivery_option"],
        "shippingCost": row["shipping_cost"],
        "ecoImpactScore": row["eco_impact_score"] or 0,
        "reviews": reviews or [],
        "averageRating": avg,
        "negotiable": bool(row["negotiable"]),
    }


def _row_to_message(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row["id"],
        "conversationId": row["conversation_id"],
        "senderId": row["sender_id"],
        "senderName": row["sender_name"],
        "content": row["content"],
        "timestamp": row["created_at"],
        "read": bool(row["read"]),
        "type": row["type"],
        "productId": row["product_id"],
    }


def _row_to_conversation(row: dict[str, Any], last: dict[str, Any] | None, unread: int) -> dict[str, Any]:
    return {
        "id": row["id"],
        "participants": json.loads(row["participants"] or "[]"),
        "productId": row["product_id"],
        "productTitle": row["product_title"],
        "productImage": row["product_image"],
        "lastMessage": (last or {}).get("content"),
        "lastMessageTime": (last or {}).get("timestamp"),
        "unreadCount": unread,
        "createdAt": row["created_at"],
    }


def _row_to_scan(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row["id"],
        "timestamp": row["timestamp"],
        "source": row["source"],
        "wasteType": row["waste_type"],
        "wasteTypeConfidence": row["waste_type_confidence"] or 0,
        "binSuggestion": row["bin_suggestion"],
        "binConfidence": row["bin_confidence"] or 0,
        "imageUrl": row["image_url"] or "",
        "detections": json.loads(row["detections"] or "[]"),
    }


def _row_to_order(row: dict[str, Any], buyer_email: str | None = None) -> dict[str, Any]:
    items = json.loads(row["items"] or "[]")
    return {
        "id": row["id"],
        "orderNumber": row["order_number"] or row["id"],
        "buyerId": row["buyer_id"],
        "buyerName": row["buyer_name"],
        "customerEmail": buyer_email or "",
        "sellerId": row["seller_id"],
        "items": items,
        "total": row["total"],
        "status": row["status"],
        "paymentStatus": row["payment_status"],
        "trackingNumber": row["tracking_number"],
        "shippingAddress": row["shipping_address"] or "",
        "date": row["created_at"],
        "createdAt": row["created_at"],
    }


def _row_to_alert(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row["id"],
        "type": row["type"],
        "description": row["description"],
        "severity": row["severity"],
        "status": row["status"],
        "binId": row["bin_id"],
        "createdAt": row["created_at"],
    }


def _row_to_user(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row["id"],
        "email": row["email"],
        "name": row["name"],
        "role": row["role"],
        "accountType": row["account_type"],
        "department": row["department"],
        "employeeId": row["employee_id"],
        "phone": row["phone"],
        "address": row["address"],
        "verified": bool(row["verified"]),
        "ecoScore": row["eco_score"] or 0,
        "avatar": row["avatar"],
        "createdAt": row["created_at"],
    }


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------


def list_users() -> list[dict[str, Any]]:
    conn = get_conn()
    with _lock:
        rows = conn.execute("SELECT * FROM users ORDER BY created_at DESC").fetchall()
        return [_row_to_user(r) for r in rows]


def upsert_user(data: dict[str, Any]) -> dict[str, Any]:
    """Create or update a user by email. Returns the stored user dict."""
    conn = get_conn()
    with _lock:
        existing = conn.execute("SELECT id FROM users WHERE email = %s", (data.get("email"),)).fetchone()
        uid = existing["id"] if existing else data.get("id") or _uid()
        conn.execute(
            """
            INSERT INTO users (id, email, name, role, account_type, department, employee_id,
                               phone, address, verified, eco_score, avatar, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT(id) DO UPDATE SET
              email=excluded.email, name=excluded.name, role=excluded.role,
              account_type=excluded.account_type, department=excluded.department,
              employee_id=excluded.employee_id, phone=excluded.phone, address=excluded.address,
              verified=excluded.verified, eco_score=excluded.eco_score, avatar=excluded.avatar
            """,
            (
                uid,
                data.get("email", ""),
                data.get("name", ""),
                data.get("role", "marketplace"),
                data.get("accountType"),
                data.get("department"),
                data.get("employeeId"),
                data.get("phone"),
                data.get("address"),
                1 if data.get("verified") else 0,
                int(data.get("ecoScore") or 0),
                data.get("avatar"),
                data.get("createdAt") or _now(),
            ),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM users WHERE id = %s", (uid,)).fetchone()
        return _row_to_user(row)


# ---------------------------------------------------------------------------
# Products
# ---------------------------------------------------------------------------


def _product_reviews(conn: psycopg.Connection, product_id: str) -> list[dict[str, Any]]:
    rows = conn.execute("SELECT * FROM reviews WHERE product_id = %s ORDER BY created_at DESC", (product_id,)).fetchall()
    return [
        {
            "id": r["id"],
            "productId": r["product_id"],
            "userId": r["user_id"],
            "userName": r["user_name"],
            "rating": r["rating"],
            "comment": r["comment"],
            "createdAt": r["created_at"],
            "helpful": r["helpful"] or 0,
        }
        for r in rows
    ]


def list_products() -> list[dict[str, Any]]:
    conn = get_conn()
    with _lock:
        rows = conn.execute("SELECT * FROM products ORDER BY created_at DESC").fetchall()
        return [_row_to_product(r, _product_reviews(conn, r["id"])) for r in rows]


def get_product(product_id: str) -> dict[str, Any] | None:
    conn = get_conn()
    with _lock:
        row = conn.execute("SELECT * FROM products WHERE id = %s", (product_id,)).fetchone()
        if row is None:
            return None
        return _row_to_product(row, _product_reviews(conn, product_id))


def create_product(data: dict[str, Any]) -> dict[str, Any]:
    conn = get_conn()
    pid = data.get("id") or _uid()
    with _lock:
        conn.execute(
            """
            INSERT INTO products (id, title, description, price, original_price, category, condition,
                                  status, images, seller_name, seller_contact, seller_location, seller_id,
                                  created_at, views, tags, is_featured, quantity, delivery_option,
                                  shipping_cost, eco_impact_score, negotiable)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                pid,
                data.get("title", ""),
                data.get("description", ""),
                float(data.get("price", 0)),
                data.get("originalPrice"),
                data.get("category", "other"),
                data.get("condition", "new"),
                data.get("status", "available"),
                json.dumps(data.get("images") or []),
                data.get("sellerName", ""),
                data.get("sellerContact", ""),
                data.get("sellerLocation", ""),
                data.get("sellerId"),
                data.get("createdAt") or _now(),
                int(data.get("views") or 0),
                json.dumps(data.get("tags") or []),
                1 if data.get("isFeatured") else 0,
                int(data.get("quantity") or 1),
                data.get("deliveryOption", "both"),
                data.get("shippingCost"),
                int(data.get("ecoImpactScore") or 0),
                1 if data.get("negotiable") else 0,
            ),
        )
        conn.commit()
        return get_product(pid)  # type: ignore[return-value]


def update_product(product_id: str, updates: dict[str, Any]) -> dict[str, Any] | None:
    conn = get_conn()
    with _lock:
        row = conn.execute("SELECT * FROM products WHERE id = %s", (product_id,)).fetchone()
        if row is None:
            return None
        mapping = {
            "title": "title",
            "description": "description",
            "price": "price",
            "originalPrice": "original_price",
            "category": "category",
            "condition": "condition",
            "status": "status",
            "images": "images",
            "sellerName": "seller_name",
            "sellerContact": "seller_contact",
            "sellerLocation": "seller_location",
            "views": "views",
            "tags": "tags",
            "isFeatured": "is_featured",
            "quantity": "quantity",
            "deliveryOption": "delivery_option",
            "shippingCost": "shipping_cost",
            "ecoImpactScore": "eco_impact_score",
            "negotiable": "negotiable",
        }
        sets: list[str] = []
        params: list[Any] = []
        for key, col in mapping.items():
            if key in updates:
                val = updates[key]
                if key in ("images", "tags"):
                    val = json.dumps(val or [])
                elif key == "isFeatured":
                    val = 1 if val else 0
                elif key == "negotiable":
                    val = 1 if val else 0
                sets.append(f"{col} = %s")
                params.append(val)
        if sets:
            params.append(product_id)
            conn.execute(f"UPDATE products SET {', '.join(sets)} WHERE id = %s", params)
            conn.commit()
        return get_product(product_id)


def delete_product(product_id: str) -> bool:
    conn = get_conn()
    with _lock:
        cur = conn.execute("DELETE FROM products WHERE id = %s", (product_id,))
        conn.commit()
        return cur.rowcount > 0


def increment_product_views(product_id: str) -> dict[str, Any] | None:
    conn = get_conn()
    with _lock:
        conn.execute("UPDATE products SET views = views + 1 WHERE id = %s", (product_id,))
        conn.commit()
        return get_product(product_id)


def add_review(product_id: str, data: dict[str, Any]) -> dict[str, Any] | None:
    conn = get_conn()
    if get_product(product_id) is None:
        return None
    rid = _uid()
    with _lock:
        conn.execute(
            "INSERT INTO reviews (id, product_id, user_id, user_name, rating, comment, created_at, helpful) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, 0)",
            (
                rid,
                product_id,
                data.get("userId"),
                data.get("userName", "Anonymous"),
                int(data.get("rating", 5)),
                data.get("comment", ""),
                data.get("createdAt") or _now(),
            ),
        )
        conn.commit()
        return get_product(product_id)


def mark_review_helpful(review_id: str) -> dict[str, Any] | None:
    conn = get_conn()
    with _lock:
        conn.execute("UPDATE reviews SET helpful = helpful + 1 WHERE id = %s", (review_id,))
        conn.commit()
        row = conn.execute("SELECT product_id FROM reviews WHERE id = %s", (review_id,)).fetchone()
        if row is None:
            return None
        return get_product(row["product_id"])


# ---------------------------------------------------------------------------
# Orders
# ---------------------------------------------------------------------------


def list_orders(buyer_id: str | None = None, seller_id: str | None = None) -> list[dict[str, Any]]:
    conn = get_conn()
    with _lock:
        sql = "SELECT o.*, u.email AS buyer_email FROM orders o LEFT JOIN users u ON o.buyer_id = u.id"
        params: list[Any] = []
        if buyer_id:
            sql += " WHERE o.buyer_id = %s"
            params.append(buyer_id)
        elif seller_id:
            sql += " WHERE o.seller_id = %s"
            params.append(seller_id)
        sql += " ORDER BY o.created_at DESC"
        rows = conn.execute(sql, params).fetchall()
        return [_row_to_order(r, r["buyer_email"]) for r in rows]


def create_order(data: dict[str, Any]) -> dict[str, Any]:
    conn = get_conn()
    oid = data.get("id") or _uid()
    with _lock:
        conn.execute(
            "INSERT INTO orders (id, order_number, buyer_id, buyer_name, seller_id, items, total, status, "
            "payment_status, tracking_number, shipping_address, created_at) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
            (
                oid,
                data.get("orderNumber") or f"ECO-{oid[:8].upper()}",
                data.get("buyerId"),
                data.get("buyerName", ""),
                data.get("sellerId"),
                json.dumps(data.get("items") or []),
                float(data.get("total") or 0),
                data.get("status", "processing"),
                data.get("paymentStatus", "paid"),
                data.get("trackingNumber"),
                data.get("shippingAddress", ""),
                data.get("createdAt") or _now(),
            ),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM orders WHERE id = %s", (oid,)).fetchone()
        return _row_to_order(row)  # type: ignore[arg-type]


def delete_order(order_id: str) -> bool:
    conn = get_conn()
    with _lock:
        cur = conn.execute("DELETE FROM orders WHERE id = %s", (order_id,))
        conn.commit()
        return cur.rowcount > 0


def update_order(order_id: str, updates: dict[str, Any]) -> dict[str, Any] | None:
    conn = get_conn()
    with _lock:
        row = conn.execute("SELECT * FROM orders WHERE id = %s", (order_id,)).fetchone()
        if row is None:
            return None
        mapping = {
            "status": "status",
            "paymentStatus": "payment_status",
            "trackingNumber": "tracking_number",
            "shippingAddress": "shipping_address",
        }
        sets = [f"{col} = %s" for key, col in mapping.items() if key in updates]
        params = [updates[key] for key in mapping if key in updates]
        if sets:
            params.append(order_id)
            conn.execute(f"UPDATE orders SET {', '.join(sets)} WHERE id = %s", params)
            conn.commit()
        row = conn.execute("SELECT * FROM orders WHERE id = %s", (order_id,)).fetchone()
        return _row_to_order(row)  # type: ignore[arg-type]


# ---------------------------------------------------------------------------
# Messaging
# ---------------------------------------------------------------------------


def _conversation_last_and_unread(conn: psycopg.Connection, conv_id: str, user_id: str | None) -> tuple[dict[str, Any] | None, int]:
    last = conn.execute(
        "SELECT * FROM messages WHERE conversation_id = %s ORDER BY created_at DESC LIMIT 1",
        (conv_id,),
    ).fetchone()
    unread = 0
    if user_id:
        row = conn.execute(
            "SELECT COUNT(*) AS n FROM messages WHERE conversation_id = %s AND sender_id != %s AND read = 0",
            (conv_id, user_id),
        ).fetchone()
        unread = int(row["n"])
    return (_row_to_message(last) if last else None, unread)


def list_conversations(user_id: str) -> list[dict[str, Any]]:
    conn = get_conn()
    with _lock:
        rows = conn.execute(
            "SELECT * FROM conversations WHERE buyer_id = %s OR seller_id = %s ORDER BY created_at DESC",
            (user_id, user_id),
        ).fetchall()
        out = []
        for r in rows:
            last, unread = _conversation_last_and_unread(conn, r["id"], user_id)
            out.append(_row_to_conversation(r, last, unread))
        # Sort by last activity
        out.sort(
            key=lambda c: (c["lastMessageTime"] or c["createdAt"] or ""),
            reverse=True,
        )
        return out


def get_or_create_conversation(data: dict[str, Any]) -> dict[str, Any]:
    """Find an existing conversation between buyer/seller (optionally for a product)
    or create one. Returns the conversation dict with unread info for the buyer."""
    conn = get_conn()
    buyer_id = data.get("buyerId") or ""
    seller_id = data.get("sellerId") or ""
    product_id = data.get("productId")
    with _lock:
        if product_id:
            row = conn.execute(
                "SELECT * FROM conversations WHERE buyer_id = %s AND seller_id = %s AND product_id = %s LIMIT 1",
                (buyer_id, seller_id, product_id),
            ).fetchone()
        else:
            row = conn.execute(
                "SELECT * FROM conversations WHERE buyer_id = %s AND seller_id = %s LIMIT 1",
                (buyer_id, seller_id),
            ).fetchone()
        if row is None:
            cid = _uid()
            buyer_name = data.get("buyerName") or "You"
            seller_name = data.get("sellerName") or "Seller"
            participants = json.dumps(
                [
                    {"id": buyer_id, "name": buyer_name},
                    {"id": seller_id, "name": seller_name},
                ]
            )
            conn.execute(
                "INSERT INTO conversations (id, buyer_id, buyer_name, seller_id, seller_name, participants, "
                "product_id, product_title, product_image, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
                (
                    cid,
                    buyer_id,
                    buyer_name,
                    seller_id,
                    seller_name,
                    participants,
                    product_id,
                    data.get("productTitle"),
                    data.get("productImage"),
                    data.get("createdAt") or _now(),
                ),
            )
            conn.commit()
            row = conn.execute("SELECT * FROM conversations WHERE id = %s", (cid,)).fetchone()
        last, unread = _conversation_last_and_unread(conn, row["id"], buyer_id or None)
        return _row_to_conversation(row, last, unread)


def delete_conversation(conv_id: str) -> bool:
    conn = get_conn()
    with _lock:
        conn.execute("DELETE FROM messages WHERE conversation_id = %s", (conv_id,))
        cur = conn.execute("DELETE FROM conversations WHERE id = %s", (conv_id,))
        conn.commit()
        return cur.rowcount > 0


def list_messages(conv_id: str) -> list[dict[str, Any]]:
    conn = get_conn()
    with _lock:
        rows = conn.execute(
            "SELECT * FROM messages WHERE conversation_id = %s ORDER BY created_at ASC",
            (conv_id,),
        ).fetchall()
        return [_row_to_message(r) for r in rows]


def send_message(conv_id: str, data: dict[str, Any]) -> dict[str, Any] | None:
    conn = get_conn()
    with _lock:
        row = conn.execute("SELECT id FROM conversations WHERE id = %s", (conv_id,)).fetchone()
        if row is None:
            return None
        mid = _uid()
        conn.execute(
            "INSERT INTO messages (id, conversation_id, sender_id, sender_name, content, type, product_id, read, created_at) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, 0, %s)",
            (
                mid,
                conv_id,
                data.get("senderId", ""),
                data.get("senderName", ""),
                data.get("content", ""),
                data.get("type", "text"),
                data.get("productId"),
                data.get("createdAt") or _now(),
            ),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM messages WHERE id = %s", (mid,)).fetchone()
        return _row_to_message(row)  # type: ignore[arg-type]


def mark_conversation_read(conv_id: str, user_id: str) -> int:
    """Mark all messages from the other participant as read. Returns remaining unread count."""
    conn = get_conn()
    with _lock:
        conn.execute(
            "UPDATE messages SET read = 1 WHERE conversation_id = %s AND sender_id != %s AND read = 0",
            (conv_id, user_id),
        )
        conn.commit()
        row = conn.execute(
            "SELECT COUNT(*) AS n FROM messages WHERE conversation_id = %s AND sender_id != %s AND read = 0",
            (conv_id, user_id),
        ).fetchone()
        return int(row["n"])


# ---------------------------------------------------------------------------
# Scans
# ---------------------------------------------------------------------------


def list_scans(user_id: str | None = None, limit: int = 200) -> list[dict[str, Any]]:
    conn = get_conn()
    with _lock:
        if user_id:
            rows = conn.execute(
                "SELECT * FROM scans WHERE user_id = %s ORDER BY timestamp DESC LIMIT %s",
                (user_id, limit),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM scans ORDER BY timestamp DESC LIMIT %s",
                (limit,),
            ).fetchall()
        return [_row_to_scan(r) for r in rows]


def create_scan(data: dict[str, Any]) -> dict[str, Any]:
    conn = get_conn()
    sid = data.get("id") or _uid()
    with _lock:
        conn.execute(
            "INSERT INTO scans (id, user_id, timestamp, source, waste_type, waste_type_confidence, "
            "bin_suggestion, bin_confidence, image_url, detections) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
            (
                sid,
                data.get("userId"),
                int(data.get("timestamp") or 0),
                data.get("source", "upload"),
                data.get("wasteType", ""),
                float(data.get("wasteTypeConfidence") or 0),
                data.get("binSuggestion", "landfill"),
                float(data.get("binConfidence") or 0),
                data.get("imageUrl", ""),
                json.dumps(data.get("detections") or []),
            ),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM scans WHERE id = %s", (sid,)).fetchone()
        return _row_to_scan(row)  # type: ignore[arg-type]


def clear_scans() -> int:
    conn = get_conn()
    with _lock:
        cur = conn.execute("DELETE FROM scans")
        conn.commit()
        return cur.rowcount


# ---------------------------------------------------------------------------
# Alerts
# ---------------------------------------------------------------------------


def list_alerts(limit: int = 100) -> list[dict[str, Any]]:
    conn = get_conn()
    with _lock:
        rows = conn.execute(
            "SELECT * FROM alerts ORDER BY created_at DESC LIMIT %s",
            (limit,),
        ).fetchall()
        return [_row_to_alert(r) for r in rows]


def create_alert(data: dict[str, Any]) -> dict[str, Any]:
    conn = get_conn()
    aid = _uid()
    with _lock:
        conn.execute(
            "INSERT INTO alerts (id, type, description, severity, status, bin_id, created_at) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s)",
            (
                aid,
                data.get("type", "info"),
                data.get("description", ""),
                data.get("severity", "info"),
                data.get("status", "open"),
                data.get("binId"),
                data.get("createdAt") or _now(),
            ),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM alerts WHERE id = %s", (aid,)).fetchone()
        return _row_to_alert(row)  # type: ignore[arg-type]


def update_alert(alert_id: str, updates: dict[str, Any]) -> dict[str, Any] | None:
    conn = get_conn()
    with _lock:
        row = conn.execute("SELECT * FROM alerts WHERE id = %s", (alert_id,)).fetchone()
        if row is None:
            return None
        mapping = {"type": "type", "description": "description", "severity": "severity", "status": "status", "binId": "bin_id"}
        sets = [f"{col} = %s" for key, col in mapping.items() if key in updates]
        params = [updates[key] for key in mapping if key in updates]
        if sets:
            params.append(alert_id)
            conn.execute(f"UPDATE alerts SET {', '.join(sets)} WHERE id = %s", params)
            conn.commit()
        row = conn.execute("SELECT * FROM alerts WHERE id = %s", (alert_id,)).fetchone()
        return _row_to_alert(row)  # type: ignore[arg-type]


# ---------------------------------------------------------------------------
# Seed data (mirrors the demo data the UI previously held in localStorage)
# ---------------------------------------------------------------------------


def seed_database() -> dict[str, int]:
    conn = get_conn()
    with _lock:
        _exec_script(
            conn,
            """
            DELETE FROM reviews;
            DELETE FROM messages;
            DELETE FROM conversations;
            DELETE FROM orders;
            DELETE FROM products;
            DELETE FROM scans;
            DELETE FROM alerts;
            DELETE FROM users;
            """,
        )

        users = [
            ("gov-1", "admin@ecosort.gov", "John Administrator", "government", None, "Waste Management", "GOV-2024-001", None, None, 1, 0, None),
            ("gov-2", "officer@ecosort.gov", "Sarah Officer", "government", None, "Environmental Services", "GOV-2024-002", None, None, 1, 0, None),
            ("mp-1", "seller@ecomarket.com", "Green Goods Store", "marketplace", "seller", None, None, "+1 234 567 8900", "123 Eco Street, Green City", 1, 92, None),
            ("mp-2", "buyer@ecomarket.com", "Emma Green", "marketplace", "buyer", None, None, "+1 234 567 8901", None, 1, 78, None),
        ]
        for u in users:
            conn.execute(
                "INSERT INTO users (id, email, name, role, account_type, department, employee_id, phone, address, verified, eco_score, avatar, created_at) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
                (*u, _iso_ago(days=200)),
            )

        products = [
            {
                "id": "prod-1",
                "title": "Recycled Plastic Planter Set",
                "description": "Beautiful set of 3 planters made from 100% recycled ocean plastic. Each planter is unique and helps reduce ocean pollution. Perfect for indoor plants and succulents.",
                "price": 899,
                "originalPrice": 1299,
                "category": "recycled-plastic",
                "condition": "new",
                "images": [
                    "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=500&h=500&fit=crop",
                    "https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=500&h=500&fit=crop",
                ],
                "seller_name": "Green Crafts Chennai",
                "seller_contact": "greencrafts@email.com",
                "seller_location": "Chennai, TN",
                "created_at": _iso_ago(days=2),
                "views": 156,
                "tags": ["eco-friendly", "handmade", "ocean-plastic", "planters"],
                "is_featured": 1,
                "quantity": 15,
                "delivery_option": "both",
                "shipping_cost": 99,
                "eco_impact_score": 92,
                "negotiable": 0,
            },
            {
                "id": "prod-2",
                "title": "Refurbished Laptop Stand - Bamboo",
                "description": "Ergonomic laptop stand made from sustainable bamboo and recycled aluminum. Adjustable to 6 heights. Helps reduce neck strain while working.",
                "price": 1499,
                "originalPrice": 2499,
                "category": "refurbished-electronics",
                "condition": "like-new",
                "images": ["https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500&h=500&fit=crop"],
                "seller_name": "Eco Electronics Hub",
                "seller_contact": "+91 98765 43210",
                "seller_location": "Bangalore, KA",
                "created_at": _iso_ago(days=5),
                "views": 89,
                "tags": ["laptop-stand", "bamboo", "ergonomic", "sustainable"],
                "is_featured": 1,
                "quantity": 8,
                "delivery_option": "shipping",
                "shipping_cost": 0,
                "eco_impact_score": 78,
                "negotiable": 1,
            },
            {
                "id": "prod-3",
                "title": "Upcycled Denim Tote Bag",
                "description": "Handcrafted tote bag made from upcycled denim jeans. Spacious main compartment with inner pockets. Each bag is one-of-a-kind!",
                "price": 599,
                "category": "eco-fashion",
                "condition": "new",
                "images": ["https://images.unsplash.com/photo-1544816155-12df9643f363?w=500&h=500&fit=crop"],
                "seller_name": "Stitch & Save",
                "seller_contact": "stitchsave@email.com",
                "seller_location": "Mumbai, MH",
                "created_at": _iso_ago(days=3),
                "views": 234,
                "tags": ["tote-bag", "upcycled", "denim", "handmade"],
                "is_featured": 0,
                "quantity": 25,
                "delivery_option": "both",
                "shipping_cost": 49,
                "eco_impact_score": 88,
                "negotiable": 1,
            },
            {
                "id": "prod-4",
                "title": "Organic Vermicompost - 5kg",
                "description": "Premium quality vermicompost made from organic kitchen waste. Rich in nutrients, perfect for home gardens and potted plants.",
                "price": 299,
                "category": "organic-compost",
                "condition": "new",
                "images": ["https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=500&h=500&fit=crop"],
                "seller_name": "Urban Composters",
                "seller_contact": "urbancompost@email.com",
                "seller_location": "Delhi, DL",
                "created_at": _iso_ago(days=1),
                "views": 67,
                "tags": ["compost", "organic", "gardening", "vermicompost"],
                "is_featured": 0,
                "quantity": 50,
                "delivery_option": "pickup",
                "shipping_cost": None,
                "eco_impact_score": 95,
                "negotiable": 0,
            },
            {
                "id": "prod-5",
                "title": "Pre-owned Kindle Paperwhite",
                "description": "Well-maintained Kindle Paperwhite (2021 model). Includes original charger and a leather case. Battery life is excellent.",
                "price": 6999,
                "originalPrice": 13999,
                "category": "pre-owned",
                "condition": "good",
                "images": ["https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&h=500&fit=crop"],
                "seller_name": "Tech Resale",
                "seller_contact": "+91 87654 32109",
                "seller_location": "Hyderabad, TS",
                "created_at": _iso_ago(days=7),
                "views": 312,
                "tags": ["kindle", "e-reader", "pre-owned", "electronics"],
                "is_featured": 1,
                "quantity": 1,
                "delivery_option": "shipping",
                "shipping_cost": 0,
                "eco_impact_score": 72,
                "negotiable": 1,
            },
        ]
        for p in products:
            conn.execute(
                "INSERT INTO products (id, title, description, price, original_price, category, condition, status, "
                "images, seller_name, seller_contact, seller_location, seller_id, created_at, views, tags, "
                "is_featured, quantity, delivery_option, shipping_cost, eco_impact_score, negotiable) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, 'available', %s, %s, %s, %s, NULL, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
                (
                    p["id"], p["title"], p["description"], p["price"], p.get("originalPrice"), p["category"],
                    p["condition"], json.dumps(p["images"]), p["seller_name"], p["seller_contact"],
                    p["seller_location"], p["created_at"], p["views"], json.dumps(p["tags"]),
                    p["is_featured"], p["quantity"], p["delivery_option"], p.get("shipping_cost"),
                    p["eco_impact_score"], p["negotiable"],
                ),
            )

        reviews = [
            ("rev-1", "prod-1", "user-2", "Priya M", 5, "Absolutely love these planters! Great quality and knowing they're made from ocean plastic makes it even better.", _iso_ago(days=1), 12),
            ("rev-2", "prod-2", "user-3", "Rahul K", 4, "Good quality stand. Shipping was fast and it was well packaged.", _iso_ago(days=2), 5),
            ("rev-3", "prod-4", "user-4", "Anita S", 5, "My plants are thriving with this compost! Will definitely buy again.", _iso_ago(hours=12), 8),
        ]
        for r in reviews:
            conn.execute(
                "INSERT INTO reviews (id, product_id, user_id, user_name, rating, comment, created_at, helpful) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
                r,
            )

        conversations = [
            (
                "conv-1", "mp-2", "Emma Green", "seller-1", "Green Crafts Chennai",
                json.dumps([{"id": "mp-2", "name": "Emma Green"}, {"id": "seller-1", "name": "Green Crafts Chennai"}]),
                "prod-1", "Recycled Plastic Planter Set",
                "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=100&h=100&fit=crop",
                _iso_ago(days=1),
            ),
            (
                "conv-2", "mp-2", "Emma Green", "seller-2", "Eco Electronics Hub",
                json.dumps([{"id": "mp-2", "name": "Emma Green"}, {"id": "seller-2", "name": "Eco Electronics Hub"}]),
                "prod-2", "Refurbished Laptop Stand",
                None,
                _iso_ago(days=2),
            ),
            (
                "conv-3", "buyer-1", "Aarav Patel", "mp-1", "Green Goods Store",
                json.dumps([{"id": "buyer-1", "name": "Aarav Patel"}, {"id": "mp-1", "name": "Green Goods Store"}]),
                None,
                None,
                None,
                _iso_ago(hours=6),
            ),
        ]
        for c in conversations:
            conn.execute(
                "INSERT INTO conversations (id, buyer_id, buyer_name, seller_id, seller_name, participants, "
                "product_id, product_title, product_image, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
                c,
            )

        messages = [
            ("msg-1-1", "conv-1", "mp-2", "Emma Green", "Hi! I'm interested in the Recycled Plastic Planter Set. Is it still available?", "text", None, 1, _iso_ago(hours=1)),
            ("msg-1-2", "conv-1", "seller-1", "Green Crafts Chennai", "Yes, the planters are still available! Would you like to place an order?", "text", None, 0, _iso_ago(minutes=30)),
            ("msg-2-1", "conv-2", "mp-2", "Emma Green", "Hello, can you tell me more about the laptop stand?", "text", None, 1, _iso_ago(hours=3)),
            ("msg-2-2", "conv-2", "seller-2", "Eco Electronics Hub", "It's made from recycled aluminum and bamboo. Very sturdy and adjustable to 6 different heights.", "text", None, 1, _iso_ago(hours=2, minutes=30)),
            ("msg-2-3", "conv-2", "mp-2", "Emma Green", "That sounds great! What about shipping?", "text", None, 1, _iso_ago(hours=2, minutes=12)),
            ("msg-2-4", "conv-2", "seller-2", "Eco Electronics Hub", "I can offer free shipping if you order today.", "text", None, 1, _iso_ago(hours=2)),
            ("msg-3-1", "conv-3", "buyer-1", "Aarav Patel", "Hi, do you deliver the upcycled tote bags to Pune?", "text", None, 1, _iso_ago(hours=7)),
            ("msg-3-2", "conv-3", "mp-1", "Green Goods Store", "Yes! We ship all over India. Standard delivery is 3-5 business days.", "text", None, 1, _iso_ago(hours=6, minutes=40)),
            ("msg-3-3", "conv-3", "buyer-1", "Aarav Patel", "Perfect, I'll place an order soon. Thanks!", "text", None, 0, _iso_ago(hours=6)),
        ]
        for m in messages:
            conn.execute(
                "INSERT INTO messages (id, conversation_id, sender_id, sender_name, content, type, product_id, read, created_at) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
                m,
            )

        # Sample orders so the buyer Orders + seller Sales Orders pages have real data.
        seed_orders = [
            (
                "ord-1", "ECO-2026-001", "mp-2", "Emma Green", "mp-1",
                json.dumps([
                    {"id": "prod-3", "name": "Upcycled Denim Tote Bag", "image": "https://images.unsplash.com/photo-1544816155-12df9643f363?w=200", "quantity": 1, "price": 599, "seller": "Green Goods Store"},
                ]),
                599.0, "delivered", "paid", "TRK776543210", "12 Green Avenue, Pune, MH", _iso_ago(days=4),
            ),
            (
                "ord-2", "ECO-2026-002", "buyer-2", "Riya Sharma", None,
                json.dumps([
                    {"id": "prod-1", "name": "Recycled Plastic Planter Set", "image": "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=200", "quantity": 1, "price": 899, "seller": "Green Crafts Chennai"},
                ]),
                998.0, "shipped", "paid", "TRK112233445", "45 Eco Road, Jaipur, RJ", _iso_ago(days=2),
            ),
            (
                "ord-3", "ECO-2026-003", "buyer-3", "Kabir Mehta", None,
                json.dumps([
                    {"id": "prod-2", "name": "Refurbished Laptop Stand - Bamboo", "image": "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=200", "quantity": 1, "price": 1499, "seller": "Eco Electronics Hub"},
                ]),
                1499.0, "processing", "paid", None, "78 Green Park, Kochi, KL", _iso_ago(days=1),
            ),
        ]
        for o in seed_orders:
            conn.execute(
                "INSERT INTO orders (id, order_number, buyer_id, buyer_name, seller_id, items, total, status, "
                "payment_status, tracking_number, shipping_address, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
                o,
            )

        # A few sample scans so the dashboard/reports have real data to work with.
        sample_scans = [
            ("scan-1", "mp-2", "plastic", 0.93, "plastic", 0.91),
            ("scan-2", "mp-2", "glass", 0.88, "glass", 0.85),
            ("scan-3", "mp-2", "compost", 0.9, "compost", 0.87),
            ("scan-4", "mp-2", "plastic", 0.61, "landfill", 0.55),
            ("scan-5", "mp-2", "glass", 0.95, "glass", 0.93),
        ]
        for i, (sid, user, wt, wtc, bin_s, bc) in enumerate(sample_scans):
            conn.execute(
                "INSERT INTO scans (id, user_id, timestamp, source, waste_type, waste_type_confidence, "
                "bin_suggestion, bin_confidence, image_url, detections) VALUES (%s, %s, %s, 'upload', %s, %s, %s, %s, '', '[]')",
                (sid, user, int((datetime.now(timezone.utc) - timedelta(hours=i * 26)).timestamp() * 1000), wt, wtc, bin_s, bc),
            )

        alerts = [
            ("alert-1", "contamination", "Plastic bottle detected in compost bin", "medium", "open", "bin-3", _iso_ago(hours=5)),
            ("alert-2", "overflow", "Bin near Market Road is at 92% capacity", "high", "open", "bin-1", _iso_ago(hours=9)),
            ("alert-3", "contamination", "Glass jar placed in landfill bin", "medium", "resolved", "bin-2", _iso_ago(days=1)),
        ]
        for a in alerts:
            conn.execute(
                "INSERT INTO alerts (id, type, description, severity, status, bin_id, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s)",
                a,
            )

        conn.commit()

    return {
        "users": len(users),
        "products": len(products),
        "reviews": len(reviews),
        "orders": len(seed_orders),
        "conversations": len(conversations),
        "messages": len(messages),
        "scans": len(sample_scans),
        "alerts": len(alerts),
    }


def is_seeded() -> bool:
    conn = get_conn()
    with _lock:
        row = conn.execute("SELECT COUNT(*) AS n FROM products").fetchone()
        return int(row["n"]) > 0
