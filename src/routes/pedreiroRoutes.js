const express = require('express');
const router = express.Router();
const connection = require('../database/connection');
const verificarToken = require('../middleware/authMiddleware');
const pedreiroController = require('../controllers/pedreiroController');
const perfilPedreiro = require('../controllers/perfilPedreiro');
const cloudinary = require("../utils/cloudinary");
const upload = require("../utils/upload");

// const { route } = require('./userRoutes');

router.get('/buscar/servicos/:pedreiro_id', verificarToken, pedreiroController.buscarServicos);
router.post('/vincular/servicos', verificarToken,  pedreiroController.vincularServicos);

router.get('/pedreiro/tipos-servicos/:pedreiro_id', verificarToken,  pedreiroController.listarTiposdeServicos);
router.get('/pedreiro/servicos-prestados/:pedreiro_id', verificarToken,   pedreiroController.servicosPrestados);

router.get('/pedreiro/:id', verificarToken, perfilPedreiro.listarPedreiro);
router.put('/atualizarPedreiro/:id', perfilPedreiro.atualizarPedreiro);
router.put('/atualizarSenha', verificarToken, perfilPedreiro.atualizarSenha);
router.put('/atualizarFotoPerfil/:id', upload.single("imagem"), perfilPedreiro.atualizarFotoPerfil);
router.post('/deletarPedreiro', express.json(), verificarToken, perfilPedreiro.deletarPedreiro);
router.get('/avaliacoes/:id', verificarToken, perfilPedreiro.listarAvaliacoes);
router.get('/historico-servicos/:id',  perfilPedreiro.historicoServicos);
router.get('/total-servicos-finalizados/:id',  perfilPedreiro.totalServicosFinalizados);

module.exports = router;