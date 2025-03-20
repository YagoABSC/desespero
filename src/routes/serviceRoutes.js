const express = require('express');
const router = express.Router();
const ServicoController = require('../controllers/servicoController');
const verificarToken = require('../middleware/authMiddleware');

// Rota para aceitar um serviço
router.post('/servicos/aceitar', ServicoController.aceitarServico);

// Rota para finalizar um serviço
router.post('/servicos/finalizar', ServicoController.finalizarServico);

// Rota para confirmar a finalização de um serviço
router.get('/servicos/confirmarFinalizacao', ServicoController.confirmarFinalizacao);

// Rota para confirmar a aceitação do pedreiro pelo contratante
router.get('/servicos/confirmarAceitacao', ServicoController.confirmarAceitacao);

module.exports = router;
