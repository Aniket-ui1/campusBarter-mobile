// backend/src/socketInstance.ts
// ─────────────────────────────────────────────────────────────
// Singleton Socket.io instance.
// Kept in its own file to avoid circular imports between
// server.ts (creates the io instance) and route files (use it).
//
// Usage:
//   import { getIO } from '../socketInstance';
//   getIO().to(chatId).emit('new_message', payload);
// ─────────────────────────────────────────────────────────────

import { Server as SocketServer } from 'socket.io';

let _io: SocketServer | null = null;

/** Called once from server.ts after socket.io is initialised. */
export function setIO(io: SocketServer): void {
    _io = io;
}

/** Returns the socket.io instance. Throws if called before setIO(). */
export function getIO(): SocketServer {
    if (!_io) {
        throw new Error('Socket.io has not been initialised yet. Call setIO() from server.ts first.');
    }
    return _io;
}
