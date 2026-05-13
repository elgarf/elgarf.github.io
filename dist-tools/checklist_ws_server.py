from __future__ import annotations

import argparse
import asyncio
import json
import logging
import ssl
from collections import defaultdict
from dataclasses import dataclass
from typing import Any
from urllib import error as urlerror
from urllib import parse as urlparse
from urllib import request as urlrequest

from websockets.asyncio.server import ServerConnection, serve
from websockets.exceptions import ConnectionClosed

SCHEMA_VERSION = 1


@dataclass
class ClientContext:
    ws: ServerConnection
    checklist_guid: str
    client_id: str


CHECKLIST_STATE: dict[str, dict[str, Any]] = defaultdict(dict)
SUBSCRIBERS: dict[str, set[ServerConnection]] = defaultdict(set)
CONTEXT_BY_SOCKET: dict[ServerConnection, ClientContext] = {}
STATE_LOCK = asyncio.Lock()
PROJECT_STORE_URL = "https://static.93.189.179.185.ip.webhost1.net/project_store.php"
SAVE_DEBOUNCE_SEC = 0.35
PERSIST_TASKS: dict[str, asyncio.Task[None]] = {}
LOG = logging.getLogger("checklist-ws")


async def send_json(ws: ServerConnection, payload: dict[str, Any]) -> None:
    if "schemaVersion" not in payload:
        payload["schemaVersion"] = SCHEMA_VERSION
    await ws.send(json.dumps(payload, ensure_ascii=False, separators=(",", ":")))


async def broadcast_except(
    checklist_guid: str,
    payload: dict[str, Any],
    sender: ServerConnection | None = None,
) -> None:
    subscribers = list(SUBSCRIBERS.get(checklist_guid, set()))
    if not subscribers:
        return

    if "schemaVersion" not in payload:
        payload["schemaVersion"] = SCHEMA_VERSION
    encoded = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    stale: list[ServerConnection] = []
    for ws in subscribers:
        if sender is not None and ws == sender:
            continue
        try:
            await ws.send(encoded)
        except Exception:
            stale.append(ws)

    if stale:
        async with STATE_LOCK:
            for dead in stale:
                SUBSCRIBERS[checklist_guid].discard(dead)
                CONTEXT_BY_SOCKET.pop(dead, None)


def _http_get_json(url: str, timeout_sec: float = 8.0) -> dict[str, Any] | None:
    try:
        req = urlrequest.Request(url, method="GET")
        with urlrequest.urlopen(req, timeout=timeout_sec) as resp:
            body = resp.read().decode("utf-8", errors="replace")
        data = json.loads(body)
        return data if isinstance(data, dict) else None
    except (urlerror.URLError, TimeoutError, ValueError, OSError):
        return None


def _http_post_json(url: str, payload: dict[str, Any], timeout_sec: float = 8.0) -> dict[str, Any] | None:
    try:
        encoded = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        req = urlrequest.Request(
            url,
            data=encoded,
            method="POST",
            headers={"Content-Type": "application/json"},
        )
        with urlrequest.urlopen(req, timeout=timeout_sec) as resp:
            body = resp.read().decode("utf-8", errors="replace")
        data = json.loads(body)
        return data if isinstance(data, dict) else None
    except (urlerror.URLError, TimeoutError, ValueError, OSError):
        return None


def normalize_checklist_state(raw: Any) -> dict[str, Any]:
    parsed = raw if isinstance(raw, dict) else {}
    meta_raw = parsed.get("__meta") if isinstance(parsed.get("__meta"), dict) else {}
    revision = max(0, int(meta_raw.get("revision", 0) or 0))
    updated_at = str(meta_raw.get("updatedAt", "") or "").strip()
    def _collect_checks(map_obj: Any) -> dict[str, bool]:
        out: dict[str, bool] = {}
        if not isinstance(map_obj, dict):
            return out
        for k, v in map_obj.items():
            key = str(k or "").strip()
            if not key or key in {"checks", "customItems", "__checks", "__customItems"}:
                continue
            out[key] = bool(v)
        return out

    if "__checks" in parsed or "__customItems" in parsed:
        checks_raw = parsed.get("__checks")
        custom_raw = parsed.get("__customItems")
        checks = checks_raw if isinstance(checks_raw, dict) else {}
        custom_items = custom_raw if isinstance(custom_raw, list) else []
        merged_checks = _collect_checks(checks.get("checks")) if isinstance(checks, dict) else {}
        merged_checks.update(_collect_checks(checks))
        return {
            "__checks": merged_checks,
            "__customItems": [
                {"id": str(it.get("id", "")).strip(), "text": str(it.get("text", "")).strip()}
                for it in custom_items
                if isinstance(it, dict) and str(it.get("id", "")).strip() and str(it.get("text", "")).strip()
            ],
            "__meta": {"revision": revision, "updatedAt": updated_at},
        }
    # Legacy flat format: key -> bool
    if "checks" in parsed and isinstance(parsed.get("checks"), dict):
        return {
            "__checks": _collect_checks(parsed.get("checks")),
            "__customItems": [
                {"id": str(it.get("id", "")).strip(), "text": str(it.get("text", "")).strip()}
                for it in (parsed.get("customItems") if isinstance(parsed.get("customItems"), list) else [])
                if isinstance(it, dict) and str(it.get("id", "")).strip() and str(it.get("text", "")).strip()
            ],
            "__meta": {"revision": revision, "updatedAt": updated_at},
        }
    return {"__checks": _collect_checks(parsed), "__customItems": [], "__meta": {"revision": revision, "updatedAt": updated_at}}


