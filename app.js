const express = require('express');
const app = express();

app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));
app.use(require('./routes/auth'));
app.use(require('./routes/assignments'));
app.use(require('./routes/attempts'));
module.exports = app;