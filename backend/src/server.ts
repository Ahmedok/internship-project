import { createServer } from 'http';
import app from './app';
import { initSocketIO } from './socket';

const PORT = process.env.PORT || 5000;

const httpServer = createServer(app);

initSocketIO(httpServer);

httpServer.listen(PORT, () => {
    console.log(`Backend server is running on port ${PORT}`);
});
