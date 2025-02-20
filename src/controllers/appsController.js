import App from '../models/appSchema.js';

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
