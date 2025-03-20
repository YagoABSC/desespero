const express = require('express');
const router = express.Router();
const connection = require('../database/connection');
const verificarToken = require('../middleware/authMiddleware');
const contratanteController = require('../controllers/contratanteController');
const perfilContratante = require('../controllers/perfilContratante');
const cloudinary = require("../utils/cloudinary");
const upload = require("../utils/upload");

router.post('/add/servico', verificarToken, contratanteController.postarServico);
router.post('/buscar/pedreiros',  contratanteController.buscarPedreiros);
router.post('/avaliacoes', verificarToken, contratanteController.postarAvaliacao);


router.get('/contratante/:id', perfilContratante.listarContratante);
router.put('/atualizar/contratante/:id', perfilContratante.atualizarContratante);
router.put('/atualizar/senha/contratante', perfilContratante.atualizarSenhaContratante);
router.put('/atualizar/fotoPerfil/contratante/:id', upload.single("imagem"), perfilContratante.atualizarFotoPerfilContratante);
router.delete('/excluir/tipoServico/:id', perfilContratante.excluirServicosContratante);

module.exports = router;