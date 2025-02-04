import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import userRoutes from './routes/userRoutes.js'
import appsRoutes from './routes/appsRoutes.js'
import { connectDB } from './config/db.js'
import passport from 'passport'
import LdapStrategy from 'passport-ldapauth'
dotenv.config()

const app = express()

// Middlewares
app.use(express.json())
app.use(passport.initialize());
app.use(express.urlencoded({ extended: true }));
app.use(cors());


// Rotas
app.use('/api/users', userRoutes)
app.use('/api/apps', appsRoutes)

app.get('/', (req, res) => {
    res.send('Hello from Vercel!');
});


const PORT = process.env.PORT || 5000
connectDB()

app.listen(PORT, () => console.log(`Server runing ${PORT}`))



// Configuração do LDAP para autenticação direta pelo corpo da requisição
const LDAP_OPTIONS = {
    server: {
        url: process.env.LDAP_URL,
        bindDN: process.env.LDAP_BIND_DN,
        bindCredentials: process.env.LDAP_BIND_CREDENTIALS,
        searchBase: process.env.LDAP_SEARCH_BASE,
        searchFilter: "(sAMAccountName={{username}})",
    }
};


// Configurar o Passport para autenticação LDAP
passport.use(new LdapStrategy(LDAP_OPTIONS));

