/* Niles Historical Society — site.js */

// === Mobile Nav Toggle ===
(function () {
  const toggle = document.getElementById('nav-toggle');
  const nav    = document.getElementById('site-nav');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', function () {
    const open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
  });

  // Close when clicking outside
  document.addEventListener('click', function (e) {
    if (!toggle.contains(e.target) && !nav.contains(e.target)) {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open navigation menu');
    }
  });

  // Close on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.focus();
    }
  });
}());

// === Lightbox ===
(function () {
  const overlay  = document.getElementById('lightbox');
  const img      = document.getElementById('lightbox-img');
  const caption  = document.getElementById('lightbox-caption');
  const closeBtn = document.getElementById('lightbox-close');

  if (!overlay || !img) return;

  function getCaption(link) {
    // Try img alt first
    const imgEl = link.querySelector('img');
    const alt   = imgEl ? imgEl.alt : '';

    // Try nearest sibling / parent text node (legacy content has captions in sibling <p> or after <br>)
    const cell = link.closest('td') || link.closest('figure') || link.parentElement;
    if (cell) {
      // Collect text from non-link elements in the same cell
      const texts = [];
      cell.childNodes.forEach(function (node) {
        if (node === link) return;
        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
          texts.push(node.textContent.trim());
        } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'A') {
          const t = node.textContent.trim();
          if (t && t.length < 300) texts.push(t);
        }
      });
      if (texts.length) return texts.join(' ').replace(/\s+/g, ' ').trim();
    }
    return alt;
  }

  function open(href, cap) {
    img.src = href;
    img.alt = cap || '';
    caption.textContent = cap || '';
    overlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  }

  function close() {
    overlay.classList.remove('is-open');
    document.body.style.overflow = '';
    img.src = '';
  }

  // Wire up all links that point to image files and wrap an <img>
  document.querySelectorAll('a[href]').forEach(function (link) {
    const href = link.getAttribute('href') || '';
    if (!/\.(jpe?g|png|gif|webp)(\?.*)?$/i.test(href)) return;
    if (!link.querySelector('img')) return;

    link.addEventListener('click', function (e) {
      e.preventDefault();
      open(href, getCaption(link));
    });
  });

  closeBtn.addEventListener('click', close);

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) close();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlay.classList.contains('is-open')) close();
  });
}());
