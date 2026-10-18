// Camada de dados: armazenamento em memória.
// Isolada em um repositório para que trocar por um banco não afete o service.

let pedidos = [];
let proximoId = 1;

function inserir(dados) {
  const pedido = { id: proximoId++, ...dados };
  pedidos.push(pedido);
  return { ...pedido };
}

function listar() {
  return pedidos.map((p) => ({ ...p }));
}

function buscarPorId(id) {
  const pedido = pedidos.find((p) => p.id === id);
  return pedido ? { ...pedido } : undefined;
}

function atualizar(id, campos) {
  const pedido = pedidos.find((p) => p.id === id);
  if (!pedido) return undefined;
  Object.assign(pedido, campos);
  return { ...pedido };
}

// Usado apenas pelos testes para começar cada caso com a "base" vazia.
function limpar() {
  pedidos = [];
  proximoId = 1;
}

module.exports = { inserir, listar, buscarPorId, atualizar, limpar };
