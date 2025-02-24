import express from 'express';
import { createOrUpdateApps, installSpecificApp, installSpecificAppTecnico, uninstallSpecificApp } from '../controllers/appsController.js';
import { protect, isMaster, isTecnico } from "../middleware/authMiddleware.js";

const router = express.Router();

// Rota para cadastrar apps
router.post('/', createOrUpdateApps);

// Rota para instalar um app específico para um usuário
router.post('/install', protect, isMaster, installSpecificApp);

// Rota para instalar um app específico para um usuário Técnico
router.post('/instal-tecnico', protect, isTecnico, installSpecificAppTecnico);

// Rota para desinstalar aplicativos específicos e rebaixar para Servidor
router.post("/uninstall", uninstallSpecificApp);

export default router;
