import mongoose from 'mongoose'
import bcrypt from 'bcrypt'

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'O nome é obrigatório']
  },
  email: {
    type: String,
    required: [true, 'O e-mail é obrigatório']
  },
  password: {
    type: String,
    required: [true, 'A senha é obrigatória']
  }
}, {timestamps: true})

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
export default mongoose.model('User', userSchema)