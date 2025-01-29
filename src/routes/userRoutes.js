import express from 'express';
import { registerUser, loginUser, getUserProfile } from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser); // Rota para registro
router.post('/login', loginUser); // Rota para login
router.get('/profile', protect, getUserProfile); // Rota protegida para perfil do usuário

export default router;
