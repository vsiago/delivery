import User from '../models/userModel.js'
import UserApps from "../models/UserApps.js";
import App from '../models/appSchema.js'
import getAppsByRole from '../utils/getAppsByRole.js';
import jwt from 'jsonwebtoken';
import passport from 'passport'
import LdapStrategy from 'passport-ldapauth'
import dotenv from 'dotenv'
import bcrypt from 'bcrypt'

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
const getUserApps = async (user) => {
  // Buscar apps padrão baseado no papel do usuário
  const defaultApps = await getAppsByRole(user.role);

  // Buscar os apps que foram atribuídos manualmente ao usuário
  const userApps = user.apps || [];
  const manualApps = await App.find({ name: { $in: userApps } });

  // Combinar ambos, garantindo que não haja duplicatas
  const allApps = [...defaultApps, ...manualApps].filter(
    (app, index, self) =>
      index === self.findIndex((a) => a.name === app.name) // Remover duplicatas
  );

  return allApps;
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

  if (!data || !password) {
    return res.status(400).json({ message: 'Por favor, preencha todos os campos' });
  }

  try {
    if (data.includes('@')) {
      // Login via email (usuários não LDAP)
      const email = data;
      let user = await User.findOne({ email });

      if (user && (await user.matchPassword(password))) {
        const apps = await getAppsByRole(user.role);
        return res.status(200).json({
          _id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          apps,
          token: generateToken(user.id, user.name, user.email, user.role),
        });
      } else {
        return res.status(401).json({ message: 'Credenciais inválidas' });
      }
    } else if (data.includes('.')) {


      // Login via LDAP
      const username = data;
      req.body.username = username;
      req.body.password = password;

      passport.authenticate("ldapauth", { session: false }, async (err, ldapUser, info) => {
        if (err) {
          console.error("Erro no LDAP:", err);
          return res.status(500).json({ error: "Erro interno no servidor" });
        }

        if (!ldapUser) {
          console.warn("Autenticação falhou:", info);
          return res.status(401).json({ error: "Usuário ou senha inválidos" });
        }

        try {
          const username = ldapUser.sAMAccountName;
          const name = ldapUser.givenName || ldapUser.cn;
          const email = ldapUser.mail;
          const dn = ldapUser.dn;
          const memberOf = ldapUser.memberOf;

          // Determinar o papel do usuário
          let role = 'member';
          if (Array.isArray(memberOf) && memberOf.some(group => group.includes('STI'))) {
            role = 'tecnico';
          }

          // Buscar usuário no banco
          let user = await User.findOne({ $or: [{ email }, { username }] });

          if (!user) {
            // Criar usuário se não existir
            user = new User({ username, name, email, role, dn, memberOf });
            await user.save();
          } else {
            // Comparar e atualizar se necessário (INCLUINDO USERNAME)
            if (
              user.username !== username ||  // Verifica se o username está salvo
              user.name !== name ||
              user.email !== email ||
              user.role !== role ||
              user.dn !== dn ||
              JSON.stringify(user.memberOf) !== JSON.stringify(memberOf)
            ) {
              await User.updateOne({ _id: user.id }, { username, name, email, role, dn, memberOf });
            }
          }


          const token = generateToken(user.id, user.name, user.email, role);

          // Buscar apps associados ao usuário (padrões + adicionados manualmente)
          const apps = await getUserApps(user);

          return res.json({
            user: {
              _id: user.id,
              username: user.username,
              name: user.name,
              email: user.email,
              role: user.role,
              apps, // Apps dentro de "user"
              createdAt: user.createdAt,
              updatedAt: user.updatedAt,
            },
            token // Agora o token é irmão de "user"
          });
        } catch (error) {
          console.error("Erro ao processar o LDAP:", error);
          return res.status(500).json({ error: "Erro ao salvar ou autenticar o usuário", message: error.message });
        }
      })(req, res);
    } else {
      return res.status(400).json({ message: 'Formato de login inválido' });
    }
  } catch (error) {
    return res.status(500).json({ message: 'Erro no servidor', error: error.message });
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


/**
 * Define quais aplicativos um usuário do LDAP pode acessar.
 */
export const definirAppsParaUsuario = async (req, res) => {
  const { username, apps } = req.body;

  try {
    const user = await User.findOneAndUpdate(
      { username },
      { $addToSet: { apps: { $each: apps } } }, // Adiciona sem duplicar
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    res.json({ message: "Apps atribuídos com sucesso", user });
  } catch (error) {
    console.error("Erro ao definir apps:", error);
    res.status(500).json({ message: "Erro interno no servidor" });
  }
};

export const removerApp = async (req, res) => {
  const { username, apps } = req.body;

  try {
    const user = await User.findOneAndUpdate(
      { username },
      { $pull: { apps: { $in: apps } } }, // Remove os apps que estiverem na lista
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    res.json({ message: "App(s) removido(s) com sucesso", user });
  } catch (error) {
    console.error("Erro ao remover app:", error);
    res.status(500).json({ message: "Erro interno no servidor" });
  }
};



export const obterUsuarioComApps = async (req, res) => {
  try {
    const { username } = req.params;
    console.log("🔍 Buscando usuário:", username); // Debug

    const user = await User.findOne({ username }).populate({
      path: "apps",
      select: "name description logo url status updatedAt"
    });

    console.log("Usuário no Login:", user);

    if (!user) {
      console.log("❌ Usuário não encontrado:", username);
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    return res.status(200).json({ user, apps: user.apps });
  } catch (error) {
    console.error("❌ Erro ao obter usuário:", error);
    return res.status(500).json({ message: "Erro interno do servidor" });
  }
};


// Atualizar o papel (role) de um usuário
export const updateUserRole = async (req, res) => {
  try {
    const { userId, newRole } = req.body;

    if (!userId || !newRole) {
      return res.status(400).json({ message: 'ID do usuário e novo papel são obrigatórios.' });
    }

    // Certifique-se de que o novo papel é válido
    const validRoles = ['master', 'user', 'member', 'tecnico'];
    if (!validRoles.includes(newRole)) {
      return res.status(400).json({ message: 'Papel inválido.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    user.role = newRole;
    await user.save();

    res.json({ message: `O usuário ${user.username} agora tem o papel de ${newRole}` });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar papel do usuário.', error: error.message });
  }
};