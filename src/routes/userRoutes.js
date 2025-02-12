import express from "express";
import {
    registerUser,
    loginUser,
    getUserProfile,
    definirAppsParaUsuario,
    obterUsuarioComApps,
    removerApp,
    updateUserRole,
    getUserData, // <- Importando a função
} from "../controllers/userController.js";
import { protect, isMaster } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/profile", protect, getUserProfile);
router.post("/definir-apps", definirAppsParaUsuario);
router.post("/remover-app", removerApp);
router.get("/me", protect, getUserData);
router.get("/:username", obterUsuarioComApps);
router.put("/update-role", protect, isMaster, updateUserRole);


export default router;
