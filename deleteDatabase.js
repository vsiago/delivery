import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// Conectar ao MongoDB Atlas
const conectarBancoDados = async () => {
    try {
        await mongoose.connect(process.env.URI);
        console.log('Conectado ao MongoDB com sucesso!');
    } catch (erro) {
        console.error(`Erro ao conectar ao MongoDB: ${erro.message}`);
        process.exit(1);
    }
};

// Função para deletar o banco de dados
const deletarBancoDeDados = async () => {
    try {
        // Conectar ao MongoDB
        await conectarBancoDados();

        // Deletar o banco de dados
        const conexao = mongoose.connection;
        const dbName = conexao.name; // Nome do banco de dados conectado

        console.log(`Deletando o banco de dados: ${dbName}...`);

        await mongoose.connection.db.dropDatabase();
        console.log(`Banco de dados ${dbName} deletado com sucesso!`);

        // Fechar a conexão após a operação
        mongoose.connection.close();
    } catch (erro) {
        console.error(`Erro ao deletar o banco de dados: ${erro.message}`);
        mongoose.connection.close();
        process.exit(1);
    }
};

// Executar a função
deletarBancoDeDados();
