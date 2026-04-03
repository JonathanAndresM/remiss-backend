import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, select: false }, // No devolver por defecto
    phone: { type: String, required: true },
    role: { type: String, enum: ['customer', 'driver', 'admin'], default: 'customer' },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
});

// Encriptar contraseña antes de guardar
/*userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});*/

// Método para comparar contraseñas
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;