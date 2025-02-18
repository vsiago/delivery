import ldap from 'ldapjs';

import dotenv from "dotenv";
dotenv.config();

// 🔧 Configurações LDAP centralizadas
export const LDAP_CONFIG = {
    url: process.env.LDAP_URL,
    bindDN: process.env.LDAP_BIND_DN,
    bindCredentials: process.env.LDAP_BIND_CREDENTIALS,
    searchBase: process.env.LDAP_SEARCH_BASE,
    searchFilter: '(&(&(objectCategory=person)(objectClass=user))(!(sAMAccountName=*$$)))', // Filtro atualizado
    attributes: ['cn', 'sAMAccountName', 'mail', 'memberOf', 'description', 'department', 'username'], // Atributos desejados
};

// 🔌 Criar cliente LDAP reutilizável
export const createLdapClient = () => {
    return ldap.createClient({ url: LDAP_CONFIG.url });
};

// 🔎 Função de busca LDAP genérica
export const searchLdap = (client) => {
    return new Promise((resolve, reject) => {
        const opts = {
            filter: LDAP_CONFIG.searchFilter,
            scope: 'sub',
            attributes: LDAP_CONFIG.attributes,
            paged: { pageSize: 5000 }, // Paginação para evitar limites do servidor
        };

        const users = [];
        client.search(LDAP_CONFIG.searchBase, opts, (err, searchRes) => {
            if (err) {
                console.error("Erro na busca LDAP:", err);
                return reject(err);
            }

            searchRes.on('searchEntry', (entry) => {
                users.push(entry.object);
            });

            searchRes.on('end', (result) => {
                console.log("Busca LDAP concluída. Usuários encontrados:", users.length);
                resolve(users);
            });

            searchRes.on('error', (err) => {
                console.error("Erro ao processar a busca LDAP:", err);
                reject(err);
            });
        });
    });
};
export const searchLDAPUsers = async (baseDN) => {
    return new Promise((resolve, reject) => {
        const client = createLdapClient();

        client.bind(LDAP_CONFIG.bindDN, LDAP_CONFIG.bindCredentials, (err) => {
            if (err) {
                console.error("❌ Erro ao conectar ao LDAP:", err);
                client.unbind();
                return reject(new Error("Erro ao conectar ao servidor LDAP"));
            }

            const options = {
                filter: "(objectClass=person)", // Ajuste o filtro conforme necessário
                scope: "sub",
                attributes: ["sAMAccountName", "department", "memberOf"],
                paged: { pageSize: 5000 } // Ativando paginação para evitar limites do servidor
            };

            let users = [];

            client.search(baseDN, options, (err, res) => {
                if (err) {
                    console.error("❌ Erro na busca LDAP:", err);
                    client.unbind();
                    return reject(new Error("Erro ao buscar usuários no LDAP"));
                }

                res.on("searchEntry", (entry) => {
                    users.push(entry.object);
                });

                res.on("page", (result, cb) => {
                    console.log(`📄 Página recebida com ${users.length} usuários.`);
                    cb(); // Solicitar próxima página automaticamente
                });

                res.on("end", () => {
                    console.log(`✅ Busca LDAP concluída. ${users.length} usuários encontrados.`);
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

export const searchUsersByGroup = async (groupCN) => {
    return new Promise((resolve, reject) => {
        const client = createLdapClient();

        client.bind(LDAP_CONFIG.bindDN, LDAP_CONFIG.bindCredentials, (err) => {
            if (err) {
                console.error("❌ Erro ao conectar ao LDAP:", err);
                client.unbind();
                return reject(new Error("Erro ao conectar ao servidor LDAP"));
            }

            // 🔎 Filtra usuários que pertencem ao grupo específico
            const filter = `(&(objectClass=person)(memberOf=CN=${groupCN},${LDAP_CONFIG.searchBase}))`;

            const options = {
                filter,
                scope: "sub",
                attributes: ["sAMAccountName", "cn", "mail", "department"],
                paged: { pageSize: 5000 },
            };

            let users = [];

            client.search(LDAP_CONFIG.searchBase, options, (err, res) => {
                if (err) {
                    console.error("❌ Erro na busca LDAP:", err);
                    client.unbind();
                    return reject(new Error("Erro ao buscar usuários no LDAP"));
                }

                res.on("searchEntry", (entry) => {
                    users.push(entry.object);
                });

                res.on("end", () => {
                    console.log(`✅ ${users.length} usuários encontrados no grupo ${groupCN}`);
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
export const searchLDAPUsersByGroups = async (groupDN) => {
    return new Promise((resolve, reject) => {
        const client = createLdapClient();

        client.bind(LDAP_CONFIG.bindDN, LDAP_CONFIG.bindCredentials, (err) => {
            if (err) {
                console.error("❌ Erro ao conectar ao LDAP:", err);
                client.unbind();
                return reject(new Error("Erro ao conectar ao servidor LDAP"));
            }

            const options = {
                filter: `(memberOf=${groupDN})`,
                scope: "sub",
                attributes: ["sAMAccountName", "cn"],
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
