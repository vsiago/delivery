import mongoose from 'mongoose';

const appSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String,
        required: true
    },
    logo: {
        type: String, // URL do logo (pode ser um caminho ou link para a imagem)
        required: true
    },
    url: {
        type: String, // URL do aplicativo
        required: true
    },
    status: {
        type: String,
        enum: ['ativo', 'produção', 'inativo'],
        default: 'ativo'
    }
}, { timestamps: true });

const App = mongoose.model('App', appSchema);

export default App;
