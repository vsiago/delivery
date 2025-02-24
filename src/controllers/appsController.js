import App from '../models/appSchema.js';
import userModel from '../models/userModel.js';
import fetch from 'node-fetch';

export const createOrUpdateApps = async (req, res) => {
    try {
        const appsToAdd = req.body.apps; // Recebe o array de apps do corpo da requisição

        if (!appsToAdd || appsToAdd.length === 0) {
            return res.status(400).json({ error: "Nenhum aplicativo fornecido." });
        }

        const existingApps = await App.find({}, 'name'); // Obtém todos os apps já cadastrados
        const existingNames = existingApps.map(app => app.name); // Lista de nomes dos apps já no banco

        const newAppNames = appsToAdd.map(app => app.name); // Lista de nomes enviados na requisição
        const appsToRemove = existingNames.filter(name => !newAppNames.includes(name)); // Apps a remover

        const result = [];

        for (const app of appsToAdd) {
            const { name, category } = app;
            const existingApp = await App.findOne({ name });

            // Validação de categoria
            if (!["Master", "Coordenador", "Técnico", "Servidor", "Cidadão"].includes(category)) {
                return res.status(400).json({ error: `Categoria inválida: ${category}` });
            }

            if (existingApp) {
                // Atualiza o app existente
                const updatedApp = await App.findOneAndUpdate({ name }, { $set: app }, { new: true });
                result.push(updatedApp);
            } else {
                // Cria um novo app
                const newApp = new App(app);
                const savedApp = await newApp.save();
                result.push(savedApp);
            }
        }

        // Remove os apps que não foram enviados na requisição
        if (appsToRemove.length > 0) {
            await App.deleteMany({ name: { $in: appsToRemove } });
        }

        res.status(200).json({
            message: "Aplicativos cadastrados, atualizados ou removidos com sucesso!",
            data: result,
        });
    } catch (error) {
        console.error("Erro ao cadastrar, atualizar ou remover aplicativos:", error);
        res.status(500).json({ error: "Erro ao cadastrar, atualizar ou remover aplicativos" });
    }
};
export const installSpecificApp = async (req, res) => {
    try {
        const { username, apps } = req.body;

        // Verifica se os parâmetros necessários foram enviados
        if (!username || !apps || !Array.isArray(apps)) {
            return res.status(400).json({ error: 'Username e apps são obrigatórios, e apps deve ser um array.' });
        }

        // Busca o usuário pelo username
        let user = await userModel.findOne({ username });

        // Se o usuário não existir, registra ele via LDAP
        if (!user) {
            const ldapResponse = await fetch('http://localhost:3333/api/ldap/register-ldap-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username }),
            });

            if (!ldapResponse.ok) {
                return res.status(500).json({ error: 'Erro ao registrar usuário no LDAP.' });
            }

            // Após registrar, busca o usuário novamente
            user = await userModel.findOne({ username });

            if (!user) {
                return res.status(500).json({ error: 'Usuário registrado, mas não encontrado na base local.' });
            }
        }

        // Atualiza os aplicativos específicos e o role para Coordenador
        user.specificApplications = apps;
        user.role = 'Coordenador';

        await user.save();

        res.status(200).json({
            message: 'Apps instalados e role atualizado com sucesso.',
            user: {
                username: user.username,
                specificApplications: user.specificApplications,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Erro ao instalar apps e atualizar role:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};


// ✅ Registar um usuário no app, Instalar aplicativos específicos e atualizar o role para Técnico
export const installSpecificAppTecnico = async (req, res) => {
    try {
        const { username, apps } = req.body;

        // Verifica se os parâmetros foram enviados corretamente
        if (!username || !apps || !Array.isArray(apps)) {
            return res.status(400).json({ error: 'Username e apps são obrigatórios, e apps deve ser um array.' });
        }

        // Verifica se o usuário autenticado é um Coordenador
        const coordinator = await userModel.findOne({ username: req.user.username, role: 'Coordenador' });

        if (!coordinator) {
            return res.status(403).json({ error: 'Apenas Coordenadores podem promover Técnicos.' });
        }

        // Busca o usuário pelo username
        let user = await userModel.findOne({ username });

        // Se o usuário não existir, registra ele via LDAP
        if (!user) {
            const ldapResponse = await fetch('http://localhost:3333/api/ldap/register-ldap-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username }),
            });

            if (!ldapResponse.ok) {
                return res.status(500).json({ error: 'Erro ao registrar usuário no LDAP.' });
            }

            // Após registrar, busca o usuário novamente
            user = await userModel.findOne({ username });

            if (!user) {
                return res.status(500).json({ error: 'Usuário registrado, mas não encontrado na base local.' });
            }
        }

        // Atualiza os aplicativos específicos e o role para Técnico
        user.specificApplications = apps;
        user.role = 'Técnico';

        await user.save();

        res.status(200).json({
            message: 'Apps instalados e role atualizado para Técnico com sucesso.',
            user: {
                username: user.username,
                specificApplications: user.specificApplications,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Erro ao instalar apps e atualizar role para Técnico:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

// Remove um app específico e rebaixa o role para Servidor
export const uninstallSpecificApp = async (req, res) => {
    try {
        const { username, apps } = req.body;

        // Verifica se os parâmetros necessários foram enviados
        if (!username || !apps || !Array.isArray(apps)) {
            return res.status(400).json({ error: "Username e apps são obrigatórios, e apps deve ser um array." });
        }

        // Busca o usuário pelo username
        const user = await userModel.findOne({ username });

        if (!user) {
            return res.status(404).json({ error: "Usuário não encontrado." });
        }

        // Remove os apps especificados da lista `specificApplications`
        user.specificApplications = user.specificApplications.filter(app => !apps.includes(app));

        // Se não houver mais apps específicos, rebaixa o role para "Servidor"
        if (user.specificApplications.length === 0) {
            user.role = "Servidor";
        }

        await user.save();

        res.status(200).json({
            message: "Apps desinstalados com sucesso.",
            user: {
                username: user.username,
                specificApplications: user.specificApplications,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Erro ao desinstalar apps:", error);
        res.status(500).json({ error: "Erro interno do servidor." });
    }
};