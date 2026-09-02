from typing import Dict, List, Set, Any
from fastapi import WebSocket
import json
from datetime import datetime

class WebSocketManager:
    def __init__(self):
        # Map of connection -> user_info
        self.active_connections: Dict[WebSocket, Dict[str, Any]] = {}
        # Map of room_name -> set of WebSockets
        self.rooms: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_info: Dict[str, Any] = None):
        await websocket.accept()
        self.active_connections[websocket] = user_info or {
            "user_id": "anonymous",
            "username": "Anonymous User",
            "role": "viewer"
        }
        # Join global room
        self.join_room(websocket, "global")
        # Broadcast presence
        await self.broadcast_presence()

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            del self.active_connections[websocket]
        for room_name, conns in list(self.rooms.items()):
            conns.discard(websocket)
            if not conns and room_name != "global":
                del self.rooms[room_name]

    def join_room(self, websocket: WebSocket, room: str):
        if room not in self.rooms:
            self.rooms[room] = set()
        self.rooms[room].add(websocket)

    def leave_room(self, websocket: WebSocket, room: str):
        if room in self.rooms:
            self.rooms[room].discard(websocket)

    async def broadcast_to_room(self, room: str, event_type: str, data: Any):
        payload = json.dumps({
            "event": event_type,
            "room": room,
            "data": data,
            "timestamp": datetime.utcnow().isoformat()
        }, default=str)
        if room in self.rooms:
            dead_sockets = []
            for connection in self.rooms[room]:
                try:
                    await connection.send_text(payload)
                except Exception:
                    dead_sockets.append(connection)
            for dead in dead_sockets:
                self.disconnect(dead)

    async def broadcast_global(self, event_type: str, data: Any):
        await self.broadcast_to_room("global", event_type, data)

    async def broadcast_presence(self):
        online_users = []
        seen = set()
        for u in self.active_connections.values():
            uid = u.get("user_id")
            if uid and uid not in seen:
                seen.add(uid)
                online_users.append(u)
        await self.broadcast_global("PRESENCE_UPDATE", {"online_users": online_users, "count": len(online_users)})

manager = WebSocketManager()
