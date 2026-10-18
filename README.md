# API de Gerenciamento de Pedidos

Projeto prático avaliativo — Tópicos Avançados em Sistemas de Informação II.

API REST para gerenciar os pedidos de uma pequena loja, com **backend** (Node.js + Express) e **frontend** (HTML/CSS/JS) em projetos separados.

```
API_GERENCIAMENTO_PEDIDOS/
├── backend/          API REST (Express) — porta 3000
├── frontend/         Interface web que consome a API — porta 5173
└── evidencias/       Prints do Postman
```

## Instalação e execução

Requisito: Node.js 18 ou superior.

**Backend** (terminal 1):

```bash
cd backend
npm install
npm start          # http://localhost:3000
```

**Frontend** (terminal 2), com o backend já rodando:

```bash
cd frontend
npm install        # não há dependências, mas mantém o padrão
npm start          # http://localhost:5173
```

O endereço da API usado pelo frontend fica em `frontend/public/config.js`.

**Testes automatizados** (Jest + Supertest):

```bash
cd backend
npm test
```

## Rotas

| Método | Rota                   | Descrição                   | Respostas                                        |
|--------|------------------------|-----------------------------|--------------------------------------------------|
| POST   | `/pedidos`             | Cadastra um pedido (RF01)   | 201 criado · 400 dados inválidos                 |
| GET    | `/pedidos`             | Lista os pedidos (RF02)     | 200                                              |
| GET    | `/pedidos/:id`         | Consulta pelo id (RF03)     | 200 · 404 inexistente                            |
| PATCH  | `/pedidos/:id/status`  | Atualiza o status (RF04)    | 200 · 400 status/transição inválidos · 404       |

### Exemplos

Criar pedido:

```http
POST /pedidos
Content-Type: application/json

{ "cliente": "Carlos Silva", "tipo": "entrega", "valor": 350, "prioridade": "normal" }
```

Resposta `201`:

```json
{ "id": 1, "cliente": "Carlos Silva", "tipo": "entrega", "valor": 350, "prioridade": "normal", "status": "recebido" }
```

Pedido inválido — resposta `400`:

```json
{
  "erro": "Dados do pedido inválidos.",
  "detalhes": [
    "cliente é obrigatório e deve ser um texto não vazio.",
    "valor deve ser numérico e maior que zero."
  ]
}
```

Atualizar status:

```http
PATCH /pedidos/1/status
Content-Type: application/json

{ "status": "em_preparacao" }
```

Id inexistente — resposta `404`:

```json
{ "erro": "Pedido com id '999' não encontrado." }
```

## Regras de validação

| Campo        | Regra                                                                 |
|--------------|-----------------------------------------------------------------------|
| `cliente`    | Texto obrigatório, não vazio mesmo após remover espaços das pontas. É salvo sem esses espaços. |
| `valor`      | Número (tipo `number` no JSON) maior que zero. `"350"` como texto é recusado. |
| `tipo`       | `entrega` ou `retirada`                                               |
| `prioridade` | `baixa`, `normal` ou `alta`                                           |
| `status`     | Definido pela API como `recebido` na criação; não é aceito no POST.  |

Todos os erros de validação do POST são retornados juntos em `detalhes`. Um JSON malformado também gera `400`. Um `id` que não seja número inteiro é tratado como inexistente (`404`).

### Transições de status

```
recebido ──► em_preparacao ──► enviado ──► entregue
   │               │
   └──► cancelado ◄┘
```

| Status atual    | Pode ir para                  |
|-----------------|-------------------------------|
| `recebido`      | `em_preparacao`, `cancelado`  |
| `em_preparacao` | `enviado`, `cancelado`        |
| `enviado`       | `entregue`                    |
| `entregue`      | — (final)                     |
| `cancelado`     | — (final)                     |

Um pedido já enviado não pode ser cancelado. Status desconhecido ou transição fora da tabela retorna `400` com a mensagem explicando as transições possíveis. No PATCH, a existência do pedido é verificada antes (404) e a validade do status depois (400).

