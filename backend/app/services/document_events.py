from __future__ import annotations

import asyncio
import json
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any

# In-memory pub/sub for document status events, keyed by workspace id.
_workspace_subscribers: dict[int, set[asyncio.Queue[dict[str, Any]]]] = defaultdict(set)
_subscribers_lock = asyncio.Lock()


async def subscribe_workspace_events(workspace_id: int) -> asyncio.Queue[dict[str, Any]]:
    queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue(maxsize=200)
    async with _subscribers_lock:
        _workspace_subscribers[workspace_id].add(queue)
    return queue


async def unsubscribe_workspace_events(workspace_id: int, queue: asyncio.Queue[dict[str, Any]]) -> None:
    async with _subscribers_lock:
        subscribers = _workspace_subscribers.get(workspace_id)
        if not subscribers:
            return
        subscribers.discard(queue)
        if not subscribers:
            _workspace_subscribers.pop(workspace_id, None)


async def publish_document_status(
    workspace_id: int,
    document_id: int,
    status: str,
    *,
    message: str | None = None,
    chunk_count: int | None = None,
    error_message: str | None = None,
) -> None:
    payload: dict[str, Any] = {
        "document_id": document_id,
        "workspace_id": workspace_id,
        "status": status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    if message is not None:
        payload["message"] = message
    if chunk_count is not None:
        payload["chunk_count"] = chunk_count
    if error_message is not None:
        payload["error_message"] = error_message

    async with _subscribers_lock:
        subscribers = list(_workspace_subscribers.get(workspace_id, set()))

    for queue in subscribers:
        try:
            queue.put_nowait(payload)
        except asyncio.QueueFull:
            # Drop oldest event to keep stream live under burst.
            try:
                queue.get_nowait()
                queue.put_nowait(payload)
            except Exception:
                continue


def format_sse_event(event: str, data: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False, default=str)}\n\n"
