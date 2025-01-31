import App from '../models/appSchema.js'

export const createOrUpdateApps = async (req, res) => {
    try {
        const appsToAdd = req.body.apps;  // Recebe o array de apps do corpo da requisição

        if (!appsToAdd || appsToAdd.length === 0) {
            return res.status(400).json({ error: "Nenhum aplicativo fornecido." });
        }

        // Processa cada app individualmente
        const result = [];
        for (const app of appsToAdd) {
            const existingApp = await App.findOne({ name: app.name });

            if (existingApp) {
                // Se o aplicativo já existe, atualiza
                const updatedApp = await App.findOneAndUpdate(
                    { name: app.name },
                    { $set: app },
                    { new: true }
                );
                result.push(updatedApp);
            } else {
                // Caso contrário, insere um novo aplicativo
                const newApp = new App(app);
                const savedApp = await newApp.save();
                result.push(savedApp);
            }
        }

        res.status(200).json({
            message: "Aplicativos cadastrados ou atualizados com sucesso!",
            data: result
        });
    } catch (error) {
        console.error("Erro ao cadastrar ou atualizar os aplicativos:", error);
        res.status(500).json({ error: "Erro ao cadastrar ou atualizar os aplicativos" });
    }
};
