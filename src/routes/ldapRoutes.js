import express from 'express';
import ldap from 'ldapjs';
import dotenv from 'dotenv';
import { registerLdapUser, getAllLdapUsers, getLdapUsersByDepartment, getUsersBySolution, getUserGroups, getUsersByGroups } from '../controllers/ldapController.js';

dotenv.config();

const router = express.Router();

// Rota para buscar todos os usuários do AD
router.get('/users', getAllLdapUsers);

// Definir a rota para registrar usuário baseado no LDAP
router.post("/register-ldap-user", registerLdapUser);



// ******************** Consumir LDAP por Departamento ********************

router.get('/users/department/:department', async (req, res) => {
    const { department } = req.params;
    try {
        const users = await getLdapUsersByDepartment(department);
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: "Erro ao buscar usuários do LDAP por departamento", message: error.message });
    }
});

// 🔹 Buscar usuários por Solução (dinâmico)
router.get("/users/solution/:solution", getUsersBySolution);

// Organizados por grupo
router.get("/users/groups/:username", getUsersByGroups);

// 📌 Nova rota para obter todos os usuários organizados por grupos
router.get("/users/groups");

export default router;
