const { AppError } = require('../errors/AppError');

function notFoundHandler(req, res) {
  res.status(404).json({ erro: `Rota ${req.method} ${req.originalUrl} não encontrada.` });
}

// O Express reconhece o middleware de erro pelos 4 parâmetros, por isso o "next".
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    const corpo = { erro: err.message };
    if (err.detalhes) corpo.detalhes = err.detalhes;
    return res.status(err.statusCode).json(corpo);
  }

  // JSON malformado enviado pelo cliente é erro do usuário, não do servidor.
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON da requisição está malformado.' });
  }

  console.error(err);
  return res.status(500).json({ erro: 'Erro interno do servidor.' });
}

module.exports = { notFoundHandler, errorHandler };
