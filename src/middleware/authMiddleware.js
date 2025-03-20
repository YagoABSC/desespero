const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

function verificarToken(req, res, next){
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ message: "Token não fornecido!" });
    }

    const token = authHeader.split(" ")[1]; // Remove "Bearer" e pega só o token

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: "Token inválido!" });
        }
        req.user = decoded; // Armazena o usuário decodificado na requisição
        next();
    });
}

module.exports = verificarToken;