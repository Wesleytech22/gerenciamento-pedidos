# API de Gerenciamento de Pedidos

Projeto prático avaliativo — **Tópicos Avançados em Sistemas de Informação II**
Universidade Cruzeiro do Sul · Análise e Desenvolvimento de Sistemas · 2026

API REST para gerenciar os pedidos de uma pequena loja, com **backend** (Node.js + Express) e **frontend** (HTML/CSS/JS) em projetos separados.

- Repositório: https://github.com/Wesleytech22/gerenciamento-pedidos
- Documentação completa em PDF: [`Documentacao_API_Pedidos.pdf`](Documentacao_API_Pedidos.pdf)

## Integrantes

| Nome                             | RGM        |
|----------------------------------|------------|
| Clayton de Andrade Junior        | 45781303   |
| Gabriel Yanes                    | 42585953   |
| Leonardo Rocha                   | 41735285   |
| Luana Aparecida Silva Che        | 43637302   |
| Nicolas Neris dos Santos Dourado | 04307588-6 |
| Wesley Rodrigues Dias            | 42288835   |

## Sumário

- [Estrutura](#estrutura)
- [Instalação e execução](#instalação-e-execução)
- [Rotas](#rotas)
- [Regras de validação](#regras-de-validação)
- [Arquitetura](#arquitetura)
- [Testes](#testes)
- [Evidências](#evidências)
- [Uso de IA](#uso-de-ia)

## Estrutura

```
gerenciamento-pedidos/
├── backend/                  API REST (Express) — porta 3000
│   ├── src/
│   │   ├── server.js         inicia o servidor
│   │   ├── app.js            Express, CORS, rotas e tratamento de erros
│   │   ├── routes/           mapeamento das URLs
│   │   ├── controllers/      camada HTTP
│   │   ├── services/         regras de negócio
│   │   ├── validators/       validação dos dados de entrada
│   │   ├── repositories/     armazenamento em memória
│   │   ├── errors/           classes de erro da aplicação
│   │   └── middlewares/      tratamento centralizado de erros
│   ├── tests/                testes Jest + Supertest
│   └── postman/              coleção do Postman
├── frontend/                 interface web que consome a API — porta 5173
├── evidencias/               prints do Postman
└── Documentacao_API_Pedidos.pdf
```

## Instalação e execução

Requisito: **Node.js 18 ou superior**.

```bash
git clone https://github.com/Wesleytech22/gerenciamento-pedidos.git
cd gerenciamento-pedidos
```

**Backend** (terminal 1):

```bash
cd backend
npm install
npm start          # http://localhost:3000
```

**Frontend** (terminal 2), com o backend já rodando:

```bash
cd frontend
npm start          # http://localhost:5173
```

O frontend não tem dependências. O endereço da API que ele usa fica em `frontend/public/config.js`.

**Testes automatizados:**

```bash
cd backend
npm test
```

## Rotas

Base: `http://localhost:3000`. Requisições com corpo devem enviar `Content-Type: application/json`.

| Método | Rota                  | Descrição                 | Respostas                                  |
|--------|-----------------------|---------------------------|--------------------------------------------|
| POST   | `/pedidos`            | Cadastra um pedido (RF01) | 201 criado · 400 dados inválidos           |
| GET    | `/pedidos`            | Lista os pedidos (RF02)   | 200                                        |
| GET    | `/pedidos/:id`        | Consulta pelo id (RF03)   | 200 · 404 inexistente                      |
| PATCH  | `/pedidos/:id/status` | Atualiza o status (RF04)  | 200 · 400 status/transição inválidos · 404 |

### POST /pedidos

```http
POST /pedidos
Content-Type: application/json

{ "cliente": "Carlos Silva", "tipo": "entrega", "valor": 350, "prioridade": "normal" }
```

Resposta `201 Created`:

```json
{ "id": 1, "cliente": "Carlos Silva", "tipo": "entrega", "valor": 350, "prioridade": "normal", "status": "recebido" }
```

Pedido inválido (`{ "cliente": "   ", "tipo": "drone", "valor": -5, "prioridade": "normal" }`), resposta `400 Bad Request`:

```json
{
  "erro": "Dados do pedido inválidos.",
  "detalhes": [
    "cliente é obrigatório e deve ser um texto não vazio.",
    "valor deve ser numérico e maior que zero.",
    "tipo deve ser um dos valores: entrega, retirada."
  ]
}
```

### GET /pedidos

Retorna `200 OK` com a lista de pedidos, ou `[]` se não houver nenhum.

### GET /pedidos/:id

Retorna `200 OK` com o pedido. Id inexistente ou não numérico resulta em `404 Not Found`:

```json
{ "erro": "Pedido com id '999' não encontrado." }
```

### PATCH /pedidos/:id/status

```http
PATCH /pedidos/1/status
Content-Type: application/json

{ "status": "em_preparacao" }
```

Retorna `200 OK` com o pedido atualizado. Status desconhecido ou transição não permitida resulta em `400`:

```json
{ "erro": "Transição de 'em_preparacao' para 'recebido' não é permitida. Transições possíveis: enviado, cancelado." }
```

## Regras de validação

| Campo        | Regra |
|--------------|-------|
| `cliente`    | Texto obrigatório, não vazio mesmo após remover os espaços das pontas. É salvo sem esses espaços. |
| `valor`      | Número (tipo `number` no JSON) maior que zero. `"350"` como texto é recusado. |
| `tipo`       | `entrega` ou `retirada` |
| `prioridade` | `baixa`, `normal` ou `alta` |
| `status`     | Definido pela API como `recebido` na criação. |

Todos os erros de validação do POST são retornados juntos em `detalhes`. JSON malformado também gera `400`. Erros inesperados retornam `500` com `{ "erro": "Erro interno do servidor." }`, sem expor detalhes internos.

### Transições de status

```
recebido ──► em_preparacao ──► enviado ──► entregue
   │               │
   └──► cancelado ◄┘
```

| Status atual    | Pode ir para                 |
|-----------------|------------------------------|
| `recebido`      | `em_preparacao`, `cancelado` |
| `em_preparacao` | `enviado`, `cancelado`       |
| `enviado`       | `entregue`                   |
| `entregue`      | — (final)                    |
| `cancelado`     | — (final)                    |

Um pedido já enviado não pode ser cancelado. No PATCH, a existência do pedido é verificada primeiro (404) e a validade do status depois (400).

## Arquitetura

Arquitetura em camadas. Cada requisição percorre:

```
routes → controllers → services → repositories
                          │
                      validators
```

| Pasta               | Responsabilidade |
|---------------------|------------------|
| `src/routes/`       | Associa método + URL à função do controller. |
| `src/controllers/`  | Lê a requisição, chama o service e devolve o código HTTP. Não contém regra de negócio. |
| `src/services/`     | Regras de negócio: status inicial, existência do pedido e transições de status. |
| `src/validators/`   | Validação dos dados de entrada e listas de valores aceitos. Separa "os dados estão no formato certo?" de "a operação é permitida?". |
| `src/repositories/` | Armazenamento em memória. O service não sabe onde os dados ficam; trocar por um banco mexeria só nesta camada. |
| `src/errors/`       | `ValidationError` (400) e `NotFoundError` (404): o service sinaliza o tipo de erro sem conhecer HTTP. |
| `src/middlewares/`  | Tratamento centralizado de erros: 400/404 para erros conhecidos e 500 para qualquer outro. |

**Padrão implementado:** MVC adaptado para API (sem view), com camada de serviço, *Repository Pattern* e tratamento de erros centralizado em middleware.

Os dados ficam em memória: ao reiniciar o backend, os pedidos são apagados e os ids recomeçam em 1.

**Frontend:** projeto independente em `frontend/`, servido por um servidor estático em Node sem dependências. Permite cadastrar, listar, buscar por id e alterar o status dos pedidos. Toda a validação é feita pela API; o frontend só exibe as mensagens retornadas. O backend habilita CORS para aceitar requisições dessa outra origem.

## Testes

- **Automatizados:** `backend/tests/`, com Jest e Supertest (31 casos). Cobrem criação válida e inválida (cliente vazio, valor zero/negativo/texto, tipo e prioridade desconhecidos, JSON malformado), listagem, consulta existente e inexistente, fluxo completo de status, transições proibidas, 404 no PATCH e erro inesperado retornando 500.
- **Manuais:** coleção do Postman em `backend/postman/API_Pedidos.postman_collection.json` (Postman → Import). São 8 requisições com testes embutidos (aba *Test Results*), que conferem o código HTTP e o corpo de cada resposta. A requisição 01 guarda o id do pedido criado na variável `{{pedidoId}}`, usada pelas seguintes. Para rodar todas de uma vez: botão direito na coleção → *Run collection*.

## Evidências

| Arquivo                                  | Cenário                     |
|------------------------------------------|-----------------------------|
| `evidencias/01-criacao.png`              | POST válido — 201           |
| `evidencias/02-validacao.png`            | POST inválido — 400         |
| `evidencias/03-listagem.png`             | GET da lista — 200          |
| `evidencias/04-consulta-inexistente.png` | GET de id inexistente — 404 |
| `evidencias/05-atualizacao.png`          | PATCH de status válido — 200 |

## Uso de IA

Utilizamos o assistente Claude (Anthropic) como apoio para:

- gerar a estrutura inicial do backend em camadas e do frontend;
- escrever os testes automatizados;
- redigir o README e a documentação em PDF.

Todo o código foi revisado, executado e testado pelo grupo.

Sugestões avaliadas:

- **Aceita:** retornar `400` quando o JSON é malformado, em vez de deixar cair no `500`. Justificativa: é um erro de quem envia a requisição, não do servidor, como pede o item 5 do enunciado.
- **Aceita:** recusar `valor` enviado como texto (`"350"`). Justificativa: o enunciado exige valor numérico; converter automaticamente esconderia erros do cliente da API.
- **Modificada / rejeitada:** _descrever aqui uma sugestão que o grupo alterou ou não usou, e o porquê._