def get_state_revision(state: dict[str, Any]) -> int:
    meta = state.get("__meta")
    if not isinstance(meta, dict):
        return 0
    try:
        return max(0, int(meta.get("revision", 0) or 0))
    except (TypeError, ValueError):
        return 0


def bump_state_revision(state: dict[str, Any]) -> dict[str, Any]:
    from datetime import datetime, timezone

    normalized = normalize_checklist_state(state)
    normalized["__meta"] = {
        "revision": get_state_revision(normalized) + 1,
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    }
    return normalized


async def load_checklist_state_from_store(checklist_guid: str) -> dict[str, Any] | None:
    query = urlparse.urlencode({"checklist_guid": checklist_guid})
    url = f"{PROJECT_STORE_URL}?{query}"
    data = await asyncio.to_thread(_http_get_json, url)
    if not data or data.get("ok") is not True:
        return None
    checklist_obj = data.get("checklist")
    if not isinstance(checklist_obj, dict):
        return None
    raw = checklist_obj.get("checklist_json", "{}")
    try:
        parsed = json.loads(str(raw))
    except ValueError:
        return None
    if not isinstance(parsed, dict):
        return None
    return normalize_checklist_state(parsed)


async def persist_checklist_state_to_store(checklist_guid: str, state: dict[str, Any]) -> bool:
    payload: dict[str, Any] = {
        "checklistGuid": checklist_guid,
        "checklistData": state,
    }
    data = await asyncio.to_thread(_http_post_json, PROJECT_STORE_URL, payload)
    return bool(data and data.get("ok") is True)


async def schedule_persist(checklist_guid: str) -> None:
    async with STATE_LOCK:
        prev = PERSIST_TASKS.get(checklist_guid)
        if prev and not prev.done():
            prev.cancel()

        async def _persist_later() -> None:
            try:
                await asyncio.sleep(SAVE_DEBOUNCE_SEC)
                async with STATE_LOCK:
                    snapshot = dict(CHECKLIST_STATE.get(checklist_guid, {}))
                await persist_checklist_state_to_store(checklist_guid, snapshot)
            except asyncio.CancelledError:
                return
            finally:
                async with STATE_LOCK:
                    if PERSIST_TASKS.get(checklist_guid) is task:
                        PERSIST_TASKS.pop(checklist_guid, None)

        task = asyncio.create_task(_persist_later())
        PERSIST_TASKS[checklist_guid] = task


async def register_subscription(
    ws: ServerConnection,
    checklist_guid: str,
    client_id: str,
) -> None:
    must_load_from_store = False
    async with STATE_LOCK:
        if checklist_guid not in CHECKLIST_STATE:
            CHECKLIST_STATE[checklist_guid] = {}
            must_load_from_store = True
        prev = CONTEXT_BY_SOCKET.get(ws)
        if prev and prev.checklist_guid != checklist_guid:
            SUBSCRIBERS[prev.checklist_guid].discard(ws)
        SUBSCRIBERS[checklist_guid].add(ws)
        CONTEXT_BY_SOCKET[ws] = ClientContext(ws=ws, checklist_guid=checklist_guid, client_id=client_id)
        snapshot = dict(CHECKLIST_STATE[checklist_guid])

    if must_load_from_store:
        from_store = await load_checklist_state_from_store(checklist_guid)
        if from_store is not None:
            async with STATE_LOCK:
                CHECKLIST_STATE[checklist_guid] = dict(from_store)
                snapshot = dict(from_store)

    await send_json(
        ws,
        {
            "type": "init_state",
            "checklistGuid": checklist_guid,
            "state": snapshot,
        },
    )
    LOG.info("subscribe guid=%s client=%s remote=%s", checklist_guid, client_id, getattr(ws, "remote_address", None))


