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
