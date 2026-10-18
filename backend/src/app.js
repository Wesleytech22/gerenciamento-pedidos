const express = require('express');
const cors = require('cors');
const pedidosRoutes = require('./routes/pedidos.routes');
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler');

const app = express();

// O frontend roda em outra origem (porta 5173), por isso o CORS.
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ mensagem: 'API de Gerenciamento de Pedidos', rotas: ['/pedidos'] });
});

app.use('/pedidos', pedidosRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
