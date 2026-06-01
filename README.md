# 🚀 Lacrei DevOps Challenge

Pipeline de deploy seguro, escalável e eficiente para staging e produção na AWS.

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                        GitHub Repository                         │
│                                                                   │
│   branch develop ──→ GitHub Actions ──→ EC2 Staging             │
│   branch main    ──→ GitHub Actions ──→ EC2 Produção            │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐     ┌──────────────────┐
│   EC2 Staging    │     │  EC2 Produção    │
│                  │     │                  │
│  Docker          │     │  Docker          │
│  Node.js :3000   │     │  Node.js :3000   │
│  CloudWatch Logs │     │  CloudWatch Logs │
└──────────────────┘     └──────────────────┘
```

---

## 📋 Fluxo CI/CD

```
Push develop                Push main
     │                           │
     ▼                           ▼
┌─────────┐               ┌─────────┐
│  Build  │               │  Build  │
│  Image  │               │  Image  │
└────┬────┘               └────┬────┘
     │                         │
     ▼                         ▼
┌─────────┐               ┌─────────┐
│  Testes │               │  Testes │
│/status  │               │/status  │
│/health  │               │/health  │
└────┬────┘               └────┬────┘
     │                         │
     ▼                         ▼
┌─────────┐               ┌──────────┐
│ Deploy  │               │ Aprovação│
│ Staging │               │ manual   │
└─────────┘               └────┬─────┘
                               │
                               ▼
                          ┌─────────┐
                          │ Deploy  │
                          │  Prod   │
                          └─────────┘
```

---

## ⚙️ Setup dos Ambientes

### Pré-requisitos

- AWS Account com permissões EC2
- Dois servidores EC2 (Ubuntu 22.04 LTS, t2.micro)
- Docker instalado em ambos
- GitHub Secrets configurados

### 1. Criar instâncias EC2

**Staging e Produção** — repita para cada ambiente:

```bash
# Na AWS Console
# EC2 → Launch Instance
# AMI: Ubuntu Server 22.04 LTS
# Instance type: t2.micro (free tier)
# Security Group:
#   - SSH (22) → seu IP
#   - TCP (3000) → 0.0.0.0/0
#   - TCP (80) → 0.0.0.0/0
```

### 2. Instalar Docker nas instâncias

```bash
ssh -i sua-chave.pem ubuntu@IP-DA-INSTANCIA

# Instala Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker ubuntu
newgrp docker

# Clona o repositório
sudo mkdir -p /app
cd /app
git clone https://github.com/SEU-USUARIO/lacrei-devops-challenge.git
cd lacrei-devops-challenge
```

### 3. Configurar GitHub Secrets

Acesse: `GitHub → Settings → Secrets → Actions`

| Secret | Descrição |
|---|---|
| `STAGING_HOST` | IP público da EC2 staging |
| `STAGING_USER` | ubuntu |
| `STAGING_SSH_KEY` | Chave privada PEM da EC2 staging |
| `PROD_HOST` | IP público da EC2 produção |
| `PROD_USER` | ubuntu |
| `PROD_SSH_KEY` | Chave privada PEM da EC2 produção |

### 4. Configurar Environments no GitHub

```
GitHub → Settings → Environments
→ Criar "staging"
→ Criar "production" (adicionar aprovação manual)
```

---

## 🚀 Como fazer deploy

### Staging
```bash
git checkout develop
git push origin develop
# GitHub Actions inicia automaticamente
```

### Produção
```bash
git checkout main
git merge develop
git push origin main
# GitHub Actions aguarda aprovação manual
```

---

## 🔐 Checklist de Segurança

- [x] Usuário não-root no container (`appuser`)
- [x] Multi-stage build (imagem menor e sem vulnerabilidades de build)
- [x] Secrets via GitHub Secrets (nunca no código)
- [x] CORS configurado no Express
- [x] Security Groups restritivos (princípio do menor privilégio)
- [x] Logs rotacionados (max 10MB × 5 arquivos)
- [x] Healthcheck configurado
- [x] `.env` no `.gitignore`
- [x] Porta SSH restrita ao IP do desenvolvedor

---

## 🔄 Processo de Rollback

### Rollback automático (falha no healthcheck)
O pipeline detecta falha no `/health` e reverte automaticamente:

```bash
# O deploy.yml executa automaticamente:
curl -f http://localhost:3000/health || {
  LAST=$(cat /app/last_version.txt)
  docker run -d --name lacrei-app -p 3000:3000 $LAST
}
```

### Rollback manual
```bash
ssh ubuntu@IP-PRODUCAO

# Ver versão anterior
cat /app/last_version.txt

# Parar container atual
docker compose down

# Subir versão anterior
docker run -d \
  --name lacrei-app \
  -p 3000:3000 \
  -e NODE_ENV=production \
  IMAGEM:VERSAO-ANTERIOR

# Validar
curl http://localhost:3000/health
```

### Rollback via Git
```bash
# Reverter último commit
git revert HEAD
git push origin main
# Pipeline faz novo deploy automaticamente
```

---

## 📊 Observabilidade

### Logs da aplicação
```bash
# Ver logs em tempo real
docker compose logs -f app

# Ver logs do deploy
cat /var/log/deploy.log
```

### CloudWatch (AWS)
```bash
# Instalar agente CloudWatch
sudo apt install amazon-cloudwatch-agent -y

# Configurar para enviar logs Docker
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config -m ec2 -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
```

---

## 💳 Proposta de Integração Asaas

```
┌─────────────┐     POST /split     ┌─────────────┐
│   Lacrei    │ ─────────────────→  │    Asaas    │
│   Backend   │                     │     API     │
└─────────────┘ ←─────────────────  └─────────────┘
                  { paymentId,             
                    status,               
                    splitAmount }         

Fluxo:
1. Paciente realiza pagamento na Lacrei
2. Backend chama POST /v3/payments (Asaas)
3. Configura split: profissional + plataforma
4. Asaas processa e notifica via webhook
5. Lacrei atualiza status do pagamento
```

**Variáveis necessárias:**
```env
ASAAS_API_KEY=seu_token
ASAAS_ENVIRONMENT=sandbox  # ou production
ASAAS_WEBHOOK_SECRET=seu_secret
```

---

## 🛠️ Rodando localmente

```bash
# Clonar
git clone https://github.com/SEU-USUARIO/lacrei-devops-challenge.git
cd lacrei-devops-challenge

# Instalar dependências
npm install

# Rodar localmente
node src/index.js

# Ou com Docker
docker compose up --build

# Testar
curl http://localhost:3000/status
curl http://localhost:3000/health
```

---

## 🐛 Erros encontrados e decisões técnicas

| Erro | Solução |
|---|---|
| Container unhealthy no healthcheck inicial | Aumentei `start_period` para 60s |
| Multi-stage build com `npm ci` falhando | Separei stage de deps do stage de produção |
| Permissão negada ao criar pastas no container | Usei `--chown` no COPY e usuário não-root |
| SSH Action timeout | Adicionei `sleep 10` após `docker compose up` |

---

## 📁 Estrutura do Projeto

```
lacrei-devops-challenge/
├── src/
│   └── index.js          # Aplicação Node.js
├── .github/
│   └── workflows/
│       └── deploy.yml    # Pipeline CI/CD
├── Dockerfile            # Multi-stage build
├── docker-compose.yml    # Orquestração
├── package.json
└── README.md
```

---

Desenvolvido por **Bruno Consani Fernandes** para o Desafio Técnico DevOps — Lacrei Saúde 💚