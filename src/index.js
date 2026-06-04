const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000;
const ENV  = process.env.NODE_ENV || 'development';
const VERSION = process.env.APP_VERSION || '1.0.0';

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

// Health check / status
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

// Root
app.get('/', (req, res) => {
  res.json({
    app:     'Lacrei DevOps Challenge',
    version: VERSION,
    env:     ENV,
    routes:  ['/status', '/health'],
  });
});

// Health check simples para load balancer
app.get('/health', (req, res) => {
  res.status(200).json({ healthy: true });
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