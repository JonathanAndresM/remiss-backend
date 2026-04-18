import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, select: false }, // No devolver por defecto
    phone: { type: String, required: true },
    role: { type: String, enum: ['customer', 'driver', 'admin'], default: 'customer' },
    isActive: { type: Boolean, default: true },
    pendingPenalty: { type: Number, default: 0 },
    fcmToken: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
});

// Método para comparar contraseñas
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;