async def handle_checkbox_update(
    ws: ServerConnection,
    checklist_guid: str,
    key: str,
    checked: bool,
    client_id: str,
) -> None:
    updated_state: dict[str, Any]
    async with STATE_LOCK:
        if ws not in SUBSCRIBERS[checklist_guid]:
            SUBSCRIBERS[checklist_guid].add(ws)
            CONTEXT_BY_SOCKET[ws] = ClientContext(ws=ws, checklist_guid=checklist_guid, client_id=client_id)
        current = normalize_checklist_state(CHECKLIST_STATE.get(checklist_guid, {}))
        checks = current.get("__checks")
        if not isinstance(checks, dict):
            checks = {}
            current["__checks"] = checks
        checks[key] = checked
        updated_state = bump_state_revision(current)
        CHECKLIST_STATE[checklist_guid] = updated_state
    await schedule_persist(checklist_guid)

    await broadcast_except(
        checklist_guid,
        {
            "type": "checkbox_update",
            "checklistGuid": checklist_guid,
            "key": key,
            "checked": checked,
            "clientId": client_id,
            "revision": get_state_revision(updated_state),
        },
        sender=ws,
    )


async def handle_state_replace(
    ws: ServerConnection,
    checklist_guid: str,
    state: dict[str, Any],
    client_id: str,
) -> None:
    normalized = normalize_checklist_state(state)
    incoming_revision = get_state_revision(normalized)
    accepted = False
    current_revision = 0
    async with STATE_LOCK:
        if ws not in SUBSCRIBERS[checklist_guid]:
            SUBSCRIBERS[checklist_guid].add(ws)
            CONTEXT_BY_SOCKET[ws] = ClientContext(ws=ws, checklist_guid=checklist_guid, client_id=client_id)
        current = normalize_checklist_state(CHECKLIST_STATE.get(checklist_guid, {}))
        current_revision = get_state_revision(current)
        if incoming_revision > current_revision:
            CHECKLIST_STATE[checklist_guid] = normalized
            accepted = True
    if not accepted:
        await send_json(
            ws,
            {
                "type": "state_rejected",
                "checklistGuid": checklist_guid,
                "reason": "stale_revision",
                "currentRevision": current_revision,
                "incomingRevision": incoming_revision,
            },
        )
        return
    await schedule_persist(checklist_guid)
    await broadcast_except(
        checklist_guid,
        {
            "type": "state_replace",
            "checklistGuid": checklist_guid,
            "state": normalized,
            "clientId": client_id,
            "revision": incoming_revision,
        },
        sender=ws,
    )


def as_non_empty_str(value: Any) -> str:
    return str(value or "").strip()


async def handle_message(ws: ServerConnection, raw_message: str) -> None:
    try:
        payload = json.loads(raw_message)
    except json.JSONDecodeError:
        await send_json(ws, {"type": "error", "message": "Invalid JSON"})
        return

    if not isinstance(payload, dict):
        await send_json(ws, {"type": "error", "message": "Message must be object"})
        return

    message_type = as_non_empty_str(payload.get("type"))
    schema_version = int(payload.get("schemaVersion", 0) or 0)
    checklist_guid = as_non_empty_str(payload.get("checklistGuid"))
    client_id = as_non_empty_str(payload.get("clientId")) or "anon"

    if schema_version != SCHEMA_VERSION:
        await send_json(ws, {"type": "error", "message": f"Unsupported schemaVersion: {schema_version}"})
        return

    if not checklist_guid:
        await send_json(ws, {"type": "error", "message": "Missing checklistGuid"})
        return

    if message_type == "subscribe":
        await register_subscription(ws, checklist_guid, client_id)
        return

    if message_type == "checkbox_update":
        key = as_non_empty_str(payload.get("key"))
        if not key:
            await send_json(ws, {"type": "error", "message": "Missing key"})
            return
        checked = bool(payload.get("checked"))
        await handle_checkbox_update(ws, checklist_guid, key, checked, client_id)
        return

    if message_type == "state_replace":
        raw_state = payload.get("state")
        if not isinstance(raw_state, dict):
            await send_json(ws, {"type": "error", "message": "Missing state object"})
            return
        await handle_state_replace(ws, checklist_guid, raw_state, client_id)
        return

    if message_type == "unsubscribe":
        await handle_unsubscribe(ws, checklist_guid)
        return

    await send_json(ws, {"type": "error", "message": f"Unknown type: {message_type}"})


