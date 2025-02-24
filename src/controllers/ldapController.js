import { LDAP_CONFIG, createLdapClient, searchLdap, searchLDAPUsers, searchLDAPUsersByGroups } from '../config/ldapConfig.js';
import userModel from '../models/userModel.js';

// Busca UM usuário pelo username
export const getLdapUser = async (username) => {
    return new Promise((resolve, reject) => {
        const client = createLdapClient();

        if (client.options) {
            client.options.referrals = 0;
        }

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
        if (!client) {
            console.error("❌ Erro: createLdapClient() não retornou um cliente válido.");
            return reject(new Error("Erro ao criar cliente LDAP"));
        }

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

// Mapeamento de siglas para departamentos completos
const departmentMap = {
    "PGM": "Procuradoria Geral Municipal",
    "SMA": "Secretaria Municipal de Administração",
    "SMEVE": "Secretaria Municipal de Eventos",
    "SMFPL": "Secretaria Municipal de Fazenda e Planejamento",
    "SMAS": "Secretaria Municipal de Assistência Social",
    "SMS": "Secretaria Municipal de Saúde",
    "SMT": "Secretaria Municipal de Transportes",
    "SMTESP": "Secretaria Municipal de Trabalho e Emprego",
};

// Buscar usuários por depatarmento
export const getLdapUsersByDepartment = async (department) => {
    return new Promise((resolve, reject) => {
        const client = createLdapClient();

        client.bind(LDAP_CONFIG.bindDN, LDAP_CONFIG.bindCredentials, async (err) => {
            if (err) {
                console.error("❌ Erro ao conectar ao LDAP:", err);
                reject(new Error("Erro ao conectar ao servidor LDAP"));
                return;
            }

            // Definir o DN base do setor (ajustar conforme necessidade)
            const baseDN = `OU=${department},OU=Prefeitura,DC=itg,DC=rio`;

            // 🔍 Filtro para buscar apenas usuários ativos dentro do setor
            const options = {
                scope: "sub", // Busca em todos os níveis dentro do setor
                filter: "(objectClass=person)", // Filtra apenas objetos do tipo 'person' (usuários)
                attributes: ["cn", "sAMAccountName", "mail", "department", "title", "distinguishedName"]
            };

            client.search(baseDN, options, (err, res) => {
                if (err) {
                    console.error("❌ Erro na busca LDAP:", err);
                    reject(new Error("Erro ao buscar usuários no LDAP"));
                    return;
                }

                const users = [];

                res.on("searchEntry", (entry) => {
                    users.push(entry.object);
                });

                res.on("end", (result) => {
                    console.log(`✅ ${users.length} usuários encontrados no setor "${department}".`);
                    resolve(users);
                });

                res.on("error", (err) => {
                    if (err.name === "ReferralError") {
                        console.warn("⚠️ Referência LDAP ignorada:", err);
                        return resolve([]); // Retorna uma lista vazia em caso de referência
                    }
                    console.error("❌ Erro ao processar busca LDAP:", err);
                    client.unbind();
                    reject(new Error("Erro ao processar busca LDAP"));
                });
            });
        });
    });
};

export const getUsersBySolution = async (req, res) => {
    try {
        const { solution } = req.params;

        if (!solution) {
            return res.status(400).json({ error: "Solução não informada." });
        }

        // Gerando o caminho LDAP dinamicamente
        const baseDN = `OU=${solution},OU=Prefeitura,DC=itg,DC=rio`;

        console.log("🔍 Buscando usuários em:", baseDN);

        // Simulação de consulta ao LDAP
        const users = await searchLDAPUsers(baseDN);

        // Extraindo apenas as siglas dos departamentos
        const departments = users.map(user => {
            const departmentFull = user.department || "Desconhecido";
            return Object.keys(departmentMap).find(key => departmentMap[key] === departmentFull) || "N/A";
        });

        return res.json({ solution, departments, users });
    } catch (error) {
        console.error("❌ Erro ao buscar usuários:", error.message);
        return res.status(500).json({ error: "Erro ao processar busca LDAP" });
    }
};

// Organizados por grupo
export const searchUserGroups = async (username, baseDN) => {
    return new Promise((resolve, reject) => {
        const client = createLdapClient();

        client.bind(LDAP_CONFIG.bindDN, LDAP_CONFIG.bindCredentials, (err) => {
            if (err) {
                console.error("❌ Erro ao conectar ao LDAP:", err);
                client.unbind();
                return reject(new Error("Erro ao conectar ao servidor LDAP"));
            }

            const options = {
                filter: `(sAMAccountName=${username})`, // Filtra apenas o usuário específico
                scope: "sub",
                attributes: ["memberOf"], // Traz apenas os grupos do usuário
                sizeLimit: 1,
                referrals: [] // ⛔ Evita seguir referrals
            };

            client.search(baseDN, options, (err, res) => {
                if (err) {
                    console.error("❌ Erro na busca LDAP:", err);
                    client.unbind();
                    return reject(new Error("Erro ao buscar usuário no LDAP"));
                }

                let userGroups = [];

                res.on("searchEntry", (entry) => {
                    console.log("🔍 Entrada LDAP recebida:", JSON.stringify(entry.object, null, 2));
                    userGroups = entry.object.memberOf || [];
                });

                res.on("end", () => {
                    console.log(`✅ Grupos encontrados para ${username}:`, userGroups);
                    client.unbind();
                    resolve(userGroups);
                });

                res.on("error", (err) => {
                    console.error("❌ Erro ao processar busca LDAP:", err);
                    client.unbind();
                    reject(new Error("Erro ao processar busca LDAP"));
                });
            });
        });
    });
};

export const getUserGroups = async (req, res) => {
    try {
        const username = req.params.username; // Obtém o nome do usuário da URL
        const baseDN = "DC=itg,DC=rio"; // Certifique-se de que isso está correto

        if (!username) {
            return res.status(400).json({ error: "Nome de usuário é obrigatório" });
        }

        const groups = await searchUserGroups(username, baseDN);
        res.json({ username, groups });
    } catch (error) {
        console.error("Erro ao buscar grupos LDAP:", error);
        res.status(500).json({ error: "Erro ao buscar grupos do usuário no LDAP" });
    }
};


// 🔍Implementação da Função searchUsersByGroup
export const searchUsersByGroup = async (groupDN) => {
    return new Promise((resolve, reject) => {
        const client = createLdapClient();

        client.bind(LDAP_CONFIG.bindDN, LDAP_CONFIG.bindCredentials, (err) => {
            if (err) {
                console.error("❌ Erro ao conectar ao LDAP:", err);
                client.unbind();
                return reject(new Error("Erro ao conectar ao servidor LDAP"));
            }

            const options = {
                filter: `(memberOf=${groupDN})`, // Filtra usuários que pertencem ao grupo
                scope: "sub",
                attributes: ["sAMAccountName", "cn"], // Pega nome e username
                sizeLimit: 1000,
                referrals: []
            };

            let users = [];

            client.search("DC=itg,DC=rio", options, (err, res) => {
                if (err) {
                    console.error("❌ Erro na busca LDAP:", err);
                    client.unbind();
                    return reject(new Error("Erro ao buscar usuários do grupo no LDAP"));
                }

                res.on("searchEntry", (entry) => {
                    users.push({
                        username: entry.object.sAMAccountName,
                        fullName: entry.object.cn
                    });
                });

                res.on("end", () => {
                    client.unbind();
                    resolve(users);
                });

                res.on("error", (err) => {
                    console.error("❌ Erro ao processar busca LDAP:", err);
                    client.unbind();
                    reject(new Error("Erro ao processar busca LDAP"));
                });
            });
        });
    });
};


export const getUsersByGroups = async (req, res) => {
    try {
        const username = req.params.username;
        const baseDN = "DC=itg,DC=rio";

        if (!username) {
            return res.status(400).json({ error: "Nome de usuário é obrigatório" });
        }

        // 1️⃣ Buscar os grupos do usuário
        const groups = await searchUserGroups(username, baseDN);

        // Garante que sempre seja um array
        const formattedGroups = Array.isArray(groups) ? groups : groups ? [groups] : [];

        if (!formattedGroups.length) {
            return res.json({ username, groups: [], usersByGroup: {} });
        }

        // 2️⃣ Buscar usuários pertencentes a cada grupo encontrado
        let usersByGroup = {};

        for (const groupDN of formattedGroups) {
            console.log(`🔍 Buscando usuários no grupo: ${groupDN}`);

            // Extrai o nome do grupo do DN
            const match = groupDN.match(/CN=([^,]+)/);
            const groupName = match ? match[1] : groupDN; // Usa o nome extraído ou o DN inteiro como fallback

            // Busca os usuários dentro desse grupo específico
            const users = await searchLDAPUsersByGroups(groupDN);

            // Adiciona os usuários ao objeto categorizado
            usersByGroup[groupName] = users;
        }

        res.json({ username, groups: formattedGroups, usersByGroup });

    } catch (error) {
        console.error("Erro ao buscar usuários dos grupos:", error);
        res.status(500).json({ error: "Erro ao buscar usuários dos grupos no LDAP" });
    }
};