## Arquitetura

Arquitetura em camadas. Cada requisição percorre:

```
routes → controllers → services → repositories
                          │
                      validators
```

| Pasta                      | Responsabilidade |
|----------------------------|------------------|
| `src/routes/`              | Mapeia método + URL para a função do controller. |
| `src/controllers/`         | Lê `req`, chama o service e devolve o código HTTP. Não contém regra de negócio. |
| `src/services/`            | Regras de negócio: status inicial, existência do pedido, transições de status. |
| `src/validators/`          | Validação dos dados de entrada e listas de valores aceitos (tipos, prioridades, status, transições). *Justificativa:* separa “os dados estão no formato certo?” de “a operação é permitida?”, e centraliza os valores documentados acima. |
| `src/repositories/`        | Armazenamento em memória. *Justificativa:* o service não sabe onde os dados ficam; trocar por um banco mexeria só nesta camada. Retorna cópias para que ninguém altere a “base” por fora. |
| `src/errors/`              | `ValidationError` (400) e `NotFoundError` (404). *Justificativa:* o service sinaliza o tipo de erro sem conhecer HTTP. |
| `src/middlewares/`         | Tratamento centralizado de erros: erros conhecidos viram 400/404; qualquer outro vira `500 Erro interno do servidor`, sem expor detalhes internos. |

**Padrão implementado:** MVC adaptado para API (sem view) com camada de serviço e *Repository Pattern*, mais tratamento de erros centralizado em middleware. O Express 5 encaminha automaticamente ao middleware de erro as exceções lançadas nos controllers.

Os dados ficam em memória: ao reiniciar o backend, os pedidos são perdidos e os ids recomeçam em 1.

### Frontend

Projeto independente em `frontend/`, servido por um servidor estático simples em Node (sem dependências). Permite cadastrar pedidos, listar, buscar por id e alterar o status. Toda validação real é feita pela API; o frontend apenas exibe as mensagens de erro retornadas. O backend habilita CORS para aceitar requisições dessa outra origem.

## Testes

- **Automatizados** — `backend/tests/` com Jest e Supertest (31 casos): criação válida e inválida (cliente vazio/com espaços, valor zero/negativo/texto, tipo e prioridade desconhecidos, JSON malformado), listagem, consulta existente/inexistente, fluxo completo de status, transições proibidas, 404 no PATCH e erro inesperado retornando 500.
- **Manuais** — coleção Postman em `backend/postman/API_Pedidos.postman_collection.json` (importar no Postman). As capturas estão em `evidencias/`.

## Evidências

| Arquivo                                  | Cenário                     |
|------------------------------------------|-----------------------------|
| `evidencias/01-criacao.png`              | POST válido — 201           |
| `evidencias/02-validacao.png`            | POST inválido — 400         |
| `evidencias/03-listagem.png`             | GET da lista                |
| `evidencias/04-consulta-inexistente.png` | GET de id inexistente — 404 |
| `evidencias/05-atualizacao.png`          | PATCH de status válido      |

## Uso de IA

> **Revise e complete esta seção com as suas próprias palavras antes de entregar.**

Utilizei o assistente Claude (Anthropic) como apoio para:

- gerar a estrutura inicial do backend em camadas e do frontend;
- escrever os testes automatizados;
- redigir este README.

Exemplos de sugestões avaliadas:

- **Aceita:** retornar `400` quando o JSON é malformado, em vez de deixar cair no `500`. Justificativa: é um erro de quem envia a requisição, não do servidor, como pede o item 5 do enunciado.
- **Aceita:** recusar `valor` enviado como texto (`"350"`). Justificativa: o enunciado exige valor numérico; converter automaticamente esconderia erros do cliente da API.
- **Modificada / rejeitada:** _descreva aqui uma sugestão que você alterou ou não usou, e o porquê._
#   g e r e n c i a m e n t o - p e d i d o s  
 