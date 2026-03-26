const PLACEHOLDER = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <rect width="400" height="400" fill="#009C3B"/>
  <rect x="0" y="160" width="400" height="80" fill="#FFDF00"/>
  <text x="200" y="210" font-family="Arial" font-size="18" font-weight="bold" fill="#002776" text-anchor="middle">Camiseta Brasil 2026</text>
  <text x="200" y="280" font-family="Arial" font-size="14" fill="white" text-anchor="middle">Imagem indisponível</text>
</svg>`)}`;

export const PRODUCT_IMAGES = [
  {
    src: 'https://imgnike-a.akamaihd.net/1920x1920/09761715A3.jpg',
    alt: 'Camiseta Oficial Brasil Copa 2026 Jordan — frente'
  },
  {
    src: 'https://imgnike-a.akamaihd.net/1920x1920/09761715A4.jpg',
    alt: 'Camiseta Oficial Brasil Copa 2026 Jordan — costas'
  },
  {
    src: 'https://imgnike-a.akamaihd.net/1920x1920/09761715A6.jpg',
    alt: 'Camiseta Oficial Brasil Copa 2026 Jordan — detalhe do escudo'
  }
];

function onImgError(img, alt) {
  img.src = PLACEHOLDER;
  img.alt = alt || 'Imagem indisponível';
}

export function initGallery() {
  const mainImg = document.getElementById('gallery-main');
  const thumbsContainer = document.getElementById('gallery-thumbs');
  const heroImg = document.getElementById('hero-img');

  // Set hero image
  if (heroImg) {
    heroImg.src = PRODUCT_IMAGES[0].src;
    heroImg.alt = PRODUCT_IMAGES[0].alt;
    heroImg.onerror = () => onImgError(heroImg, PRODUCT_IMAGES[0].alt);
  }

  // Hero thumbnails
  const heroThumbs = document.getElementById('hero-thumbs');
  if (heroImg && heroThumbs) {
    PRODUCT_IMAGES.forEach((image, index) => {
      const thumb = document.createElement('img');
      thumb.src = image.src;
      thumb.alt = image.alt;
      thumb.className = 'hero__thumb' + (index === 0 ? ' active' : '');
      thumb.onerror = () => onImgError(thumb, image.alt);

      thumb.addEventListener('click', () => {
        heroImg.src = image.src;
        heroImg.alt = image.alt;
        heroThumbs.querySelectorAll('.hero__thumb').forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
      });

      heroThumbs.appendChild(thumb);
    });
  }

  // Set main gallery image
  if (mainImg && thumbsContainer) {
    mainImg.src = PRODUCT_IMAGES[0].src;
    mainImg.alt = PRODUCT_IMAGES[0].alt;
    mainImg.onerror = () => onImgError(mainImg, PRODUCT_IMAGES[0].alt);

    // Render thumbnails
    PRODUCT_IMAGES.forEach((image, index) => {
      const thumb = document.createElement('img');
      thumb.src = image.src;
      thumb.alt = image.alt;
      thumb.className = 'gallery__thumb' + (index === 0 ? ' active' : '');
      thumb.setAttribute('role', 'listitem');
      thumb.setAttribute('tabindex', '0');
      thumb.onerror = () => onImgError(thumb, image.alt);

      const activate = () => {
        mainImg.src = image.src;
        mainImg.alt = image.alt;
        mainImg.onerror = () => onImgError(mainImg, image.alt);
        thumbsContainer.querySelectorAll('.gallery__thumb').forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
      };

      thumb.addEventListener('click', activate);
      thumb.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); } });
      thumbsContainer.appendChild(thumb);
    });
  }
}
