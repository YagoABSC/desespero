const getCoordinatesFromCep = require('../utils/getCoordinatesFromCep');
const { gerarCodigoVerificacao, enviarCodigoEmail, salvarCodigoNoBanco } = require('../utils/RedefinicaoDeSenha');
const sendEmail = require('../utils/sendEmail');
const database = require('../database/connection');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

class AuthController {
    // Cadastro de pedreiro
    async cadastrarPedreiro(req, res) {
        try {
            const { nome, telefone, cpf, email, senha, cep, tipo_servicos } = req.body;

            // Verifica se o CPF ou e-mail já estão cadastrados
            const pedreiroExistente = await database('pedreiros')
                .where('cpf', cpf)
                .orWhere('email', email)
                .first();

            if (pedreiroExistente) {
                return res.status(400).json({ message: "Já existe um cadastro com esse CPF ou Email. Faça login." });
            }

            // Verifica se o CEP já existe na tabela ceps
            let cepExistente = await database('ceps').where('cep', cep).first();

            // Se o CEP não existir, obtém as coordenadas e insere na tabela ceps
            if (!cepExistente) {
                const result = await getCoordinatesFromCep(cep);
                if (result.message) {
                    return res.status(400).json({ message: result.message });
                }
                const { latitude, longitude } = result;
                if (!latitude || !longitude) {
                    return res.status(400).json({ message: "Não foi possível obter a localização para o CEP informado." });
                }

                // Insere o CEP na tabela ceps
                await database('ceps').insert({ cep, latitude, longitude });
            }

            // Criptografa a senha
            const senhaSegura = await bcrypt.hash(senha, 10);

            // Adiciona o código do Brasil (+55) ao telefone se não estiver presente
            let telefoneFormatado = telefone.replace(/\D/g, ''); // Remove todos os caracteres não numéricos
            if (!telefoneFormatado.startsWith('55')) {
                telefoneFormatado = '55' + telefoneFormatado; // Adiciona +55 ao número
            }
            telefoneFormatado = `+${telefoneFormatado}`; // Formata o telefone com o +55

            // Insere o novo pedreiro no banco de dados
            const [pedreiroId] = await database('pedreiros').insert({
                nome,
                telefone: telefoneFormatado,  // Salva o telefone formatado
                cpf,
                email,
                senha: senhaSegura,
                cep,
                ativo: 0 // Conta inativa até a ativação por e-mail
            });

            // Gera um token de ativação
            const token = jwt.sign({ userId: pedreiroId, userType: 'pedreiro' }, process.env.JWT_SECRET, { expiresIn: '1h' });

            // Prepara o conteúdo do e-mail de ativação
            const activationUrl = `https://apiobra.vercel.app/pedreiros/activate/${token}`;
            const subject = 'Ativação de Conta - Em Obra';
            const text = `Olá ${nome},\n\nObrigado por se cadastrar no Em Obra!\nPara ativar sua conta, clique no link abaixo:\n\n${activationUrl}\n\nAtenciosamente,\nEquipe Em Obra`;

            // Envia o e-mail de ativação
            await sendEmail(email, subject, text);

            return res.status(201).json({ message: "Cadastro de pedreiro realizado com sucesso! Verifique seu e-mail para ativar sua conta." });
        } catch (error) {
            console.error('Erro ao realizar o cadastro de pedreiro:', error);
            return res.status(500).json({ message: "Ocorreu um erro ao realizar o cadastro." });
        }
    }


