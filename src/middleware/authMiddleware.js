import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // Verifica e decodifica o token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Busca o usuário pelo ID do token
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(404).json({ message: 'Usuário não encontrado' });
      }

      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Sessão expirada, faça login novamente' });
      }
      res.status(401).json({ message: 'Não autorizado, token inválido' });
    }
  } else {
    res.status(401).json({ message: 'Não autorizado, sem token' });
  }
};

export const isMaster = (req, res, next) => {
  if (req.user && req.user.role === 'Master') {
    next();
  } else {
    res.status(403).json({ message: 'Acesso negado. Apenas usuários Master podem alterar funções.' });
  }
};

export const isTecnico = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'Coordenador') {
      return res.status(403).json({ message: 'Acesso negado. Apenas Coordenadores podem promover Técnicos.' });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};
