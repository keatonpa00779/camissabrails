const SIZES = ['P', 'M', 'G', 'GG', 'GGG'];
let selectedSize = null;

export function initSizeSelector() {
  const container = document.getElementById('size-selector');
  SIZES.forEach(size => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'size-btn';
    btn.textContent = size;
    btn.setAttribute('aria-label', `Tamanho ${size}`);
    btn.setAttribute('aria-pressed', 'false');

    btn.addEventListener('click', () => {
      selectedSize = size;
      container.querySelectorAll('.size-btn').forEach(b => {
        b.classList.remove('selected');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('selected');
      btn.setAttribute('aria-pressed', 'true');
      // Hide error if shown
      const err = document.getElementById('size-error');
      if (err) err.hidden = true;
    });

    container.appendChild(btn);
  });
}

export function getSelectedSize() {
  return selectedSize;
}
