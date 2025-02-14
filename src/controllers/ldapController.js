import { LDAP_CONFIG, createLdapClient, searchLdap } from '../config/ldapConfig.js';
import userModel from '../models/userModel.js';

// Busca UM usuário pelo username
export const getLdapUser = async (username) => {
    return new Promise((resolve, reject) => {
        const client = createLdapClient();

        client.bind(LDAP_CONFIG.bindDN, LDAP_CONFIG.bindCredentials, async (err) => {
            if (err) {
                console.error("❌ Erro ao conectar ao LDAP:", err);
                reject(new Error("Erro ao conectar ao servidor LDAP"));
                return;
            }

            try {
                const users = await searchLdap(client);
                console.log(`✅ ${users.length} usuários encontrados.`);

                // Filtrar pelo username
                const foundUser = users.find(user => user.sAMAccountName === username);

                if (!foundUser) {
                    console.error(`❌ Usuário ${username} não encontrado no AD.`);
                    resolve(null);
                } else {
                    console.log("✅ Usuário encontrado:", foundUser);
                    resolve(foundUser);
                }
            } catch (error) {
                console.error("❌ Erro na busca LDAP:", error);
                reject(new Error("Erro ao buscar usuários no LDAP"));
            } finally {
                client.unbind();
            }
        });
    });
};

// Controlador para registrar usuário LDAP no MongoDB
export const registerLdapUser = async (req, res) => {
    try {
        console.log("📩 Recebendo requisição para registrar usuário LDAP...");

        if (!req.body || !req.body.username) {
            console.error("❌ Requisição inválida: falta 'username'.");
            return res.status(400).json({ error: "Nome de usuário é obrigatório" });
        }

        const { username } = req.body;
        console.log(`🔍 Buscando usuário no LDAP: ${username}`);

        // Buscar usuário no LDAP
        const ldapUser = await getLdapUser(username);

        if (!ldapUser) {
            console.error(`❌ Usuário ${username} não encontrado no AD.`);
            return res.status(404).json({ error: "Usuário não encontrado no AD" });
        }

        console.log("✅ Usuário encontrado no AD:", ldapUser);

        // Verificar se já existe no banco
        let user = await userModel.findOne({ username: ldapUser.sAMAccountName });

        // Determinar função do usuário
        const memberOf = ldapUser.memberOf || [];
        const role = Array.isArray(memberOf) && memberOf.some(grupo => grupo.includes("STI")) ? "Técnico" : "Servidor";

        if (!user) {
            console.log(`🆕 Criando novo usuário: ${ldapUser.sAMAccountName}`);

            // Criar usuário no MongoDB
            user = new userModel({
                username: ldapUser.sAMAccountName,
                name: ldapUser.cn,
                email: ldapUser.mail,
                role: role,
                dn: ldapUser.distinguishedName,
                memberOf: memberOf,
            });

            await user.save();
        } else {
            console.log(`🔄 Atualizando usuário existente: ${ldapUser.sAMAccountName}`);

            // Atualizar usuário caso os dados tenham mudado
            await userModel.updateOne(
                { _id: user._id },
                {
                    name: ldapUser.cn,
                    email: ldapUser.mail,
                    role: role,
                    dn: ldapUser.distinguishedName,
                    memberOf: memberOf,
                }
            );
        }

        console.log("✅ Usuário LDAP cadastrado/atualizado com sucesso!");
        return res.json({ message: "Usuário LDAP cadastrado com sucesso", user });
    } catch (error) {
        console.error("❌ Erro ao processar requisição:", error);

        if (res && typeof res.status === "function") {
            return res.status(500).json({ error: "Erro interno ao buscar ou salvar usuário", message: error.message });
        } else {
            console.error("❌ ERRO CRÍTICO: 'res' está indefinido!");
        }
    }
};

// Controlador para buscar todos os usuários do AD
export const getAllLdapUsers = async (req, res) => {
    try {
        console.log("🔍 Buscando todos os usuários no LDAP...");
        const client = createLdapClient();

        client.bind(LDAP_CONFIG.bindDN, LDAP_CONFIG.bindCredentials, async (err) => {
            if (err) {
                console.error("❌ Erro ao conectar ao LDAP:", err);
                return res.status(500).json({ error: "Erro ao conectar ao servidor LDAP" });
            }

            try {
                const users = await searchLdap(client);
                console.log(`✅ ${users.length} usuários encontrados no AD.`);
                res.json(users);
            } catch (error) {
                console.error("❌ Erro na busca LDAP:", error);
                res.status(500).json({ error: "Erro ao buscar usuários no LDAP" });
            } finally {
                client.unbind();
            }
        });
    } catch (error) {
        console.error("❌ Erro ao processar requisição:", error);
        res.status(500).json({ error: "Erro interno ao buscar usuários", message: error.message });
    }
};