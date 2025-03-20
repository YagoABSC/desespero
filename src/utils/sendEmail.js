const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
dotenv.config();

// Função genérica para enviar e-mails
const sendEmail = async (to, subject, text) => {
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
        to: to,
        subject: subject,
        text: text,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('E-mail enviado com sucesso!');
    } catch (error) {
        console.error('Erro ao enviar e-mail:', error);
        throw new Error('Erro ao enviar e-mail');
    }
};

module.exports = sendEmail;