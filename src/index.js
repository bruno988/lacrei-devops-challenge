const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000;
const ENV  = process.env.NODE_ENV || 'development';
const VERSION = process.env.APP_VERSION || '1.0.0';

const ASAAS_URL = 'https://sandbox.asaas.com/api/v3';
const ASAAS_API_KEY = process.env.ASAAS_API_KEY || '';

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Logger simples
app.use((req, res, next) => {
  const now = new Date().toISOString();
  console.log(`[${now}] ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// ── Rotas ───────────────────────────────────────────────────────────────────

app.get('/status', (req, res) => {
  res.json({
    status:    'ok',
    env:       ENV,
    version:   VERSION,
    timestamp: new Date().toISOString(),
    uptime:    `${Math.floor(process.uptime())}s`,
    message:   'Lacrei Saúde — API funcionando 💚',
  });
});

app.get('/', (req, res) => {
  res.json({
    app:     'Lacrei DevOps Challenge',
    version: VERSION,
    env:     ENV,
    routes:  ['/status', '/health', '/pagamento', '/webhook/asaas'],
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ healthy: true });
});

// ── Asaas: Criar pagamento com split ───────────────────────────────────────
app.post('/pagamento', async (req, res) => {
  try {
    const { clienteId, valor, profissionalWalletId } = req.body;

    if (!clienteId || !valor || !profissionalWalletId) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: clienteId, valor, profissionalWalletId' 
      });
    }

    const response = await fetch(`${ASAAS_URL}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY
      },
      body: JSON.stringify({
        customer: clienteId,
        billingType: 'PIX',
        value: valor,
        dueDate: new Date().toISOString().split('T')[0],
        description: 'Consulta Lacrei Saúde',
        split: [
          {
            walletId: profissionalWalletId,
            percentualValue: 80
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data });
    }

    res.json({
      paymentId: data.id,
      status: data.status,
      valor: data.value,
      split: {
        profissional: '80%',
        lacrei: '20%'
      },
      pixQrCode: data.pixQrCodeUrl || null
    });

  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar pagamento', details: err.message });
  }
});

// ── Asaas: Webhook ─────────────────────────────────────────────────────────
app.post('/webhook/asaas', (req, res) => {
  const { event, payment } = req.body;

  console.log(`[ASAAS] Evento recebido: ${event}`);

  switch (event) {
    case 'PAYMENT_CONFIRMED':
      console.log(`✅ Pagamento ${payment.id} confirmado — R$${payment.value}`);
      break;
    case 'PAYMENT_OVERDUE':
      console.log(`❌ Pagamento ${payment.id} vencido`);
      break;
    case 'PAYMENT_REFUNDED':
      console.log(`↩️ Pagamento ${payment.id} estornado`);
      break;
    default:
      console.log(`ℹ️ Evento não tratado: ${event}`);
  }

  res.sendStatus(200);
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT} [${ENV}]`);
  console.log(`📋 Status: http://localhost:${PORT}/status`);
});

module.exports = app;