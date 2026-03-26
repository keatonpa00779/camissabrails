// Usa backend local (/api/*) para evitar bloqueio e instabilidade de CORS
const API_BASE = '/api';
const POLL_INTERVAL_MS = 5000;

/**
 * Cria cobrança PIX via backend local
 */
export async function createCharge(amount, description, payerName, customerCpf, customerAddress) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(`${API_BASE}/pix`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount,
        description,
        customer: {
          id: customerCpf || '00000000000',
          name: payerName || 'Cliente',
          document: customerCpf || '00000000000',
          address: customerAddress || undefined
        }
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Erro ${res.status}: ${err}`);
    }

    const data = await res.json();

    return {
      paymentId: data.payment_id,
      copyPasteCode: data.pix_copia_e_cola || ''
    };
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

/**
 * Gera URL do QR Code
 */
export function getQrCodeUrl(copyPasteCode) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(copyPasteCode)}`;
}

/**
 * Verifica status via backend local
 */
async function checkStatus(paymentId) {
  const res = await fetch(`${API_BASE}/payments/status/${encodeURIComponent(paymentId)}`);
  if (!res.ok) throw new Error('Falha ao verificar status');
  const data = await res.json();
  return data.status || 'pending';
}

/**
 * Polling de status
 */
export function pollChargeStatus(paymentId, onUpdate) {
  let stopped = false;

  const poll = async () => {
    if (stopped) return;
    try {
      const status = await checkStatus(paymentId);
      onUpdate(status);
      if (status === 'paid' || status === 'expired') {
        stopped = true;
        return;
      }
    } catch (_) {
      // falha silenciosa
    }
    if (!stopped) setTimeout(poll, POLL_INTERVAL_MS);
  };

  setTimeout(poll, POLL_INTERVAL_MS);
  return () => { stopped = true; };
}