    // Cadastro de contratante
    async cadastrarContratante(req, res) {
        try {
            const { nome, email, senha, cpf, cep, telefone } = req.body;

            // Verifica se o CPF ou e-mail já estão cadastrados
            const contratanteExistente = await database('contratantes')
                .where('cpf', cpf)
                .orWhere('email', email)
                .first();

            if (contratanteExistente) {
                return res.status(400).json({ message: "Já existe um cadastro com esse CPF ou Email. Faça login." });
            }

            // Verifica se o CEP já existe na tabela ceps
            const cepExistente = await database('ceps').where('cep', cep).first();

            // Se o CEP não existir, obtém as coordenadas e insere na tabela ceps
            if (!cepExistente) {
                const result = await getCoordinatesFromCep(cep);
                if (result.message) {
                    return res.status(400).json({ message: result.message });
                }
                const { latitude, longitude } = result;
                if (!latitude || !longitude) {
                    return res.status(400).json({ message: "Não foi possível obter a localização para o CEP informado." });
                }
                // Insere o CEP na tabela ceps
                await database('ceps').insert({ cep, latitude, longitude });
            }

            // Criptografa a senha
            const senhaSegura = await bcrypt.hash(senha, 10);

            // Insere o novo contratante no banco de dados
            const [contratanteId] = await database('contratantes').insert({
                nome,
                telefone,
                cpf,
                email,
                senha: senhaSegura,
                cep,
                ativo: 0 // Conta inativa até a ativação por e-mail
            });

            // Gera um token de ativação
            const token = jwt.sign({ userId: contratanteId, userType: 'contratante' }, process.env.JWT_SECRET, { expiresIn: '1h' });

            // Prepara o conteúdo do e-mail de ativação
            const activationUrl = `https://apiobra.vercel.app/contratantes/activate/${token}`;
            const subject = 'Ativação de Conta - Em Obra';
            const text = `Olá ${nome},\n\nObrigado por se cadastrar no Em Obra!\nPara ativar sua conta, clique no link abaixo:\n\n${activationUrl}\n\nAtenciosamente,\nEquipe Em Obra`;

            // Envia o e-mail de ativação
            await sendEmail(email, subject, text);

            return res.status(201).json({ message: "Cadastro de contratante realizado com sucesso! Verifique seu e-mail para ativar sua conta." });
        } catch (error) {
            console.error('Erro ao realizar o cadastro de contratante:', error);
            return res.status(500).json({ message: "Ocorreu um erro ao realizar o cadastro." });
        }
    }

