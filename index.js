const express = require('express');
const cors = require('cors');
const app = express();
// const path = require('path');
const port = 3000;
const PedreiroRouter = require('./src/routes/pedreiroRoutes');
const ContratanteRouter = require('./src/routes/contratanteRoutes');
const UseRouter = require('./src/routes/userRoutes');
const ServicoController = require('./src/routes/serviceRoutes')
const dotenv = require('dotenv');
const upload = require("./src/utils/upload");

dotenv.config();
app.use(cors({
    origin: "*",
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: "GET, PUT, POST, DELETE",
    // credentials: true
}));
app.use(express.json());

app.use(UseRouter);
app.use(PedreiroRouter);
app.use(ContratanteRouter);
app.use(ServicoController);

// app.use('/imgs-pedreiro', express.static(path.join(__dirname, 'public', 'imgs-pedreiro'))); 

app.post('/upload', upload.single('imagem'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhuma imagem enviada' });
        }

        // URL da imagem salva no Cloudinary
        const imageUrl = req.file.path;

        res.json({ message: 'Upload feito com sucesso!', imageUrl });
    } catch (error) {
        console.error('Erro no upload:', error);
        res.status(500).json({ error: 'Erro ao fazer upload da imagem' });
    }
});

app.listen(port, () => {
    console.log('Servidor rodando na porta 3000');
});

