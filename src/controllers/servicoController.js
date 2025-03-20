const database = require('../database/connection');
const sendEmail = require('../utils/sendEmail'); // Importa a função de enviar e-mail
const cron = require('node-cron'); // Importa a biblioteca para agendamento de jobs
const { DateTime } = require('luxon');

function getBrazilianTimestamp() {
    return DateTime.now().setZone('America/Sao_Paulo').toFormat('yyyy-MM-dd HH:mm:ss');
}

class ServicoController {
    async confirmarAceitacao(req, res) {
        try {
            const { servico_id, resposta } = req.query;

            if (!servico_id || !resposta) {
                return res.status(400).json({ message: "servico_id e resposta são obrigatórios." });
            }


            const servico = await database('servicos_postados')
                .where({ id: servico_id, status: 'em andamento' })
                .first();

            if (!servico) {
                return res.status(404).json({ message: "Serviço não encontrado ou já confirmado." });
            }

            // Busca o contratante
            const contratante = await database('contratantes')
                .where({ id: servico.contratante_id })
                .first();

            if (!contratante) {
                return res.status(404).json({ message: "Contratante não encontrado." });
            }

            if (resposta === 'sim') {
                // Atualiza o status do serviço para "aceito"
                await database('servicos_postados')
                    .where({ id: servico_id })
                    .update({ status: 'aceito' });

                return res.status(200).json({ message: "Serviço aceito com sucesso!" });

            } else if (resposta === 'nao') {
                // Atualiza o status do serviço para "pendente" e remove o pedreiro_id
                await database('servicos_postados')
                    .where({ id: servico_id })
                    .update({
                        status: 'pendente',
                        pedreiro_id: null
                    });

                return res.status(200).json({ message: "Serviço recusado e status alterado para pendente." });
            } else {
                return res.status(400).json({ message: "Resposta inválida. Use 'sim' ou 'nao'." });
            }

        } catch (error) {
            console.error("Erro ao confirmar aceitação do serviço:", error);
            return res.status(500).json({ message: "Erro ao confirmar aceitação do serviço." });
        }
    }
    aceitarServico = async (req, res) => {
        try {
            const { servico_id, pedreiro_id } = req.body;

            // Verifica se os campos obrigatórios foram enviados
            if (!servico_id || !pedreiro_id) {
                return res.status(400).json({ message: "servico_id e pedreiro_id são obrigatórios." });
            }

            // Verifica se o pedreiro pode aceitar mais serviços
            const servicosEmAndamento = await database('servicos_postados')
                .where('pedreiro_id', pedreiro_id)
                .whereIn('status', ['aceito', 'em andamento', 'aguardando confirmacao'])
                .count('id as total');


            const totalServicosEmAndamento = parseInt(servicosEmAndamento[0].total);

            if (totalServicosEmAndamento >= 2) {
                return res.status(400).json({ message: "Você já atingiu o limite de serviços em andamento." });
            }

            // Atualiza o serviço com o pedreiro_id e muda o status para "aguardando confirmacao"
            await database('servicos_postados')
                .where({ id: servico_id })
                .update({
                    pedreiro_id, // Insere o pedreiro_id
                    status: 'em andamento' // Atualiza o status
                });

            // Busca o pedreiro para enviar a mensagem
            const pedreiro = await database('pedreiros')
                .where({ id: pedreiro_id })
                .first();

            if (!pedreiro) {
                return res.status(404).json({ message: "Pedreiro não encontrado." });
            }

            // Busca o contratante para enviar a mensagem
            const servico = await database('servicos_postados')
                .where({ id: servico_id })
                .first();

            const contratante = await database('contratantes')
                .where({ id: servico.contratante_id })
                .first();

            if (!contratante) {
                return res.status(404).json({ message: "Contratante não encontrado." });
            }

            // Mensagem para o pedreiro
            const assuntoPedreiro = 'Candidatura ao Serviço';
            const textoPedreiro = `
                Olá ${pedreiro.nome},
                Você se candidatou a um serviço e está aguardando a confirmação do contratante.
                Acompanhe o status do serviço em sua área de candidaturas.
                Atenciosamente,
                Equipe Em Obra
            `;

            // Envia o e-mail para o pedreiro
            console.log("Tentando enviar e-mail para o pedreiro:", pedreiro.email);
            await sendEmail(pedreiro.email, assuntoPedreiro, textoPedreiro);
            console.log("E-mail enviado com sucesso para o pedreiro:", pedreiro.email);

            // Mensagem para o contratante
            const assuntoContratante = 'Confirmação de Aceitação de Serviço';
            const textoContratante = `
                Olá ${contratante.nome},
                O pedreiro ${pedreiro.nome} deseja aceitar o serviço "${servico.descricao}".
                Por favor, confirme se você aceita o pedreiro para este serviço:
                    Caso aceite: https://apiobra.vercel.app/servicos/confirmarAceitacao?servico_id=${servico_id}&resposta=sim 
                    Para rejeitar: https://apiobra.vercel.app/servicos/confirmarAceitacao?servico_id=${servico_id}&resposta=nao   
                Se você não responder em 24 horas, o serviço continuará pendente.
                Atenciosamente,
               Equipe Em Obra
            `;

            // Envia o e-mail para o contratante
            console.log("Tentando enviar e-mail para o contratante:", contratante.email);
            await sendEmail(contratante.email, assuntoContratante, textoContratante);
            console.log("E-mail enviado com sucesso para o contratante:", contratante.email);

            return res.status(200).json({ message: "Candidatura enviada com sucesso. Aguarde a confirmação do contratante." });
        } catch (error) {
            console.error("Erro ao aceitar serviço:", error);
            return res.status(500).json({ message: "Erro ao aceitar o serviço." });
        }
    }
    async finalizarServico(req, res) {
        try {
            const { servico_id } = req.body;

            const servico = await database('servicos_postados')
                .where({ id: servico_id, status: 'aceito' })
                .first();

            if (!servico) {
                return res.status(404).json({ message: "Serviço não encontrado ou já finalizado." });
            }

            // Obtém o e-mail do contratante
            const contratante = await database('contratantes')
                .where({ id: servico.contratante_id })
                .first();

            if (!contratante) {
                return res.status(404).json({ message: "Contratante não encontrado." });
            }

            // Atualiza o status para "aguardando confirmação"
            await database('servicos_postados')
                .where({ id: servico_id })
                .update({
                    status: 'aguardando confirmacao',
                    data_finalizacao: getBrazilianTimestamp()
                });

            // Envia o e-mail para o contratante
            const emailBody = `
                O serviço ${servico_id} foi marcado como concluído pelo prestador. 
                Você deseja confirmar a finalização? 
                Clique aqui: https://desespero-kappa.vercel.app/servicos/confirmarFinalizacao?servico_id=${servico_id}&resposta=sim 
                ou recuse aqui: https://desespero-kappa.vercel.app/servicos/confirmarFinalizacao?servico_id=${servico_id}&resposta=nao
            `;

            await sendEmail(contratante.email, "Confirmação de Finalização do Serviço", emailBody);

            return res.status(200).json({ message: "Serviço aguardando confirmação do contratante. E-mail enviado!" });

        } catch (error) {
            console.error("Erro ao finalizar serviço:", error);
            return res.status(500).json({ message: "Erro ao finalizar o serviço." });
        }
    }



