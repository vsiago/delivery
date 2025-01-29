import User from '../models/userModel.js'
import jwt from 'jsonwebtoken';

// Função para gerar o token JWT
const generateToken = (id, name, email) => {
  return jwt.sign({ id, name, email }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Controlador para registro de usuários
export const registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Por favor, preencha todos os campos' });
  }

  try {
    // Verificar se o usuário já existe
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'Usuário já cadastrado' });
    }

    // Criar um novo usuário
    const newUser = await User.create({ name, email, password });

    if (newUser) {
      res.status(201).json({
        _id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        token: generateToken(newUser.id),
      });
    } else {
      res.status(400).json({ message: 'Erro ao registrar usuário' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Erro no servidor', error: error.message });
  }
};

// Controlador de logi
export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Por favor, preencha todos os campos' });
  }

  try {
    // Encontrar o usuário pelo email
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      res.status(200).json({
        _id: user.id,
        name: user.name,
        email: user.email,
        token: generateToken(user.id, user.name, user.email),
      });
    } else {
      res.status(401).json({ message: 'Credenciais inválidas' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Erro no servidor', error: error.message });
  }
};


// Controlador para obter detalhes do usuário autenticado
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (user) {
      res.status(200).json({
        _id: user.id,
        name: user.name,
        email: user.email,
      });
    } else {
      res.status(404).json({ message: 'Usuário não encontrado' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Erro no servidor', error: error.message });
  }
};
