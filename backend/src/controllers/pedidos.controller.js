const service = require('../services/pedidos.service');

// O controller só traduz HTTP <-> serviço. Regras de negócio ficam no service.
// Erros lançados aqui são repassados ao middleware de erro pelo Express 5.

function criar(req, res) {
  const pedido = service.criar(req.body);
  res.status(201).json(pedido);
}

function listar(req, res) {
  res.status(200).json(service.listar());
}

function buscarPorId(req, res) {
  const pedido = service.buscarPorId(req.params.id);
  res.status(200).json(pedido);
}

function atualizarStatus(req, res) {
  const status = req.body ? req.body.status : undefined;
  const pedido = service.atualizarStatus(req.params.id, status);
  res.status(200).json(pedido);
}

function remover(req, res) {
  service.remover(req.params.id);
  res.status(204).end();
}

module.exports = { criar, listar, buscarPorId, atualizarStatus, remover };
