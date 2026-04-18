import User from '../models/User.js';

export const updateFcmToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    user.fcmToken = fcmToken;
    await user.save();
    res.json({ message: 'Token FCM actualizado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al guardar el token' });
  }
};