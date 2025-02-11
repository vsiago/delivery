import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: false, unique: true },
    name: {
      type: String,
      required: [true, 'O nome é obrigatório'],
    },
    email: {
      type: String,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      select: false
    },
    role: {
      type: String,
      enum: ['master', 'user', 'member', 'tecnico'],
      default: 'user',
    },
    apps: [{ type: String }] // ✅ Agora aceita strings
  },
  { timestamps: true }
);

// Antes de salvar, hash da senha
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Método para verificar a senha
userSchema.methods.matchPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// Método para verificar se o usuário é master
userSchema.methods.isMaster = function () {
  return this.role === 'master';
};

export default mongoose.model('User', userSchema);
