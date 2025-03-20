const multer = require("multer");

const storage = multer.memoryStorage(); // Mantém a imagem em memória
const upload = multer({ storage });

module.exports = upload;
