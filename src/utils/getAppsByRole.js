import App from "../models/appSchema.js";

const getAppsByRole = async (role) => {
    const appsPorTipo = {
        user: ["Oportunidades", "IPTU"],
        member: ["Chamados", "IPTU", "Oportunidades", "ItaMail", "ItaCloud", "ItaDesk"],
        tecnico: ["ChamadosTecnicos", "OportunidadesTecnico", "ItaMail", "ItaCloud"],
        master: [
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

    if (role === 'master') {
        // Para o 'master', buscamos todos os apps necessários para esse papel
        apps = await App.find({ name: { $in: appsPorTipo.master } });
    } else if (appsPorTipo[role]) {
        // Para outros roles, buscamos os apps de acordo com a configuração
        apps = await App.find({ name: { $in: appsPorTipo[role] } });
    }

    return apps;
};

export default getAppsByRole;
