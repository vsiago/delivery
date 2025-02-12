import App from "../models/appSchema.js";

const getAppsByRole = async (role) => {
    const appsPorTipo = {
        user: ["Oportunidades", "IPTU"],
        Membro: ["Chamados", "IPTU", "ItaMail", "ItaCloud", "ItaDesk"],
        Técnico: ["ChamadosTecnicos", "OportunidadesTecnico", "ItaMail", "ItaCloud"],
        administrador: ["AD"],
        Master: [
            "Chamados",
            "ChamadosTecnicos",
            "Oportunidades",
            "OportunidadesTecnico",
            "ItaMail",
            "ItaCloud",
            "ItaDesk",
            "IPTU"
        ]
    };

    let apps = [];

    if (role === 'Master') {
        // Para o 'Master', buscamos todos os apps necessários para esse papel
        apps = await App.find({ name: { $in: appsPorTipo.Master } });
    } else if (appsPorTipo[role]) {
        // Para outros roles, buscamos os apps de acordo com a configuração
        apps = await App.find({ name: { $in: appsPorTipo[role] } });
    }

    return apps;
};

export default getAppsByRole;
