import mongoose from "mongoose";

const appSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
        },
        description: {
            type: String,
            required: true,
        },
        logoUrl: {
            type: String, // URL do logo (pode ser um caminho ou link para a imagem)
            required: true,
        },
        pathApp: {
            type: String, // Caminho interno do app
            required: true,
            unique: true,
        },
        url: {
            type: String, // URL do aplicativo
            required: true,
        },
        requiresAuth: {
            type: Boolean,
            default: false,
        },
        loginMethod: {
            type: String,
            enum: ["email-password", "username-password", null],
            default: null,
        },
        state: {
            type: String,
            enum: ["ativo", "produção", "inativo"],
            default: "ativo",
        },
        category: {
            type: String,
            enum: ["Master", "Coordenador", "Técnico", "Servidor", "Cidadão"],
            default: "Servidor",
            required: true,
        },
        allowedDepartments: [{ type: String }],
    },
    { timestamps: true }
);

const App = mongoose.model("App", appSchema);

export default App;
