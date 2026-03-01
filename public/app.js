// ---- Dark Mode ----
function initTheme() {
  const toggle = document.getElementById('theme-toggle');
  const html = document.documentElement;

  function setTheme(dark) {
    html.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }

  const saved = localStorage.getItem('theme');
  if (saved) {
    setTheme(saved === 'dark');
  } else {
    setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches);
  }

  toggle.addEventListener('click', () => {
    setTheme(html.getAttribute('data-theme') !== 'dark');
  });
}

// ---- Scroll Reveal ----
function observeReveals() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal:not(.revealed)').forEach((el) => {
    observer.observe(el);
  });
}

// ---- Lightbox ----
let lbPhotos = [];
let lbIndex = 0;

function openLightbox(photos, index) {
  lbPhotos = photos;
  lbIndex = index;
  const lb = document.getElementById('lightbox');
  const img = document.getElementById('lightbox-img');
  img.src = photos[index].src;
  updateCounter();
  lb.hidden = false;
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => lb.classList.add('active'));
}

function closeLightbox() {
  const lb = document.getElementById('lightbox');
  lb.classList.remove('active');
  document.body.style.overflow = '';
  setTimeout(() => { lb.hidden = true; }, 300);
}

function navigateLightbox(dir) {
  lbIndex = (lbIndex + dir + lbPhotos.length) % lbPhotos.length;
  const img = document.getElementById('lightbox-img');
  img.style.opacity = '0';
  setTimeout(() => {
    img.src = lbPhotos[lbIndex].src;
    img.onload = () => { img.style.opacity = '1'; };
    updateCounter();
  }, 200);
}

function updateCounter() {
  document.getElementById('lightbox-counter').textContent =
    lbPhotos.length > 0 ? `${lbIndex + 1} / ${lbPhotos.length}` : '';
}

function initLightbox() {
  document.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
  document.querySelector('.lightbox-prev').addEventListener('click', () => navigateLightbox(-1));
  document.querySelector('.lightbox-next').addEventListener('click', () => navigateLightbox(1));

  document.getElementById('lightbox').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeLightbox();
  });

  document.addEventListener('keydown', (e) => {
    if (document.getElementById('lightbox').hidden) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') navigateLightbox(-1);
    if (e.key === 'ArrowRight') navigateLightbox(1);
  });
}

// ---- Placeholder Grid ----
const GRADIENTS = [
  'linear-gradient(135deg, #1a1a2e, #16213e)',
  'linear-gradient(135deg, #0f3460, #533483)',
  'linear-gradient(135deg, #2c3e50, #3498db)',
  'linear-gradient(135deg, #1e272e, #485460)',
  'linear-gradient(135deg, #2d3436, #636e72)',
  'linear-gradient(135deg, #0c2461, #1e3799)',
];

function placeholderGrid(count) {
  return Array.from({ length: count }, (_, i) => {
    const div = document.createElement('div');
    div.className = 'photo-item reveal';
    div.innerHTML = `<div class="placeholder-img" style="background:${GRADIENTS[i % GRADIENTS.length]}"><span>Photo ${i + 1}</span></div>`;
    return div;
  });
}

// ---- Data Loading ----
async function loadFeatured() {
  const grid = document.getElementById('featured-grid');
  grid.innerHTML = '';

  try {
    const res = await fetch('/api/albums');
    const albums = await res.json();

    // Collect up to 6 photos from all albums
    const allPhotos = [];
    for (const album of albums) {
      const aRes = await fetch(`/api/albums/${album.slug}`);
      const aData = await aRes.json();
      allPhotos.push(...aData.photos);
      if (allPhotos.length >= 6) break;
    }

    const photos = allPhotos.slice(0, 6);

    if (photos.length === 0) {
      placeholderGrid(6).forEach((el, i) => {
        el.style.transitionDelay = `${i * 0.1}s`;
        grid.appendChild(el);
      });
    } else {
      photos.forEach((photo, i) => {
        const div = document.createElement('div');
        div.className = 'photo-item reveal';
        div.style.transitionDelay = `${i * 0.1}s`;
        div.dataset.index = i;
        div.innerHTML = `<img src="${photo.src}" alt="${photo.filename}" loading="lazy">`;
        div.addEventListener('click', () => openLightbox(photos, i));
        grid.appendChild(div);
      });
    }
  } catch {
    placeholderGrid(6).forEach((el, i) => {
      el.style.transitionDelay = `${i * 0.1}s`;
      grid.appendChild(el);
    });
  }

  observeReveals();
}

