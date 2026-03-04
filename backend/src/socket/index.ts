import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';

export let io: SocketIOServer;

export function initSocketIO(server: HttpServer) {
    io = new SocketIOServer(server, {
        cors: {
            origin: process.env.CLIENT_URL || 'http://localhost:5173',
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
