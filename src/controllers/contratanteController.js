const database = require('../database/connection');
const getCoordinatesFromCep = require('../utils/getCoordinatesFromCep');
const getDistance = require('../utils/getDistance'); 
const dotenv = require('dotenv');
dotenv.config();
const { DateTime } = require('luxon');
function getBrazilianTimestamp() {
    return DateTime.now().setZone('America/Sao_Paulo').toFormat('yyyy-MM-dd HH:mm:ss');
}
class ContratanteController {
    async postarServico(req, res) {
        try {
            const { descricao, contratante_id, tipo_servico, cep_obra, prazo } = req.body;
            let { valor } = req.body; 
    
            // Verifica se os campos obrigatórios foram enviados
            if (!descricao || !contratante_id || !tipo_servico || !cep_obra || !prazo ) {
                return res.status(400).json({ message: "Todos os campos são obrigatórios." });
            }
            if (valor <= 0 || valor == null) {
                valor = "A combinar";
            }
            // Validação básica do formato do CEP
            if (!/^\d{5}-?\d{3}$/.test(cep_obra)) {
                return res.status(400).json({ message: "CEP inválido. O formato deve ser 00000-000." });
            }
    
            // Verifica se o contratante existe e está ativo
            const contratante = await database('contratantes')
                .where({ id: contratante_id, ativo: 1 })
                .first();
    
            if (!contratante) {
                return res.status(404).json({ message: "Contratante não encontrado ou inativo." });
            }
    
            // Verifica se o tipo de serviço existe
            const tipoServicoExistente = await database('tipo_servicos')
                .where({ id: tipo_servico })
                .first();
    
            if (!tipoServicoExistente) {
                return res.status(404).json({ message: "Tipo de serviço não encontrado." });
            }
    
            // Verifica se o CEP da obra existe na tabela `ceps`
            let cepExistente = await database('ceps')
                .where({ cep: cep_obra })
                .first();
    
            // Caso o CEP não exista, ele será gerado
            if (!cepExistente) {
                const { latitude, longitude } = await getCoordinatesFromCep(cep_obra);
                if (latitude && longitude) {
                    await database('ceps').insert({
                        cep: cep_obra,
                        latitude,
                        longitude
                    });
                } else {
                    return res.status(400).json({ message: "Não foi possível obter as coordenadas para o CEP informado." });
                }
            }
    
            // Insere o serviço
            const [servicoId] = await database('servicos_postados').insert({
                descricao,
                contratante_id,
                tipo_servico_id: tipo_servico,
                cep_obra,
                prazo,
                valor,
                data_postagem: getBrazilianTimestamp() // Substituído aqui
            });
    
            return res.status(201).json({
                message: "Serviço postado com sucesso!",
                data: {
                    servico_id: servicoId
                }
            });
        } catch (error) {
            console.error("Erro ao postar serviço:", error);
            return res.status(500).json({ message: "Ocorreu um erro ao postar o serviço.", error: error.message });
        }
    }
    async postarAvaliacao(req, res) {
        try {
            const { pedreiro_id, contratante_id, nota, comentario } = req.body;
    
            // Verifica se os campos obrigatórios foram enviados
            if (!pedreiro_id || !contratante_id || !nota) {
                return res.status(400).json({ message: "Pedreiro, Contratante e Nota são obrigatórios." });
            }
    
            // Verifica se a nota está no intervalo válido
            if (nota < 1 || nota > 5) {
                return res.status(400).json({ message: "A nota deve ser entre 1 e 5." });
            }
    
            // Verifica se o pedreiro existe
            const pedreiro = await database('pedreiros').where({ id: pedreiro_id }).first();
            if (!pedreiro) {
                return res.status(404).json({ message: "Pedreiro não encontrado." });
            }
    
            // Verifica se o contratante existe
            const contratante = await database('contratantes').where({ id: contratante_id }).first();
            if (!contratante) {
                return res.status(404).json({ message: "Contratante não encontrado." });
            }
    
            // Verifica se o contratante já avaliou esse pedreiro
            const avaliacaoExistente = await database('avaliacoes')
                .where({ contratante_id, pedreiro_id })
                .first();
    
            if (avaliacaoExistente) {
                return res.status(400).json({ message: "Você já avaliou esse pedreiro." });
            }
    
            // Insere a avaliação
            const [avaliacaoId] = await database('avaliacoes').insert({
                pedreiro_id,
                contratante_id,
                nota,
                comentario,
                data_avaliacao: getBrazilianTimestamp() // Substituído aqui
            });
    
            return res.status(201).json({
                message: "Avaliação postada com sucesso!",
                avaliacao_id: avaliacaoId
            });
        } catch (error) {
            console.error("Erro ao postar avaliação:", error);
            return res.status(500).json({ message: "Ocorreu um erro ao postar a avaliação." });
        }
    }   
    
