import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';

export let io: SocketIOServer;

export function initSocketIO(server: HttpServer) {
    io = new SocketIOServer(server, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:3000',
            credentials: true,
        },
    });

    io.on('connection', (socket) => {
        socket.on('joinInventory', (inventoryId: string) => {
            socket.join(`inventory:${inventoryId}`);
        });

        socket.on('leaveInventory', (inventoryId: string) => {
            socket.leave(`inventory:${inventoryId}`);
        });
    });
}
