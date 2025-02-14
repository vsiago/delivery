import App from '../models/appSchema.js'

export const createOrUpdateApps = async (req, res) => {
    try {
        const appsToAdd = req.body.apps; // Recebe o array de apps do corpo da requisição

        if (!appsToAdd || appsToAdd.length === 0) {
            return res.status(400).json({ error: "Nenhum aplicativo fornecido." });
        }

        const result = [];

        for (const app of appsToAdd) {
            const { name, category } = app;
            const existingApp = await App.findOne({ name });

            // Verifica se a categoria é válida
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

        res.status(200).json({
            message: "Aplicativos cadastrados ou atualizados com sucesso!",
            data: result,
        });
    } catch (error) {
        console.error("Erro ao cadastrar ou atualizar os aplicativos:", error);
        res.status(500).json({ error: "Erro ao cadastrar ou atualizar os aplicativos" });
    }
};
