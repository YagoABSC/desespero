const database = require('../database/connection');
const getDistance = require('../utils/getDistance');
const getCoordinatesFromCep = require('../utils/getCoordinatesFromCep');
const dotenv = require('dotenv');
dotenv.config();

class PedreiroController {
    async listarTiposdeServicos(req, res) {
        try {
            const { pedreiro_id } = req.params;
            console.log("Recebendo solicitação para listar tipos de serviços do pedreiro:", pedreiro_id);

            // Verifica se o pedreiro existe
            const pedreiro = await database('pedreiros').where({ id: pedreiro_id }).first();
            if (!pedreiro) {
                console.log("Pedreiro não encontrado.");
                return res.status(404).json({ message: "Pedreiro não encontrado." });
            }

            // Busca os tipos de serviços que o pedreiro faz
            const tiposServicos = await database('pedreiros_tipo_servicos')
                .join('tipo_servicos', 'pedreiros_tipo_servicos.tipo_servico_id', 'tipo_servicos.id')
                .where('pedreiros_tipo_servicos.pedreiro_id', pedreiro_id)
                .select('tipo_servicos.id', 'tipo_servicos.nome_servico', 'tipo_servicos.desc_servico', 'tipo_servicos.img_servico');

            console.log("Tipos de serviços encontrados:", tiposServicos);
            return res.status(200).json({ tiposServicos });
        } catch (error) {
            console.error("Erro ao buscar tipos de serviços:", error);
            return res.status(500).json({ message: "Erro ao buscar tipos de serviços." });
        }
    }

    async servicosPrestados(req, res) {
        try {
            const { pedreiro_id } = req.params;

            // Verifica se o pedreiro existe e está ativo
            const pedreiro = await database('pedreiros')
                .where({ id: pedreiro_id, ativo: 1 })
                .first();

            if (!pedreiro) {
                return res.status(404).json({ message: "Pedreiro não encontrado ou inativo." });
            }

            // Obtém a localização do pedreiro pelo CEP
            const pedreiroLocation = await getCoordinatesFromCep(pedreiro.cep);
            if (!pedreiroLocation.latitude || !pedreiroLocation.longitude) {
                return res.status(400).json({ message: "Não foi possível obter a localização do pedreiro." });
            }

            // Busca os serviços prestados pelo pedreiro com status finalizado
            const servicos = await database('servicos_postados')
                .join('tipo_servicos', 'servicos_postados.tipo_servico_id', 'tipo_servicos.id')
                .join('contratantes', 'servicos_postados.contratante_id', 'contratantes.id') // Join para pegar o telefone do contratante
                .where({ pedreiro_id })
                .whereIn('status', ['em andamento', 'aceito', 'aguardando confirmacao', 'finalizado'])
                .select(
                    'servicos_postados.id',
                    'servicos_postados.descricao',
                    'servicos_postados.prazo',
                    'servicos_postados.valor',
                    'servicos_postados.status',
                    'servicos_postados.cep_obra',
                    'servicos_postados.contratante_id',
                    'tipo_servicos.nome_servico',
                    'tipo_servicos.img_servico',
                    'contratantes.nome',
                    'contratantes.telefone' // Adicionando o telefone do contratante
                );

            if (servicos.length === 0) {
                return res.status(404).json({ message: "Nenhum serviço prestado encontrado." });
            }

            // Processa os serviços e calcula localização + distância
            const servicosComEndereco = await Promise.all(servicos.map(async (servico) => {
                if (!servico.cep_obra) {
                    console.warn(`Serviço ${servico.id} sem CEP de obra cadastrado.`);
                    return { ...servico, endereco: "Não disponível", bairro: "Não disponível", latitude: null, longitude: null, distancia_km: null };
                }

                // Obtém informações do endereço da obra
                const obraLocation = await getCoordinatesFromCep(servico.cep_obra);
                let distancia = null;

                if (obraLocation.latitude && obraLocation.longitude) {
                    distancia = await getDistance(
                        pedreiroLocation.latitude, pedreiroLocation.longitude,
                        obraLocation.latitude, obraLocation.longitude
                    );
                    distancia = parseFloat(distancia.toFixed(2));
                }

                return {
                    ...servico,
                    endereco: obraLocation.logradouro || "Não informado",
                    bairro: obraLocation.bairro || "Não informado",
                    distancia_km: distancia
                };
            }));
            return res.status(200).json({ servicos: servicosComEndereco });

        } catch (error) {
            return res.status(500).json({ message: "Erro ao buscar serviços prestados." });
        }
    }
    // Função para vincular pedreiros a serviços
    async vincularServicos(req, res) {
        try {
            const { pedreiro_id, tipo_servicos } = req.body;

            // Verifica se os dados são válidos
            if (!pedreiro_id || !tipo_servicos || !Array.isArray(tipo_servicos) || tipo_servicos.length === 0) {
                return res.status(400).json({ message: "Dados inválidos ou incompletos." });
            }

            // Verifica se o pedreiro existe e se é premium
            const pedreiro = await database('pedreiros').where({ id: pedreiro_id }).first();
            if (!pedreiro) {
                return res.status(404).json({ message: "Pedreiro não encontrado." });
            }

            // Define o limite de serviços com base no status premium
            const limiteServicos = pedreiro.premium ? 5 : 3;

            // Verifica quantos serviços o pedreiro já está vinculado
            const servicosVinculados = await database('pedreiros_tipo_servicos')
                .where({ pedreiro_id })
                .count('tipo_servico_id as total');

            const totalServicosVinculados = parseInt(servicosVinculados[0].total);

            // Verifica se o novo número de serviços excede o limite
            if (totalServicosVinculados + tipo_servicos.length > limiteServicos) {
                return res.status(400).json({ message: `Limite de serviços excedido. O pedreiro pode se vincular a no máximo ${limiteServicos} serviços.` });
            }

            // Prepara os dados para inserção
            const valores = tipo_servicos.map(tipo_servico_id => ({
                pedreiro_id,
                tipo_servico_id
            }));

            // Insere os dados na tabela pedreiros_tipo_servicos
            await database('pedreiros_tipo_servicos').insert(valores);

            return res.status(200).json({ message: "Pedreiros vinculados aos serviços com sucesso!" });
        } catch (error) {
            console.error("Erro ao vincular pedreiros aos serviços:", error);
            return res.status(500).json({ message: "Erro ao vincular pedreiros aos serviços." });
        }
    }

