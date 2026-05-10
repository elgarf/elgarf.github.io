from __future__ import annotations

import argparse
import asyncio
import json
from collections import defaultdict
from dataclasses import dataclass
from typing import Any
from urllib import error as urlerror
from urllib import parse as urlparse
from urllib import request as urlrequest

from websockets.asyncio.server import ServerConnection, serve


@dataclass
class ClientContext:
    ws: ServerConnection
    checklist_guid: str
    client_id: str


CHECKLIST_STATE: dict[str, dict[str, bool]] = defaultdict(dict)
SUBSCRIBERS: dict[str, set[ServerConnection]] = defaultdict(set)
CONTEXT_BY_SOCKET: dict[ServerConnection, ClientContext] = {}
STATE_LOCK = asyncio.Lock()
PROJECT_STORE_URL = "https://static.93.189.179.185.ip.webhost1.net/project_store.php"
SAVE_DEBOUNCE_SEC = 0.35
PERSIST_TASKS: dict[str, asyncio.Task[None]] = {}


async def send_json(ws: ServerConnection, payload: dict[str, Any]) -> None:
    await ws.send(json.dumps(payload, ensure_ascii=False, separators=(",", ":")))


async def broadcast_except(
    checklist_guid: str,
    payload: dict[str, Any],
    sender: ServerConnection | None = None,
) -> None:
    subscribers = list(SUBSCRIBERS.get(checklist_guid, set()))
    if not subscribers:
        return

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


async def load_checklist_state_from_store(checklist_guid: str) -> dict[str, bool] | None:
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
    return {str(k): bool(v) for k, v in parsed.items()}


async def persist_checklist_state_to_store(checklist_guid: str, state: dict[str, bool]) -> bool:
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


async def handle_checkbox_update(
    ws: ServerConnection,
    checklist_guid: str,
    key: str,
    checked: bool,
    client_id: str,
) -> None:
    async with STATE_LOCK:
        if ws not in SUBSCRIBERS[checklist_guid]:
            SUBSCRIBERS[checklist_guid].add(ws)
            CONTEXT_BY_SOCKET[ws] = ClientContext(ws=ws, checklist_guid=checklist_guid, client_id=client_id)
        CHECKLIST_STATE[checklist_guid][key] = checked
    await schedule_persist(checklist_guid)

    await broadcast_except(
        checklist_guid,
        {
            "type": "checkbox_update",
            "checklistGuid": checklist_guid,
            "key": key,
            "checked": checked,
            "clientId": client_id,
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
    checklist_guid = as_non_empty_str(payload.get("checklistGuid"))
    client_id = as_non_empty_str(payload.get("clientId")) or "anon"

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


async def connection_handler(ws: ServerConnection) -> None:
    try:
        async for message in ws:
            if isinstance(message, str):
                await handle_message(ws, message)
    finally:
        await unregister(ws)


async def run_server(host: str, port: int) -> None:
    async with serve(connection_handler, host, port, ping_interval=20, ping_timeout=20):
        print(f"Checklist WS server started on ws://{host}:{port}")
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
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    PROJECT_STORE_URL = str(args.project_store_url).strip() or PROJECT_STORE_URL
    SAVE_DEBOUNCE_SEC = max(0.05, int(args.save_debounce_ms) / 1000.0)
    asyncio.run(run_server(args.host, args.port))
