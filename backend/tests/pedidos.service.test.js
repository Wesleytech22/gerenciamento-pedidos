const service = require('../src/services/pedidos.service');
const repository = require('../src/repositories/pedidos.repository');
const { ValidationError, NotFoundError } = require('../src/errors/AppError');

const dados = { cliente: 'Carlos Silva', tipo: 'retirada', valor: 99.9, prioridade: 'alta' };

beforeEach(() => {
  repository.limpar();
});

describe('pedidos.service', () => {
  test('criar gera ids sequenciais', () => {
    expect(service.criar(dados).id).toBe(1);
    expect(service.criar(dados).id).toBe(2);
  });

  test('criar lança ValidationError para dados inválidos', () => {
    expect(() => service.criar({ ...dados, valor: -1 })).toThrow(ValidationError);
  });

  test('buscarPorId lança NotFoundError para id inexistente', () => {
    expect(() => service.buscarPorId('42')).toThrow(NotFoundError);
  });

  test('atualizarStatus verifica existência antes de validar o status', () => {
    expect(() => service.atualizarStatus('42', 'invalido')).toThrow(NotFoundError);
  });

  test('objeto retornado não altera o armazenamento', () => {
    const pedido = service.criar(dados);
    pedido.status = 'entregue';
    expect(service.buscarPorId(pedido.id).status).toBe('recebido');
  });
});
