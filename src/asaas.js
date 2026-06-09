const ASAAS_URL = 'https://sandbox.asaas.com/api/v3'
const API_KEY = process.env.ASAAS_API_KEY

// Cria pagamento com split
async function criarPagamento({ clienteId, valor, profissionalWalletId }) {
  const response = await fetch(`${ASAAS_URL}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'access_token': API_KEY
    },
    body: JSON.stringify({
      customer: clienteId,
      billingType: 'PIX',
      value: valor,
      dueDate: new Date().toISOString().split('T')[0],
      split: [
        {
          walletId: profissionalWalletId,
          percentualValue: 80  // 80% para o profissional
        }
        // 20% fica na Lacrei automaticamente
      ]
    })
  })
  return response.json()
}

// Recebe notificação do Asaas
function processarWebhook(event, payment) {
  if (event === 'PAYMENT_CONFIRMED') {
    console.log(`✅ Pagamento ${payment.id} confirmado!`)
    return { status: 'confirmado', paymentId: payment.id }
  }
  if (event === 'PAYMENT_OVERDUE') {
    console.log(`❌ Pagamento ${payment.id} vencido!`)
    return { status: 'vencido', paymentId: payment.id }
  }
}

module.exports = { criarPagamento, processarWebhook }