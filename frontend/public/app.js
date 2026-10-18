const API = window.API_URL;

// Espelha a regra de transições do backend apenas para montar o select.
// Quem decide de verdade é a API: se ela recusar, a mensagem de erro é exibida.
const TRANSICOES = {
  recebido: ['em_preparacao', 'cancelado'],
  em_preparacao: ['enviado', 'cancelado'],
  enviado: ['entregue'],
  entregue: [],
  cancelado: [],
};

const ROTULOS = {
  recebido: 'Recebido',
  em_preparacao: 'Em preparação',
  enviado: 'Enviado',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

const formPedido = document.getElementById('form-pedido');
const formBusca = document.getElementById('form-busca');
const btnTodos = document.getElementById('btn-todos');
const lista = document.getElementById('lista-pedidos');
const vazio = document.getElementById('vazio');
const mensagem = document.getElementById('mensagem');
const statusApi = document.getElementById('status-api');

async function requisitar(caminho, opcoes = {}) {
  const resposta = await fetch(`${API}${caminho}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opcoes,
  });
  const corpo = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    const erro = new Error(corpo.erro || `Erro HTTP ${resposta.status}`);
    erro.detalhes = corpo.detalhes;
    erro.status = resposta.status;
    throw erro;
  }
  return corpo;
}

function mostrarMensagem(tipo, texto, detalhes) {
  mensagem.className = `mensagem ${tipo}`;
  mensagem.textContent = texto;
  if (detalhes && detalhes.length) {
    const ul = document.createElement('ul');
    detalhes.forEach((d) => {
      const li = document.createElement('li');
      li.textContent = d;
      ul.appendChild(li);
    });
    mensagem.appendChild(ul);
  }
  mensagem.hidden = false;
}

function formatarValor(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function celula(texto) {
  const td = document.createElement('td');
  td.textContent = texto;
  return td;
}

function linhaPedido(pedido) {
  const tr = document.createElement('tr');
  tr.append(
    celula(pedido.id),
    celula(pedido.cliente),
    celula(pedido.tipo),
    celula(formatarValor(pedido.valor)),
    celula(pedido.prioridade)
  );

  const tdStatus = document.createElement('td');
  const badge = document.createElement('span');
  badge.className = `badge ${pedido.status}`;
  badge.textContent = ROTULOS[pedido.status] || pedido.status;
  tdStatus.appendChild(badge);
  tr.appendChild(tdStatus);

  const tdAcoes = document.createElement('td');
  const proximos = TRANSICOES[pedido.status] || [];
  if (proximos.length === 0) {
    tdAcoes.textContent = '—';
  } else {
    const div = document.createElement('div');
    div.className = 'acoes';
    const select = document.createElement('select');
    proximos.forEach((s) => select.add(new Option(ROTULOS[s], s)));
    const botao = document.createElement('button');
    botao.textContent = 'Aplicar';
    botao.addEventListener('click', () => atualizarStatus(pedido.id, select.value, botao));
    div.append(select, botao);
    tdAcoes.appendChild(div);
  }
  tr.appendChild(tdAcoes);

  const tdExcluir = document.createElement('td');
  const btnExcluir = document.createElement('button');
  btnExcluir.className = 'perigo';
  btnExcluir.textContent = 'Excluir';
  btnExcluir.addEventListener('click', () => excluirPedido(pedido, btnExcluir));
  tdExcluir.appendChild(btnExcluir);
  tr.appendChild(tdExcluir);
  return tr;
}

function renderizar(pedidos) {
  lista.replaceChildren(...pedidos.map(linhaPedido));
  vazio.hidden = pedidos.length > 0;
}

async function carregarPedidos() {
  try {
    const pedidos = await requisitar('/pedidos');
    renderizar(pedidos);
    statusApi.textContent = 'API online';
    statusApi.className = 'status-api online';
  } catch (erro) {
    statusApi.textContent = 'API offline';
    statusApi.className = 'status-api offline';
    renderizar([]);
    vazio.textContent = `Não foi possível conectar à API em ${API}. O backend está rodando?`;
    vazio.hidden = false;
  }
}

async function atualizarStatus(id, status, botao) {
  botao.disabled = true;
  try {
    await requisitar(`/pedidos/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    mostrarMensagem('sucesso', `Pedido #${id} atualizado para "${ROTULOS[status]}".`);
    await carregarPedidos();
  } catch (erro) {
    mostrarMensagem('erro', erro.message, erro.detalhes);
    botao.disabled = false;
  }
}

async function excluirPedido(pedido, botao) {
  if (!confirm(`Excluir o pedido #${pedido.id} de ${pedido.cliente}?`)) return;
  botao.disabled = true;
  try {
    await requisitar(`/pedidos/${pedido.id}`, { method: 'DELETE' });
    mostrarMensagem('sucesso', `Pedido #${pedido.id} excluído.`);
    await carregarPedidos();
  } catch (erro) {
    mostrarMensagem('erro', erro.message, erro.detalhes);
    botao.disabled = false;
  }
}

formPedido.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const dados = new FormData(formPedido);
  const valorTexto = dados.get('valor');

  // A validação de verdade é feita pela API; aqui só convertemos o tipo do valor.
  const pedido = {
    cliente: dados.get('cliente'),
    tipo: dados.get('tipo'),
    valor: valorTexto === '' ? null : Number(valorTexto),
    prioridade: dados.get('prioridade'),
  };

  try {
    const criado = await requisitar('/pedidos', { method: 'POST', body: JSON.stringify(pedido) });
    mostrarMensagem('sucesso', `Pedido #${criado.id} cadastrado para ${criado.cliente}.`);
    formPedido.reset();
    await carregarPedidos();
  } catch (erro) {
    mostrarMensagem('erro', erro.message, erro.detalhes);
  }
});

formBusca.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const id = new FormData(formBusca).get('id');
  if (!id) return carregarPedidos();
  try {
    const pedido = await requisitar(`/pedidos/${id}`);
    renderizar([pedido]);
  } catch (erro) {
    renderizar([]);
    vazio.textContent = erro.message;
    vazio.hidden = false;
  }
});

btnTodos.addEventListener('click', () => {
  formBusca.reset();
  vazio.textContent = 'Nenhum pedido cadastrado.';
  carregarPedidos();
});

carregarPedidos();
