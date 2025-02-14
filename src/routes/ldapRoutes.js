import express from 'express';
import ldap from 'ldapjs';
import dotenv from 'dotenv';
import { registerLdapUser, getAllLdapUsers } from '../controllers/ldapController.js';

dotenv.config();

const router = express.Router();

// Rota para buscar todos os usuários do AD
router.get('/users', getAllLdapUsers);

// Definir a rota para registrar usuário baseado no LDAP
router.post("/register-ldap-user", registerLdapUser);

export default router;
