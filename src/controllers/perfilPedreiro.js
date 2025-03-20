const getCoordinatesFromCep = require('../utils/getCoordinatesFromCep');
const database = require('../database/connection');
const dotenv = require('dotenv');
const cloudinary = require('../utils/cloudinary')
const bcrypt = require('bcryptjs');

dotenv.config();

class PerfilPedreiro {
    // Listar historicos do pedreiro 
    async historicoServicos(req, res) {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ mensagem: 'ID do pedreiro é necessário' });
        }

        try {
            const historico = await database('servicos_postados')
                .select(
                    'servicos_postados.*',
                    'tipo_servicos.nome_servico as nome_servico',
                    'tipo_servicos.img_servico as img_servico' // Pega o nome do serviço
                )
                .join('tipo_servicos', 'tipo_servicos.id', '=', 'servicos_postados.tipo_servico_id') // Faz o join
                .where('servicos_postados.pedreiro_id', id)
                .andWhere('servicos_postados.status', 'finalizado');

            if (historico.length === 0) {
                return res.status(404).json({ mensagem: 'Nenhum histórico de serviços encontrado para este pedreiro' });
            }

            const historicoComEndereco = [];

            for (const servico of historico) {
                const cepObra = await getCoordinatesFromCep(servico.cep_obra);

                // Formatar a data para DD/MM/AAAA
                let dataFormatada = null;
                if (servico.data_finalizacao) {
                    dataFormatada = new Date(servico.data_finalizacao).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                    });
                }

                historicoComEndereco.push({
                    id: servico.id,
                    descricao: servico.descricao,
                    prazo: servico.prazo,
                    data_final: dataFormatada, // Data formatada
                    valor: servico.valor,
                    tipo_servico_id: servico.tipo_servico_id,
                    nome_servico: servico.nome_servico, // Agora incluímos o nome do serviço
                    img_servico: servico.img_servico,
                    endereco: cepObra.logradouro || "Não informado",
                    bairro: cepObra.bairro || "Não informado"
                });
            }

            res.json({ historico: historicoComEndereco });
        } catch (error) {
            console.error("Erro ao buscar o histórico de serviços:", error);
            res.status(500).json({ mensagem: 'Erro ao buscar o histórico de serviços' });
        }
    }


    // Nova função para obter o total de serviços finalizados
    async totalServicosFinalizados(req, res) {
        const { id } = req.params;

        // Verifica se o id foi fornecido na URL
        if (!id) {
            return res.status(400).json({ mensagem: 'ID do pedreiro é necessário' });
        }

        try {
            // Consulta o total de serviços finalizados do pedreiro
            const total = await database('servicos_postados')
                .where('pedreiro_id', id)
                .andWhere('status', 'finalizado')
                .count('id as total');

            // Retorna o total de serviços finalizados
            res.json({ total: total[0].total });
        } catch (error) {
            console.log(error);
            res.status(500).json({ mensagem: 'Erro ao buscar o total de serviços finalizados' });
        }
    }
    // Listar avaliações do pedreiro 
    async listarAvaliacoes(request, response) {
        const { id } = request.params;
        // Verifica se o id foi fornecido na URL    
        if (!id) {
            return response.status(400).json({ mensagem: 'ID do pedreiro é necessário' });
        }
        try {
            // Consulta as avaliações do pedreiro
            const avaliacoes = await database
                .select('avaliacoes.nota')
                .from('avaliacoes')
                .where('avaliacoes.pedreiro_id', id);

            // Calcula a média das notas
            const totalNotas = avaliacoes.reduce((acc, avaliacao) => acc + avaliacao.nota, 0);
            const mediaNotas = (totalNotas / avaliacoes.length).toFixed(2);

            // Retorna a média das avaliações
            response.json({ media: `${mediaNotas}` });
        } catch (error) {
            console.log(error);
            response.status(500).json({ mensagem: 'Erro ao buscar as avaliações' });
        }
    }
    // Listar um pedreiro 
    async listarPedreiro(request, response) {
        const { id } = request.params;

        // Verifica se o id foi fornecido na URL
        if (!id) {
            return response.status(400).json({ mensagem: 'ID do pedreiro é necessário' });
        }

        try {
            // Consulta apenas os dados do pedreiro (nome, telefone, email, cep e cpf)
            const pedreiro = await database
                .select('pedreiros.id', 'pedreiros.nome', 'pedreiros.telefone', 'pedreiros.email', 'pedreiros.cep', 'pedreiros.cpf', 'pedreiros.img_perfil')
                .from('pedreiros')
                .where('pedreiros.id', id);

            // Verifica se o pedreiro foi encontrado
            if (pedreiro.length === 0) {
                return response.status(404).json({ mensagem: 'Pedreiro não encontrado' });
            }

            // Extrai os dados do pedreiro
            const pedreiroData = {
                id: pedreiro[0].id,
                nome: pedreiro[0].nome,
                telefone: pedreiro[0].telefone,
                email: pedreiro[0].email,
                cep: pedreiro[0].cep,
                img: pedreiro[0].img_perfil,
                cpf: pedreiro[0].cpf
            };

            // Retorna os dados do pedreiro
            response.json(pedreiroData);
        } catch (error) {
            console.log(error);
            response.status(500).json({ mensagem: 'Erro ao buscar o pedreiro' });
        }
    }
    // Atualizar os dados de um pedreiro 
    async atualizarPedreiro(request, response) {
        const { id } = request.params;
        const { nome, telefone, email, cep, tipos_servicos } = request.body;

        console.log("Dados recebidos:", { id, nome, telefone, email, cep, tipos_servicos });

        if (!id) {
            return response.status(400).json({ mensagem: 'ID do pedreiro é necessário' });
        }

        if (!nome || !telefone || !email || !cep) {
            return response.status(400).json({ mensagem: 'Nome, telefone, email e cep são obrigatórios' });
        }

        try {
            // Obtém as coordenadas do CEP
            const { latitude, longitude, message } = await getCoordinatesFromCep(cep);
            if (message) {
                return response.status(400).json({ mensagem: message });
            }

            // Verifica se o CEP já existe e atualiza ou insere
            const cepExists = await database('ceps').where({ cep }).first();
            if (!cepExists) {
                await database('ceps').insert({ cep, latitude, longitude });
            } else {
                await database('ceps').where({ cep }).update({ latitude, longitude });
            }

            // Atualiza os dados do pedreiro
            await database('pedreiros').where({ id }).update({ nome, telefone, email, cep });

            // Atualiza os tipos de serviço, se necessário
            if (tipos_servicos && Array.isArray(tipos_servicos)) {
                // Remova o código anterior que atualizava um par de ids
                await database('pedreiros_tipo_servicos')
                    .where({ pedreiro_id: id })
                    .del(); // Primeiro deleta todos os tipos de serviço associados

                // Agora insira os novos tipos de serviço
                const servicosParaVincular = tipos_servicos.map(servicoId => ({
                    pedreiro_id: id,
                    tipo_servico_id: servicoId
                }));

                if (servicosParaVincular.length > 0) {
                    await database('pedreiros_tipo_servicos').insert(servicosParaVincular);
                }
            }

            response.json({ mensagem: 'Dados do pedreiro atualizados com sucesso!' });
        } catch (error) {
            console.error(error);
            response.status(500).json({ mensagem: 'Erro ao atualizar os dados do pedreiro' });
        }
    }
    //Atualizar senha do pedreiro
    async atualizarSenha(req, res) {
        const { novaSenha } = req.body;

        try {
            const usuario_id = req.user.id;

            // Tenta encontrar o pedreiro
            let pedreiro = await database('pedreiros').where('id', usuario_id).first();

            if (!pedreiro) {
                return res.status(400).json({ message: "Pedreiro não encontrado!" });
            }

            // Criptografar a nova senha antes de salvar
            const senhaHash = await bcrypt.hash(novaSenha, 10);

            // Atualiza a senha no banco de dados
            await database('pedreiros')
                .where('id', pedreiro.id)
                .update({ senha: senhaHash });

            return res.status(200).json({ message: "Senha atualizada com sucesso!" });

        } catch (error) {
            console.error('Erro ao editar senha:', error);
            return res.status(500).json({ message: "Ocorreu um erro ao editar a senha." });
        }
    }

    // Atualizar foto de perfil 
    async atualizarFotoPerfil(req, res) {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ mensagem: "ID do pedreiro é necessário" });
        }

        if (!req.file) {
            return res.status(400).json({ mensagem: "Nenhuma imagem foi enviada" });
        }

        try {
            // Buscar a URL da foto antiga no banco
            const pedreiro = await database("pedreiros").where({ id }).first();

            if (pedreiro && pedreiro.img_perfil) {
                // Extrair o public_id da URL do Cloudinary
                const publicId = pedreiro.img_perfil.split("/").pop().split(".")[0];

                // Excluir a imagem anterior do Cloudinary
                await cloudinary.uploader.destroy(`perfil_pedreiros/${publicId}`);
            }

            // Upload da nova imagem para o Cloudinary
            cloudinary.uploader.upload_stream(
                { folder: "perfil_pedreiros", transformation: [{ width: 300, height: 300, crop: "fill" }] },
                async (error, result) => {
                    if (error) {
                        console.error("Erro no Cloudinary:", error);
                        return res.status(500).json({ mensagem: "Erro ao salvar a imagem no Cloudinary" });
                    }

                    // Atualizar a URL da imagem no banco
                    await database("pedreiros").where({ id }).update({ img_perfil: result.secure_url });

                    res.json({ mensagem: "Foto de perfil atualizada com sucesso!", img_perfil: result.secure_url });
                }
            ).end(req.file.buffer);

        } catch (error) {
            console.error("Erro ao atualizar a foto de perfil:", error);
            res.status(500).json({ mensagem: "Erro ao atualizar a foto de perfil" });
        }
    }



    async deletarPedreiro(req, res) {
        const { id, senha } = req.body; // Agora pegamos do body, não dos params

        if (!id || !senha) {
            return res.status(400).json({ mensagem: 'ID e senha são necessários' });
        }

        try {
            const pedreiro = await database('pedreiros').where({ id }).first();

            if (!pedreiro) {
                return res.status(404).json({ mensagem: 'Pedreiro não encontrado' });
            }

            const senhaCorreta = await bcrypt.compare(senha, pedreiro.senha);

            if (!senhaCorreta) {
                return res.status(401).json({ mensagem: 'Senha incorreta' });
            }

            await database('pedreiros_tipo_servicos').where({ pedreiro_id: id }).del();
            await database('pedreiros').where({ id }).del();

            res.json({ mensagem: 'Sua conta foi excluída com sucesso!' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ mensagem: 'Erro ao excluir a conta' });
        }
    }

}

module.exports = new PerfilPedreiro();

