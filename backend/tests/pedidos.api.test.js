const request = require('supertest');
const app = require('../src/app');
const repository = require('../src/repositories/pedidos.repository');

const pedidoValido = {
  cliente: 'Carlos Silva',
  tipo: 'entrega',
  valor: 350,
  prioridade: 'normal',
};

async function criarPedido(dados = pedidoValido) {
  return request(app).post('/pedidos').send(dados);
}

beforeEach(() => {
  repository.limpar();
});

describe('POST /pedidos', () => {
  test('cria pedido válido com status inicial "recebido" (201)', async () => {
    const res = await criarPedido();
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 1, ...pedidoValido, status: 'recebido' });
  });

  test('remove espaços das extremidades do cliente', async () => {
    const res = await criarPedido({ ...pedidoValido, cliente: '  Ana  ' });
    expect(res.status).toBe(201);
    expect(res.body.cliente).toBe('Ana');
  });

  test.each([
    ['cliente ausente', { ...pedidoValido, cliente: undefined }],
    ['cliente só com espaços', { ...pedidoValido, cliente: '   ' }],
    ['cliente não texto', { ...pedidoValido, cliente: 123 }],
    ['valor zero', { ...pedidoValido, valor: 0 }],
    ['valor negativo', { ...pedidoValido, valor: -10 }],
    ['valor como texto', { ...pedidoValido, valor: '350' }],
    ['tipo desconhecido', { ...pedidoValido, tipo: 'drone' }],
    ['prioridade desconhecida', { ...pedidoValido, prioridade: 'urgentissima' }],
  ])('rejeita %s (400)', async (_, dados) => {
    const res = await criarPedido(dados);
    expect(res.status).toBe(400);
    expect(res.body.erro).toBeDefined();
    expect(Array.isArray(res.body.detalhes)).toBe(true);
  });

  test('lista todos os erros de uma vez', async () => {
    const res = await criarPedido({});
    expect(res.status).toBe(400);
    expect(res.body.detalhes).toHaveLength(4);
  });

  test('rejeita corpo que não é objeto (400)', async () => {
    const res = await criarPedido([pedidoValido]);
    expect(res.status).toBe(400);
    expect(res.body.erro).toMatch(/objeto JSON/);
  });

  test('rejeita JSON malformado (400)', async () => {
    const res = await request(app)
      .post('/pedidos')
      .set('Content-Type', 'application/json')
      .send('{"cliente": ');
    expect(res.status).toBe(400);
    expect(res.body.erro).toMatch(/malformado/);
  });
});

describe('GET /pedidos', () => {
  test('retorna lista vazia inicialmente (200)', async () => {
    const res = await request(app).get('/pedidos');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('retorna os pedidos cadastrados (200)', async () => {
    await criarPedido();
    await criarPedido({ ...pedidoValido, cliente: 'Maria' });
    const res = await request(app).get('/pedidos');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});

describe('GET /pedidos/:id', () => {
  test('retorna pedido existente (200)', async () => {
    await criarPedido();
    const res = await request(app).get('/pedidos/1');
    expect(res.status).toBe(200);
    expect(res.body.cliente).toBe('Carlos Silva');
  });

  test('retorna 404 para id inexistente', async () => {
    const res = await request(app).get('/pedidos/999');
    expect(res.status).toBe(404);
    expect(res.body.erro).toBeDefined();
  });

  test('retorna 404 para id não numérico', async () => {
    const res = await request(app).get('/pedidos/abc');
    expect(res.status).toBe(404);
  });
});

describe('PATCH /pedidos/:id/status', () => {
  test('atualiza status com transição válida (200)', async () => {
    await criarPedido();
    const res = await request(app).patch('/pedidos/1/status').send({ status: 'em_preparacao' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('em_preparacao');
  });

  test('percorre o fluxo completo até "entregue"', async () => {
    await criarPedido();
    for (const status of ['em_preparacao', 'enviado', 'entregue']) {
      const res = await request(app).patch('/pedidos/1/status').send({ status });
      expect(res.status).toBe(200);
    }
    const res = await request(app).get('/pedidos/1');
    expect(res.body.status).toBe('entregue');
  });

  test('rejeita status desconhecido (400)', async () => {
    await criarPedido();
    const res = await request(app).patch('/pedidos/1/status').send({ status: 'perdido' });
    expect(res.status).toBe(400);
  });

  test('rejeita corpo sem status (400)', async () => {
    await criarPedido();
    const res = await request(app).patch('/pedidos/1/status').send({});
    expect(res.status).toBe(400);
  });

  test('rejeita transição não permitida (400)', async () => {
    await criarPedido();
    const res = await request(app).patch('/pedidos/1/status').send({ status: 'entregue' });
    expect(res.status).toBe(400);
    expect(res.body.erro).toMatch(/não é permitida/);
  });

  test('não altera pedido cancelado (400)', async () => {
    await criarPedido();
    await request(app).patch('/pedidos/1/status').send({ status: 'cancelado' });
    const res = await request(app).patch('/pedidos/1/status').send({ status: 'em_preparacao' });
    expect(res.status).toBe(400);
  });

  test('retorna 404 para id inexistente', async () => {
    const res = await request(app).patch('/pedidos/999/status').send({ status: 'cancelado' });
    expect(res.status).toBe(404);
  });
});

describe('GET /', () => {
  test('informa que a API está no ar (200)', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.rotas).toContain('/pedidos');
  });
});

describe('tratamento de erros', () => {
  test('rota desconhecida retorna 404', async () => {
    const res = await request(app).get('/nao-existe');
    expect(res.status).toBe(404);
  });

  test('erro inesperado retorna 500 sem expor detalhes', async () => {
    const spy = jest.spyOn(repository, 'listar').mockImplementation(() => {
      throw new Error('falha simulada');
    });
    const erroConsole = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(app).get('/pedidos');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ erro: 'Erro interno do servidor.' });

    spy.mockRestore();
    erroConsole.mockRestore();
  });
});
