import express from 'express';
import cors from 'cors';
import 'dotenv/config.js';
import { Server } from 'socket.io';
import http from 'http';
import connectDB from './config/db.js';
import { configureSockets } from './sockets/socketManager.js';
import authRoutes from './routes/authRoutes.js';
import rideRoutes from './routes/rideRoutes.js';
import driverRoutes from './routes/driverRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

connectDB();

app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/admin', adminRoutes);

app.get('/', (req, res) => {
    res.send('API de Remiss');
});

configureSockets(io);

app.set('io', io); // Para acceder a io desde los controladores

const PORT = process.env.PORT;
server.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`)
});