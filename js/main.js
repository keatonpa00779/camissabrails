import { initGallery } from './gallery.js';
import { initSizeSelector, getSelectedSize } from './size-selector.js';
import { createCharge, getQrCodeUrl, pollChargeStatus } from './pix-api.js';

const CHARGE_AMOUNT = 119.99;
const NAME_PRICE   = 19.99;
const NUMBER_PRICE = 9.99;
let stopPolling = null;

// ── Estado da personalização ──────────────────────────────────────────────────
function getPersonalization() {
  const name = document.getElementById('custom-name')?.value.trim() || '';
  const number = document.getElementById('custom-number')?.value.trim() || '';
  return { name, number };
}

function getTotal() {
  const { name, number } = getPersonalization();
  let total = CHARGE_AMOUNT;
  if (name)   total += NAME_PRICE;
  if (number) total += NUMBER_PRICE;
  return Math.round(total * 100) / 100;
}

function updateTotalDisplay() {
  const total = getTotal();
  const { name, number } = getPersonalization();
  const totalEl  = document.getElementById('total-price');
  const ctaEl    = document.getElementById('buy-cta');
  const extrasEl = document.getElementById('personalization-extras');

  if (totalEl) totalEl.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
  if (ctaEl)   ctaEl.textContent   = `COMPRAR — R$ ${total.toFixed(2).replace('.', ',')}`;

  if (extrasEl) {
    const lines = [];
    if (name)   lines.push(`+ Nome: R$ 19,99`);
    if (number) lines.push(`+ Número: R$ 9,99`);
    extrasEl.textContent = lines.join('  ');
    extrasEl.hidden = lines.length === 0;
  }
}

function getCheckoutData() {
  const rua = document.getElementById('checkout-rua')?.value.trim() || '';
  const cidade = document.getElementById('checkout-cidade')?.value.trim() || '';
  const estado = document.getElementById('checkout-estado')?.value.trim() || '';
  const cep = document.getElementById('checkout-cep')?.value.trim() || '';
  const address = [rua, cidade, estado, cep].filter(Boolean).join(', ');
  const valid = rua && cidade && estado && cep;
  return { address, valid };
}

