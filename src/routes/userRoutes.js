import express from 'express';
import { registerUser, loginUser, getUserProfile, definirAppsParaUsuario, obterUsuarioComApps, removerApp } from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser); // Rota para registro
router.post('/login', loginUser); // Rota para login
router.get('/profile', protect, getUserProfile); // Rota protegida para perfil do usuário

// Definir os aplicativos que um usuário do LDAP pode acessar
router.post('/definir-apps', definirAppsParaUsuario);

router.post("/remover-app", removerApp)

// Rota para obter um usuário com seus aplicativos populados
router.get('/:username', obterUsuarioComApps);


export default router;