async def unregister(ws: ServerConnection) -> None:
    async with STATE_LOCK:
        context = CONTEXT_BY_SOCKET.pop(ws, None)
        if not context:
            return
        subs = SUBSCRIBERS.get(context.checklist_guid)
        if subs is not None:
            subs.discard(ws)
            if not subs:
                SUBSCRIBERS.pop(context.checklist_guid, None)


async def handle_unsubscribe(ws: ServerConnection, checklist_guid: str) -> None:
    async with STATE_LOCK:
        SUBSCRIBERS[checklist_guid].discard(ws)
        context = CONTEXT_BY_SOCKET.get(ws)
        if context and context.checklist_guid == checklist_guid:
            CONTEXT_BY_SOCKET.pop(ws, None)
        if checklist_guid in SUBSCRIBERS and not SUBSCRIBERS[checklist_guid]:
            SUBSCRIBERS.pop(checklist_guid, None)
    LOG.info("unsubscribe guid=%s remote=%s", checklist_guid, getattr(ws, "remote_address", None))


async def connection_handler(ws: ServerConnection) -> None:
    LOG.info("connection_open remote=%s path=%s", getattr(ws, "remote_address", None), getattr(getattr(ws, "request", None), "path", ""))
    try:
        async for message in ws:
            if isinstance(message, str):
                await handle_message(ws, message)
    except ConnectionClosed as exc:
        ctx = CONTEXT_BY_SOCKET.get(ws)
        code = getattr(exc, "code", None)
        reason = getattr(exc, "reason", "")
        close_type = exc.__class__.__name__
        if int(code or 0) == 1006:
            LOG.warning(
                "connection_closed_abnormal code=1006 guid=%s client=%s remote=%s type=%s reason=%s",
                getattr(ctx, "checklist_guid", ""),
                getattr(ctx, "client_id", ""),
                getattr(ws, "remote_address", None),
                close_type,
                reason,
            )
        else:
            LOG.info(
                "connection_closed code=%s guid=%s client=%s remote=%s type=%s reason=%s",
                code,
                getattr(ctx, "checklist_guid", ""),
                getattr(ctx, "client_id", ""),
                getattr(ws, "remote_address", None),
                close_type,
                reason,
            )
    finally:
        await unregister(ws)
        LOG.info("connection_cleanup remote=%s", getattr(ws, "remote_address", None))


async def run_server(host: str, port: int, certfile: str | None = None, keyfile: str | None = None) -> None:
    ssl_ctx: ssl.SSLContext | None = None
    if certfile and keyfile:
        ssl_ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        ssl_ctx.load_cert_chain(certfile=certfile, keyfile=keyfile)

    async with serve(connection_handler, host, port, ssl=ssl_ctx, ping_interval=20, ping_timeout=20, origins=[
        "https://elgarf.github.io",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "https://xn--80aakd1abmpcmfoi.xn--p1ai",
    ], compression=None):
        scheme = "wss" if ssl_ctx is not None else "ws"
        print(f"Checklist WS server started on {scheme}://{host}:{port}")
        print(f"Project store URL: {PROJECT_STORE_URL}")
        await asyncio.Future()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Checklist sync websocket server")
    parser.add_argument("--host", default="127.0.0.1", help="Bind host")
    parser.add_argument("--port", default=8765, type=int, help="Bind port")
    parser.add_argument(
        "--project-store-url",
        default=PROJECT_STORE_URL,
        help="HTTP endpoint for checklist persistence (project_store.php)",
    )
    parser.add_argument(
        "--save-debounce-ms",
        default=int(SAVE_DEBOUNCE_SEC * 1000),
        type=int,
        help="Debounce interval before persisting checklist state",
    )
    parser.add_argument("--certfile", default="", help="TLS certificate PEM path for WSS")
    parser.add_argument("--keyfile", default="", help="TLS private key path for WSS")
    return parser.parse_args()


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    logging.getLogger("websockets.server").setLevel(logging.DEBUG)
    args = parse_args()
    PROJECT_STORE_URL = str(args.project_store_url).strip() or PROJECT_STORE_URL
    SAVE_DEBOUNCE_SEC = max(0.05, int(args.save_debounce_ms) / 1000.0)
    certfile = str(args.certfile or "").strip() or None
    keyfile = str(args.keyfile or "").strip() or None
    if (certfile and not keyfile) or (keyfile and not certfile):
        raise SystemExit("Both --certfile and --keyfile must be provided together")
    asyncio.run(run_server(args.host, args.port, certfile=certfile, keyfile=keyfile))
