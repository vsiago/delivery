import ldap from 'ldapjs'
import dotenv from 'dotenv'

dotenv.config()

const client = ldap.createClient({
    url: process.env.LDAP_URL,
});

client.bind(process.env.LDAP_BIND_DN, process.env.LDAP_BIND_CREDENTIALS, (err) => {
    if (err) {
        console.error('Erro ao autenticar no LDAP:', err);
        return;
    }

    const opts = {
        filter: '(objectClass=user)', // Filtro para buscar usuários
        scope: 'sub',
        attributes: ['cn', 'sAMAccountName', 'mail', 'memberOf'], // Atributos desejados
        paged: {
            pageSize: 5000, // Reduzido para evitar limitações do servidor
        },
    };

    client.search(process.env.LDAP_SEARCH_BASE, opts, (err, res) => {
        if (err) {
            console.error('Erro na busca:', err);
            return;
        }

        const users = [];

        res.on('searchEntry', (entry) => {
            users.push(entry.object);
        });

        res.on('end', (result) => {
            console.log('Busca finalizada. Código:', result.status);
            console.log('Usuários encontrados:', users);
            client.unbind();
        });

        res.on('error', (err) => {
            console.error('Erro durante a busca:', err);
            client.unbind();
        });
    });
});
