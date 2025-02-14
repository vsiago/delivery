import express from 'express';
import ldap from 'ldapjs';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

router.get('/users', async (req, res) => {
    const client = ldap.createClient({
        url: process.env.LDAP_URL,
    });

    client.bind(process.env.LDAP_BIND_DN, process.env.LDAP_BIND_CREDENTIALS, (err) => {
        if (err) {
            console.error('Erro ao autenticar no LDAP:', err);
            return res.status(500).json({ error: 'Erro ao autenticar no LDAP' });
        }

        const opts = {
            filter: '(&(&(objectCategory=person)(objectClass=user))(!(sAMAccountName=*$$)))', // Busca todos os usuários
            scope: 'sub',
            attributes: ['cn', 'sAMAccountName', 'mail', 'memberOf', 'description', 'department'], // Atributos desejados
            paged: { pageSize: 5000 }, // Paginação para evitar limites do servidor
        };

        client.search(process.env.LDAP_SEARCH_BASE, opts, (err, searchRes) => {
            if (err) {
                console.error('Erro na busca:', err);
                return res.status(500).json({ error: 'Erro na busca LDAP' });
            }

            const users = [];

            searchRes.on('searchEntry', (entry) => {
                users.push(entry.object);
            });

            searchRes.on('end', (result) => {
                console.log('Busca LDAP finalizada. Código:', result.status);
                client.unbind();
                res.json(users);
            });

            searchRes.on('error', (err) => {
                console.error('Erro durante a busca:', err);
                client.unbind();
                res.status(500).json({ error: 'Erro na busca LDAP' });
            });
        });
    });
});

export default router;