    iniciarJobFinalizacaoAutomatica() {
        cron.schedule('0 * * * *', async () => {
            try {
                const servicosAguardando = await database('servicos_postados')
                    .where({ status: 'aguardando confirmacao' })
                    .whereRaw('TIMESTAMPDIFF(HOUR, data_finalizacao, ?) >= 24', [getBrazilianTimestamp()]);

                for (const servico of servicosAguardando) {
                    await database('servicos_postados')
                        .where({ id: servico.id })
                        .update({ status: 'finalizado' });

                    console.log(`Serviço ${servico.id} finalizado automaticamente.`);
                }
            } catch (error) {
                console.error("Erro no job de finalização automática:", error);
            }
        });
    }

    async confirmarFinalizacao(req, res) {
        const { servico_id, resposta } = req.query;

        try {
            // Verifica se o serviço existe e está aguardando confirmação
            const servico = await database('servicos_postados')
                .where({ id: servico_id, status: 'aguardando confirmacao' })
                .first();

            if (!servico) {
                return res.status(404).json({ message: "Serviço não encontrado ou já confirmado." });
            }

            if (resposta === 'sim') {
                console.log("📌 Serviço encontrado:", servico);

                // Atualiza o status para "finalizado" e registra a data de finalização
                await database('servicos_postados')
                    .where({ id: servico_id })
                    .update({
                        status: 'finalizado',
                        data_fim: getBrazilianTimestamp()
                    });

                console.log(`✅ Serviço ${servico_id} finalizado com sucesso.`);

                return res.send(`
                    <html>
                    <head>
                        <style>
                            body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
                            .success { color: green; font-size: 20px; font-weight: bold; }
                        </style>
                    </head>
                    <body>
                        <p class="success">✅ Serviço finalizado com sucesso!</p>
                        <a href="/">Voltar para o início</a>
                    </body>
                    </html>
                `);

            } else if (resposta === 'nao') {
                // Atualiza o status para "aceito"
                await database('servicos_postados')
                    .where({ id: servico_id })
                    .update({ status: 'aceito' });

                    return res.send(`
                        <html>
                        <head>
                            <style>
                                body { 
                                    font-family: Arial, sans-serif; 
                                    text-align: center; 
                                    padding: 50px; 
                                    background-color: #f8f9fa; 
                                }
                                .warning { 
                                    color: #856404; 
                                    background-color: #fff3cd; 
                                    border: 1px solid #ffeeba; 
                                    padding: 15px; 
                                    display: inline-block; 
                                    font-size: 18px; 
                                    border-radius: 5px; 
                                }
                                a {
                                    display: block;
                                    margin-top: 20px;
                                    text-decoration: none;
                                    color: #007bff;
                                    font-size: 16px;
                                }
                            </style>
                        </head>
                        <body>
                            <div class="warning">⚠️ O serviço continua em andamento. Caso tenha problemas, consulte o pedreiro!</div>
                            <a href="/">Voltar para o início</a>
                        </body>
                        </html>
                    `);
            } else {
                return res.status(400).json({ message: "Resposta inválida." });
            }

        } catch (error) {
            console.error("🚨 Erro ao confirmar finalização do serviço:", error);
            return res.status(500).json({ message: "Erro ao confirmar a finalização do serviço." });
        }
    }
}

module.exports = new ServicoController();