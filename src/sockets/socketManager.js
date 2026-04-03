import Driver from '../models/Driver.js';
import jwt from 'jsonwebtoken';

export const configureSockets = (io) => {
  // Middleware para autenticar socket con JWT (opcional)
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Autenticación requerida'));
    }
    jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
      if (err) return next(new Error('Token inválido'));
      socket.userId = decoded.id;
      next();
    });
  });

  io.on('connection', (socket) => {
    console.log(`Socket conectado: ${socket.id}, usuario: ${socket.userId}`);

    // Unirse a salas según rol (podríamos obtener el rol del usuario desde DB)
    // Por simplicidad, asumimos que el cliente enviará su rol al conectar
    socket.on('join', async (data) => {
      const { role } = data;
      if (role === 'driver') {
        socket.join('drivers');
        // Actualizar disponibilidad si estaba offline
        await Driver.findOneAndUpdate({ user: socket.userId }, { isAvailable: true });
      } else if (role === 'admin') {
        socket.join('admin');
      } else if (role === 'customer') {
        // Los clientes se unen a su propio viaje cuando es aceptado
        // Podemos usar una sala personalizada
      }
      console.log(`Usuario ${socket.userId} se unió a sala ${role}`);
    });

    // Conductor envía ubicación en tiempo real
    socket.on('driverLocation', async (data) => {
      const { coordinates } = data;
      if (coordinates && coordinates.length === 2) {
        await Driver.findOneAndUpdate(
          { user: socket.userId },
          { currentLocation: { type: 'Point', coordinates } }
        );
        // Reenviar a admin para monitoreo
        io.to('admin').emit('driverLocation', {
          driverId: socket.userId,
          coordinates,
        });
      }
    });

    // Unirse a una sala específica de viaje (para seguir actualizaciones)
    socket.on('joinRide', (rideId) => {
      socket.join(`ride-${rideId}`);
    });

    socket.on('disconnect', async () => {
      console.log(`Socket desconectado: ${socket.id}`);
      // Marcar conductor como no disponible si se desconecta
      await Driver.findOneAndUpdate({ user: socket.userId }, { isAvailable: false });
    });
  });
};