const express = require('express');
const router = express.Router();
const connection = require('../database/connection');
const database = require('../database/connection');
const verificarToken = require('../middleware/authMiddleware');
const authController = require('../controllers/authController');

router.get('/', (req, res) => {
  res.send('API Em Obra, seja bem vindo!');
});

  router.get('/tipos/servicos', async (req, res) => {
    try { 
        const tiposServicos = await database('tipo_servicos').select('*');
         return res.status(200).json(tiposServicos);
    } catch (error) {
        console.error("Erro ao buscar tipos de serviços:", error);
        return res.status(500).json({ message: "Erro ao buscar os tipos de serviços." });
    }
});

router.get("/user/validar-token", verificarToken, (req, res) => {
  res.status(200).json({ valido: true, id: req.user.id, tipo: req.user.tipo });
});

router.post('/user/login', authController.autenticarUsuario);

//rota de redefinir senha
router.post('/solicitar-codigo', authController.solicitarCodigo);
router.put('/redefinir-senha', authController.redefinirSenha);


router.post('/add/contratante', authController.cadastrarContratante);
router.post('/add/pedreiro', authController.cadastrarPedreiro);

// Rota de ativação da conta
router.get('/:userType/activate/:token', authController.ativarConta);
module.exports = router;