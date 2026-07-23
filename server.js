import express from 'express';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
app.use(express.static(__dirname));

app.get('/health', (req, res) => res.status(200).send('OK'));

app.post('/api/login', async (req, res) => {
  try {
    const r = await axios.post('https://saladofuturo.educacao.sp.gov.br/api/login', req.body);
    if (r.data?.token) return res.json({ sedToken: r.data.token });
    res.status(401).json({ error: 'Falha' });
  } catch (e) { res.status(500).json({ error: 'Erro' }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('Server is UP on port', PORT);
});
