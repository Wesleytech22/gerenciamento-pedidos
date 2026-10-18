const { ValidationError } = require('../errors/AppError');

const TIPOS = ['entrega', 'retirada'];
const PRIORIDADES = ['baixa', 'normal', 'alta'];
const STATUS = ['recebido', 'em_preparacao', 'enviado', 'entregue', 'cancelado'];

// Máquina de estados do pedido: de cada status, para quais ele pode ir.
const TRANSICOES = {
  recebido: ['em_preparacao', 'cancelado'],
  em_preparacao: ['enviado', 'cancelado'],
  enviado: ['entregue'],
  entregue: [],
  cancelado: [],
};

function validarCriacao(dados) {
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) {
    throw new ValidationError('O corpo da requisição deve ser um objeto JSON.');
  }

  const { cliente, tipo, valor, prioridade } = dados;
  const erros = [];

  if (typeof cliente !== 'string' || cliente.trim() === '') {
    erros.push('cliente é obrigatório e deve ser um texto não vazio.');
  }
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor <= 0) {
    erros.push('valor deve ser numérico e maior que zero.');
  }
  if (!TIPOS.includes(tipo)) {
    erros.push(`tipo deve ser um dos valores: ${TIPOS.join(', ')}.`);
  }
  if (!PRIORIDADES.includes(prioridade)) {
    erros.push(`prioridade deve ser um dos valores: ${PRIORIDADES.join(', ')}.`);
  }

  if (erros.length) {
    throw new ValidationError('Dados do pedido inválidos.', erros);
  }

  return { cliente: cliente.trim(), tipo, valor, prioridade };
}

function validarStatus(status) {
  if (!STATUS.includes(status)) {
    throw new ValidationError(`status deve ser um dos valores: ${STATUS.join(', ')}.`);
  }
}

module.exports = { validarCriacao, validarStatus, TIPOS, PRIORIDADES, STATUS, TRANSICOES };
