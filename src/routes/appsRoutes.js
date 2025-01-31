import express from 'express';
import { createOrUpdateApps } from '../controllers/appsController.js';

const router = express.Router();

// Rota para cadastrar apps
router.post('/', createOrUpdateApps);

export default router;