    async buscarPedreiros(req, res) {
        try {
            const { tipo_servico_id, cep_contratante } = req.body;
    
            if (!tipo_servico_id || !cep_contratante) {
                return res.status(400).json({ message: "O tipo de serviço e o CEP do contratante são obrigatórios." });
            }
    
            const tipoServico = await database('tipo_servicos')
                .where({ id: tipo_servico_id })
                .first();
    
            if (!tipoServico) {
                return res.status(404).json({ message: "Tipo de serviço não encontrado." });
            }
    
            let cepContratante = await database('ceps')
                .where({ cep: cep_contratante })
                .first();
    
            // Se o CEP não estiver no banco, obtém as coordenadas via API e armazena no banco
            if (!cepContratante) {
                console.warn("CEP do contratante não encontrado no banco. Buscando na API ViaCEP...");
                const { latitude, longitude } = await getCoordinatesFromCep(cep_contratante);
                if (latitude && longitude) {
                    await database('ceps').insert({
                        cep: cep_contratante,
                        latitude,
                        longitude
                    });
                    cepContratante = { cep: cep_contratante, latitude, longitude };
                } else {
                    return res.status(400).json({ message: "Não foi possível obter as coordenadas para o CEP informado." });
                }
            }
    
            const pedreirosHabilitados = await database('pedreiros_tipo_servicos')
                .where({ tipo_servico_id })
                .join('pedreiros', 'pedreiros_tipo_servicos.pedreiro_id', 'pedreiros.id')
                .select(
                    'pedreiros.id',
                    'pedreiros.nome',
                    'pedreiros.telefone',
                    'pedreiros.cpf',
                    'pedreiros.cep',
                    'pedreiros.email',
                    'pedreiros.img_perfil',
                    'pedreiros.premium',
                    'pedreiros.ativo',
                    'pedreiros.data_criacao'
                );
    
            if (pedreirosHabilitados.length === 0) {
                return res.status(404).json({ message: "Nenhum pedreiro encontrado para o tipo de serviço solicitado." });
            }
    
            const cepsPedreiros = await database('ceps')
                .whereIn('cep', pedreirosHabilitados.map(pedreiro => pedreiro.cep));
    
            const mapaCepsPedreiros = Object.fromEntries(cepsPedreiros.map(cep => [cep.cep, cep]));
    
            const pedreirosFiltrados = [];
    
            for (const pedreiro of pedreirosHabilitados) {
                let cepPedreiro = mapaCepsPedreiros[pedreiro.cep];
    
                // Se o CEP do pedreiro não estiver no banco, buscar na API ViaCEP
                if (!cepPedreiro) {
                    console.warn(`CEP do pedreiro ${pedreiro.nome} não encontrado no banco. Buscando na API ViaCEP...`);
                    const { latitude, longitude } = await getCoordinatesFromCep(pedreiro.cep);
                    if (latitude && longitude) {
                        await database('ceps').insert({
                            cep: pedreiro.cep,
                            latitude,
                            longitude
                        });
                        cepPedreiro = { cep: pedreiro.cep, latitude, longitude };
                    } else {
                        continue; // Pula esse pedreiro se não for possível obter as coordenadas
                    }
                }
    
                const distancia = await getDistance(
                    cepContratante.latitude, cepContratante.longitude,
                    cepPedreiro.latitude, cepPedreiro.longitude
                );
    
                if (distancia && distancia <= 15) {
                    const avaliacoes = await database('avaliacoes')
                        .where({ pedreiro_id: pedreiro.id });
    
                    const mediaAvaliacoes = avaliacoes.length > 0
                        ? avaliacoes.reduce((sum, av) => sum + av.nota, 0) / avaliacoes.length
                        : 0;
    
                    const { senha, ...pedreiroSemSenha } = pedreiro;
    
                    pedreirosFiltrados.push({
                        ...pedreiroSemSenha,
                        distancia_km: parseFloat(distancia.toFixed(2)),
                        media_avaliacoes: parseFloat(mediaAvaliacoes.toFixed(2)),
                        avaliacoes
                    });
                }
            }
    
            if (pedreirosFiltrados.length === 0) {
                return res.status(200).json({ message: "Nenhum pedreiro encontrado dentro do raio de 15 km." });
            }
    
            pedreirosFiltrados.sort((a, b) => a.distancia_km - b.distancia_km);
    
            return res.status(200).json({ pedreiros: pedreirosFiltrados });
        } catch (error) {
            console.error("Erro ao buscar pedreiros:", error);
            return res.status(500).json({ message: "Erro ao buscar pedreiros." });
        }
    }
    
    
}

module.exports = new ContratanteController();