    async buscarServicos(req, res) {
        try {
            const { pedreiro_id } = req.params;

            const pedreiro = await database('pedreiros')
                .where({ id: pedreiro_id, ativo: 1 })
                .first();

            if (!pedreiro) {
                return res.status(404).json({ message: "Pedreiro não encontrado ou inativo." });
            }

            const servicosHabilitados = await database('pedreiros_tipo_servicos')
                .where({ pedreiro_id })
                .pluck('tipo_servico_id');

            if (servicosHabilitados.length === 0) {
                return res.status(400).json({ message: "O pedreiro não está habilitado para nenhum serviço." });
            }

            const { total } = await database('servicos_postados')
                .where({ pedreiro_id })
                .whereIn('status', ['aceito', 'aguardando confirmacao'])
                .count('* as total')
                .first();

            if (total > 2) {
                return res.status(400).json({ message: "O pedreiro já está em dois serviços em andamento." });
            }

            const cepPedreiro = await getCoordinatesFromCep(pedreiro.cep);
            if (!cepPedreiro.latitude || !cepPedreiro.longitude) {
                return res.status(400).json({ message: "Não foi possível obter a localização do pedreiro." });
            }

            const servicosDisponiveis = await database('servicos_postados')
                .join('tipo_servicos', 'servicos_postados.tipo_servico_id', '=', 'tipo_servicos.id')
                .whereIn('servicos_postados.tipo_servico_id', servicosHabilitados)
                .where({ 'servicos_postados.status': 'pendente' })
                .select(
                    'servicos_postados.id',
                    'servicos_postados.descricao',
                    'servicos_postados.prazo',
                    'servicos_postados.tipo_servico_id',
                    'servicos_postados.valor',
                    'tipo_servicos.nome_servico',
                    'tipo_servicos.img_servico',
                    'servicos_postados.cep_obra'
                );

            if (servicosDisponiveis.length === 0) {
                return res.status(200).json({ servicos: [], hasServicos: false, message: "Nenhum serviço disponível." });
            }

            const servicosFiltrados = [];

            for (const servico of servicosDisponiveis) {
                const cepObra = await getCoordinatesFromCep(servico.cep_obra);

                if (cepObra.latitude && cepObra.longitude) {
                    const distancia = await getDistance(
                        cepPedreiro.latitude, cepPedreiro.longitude,
                        cepObra.latitude, cepObra.longitude
                    );

                    servicosFiltrados.push({
                        id: servico.id,
                        descricao: servico.descricao,
                        prazo: servico.prazo,
                        tipo_servico_id: servico.tipo_servico_id,
                        valor: servico.valor,
                        nome_servico: servico.nome_servico,
                        img_servico: servico.img_servico,
                        distancia_km: parseFloat(distancia.toFixed(2)),
                        endereco: cepObra.logradouro || "Não informado",
                        bairro: cepObra.bairro || "Não informado",
                        cidade: cepObra.localidade || "Não informada" // Adicionando a cidade
                    });
                }
            }

            if (servicosFiltrados.length === 0) {
                return res.status(200).json({ message: "Nenhum serviço disponível." });
            }

            servicosFiltrados.sort((a, b) => a.distancia_km - b.distancia_km);

            return res.status(200).json({ servicos: servicosFiltrados });
        } catch (error) {
            console.error("Erro ao buscar serviços:", error);
            return res.status(500).json({ message: "Erro ao buscar serviços." });
        }
    }


}

module.exports = new PedreiroController();
