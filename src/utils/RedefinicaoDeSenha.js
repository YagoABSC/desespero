// utils/codigo.js

const nodemailer = require('nodemailer');
const database = require('../database/connection');

// Função para gerar código aleatório
async function gerarCodigoVerificacao(cpf, email) {
    try {
        // Garantir que o CPF ou E-mail são fornecidos
        if (!cpf && !email) {
            throw new Error("CPF ou E-mail devem ser fornecidos");
        }

        // Buscar o usuário por CPF ou E-mail na tabela 'pedreiros'
        let usuario = await database('pedreiros').where('cpf', cpf).orWhere('email', email).first();

        // Se não encontrar, buscar na tabela 'contratantes'
        if (!usuario) {
            usuario = await database('contratantes').where('cpf', cpf).orWhere('email', email).first();
        }

        // Se o usuário não for encontrado em nenhuma das tabelas
        if (!usuario) {
            return { success: false, message: "Usuário não encontrado!" };
        }

        // Gerar o código de 6 dígitos
        const codigo = Math.floor(100000 + Math.random() * 900000); // Código de 6 dígitos
        console.log('Código gerado:', codigo); // Verifique o código gerado

        // Definir a data de expiração do código (1 hora a partir de agora)
        const expiracao = Date.now() + 3600000; // 1 hora em milissegundos

        // Definir o tipo de usuário (pedreiro ou contratante)
        const tipoUsuario = usuario.tipo_usuario === 'pedreiro' ? 'pedreiro' : 'contratante';

        // Chama a função para salvar o código no banco
        await salvarCodigoNoBanco(usuario.id, codigo, tipoUsuario, expiracao);

        return { success: true, message: "Código de redefinição gerado com sucesso!" };

    } catch (error) {
        console.error('Erro ao gerar código de verificação:', error);
        return { success: false, message: "Ocorreu um erro ao gerar o código." };
    }
}

// Função para enviar o código de redefinição de senha por e-mail
async function enviarCodigoEmail(codigo, email, nome) {
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Código de Redefinição de Senha - Em Obra',
        text: `Olá ${nome},\n\nSeu código de redefinição de senha é: ${codigo}\nEste código expirará em 1 hora.\n\nAtenciosamente,\nEquipe Em Obra`,
    };

    await transporter.sendMail(mailOptions);
}

// Função para salvar o código no banco de dados
async function salvarCodigoNoBanco(usuarioId, codigo, tipo, expiracao) {
    try {
        // Verificar se o código foi gerado corretamente
        if (!codigo) {
            throw new Error("Código de verificação não gerado.");
        }

        // Inserindo dados na tabela 'codigos_redefinicao'
        await database('codigos_redefinicao').insert({
            usuario_id: usuarioId,
            codigo: codigo,
            expiracao: expiracao,
            tipo_usuario: tipo // Armazenar o tipo de usuário (pedreiro ou contratante)
        });
        console.log('Código de verificação salvo com sucesso!');
    } catch (error) {
        console.error('Erro ao salvar código no banco:', error);
    }
}


module.exports = {
    gerarCodigoVerificacao,
    enviarCodigoEmail,
    salvarCodigoNoBanco
};
