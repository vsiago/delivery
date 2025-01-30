import User from '../models/userModel.js'
import jwt from 'jsonwebtoken';
import passport from 'passport'
import LdapStrategy from 'passport-ldapauth'
import dotenv from 'dotenv'

dotenv.config()

// Função para gerar o token JWT
const generateToken = (id, name, email, role) => {
  return jwt.sign({ id, name, email, role }, process.env.JWT_SECRET, { expiresIn: '7d' });
};



// Controlador para registro de usuários
export const registerUser = async (req, res) => {


  const { name, email, password, role } = req.body;



  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Por favor, preencha todos os campos' });
  }

  try {
    // Verificar se o usuário já existe
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'Usuário já cadastrado' });
    }

    // Criar um novo usuário
    const newUser = await User.create({ name, email, password, role: role || 'user' });

    if (newUser) {
      res.status(201).json({
        _id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        token: generateToken(newUser.id, newUser.name, newUser.email, newUser.role),
      });
    } else {
      res.status(400).json({ message: 'Erro ao registrar usuário' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Erro no servidor', error: error.message });
  }
};
// Lista de aplicativos por grupo
const appsByGroup = {
  default: ["Chamados", "ITaMail", "ItaCloud"],
  AssistenciaTecnica: ["ChamadosOrders", "Email", "Suporte"],
  Financeiro: ["Faturas", "Relatórios"],
  Master: "ALL", // Acesso total
};

// Função para obter aplicativos permitidos com base nos grupos do usuário
const getUserApps = (userGroups) => {
  let allowedApps = new Set();

  userGroups.forEach((group) => {
    const groupName = group.split(",")[0].replace("CN=", ""); // Extrai o nome do grupo LDAP

    if (groupName in appsByGroup) {
      if (appsByGroup[groupName] === "ALL") {
        allowedApps = new Set(Object.values(appsByGroup).flat()); // Se for Master, vê tudo
      } else {
        appsByGroup[groupName].forEach((app) => allowedApps.add(app));
      }
    }
  });

  return Array.from(allowedApps);
};

// Função para mapear grupos LDAP para roles
const getUserRole = (userGroups) => {
  const roles = [];

  // Atribuindo roles baseadas nos grupos LDAP
  userGroups.forEach((group) => {
    const groupName = group.split(",")[0].replace("CN=", ""); // Extrai o nome do grupo LDAP
    if (groupName === "Area Tecnica STI") {
      roles.push("master");
    } else if (groupName === "AssistenciaTecnica") {
      roles.push("support");
    } else if (groupName === "Financeiro") {
      roles.push("finance");
    } else {
      roles.push("user");
    }
  });

  // Garantir que sempre exista ao menos um role
  return roles.length > 0 ? roles : ["user"];
};

// Controlador de login
export const loginUser = async (req, res) => {
  const { data, password } = req.body;

  // Verifica se o dado contém um '@', indicando um login por e-mail
  if (data.includes('@')) {
    // Login por e-mail
    const email = data;

    if (!email || !password) {
      return res.status(400).json({ message: 'Por favor, preencha todos os campos' });
    }

    try {
      // Encontrar o usuário pelo e-mail
      const user = await User.findOne({ email });

      if (user && (await user.matchPassword(password))) {
        return res.status(200).json({
          _id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          token: generateToken(user.id, user.name, user.email, user.role),
        });
      } else {
        return res.status(401).json({ message: 'Credenciais inválidas' });
      }
    } catch (error) {
      return res.status(500).json({ message: 'Erro no servidor', error: error.message });
    }
  } else if (data.includes('.')) {
    // Login via LDAP
    const username = data;
    const password = req.body.password;

    // Garantir que o username e password estejam presentes
    if (!username || !password) {
      return res.status(400).json({ error: "Usuário e senha são obrigatórios" });
    }

    // Passando username e password manualmente para req.body
    req.body.username = username;
    req.body.password = password;

    passport.authenticate("ldapauth", { session: false }, (err, user, info) => {
      if (err) {
        console.error("Erro no LDAP:", err);
        return res.status(500).json({ error: "Erro interno no servidor" });
      }

      if (!user) {
        console.warn("Autenticação falhou:", info);
        return res.status(401).json({ error: "Usuário ou senha inválidos" });
      }

      // Se o usuário for autenticado, retornar uma resposta de sucesso
      res.json({
        message: "Login bem-sucedido",
        user: {
          id: user.id,
          username: user.sAMAccountName,
          email: user.mail,
          name: user.cn,
          role: user.memberOf,
          allowedApps: user.allowedApps,
          token: generateToken(user.id, user.username),  // Função para gerar o token
        },
      });
    })(req, res);

  } else {
    return res.status(400).json({ message: 'Formato de login inválido' });
  }
};


// Controlador para obter detalhes do usuário autenticado
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (user) {
      res.status(200).json({
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      });
    } else {
      res.status(404).json({ message: 'Usuário não encontrado' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Erro no servidor', error: error.message });
  }
};