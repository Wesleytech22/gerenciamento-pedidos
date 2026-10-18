const repository = require('../repositories/pedidos.repository');
const { validarCriacao, validarStatus, TRANSICOES } = require('../validators/pedido.validator');
const { NotFoundError, ValidationError } = require('../errors/AppError');

function criar(dados) {
  const pedidoValido = validarCriacao(dados);
  return repository.inserir({ ...pedidoValido, status: 'recebido' });
}

function listar() {
  return repository.listar();
}

function buscarPorId(idParam) {
  const id = Number(idParam);
  const pedido = Number.isInteger(id) ? repository.buscarPorId(id) : undefined;
  if (!pedido) {
    throw new NotFoundError(`Pedido com id '${idParam}' não encontrado.`);
  }
  return pedido;
}

function atualizarStatus(idParam, novoStatus) {
  // Primeiro verifica a existência (404), depois a validade dos dados (400).
  const pedido = buscarPorId(idParam);
  validarStatus(novoStatus);

  const permitidos = TRANSICOES[pedido.status];
  if (!permitidos.includes(novoStatus)) {
    const opcoes = permitidos.length ? permitidos.join(', ') : 'nenhuma (status final)';
    throw new ValidationError(
      `Transição de '${pedido.status}' para '${novoStatus}' não é permitida. Transições possíveis: ${opcoes}.`
    );
  }

  return repository.atualizar(pedido.id, { status: novoStatus });
}

function remover(idParam) {
  const pedido = buscarPorId(idParam);
  repository.remover(pedido.id);
}

module.exports = { criar, listar, buscarPorId, atualizarStatus, remover };
