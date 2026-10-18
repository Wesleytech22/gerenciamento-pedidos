const { Router } = require('express');
const controller = require('../controllers/pedidos.controller');

const router = Router();

router.post('/', controller.criar);
router.get('/', controller.listar);
router.get('/:id', controller.buscarPorId);
router.patch('/:id/status', controller.atualizarStatus);
router.delete('/:id', controller.remover);

module.exports = router;