function openCheckoutForm() {
  const section = document.getElementById('checkout-section');
  const error = document.getElementById('checkout-error');
  const ruaInput = document.getElementById('checkout-rua');
  if (error) error.hidden = true;
  if (section) {
    section.hidden = false;
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => {
      ruaInput?.focus();
    }, 300);
  }
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function showPixState(stateId) {
  ['pix-loading', 'pix-awaiting', 'pix-paid', 'pix-expired', 'pix-error'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.hidden = (id !== stateId);
  });
  const section = document.getElementById('pix-section');
  if (section) {
    section.hidden = false;
    section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function renderPixAwaiting(charge) {
  const qrImg = document.getElementById('pix-qr-img');
  const codeInput = document.getElementById('pix-code');

  if (charge.copyPasteCode) {
    qrImg.src = getQrCodeUrl(charge.copyPasteCode);
    qrImg.onerror = () => { qrImg.alt = 'QR Code indisponível — use o código abaixo'; };
    codeInput.value = charge.copyPasteCode;
  }

  const total = getTotal();
  const valueEl = document.getElementById('pix-value-display');
  if (valueEl) valueEl.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;

  showPixState('pix-awaiting');
}

function updateStatusText(status) {
  const el = document.getElementById('pix-status-text');
  const dot = document.querySelector('.status-dot');
  if (!el) return;

  // API retorna: "pending", "paid", "expired"
  const map = {
    pending: 'Aguardando pagamento...',
    paid:    'Pagamento confirmado!',
    expired: 'Código expirado'
  };
  el.textContent = map[status] || 'Aguardando pagamento...';

  if (dot) {
    dot.className = 'status-dot';
    if (status === 'paid')    dot.classList.add('status-dot--paid');
    else if (status === 'expired') dot.classList.add('status-dot--expired');
    else dot.classList.add('status-dot--waiting');
  }
}

// ── Fluxo PIX ─────────────────────────────────────────────────────────────────
async function startPixFlow() {
  const size = getSelectedSize();

  if (!size) {
    const err = document.getElementById('size-error');
    err.hidden = false;
    document.getElementById('size-selector')?.scrollIntoView({ behavior: 'smooth' });
    return;
  }

  if (stopPolling) { stopPolling(); stopPolling = null; }

  showPixState('pix-loading');

  const { name, number } = getPersonalization();
  const { address, valid } = getCheckoutData();
  const total = getTotal();

  let description = `Camiseta Brasil Copa 2026 — Tam. ${size}`;
  if (name) description += ` | Nome: ${name}`;
  if (number) description += ` | Nº: ${number}`;

  if (!valid) {
    const checkoutError = document.getElementById('checkout-error');
    if (checkoutError) checkoutError.hidden = false;
    const checkoutSection = document.getElementById('checkout-section');
    if (checkoutSection) checkoutSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const pixSection = document.getElementById('pix-section');
    if (pixSection) pixSection.hidden = true;
    return;
  }

  const payerName = name || 'Cliente';
  const cpf = '00000000000';

  try {
    const charge = await createCharge(total, description, payerName, cpf, address);
    renderPixAwaiting(charge);

    stopPolling = pollChargeStatus(charge.paymentId, (status) => {
      updateStatusText(status);
      if (status === 'paid') {
        if (stopPolling) { stopPolling(); stopPolling = null; }
        showPixState('pix-paid');
      } else if (status === 'expired') {
        if (stopPolling) { stopPolling(); stopPolling = null; }
        showPixState('pix-expired');
      }
    });
  } catch (err) {
    console.error('PIX error:', err);
    const msgEl = document.getElementById('pix-error-msg');
    if (msgEl) msgEl.textContent = 'Não foi possível gerar o PIX. Tente novamente.';
    showPixState('pix-error');
  }
}

// ── Copiar código ─────────────────────────────────────────────────────────────
function setupCopyBtn() {
  const btn = document.getElementById('copy-btn');
  const confirm = document.getElementById('copy-confirm');
  const input = document.getElementById('pix-code');

  btn.addEventListener('click', async () => {
    const code = input.value;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
    } catch (_) {
      input.select();
      document.execCommand('copy');
    }
    confirm.hidden = false;
    btn.textContent = '✅ Copiado!';
    setTimeout(() => {
      confirm.hidden = true;
      btn.textContent = '📋 Copiar código PIX';
    }, 3000);
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initGallery();
  initSizeSelector();
  setupCopyBtn();

  // Hero CTA → scroll para seletor de tamanho
  document.getElementById('hero-cta')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('size-selector')?.scrollIntoView({ behavior: 'smooth' });
  });

  // Personalização → atualiza total em tempo real
  document.getElementById('custom-name')?.addEventListener('input', updateTotalDisplay);
  document.getElementById('custom-number')?.addEventListener('input', (e) => {
    // Só permite números, máx 2 dígitos
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 2);
    updateTotalDisplay();
  });

  document.getElementById('checkout-cep')?.addEventListener('input', (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
    e.target.value = digits.replace(/(\d{5})(\d)/, '$1-$2');
  });

  // Botão comprar
  document.getElementById('buy-cta')?.addEventListener('click', openCheckoutForm);
  document.getElementById('pay-cta')?.addEventListener('click', startPixFlow);
  document.getElementById('retry-btn')?.addEventListener('click', startPixFlow);
  document.getElementById('new-pix-btn')?.addEventListener('click', startPixFlow);

  // Contador de estoque (urgência)
  const stockEl = document.getElementById('stock-count');
  if (stockEl) {
    const counts = [7, 6, 5];
    let i = 0;
    setInterval(() => { i = (i + 1) % counts.length; stockEl.textContent = counts[i]; }, 30000);
  }

  // Countdown até meia-noite do dia 29
  const countdownEl = document.getElementById('countdown');
  if (countdownEl) {
    function updateCountdown() {
      const now = new Date();
      const target = new Date('2026-03-29T23:59:59');
      const diff = target - now;

      if (diff <= 0) {
        countdownEl.textContent = 'OFERTA ENCERRADA';
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      countdownEl.textContent = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    updateCountdown();
    setInterval(updateCountdown, 1000);
  }
});
