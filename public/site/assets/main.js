/* ===========================================================
   Snapping Turtle Media — shared site behavior
   Used by every page. Keep dependency-free (no jQuery/GSAP)
   so the whole site stays fast and framework-free.
   =========================================================== */

document.addEventListener('DOMContentLoaded', () => {

  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Header scroll state ---------- */
  const header = document.getElementById('siteHeader');
  if (header) {
    const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- Mobile menu ---------- */
  const burger = document.getElementById('burgerBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  if (burger && mobileMenu) {
    burger.addEventListener('click', () => {
      mobileMenu.classList.toggle('open');
      burger.classList.toggle('active');
    });
    mobileMenu.querySelectorAll('a').forEach(a =>
      a.addEventListener('click', () => mobileMenu.classList.remove('open'))
    );
  }

  /* ---------- Hero load-in (split text reveal) ---------- */
  const hero = document.querySelector('.hero, .page-hero, .detail-hero');
  if (hero) requestAnimationFrame(() => hero.classList.add('loaded'));

  /* ---------- Scroll reveal ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.15 });
  document.querySelectorAll('.reveal, .stagger').forEach(el => io.observe(el));

  /* ---------- Marquee duplicate (seamless loop) ---------- */
  document.querySelectorAll('.marquee-track').forEach(track => {
    track.innerHTML += track.innerHTML;
  });

  /* ---------- Animated counters ---------- */
  function animateCount(el) {
    const target = +el.dataset.count;
    const dur = 1400;
    const start = performance.now();
    function step(now) {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.floor(eased * target) + '+';
      if (p < 1) requestAnimationFrame(step); else el.textContent = target + '+';
    }
    requestAnimationFrame(step);
  }
  document.querySelectorAll('[data-count-group]').forEach(group => {
    const statIo = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.querySelectorAll('[data-count]').forEach(animateCount);
          statIo.unobserve(e.target);
        }
      });
    }, { threshold: 0.4 });
    statIo.observe(group);
  });

  /* ---------- Testimonial sliders (supports multiple on a page) ---------- */
  document.querySelectorAll('.testi-wrap').forEach(wrap => {
    const slides = wrap.querySelectorAll('.testi-slide');
    const dotsWrap = wrap.querySelector('.testi-dots');
    if (!slides.length || !dotsWrap) return;
    slides.forEach((_, i) => {
      const d = document.createElement('button');
      if (i === 0) d.classList.add('active');
      d.addEventListener('click', () => show(i));
      dotsWrap.appendChild(d);
    });
    let idx = 0;
    function show(i) {
      slides[idx].classList.remove('active');
      dotsWrap.children[idx].classList.remove('active');
      idx = i;
      slides[idx].classList.add('active');
      dotsWrap.children[idx].classList.add('active');
    }
    setInterval(() => show((idx + 1) % slides.length), 5500);
  });

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll('.faq-item').forEach(item => {
    const q = item.querySelector('.faq-q');
    if (!q) return;
    q.addEventListener('click', () => {
      const wasOpen = item.classList.contains('open');
      item.parentElement.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
      if (!wasOpen) item.classList.add('open');
    });
  });

  /* ---------- Portfolio / work filter pills ---------- */
  document.querySelectorAll('.filter-row').forEach(row => {
    const pills = row.querySelectorAll('.filter-pill');
    const gridSel = row.dataset.target;
    const grid = gridSel ? document.querySelector(gridSel) : null;
    if (!grid) return;
    const cards = grid.children;
    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        pills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const filter = pill.dataset.filter;
        Array.from(cards).forEach(card => {
          const show = filter === 'all' || card.dataset.category === filter;
          card.style.display = show ? '' : 'none';
        });
      });
    });
  });

  /* ---------- Hex field background (signature motif) ---------- */
  document.querySelectorAll('.hexfield-target').forEach(target => {
    const svgNS = 'http://www.w3.org/2000/svg';
    const field = target.querySelector('.hexfield-svg');
    if (!field) return;
    const w = 1600, h = 900, size = 46;
    field.setAttribute('viewBox', `0 0 ${w} ${h}`);
    field.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    const hexW = size * 1.732, hexH = size * 2;
    const cols = Math.ceil(w / hexW) + 2, rows = Math.ceil(h / (hexH * 0.75)) + 2;
    const cx0 = w * 0.62, cy0 = h * 0.4;
    const cells = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * hexW + (r % 2 ? hexW / 2 : 0) - hexW;
        const y = r * hexH * 0.75 - hexH;
        const dist = Math.hypot(x - cx0, y - cy0);
        cells.push({ x, y, dist });
      }
    }
    cells.sort((a, b) => a.dist - b.dist);
    const maxDist = Math.max(...cells.map(c => c.dist));
    cells.forEach((c) => {
      const pts = [];
      for (let k = 0; k < 6; k++) {
        const ang = Math.PI / 180 * (60 * k - 30);
        pts.push(`${c.x + size * Math.cos(ang)},${c.y + size * Math.sin(ang)}`);
      }
      const poly = document.createElementNS(svgNS, 'polygon');
      poly.setAttribute('points', pts.join(' '));
      poly.setAttribute('fill', 'none');
      poly.setAttribute('stroke', 'rgba(23,146,92,' + (0.55 * (1 - c.dist / maxDist) + 0.05) + ')');
      poly.setAttribute('stroke-width', '1');
      poly.style.opacity = '0';
      poly.style.transition = `opacity .6s ease ${(c.dist / maxDist * 1.1).toFixed(2)}s`;
      field.appendChild(poly);
    });
    const obs = new IntersectionObserver((e) => {
      if (e[0].isIntersecting) {
        field.classList.add('show');
        requestAnimationFrame(() => { field.querySelectorAll('polygon').forEach(p => p.style.opacity = '1'); });
        obs.disconnect();
      }
    }, { threshold: 0.1 });
    obs.observe(target);
  });

});