async function loadAlbumsList() {
  const grid = document.getElementById('albums-grid');
  grid.innerHTML = '';

  try {
    const res = await fetch('/api/albums');
    const albums = await res.json();

    if (albums.length === 0) {
      grid.innerHTML = '<p class="empty-state">No albums yet. Add photos to the photos folder to get started.</p>';
      return;
    }

    albums.forEach((album, i) => {
      const a = document.createElement('a');
      a.href = `#/albums/${album.slug}`;
      a.className = 'album-card reveal';
      a.style.transitionDelay = `${i * 0.1}s`;
      a.innerHTML = `
        <div class="album-cover" style="${album.cover ? `background-image:url('${album.cover}')` : ''}"></div>
        <h3>${album.title}</h3>
        <span>${album.count} photo${album.count !== 1 ? 's' : ''}</span>
      `;
      grid.appendChild(a);
    });
  } catch {
    grid.innerHTML = '<p class="empty-state">Failed to load albums.</p>';
  }

  observeReveals();
}

async function loadAlbum(slug) {
  const grid = document.getElementById('album-grid');
  const title = document.getElementById('album-title');
  const desc = document.getElementById('album-description');
  grid.innerHTML = '';

  try {
    const res = await fetch(`/api/albums/${slug}`);
    if (!res.ok) { window.location.hash = '#/albums'; return; }
    const album = await res.json();

    title.textContent = album.title;
    desc.textContent = album.description;

    if (album.photos.length === 0) {
      placeholderGrid(6).forEach((el, i) => {
        el.style.transitionDelay = `${i * 0.1}s`;
        grid.appendChild(el);
      });
    } else {
      album.photos.forEach((photo, i) => {
        const div = document.createElement('div');
        div.className = 'photo-item reveal';
        div.style.transitionDelay = `${i * 0.1}s`;
        div.dataset.index = i;
        div.innerHTML = `<img src="${photo.src}" alt="${photo.filename}" loading="lazy">`;
        div.addEventListener('click', () => openLightbox(album.photos, i));
        grid.appendChild(div);
      });
    }
  } catch {
    title.textContent = 'Album';
    desc.textContent = '';
    grid.innerHTML = '<p class="empty-state">Failed to load album.</p>';
  }

  observeReveals();
}

// ---- Contact Form ----
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = document.getElementById('form-status');
    const btn = form.querySelector('button');
    btn.disabled = true;
    btn.textContent = 'Sending...';

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.value,
          email: form.email.value,
          message: form.message.value
        })
      });
      const data = await res.json();
      status.textContent = data.message || 'Thanks! Your message has been sent.';
      status.hidden = false;
      if (res.ok) form.reset();
    } catch {
      status.textContent = 'Something went wrong. Please try again.';
      status.hidden = false;
    }
    btn.disabled = false;
    btn.textContent = 'Send Message';
  });
}

// ---- Router ----
function handleRoute() {
  const hash = window.location.hash || '#/';
  const views = document.querySelectorAll('.view');
  views.forEach((v) => { v.hidden = true; });

  document.querySelectorAll('[data-nav]').forEach((a) => a.classList.remove('active'));

  if (hash.startsWith('#/albums/')) {
    document.getElementById('view-album').hidden = false;
    document.querySelector('[data-nav="albums"]').classList.add('active');
    loadAlbum(hash.replace('#/albums/', ''));
  } else if (hash === '#/albums') {
    document.getElementById('view-albums').hidden = false;
    document.querySelector('[data-nav="albums"]').classList.add('active');
    loadAlbumsList();
  } else if (hash === '#/contact') {
    document.getElementById('view-contact').hidden = false;
    document.querySelector('[data-nav="contact"]').classList.add('active');
  } else {
    document.getElementById('view-home').hidden = false;
    document.querySelector('[data-nav="home"]').classList.add('active');
    loadFeatured();
  }

  window.scrollTo(0, 0);
  observeReveals();
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initLightbox();
  initContactForm();
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
});