    // Autenticação de usuário
    async autenticarUsuario(req, res) {
        const { identificador, senha } = req.body;

        try {
            // Verifica se o usuário é um contratante
            let usuario = await database('contratantes')
                .where('email', identificador)
                .orWhere('cpf', identificador)
                .first();
            let tipo = 'contratante';

            // Se não for contratante, verifica se é um pedreiro
            if (!usuario) {
                usuario = await database('pedreiros')
                    .where('email', identificador)
                    .orWhere('cpf', identificador)
                    .first();
                tipo = usuario ? 'pedreiro' : null;
            }

            // Se o usuário não for encontrado
            if (!usuario) {
                return res.status(401).json({ message: "Usuário não encontrado!" });
            }

            // Verifica a senha
            const validarSenha = await bcrypt.compare(senha, usuario.senha);
            if (!validarSenha) {
                return res.status(401).json({ message: "Senha incorreta!" });
            }

            // Verifica se a conta está ativa
            if (!usuario.ativo) {
                return res.status(401).json({ message: "Conta não ativada. Verifique seu e-mail para ativar sua conta." });
            }

            // Gera um token JWT
            const token = jwt.sign({ id: usuario.id, tipo }, process.env.JWT_SECRET, { expiresIn: '1h' });

            return res.status(200).json({ token, id: usuario.id, tipo });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: "Erro ao autenticar usuário" });
        }
    }

    // Ativação de conta
    async ativarConta(req, res) {
        const { token } = req.params;

        try {
            // Verifica se o token é válido
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Obtém o ID do usuário e o tipo de usuário a partir do token
            const { userId, userType } = decoded;

            // Define a tabela correta com base no tipo de usuário
            const table = userType === 'pedreiro' ? 'pedreiros' : 'contratantes';

            // Atualiza o status do usuário para "ativo"
            await database(table).where('id', userId).update({ ativo: 1 });

            return res.send(`
                <!DOCTYPE html>
                <html lang="pt-BR">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Conta Ativada</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            text-align: center;
                            margin: 50px;
                            background-color: #f4f4f4;
                        }
                        .container {
                            background: white;
                            padding: 20px;
                            border-radius: 10px;
                            box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
                            max-width: 400px;
                            margin: auto;
                        }
                        h1 {
                            color: #28a745;
                        }
                        p {
                            color: #333;
                        }
                        .btn {
                            display: inline-block;
                            margin-top: 20px;
                            padding: 10px 20px;
                            background: #28a745;
                            color: white;
                            text-decoration: none;
                            border-radius: 5px;
                            font-weight: bold;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>Conta ativada com sucesso! ✅</h1>
                        <p>Agora você já pode fechar esta aba e fazer login no aplicativo.</p>
                    </div>
                </body>
                </html>
            `);
        } catch (error) {
            console.error('Erro ao ativar a conta:', error);

            if (error.name === 'TokenExpiredError') {
                return res.status(400).json({ message: "Token expirado. Solicite um novo link de ativação." });
            }

            return res.status(400).json({ message: "Token inválido ou conta já ativada." });
        }
    }

    //Solicitar redefinição de senha
    async solicitarCodigo(req, res) {
        const { identificador } = req.body;

        try {
            let usuario = await database('contratantes')
                .where('email', identificador)
                .orWhere('cpf', identificador)
                .first();

            let tipo = 'contratante'; // Inicializamos como 'contratante'

            if (!usuario) {
                usuario = await database('pedreiros')
                    .where('email', identificador)
                    .orWhere('cpf', identificador)
                    .first();
                tipo = usuario ? 'pedreiro' : null; // Se encontrado, alteramos para 'pedreiro'
            }

            if (!usuario) {
                return res.status(404).json({ message: "Usuário não encontrado!" });
            }

            // Gerar código de verificação
            const codigo = Math.floor(100000 + Math.random() * 900000); // Gera um código de 6 dígitos
            console.log('Código gerado:', codigo); // Log para o código gerado

            // Definir a data de expiração do código (1 hora)
            const expiracao = Date.now() + 3600000; // 1 hora em milissegundos

            // Salvar o código no banco de dados com o tipo de usuário e expiração
            await salvarCodigoNoBanco(usuario.id, codigo, tipo, expiracao);

            // Enviar o código por e-mail
            await enviarCodigoEmail(codigo, usuario.email, usuario.nome);

            return res.status(200).json({ message: "Verifique seu e-mail para redefinir sua senha." });

        } catch (error) {
            console.error('Erro ao solicitar redefinição de senha:', error);
            return res.status(500).json({ message: "Ocorreu um erro ao solicitar a redefinição de senha." });
        }
    }

    //Redefinir senha
    async redefinirSenha(req, res) {
        const { codigo, novaSenha } = req.body;  // Agora pedimos o código de verificação e a nova senha

        try {
            // Verificar se o código é válido e se não expirou
            const registroCodigo = await database('codigos_redefinicao')
                .where('codigo', codigo)
                .first(); // Pega o primeiro registro que corresponder ao código

            if (!registroCodigo) {
                return res.status(400).json({ message: "Código de verificação não encontrado!" });
            }

            // Verificar se o código de verificação expirou
            const expiracao = Number(registroCodigo.expiracao);
            const expiracaoMilissegundos = expiracao < 10000000000 ? expiracao * 1000 : expiracao;

            const agora = Date.now();
            if (expiracaoMilissegundos < agora) {
                return res.status(400).json({ message: "O código de verificação expirou!" });
            }

            // Obter o id do usuário
            const { usuario_id, tipo_usuario } = registroCodigo;

            // Tentando encontrar o usuário na tabela 'pedreiros'
            let usuario;
            if (tipo_usuario === 'pedreiro') {
                usuario = await database('pedreiros').where('id', usuario_id).first();
            }

            // Se não encontrar, tenta na tabela 'contratantes'
            if (!usuario && tipo_usuario === 'contratante') {
                usuario = await database('contratantes').where('id', usuario_id).first();
            }

            if (!usuario) {
                return res.status(400).json({ message: "Usuário não encontrado!" });
            }

            // Criptografar a nova senha antes de armazenar no banco
            const senhaCriptografada = await bcrypt.hash(novaSenha, 10);  // Criptografando a senha
            console.log(`Senha criptografada para o usuário ${usuario_id}: ${senhaCriptografada}`);

            // Agora determinamos a tabela correta para o usuário
            const tabelaUsuario = tipo_usuario === 'pedreiro' ? 'pedreiros' : 'contratantes';
            console.log(`Tabela em que a senha será atualizada: ${tabelaUsuario}`);

            // Atualizar a senha na tabela correta
            const resultado = await database(tabelaUsuario)
                .where('id', usuario.id)
                .update({ senha: senhaCriptografada });  // Atualizando a senha com a nova criptografada

            // Verificando se a atualização foi bem-sucedida
            if (resultado === 0) {
                return res.status(400).json({ message: "Falha ao atualizar a senha. Tente novamente!" });
            }

            console.log(`Senha atualizada com sucesso na tabela ${tabelaUsuario} para o usuário ${usuario_id}`);


            await database('codigos_redefinicao')
                .where('codigo', codigo)
                .del();

            return res.status(200).json({ message: "Senha redefinida com sucesso!" });

        } catch (error) {
            console.error('Erro ao redefinir senha:', error);
            return res.status(500).json({ message: "Ocorreu um erro ao redefinir a senha." });
        }
    }

}

module.exports = new AuthController();
