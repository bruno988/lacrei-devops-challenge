# ── Dockerfile — Lacrei DevOps Challenge ────────────────────────────────────
# Multi-stage build para imagem menor e mais segura

# ── Stage 1: Dependencies ────────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copia apenas os arquivos de dependência primeiro (cache eficiente)
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# ── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:20-alpine AS production

# Usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs && \
    adduser  -S appuser -u 1001 -G nodejs

WORKDIR /app

# Copia dependências do stage anterior
COPY --from=deps --chown=appuser:nodejs /app/node_modules ./node_modules

# Copia o código fonte
COPY --chown=appuser:nodejs src/ ./src/
COPY --chown=appuser:nodejs package*.json ./

# Define usuário não-root
USER appuser

# Variáveis de ambiente padrão
ENV NODE_ENV=production \
    PORT=3000

# Expõe a porta
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD wget -qO- http://localhost:3000/health || exit 1

# Inicia a aplicação
CMD ["node", "src/index.js"]