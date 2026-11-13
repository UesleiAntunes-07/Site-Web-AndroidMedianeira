/* Android Medianeira — interações (sem dependências) */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.documentElement.classList.add('js');

  /* ---------- Datas dinâmicas ---------- */
  const now = new Date();
  const years = now.getFullYear() - 2012;
  $$('[data-years]').forEach(el => {
    el.textContent = years;
    if (el.hasAttribute('data-count')) el.dataset.count = years;
  });
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = now.getFullYear();

  /* ---------- Por dentro: progresso de scroll compartilhado com a cena 3D ---------- */
  const raiox = $('#por-dentro');
  const STEPS = 6, START = 0.14, END = 0.86;
  const AM = (window.AM = {
    reduce,
    STEPS, START, END,
    raioxProgress() {
      if (!raiox) return 0;
      const r = raiox.getBoundingClientRect();
      return clamp(-r.top / (r.height - innerHeight));
    },
    raioxStep(p) {
      if (p < START) return -1;
      if (p >= END) return STEPS;
      return Math.min(STEPS - 1, Math.floor(((p - START) / (END - START)) * STEPS));
    },
  });

  const stepEls = $$('#raioxSteps li');
  const bar = $('#raioxBar');
  const done = $('#raioxDone');
  const hint = $('#raioxHint');
  let lastStep = -2;
  function updateRaiox() {
    const p = AM.raioxProgress();
    const s = AM.raioxStep(p);
    if (bar) bar.style.transform = `scaleX(${clamp((p - START) / (END - START))})`;
    if (s === lastStep) return;
    lastStep = s;
    stepEls.forEach((li, i) => {
      li.classList.toggle('is-active', i === s);
      li.classList.toggle('is-past', i < s);
    });
    done && done.classList.toggle('is-on', s === STEPS);
    hint && hint.classList.toggle('is-on', s === -1);
  }

  /* ---------- Texto que acende com o scroll ---------- */
  const fill = $('#fillText');
  let words = [];
  if (fill) {
    const text = fill.textContent.trim().split(/\s+/);
    fill.setAttribute('aria-label', text.join(' '));
    fill.innerHTML = text.map(w => `<span class="w" aria-hidden="true">${w}</span>`).join(' ');
    words = $$('.w', fill);
    if (reduce) words.forEach(w => w.classList.add('on'));
  }
  function updateFill() {
    if (!words.length || reduce) return;
    const r = fill.getBoundingClientRect();
    const p = clamp((innerHeight * 0.82 - r.top) / (r.height + innerHeight * 0.3));
    const lit = Math.round(p * words.length);
    words.forEach((w, i) => w.classList.toggle('on', i < lit));
  }

  /* ---------- Nav ---------- */
  const nav = $('#nav');
  const zap = $('.zap');
  const menu = $('#menu');
  const toggle = $('#menuToggle');
  let lastY = scrollY;
  function updateNav() {
    const y = scrollY;
    const goingDown = y > lastY && y > 400;
    const menuOpen = menu.classList.contains('is-open');
    nav.classList.toggle('is-hidden', goingDown && !menuOpen);
    const nearEnd = y + innerHeight > document.documentElement.scrollHeight - innerHeight * 0.9;
    zap && zap.classList.toggle('is-on', y > innerHeight * 0.7 && !nearEnd);
    lastY = y;
  }
  function closeMenu() {
    menu.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  }
  toggle.addEventListener('click', () => {
    const open = menu.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  $$('a', menu).forEach(a => a.addEventListener('click', closeMenu));
  addEventListener('keydown', e => e.key === 'Escape' && closeMenu());

  // link ativo
  const links = $$('.nav__links a');
  const sections = links.map(a => $(a.getAttribute('href'))).filter(Boolean);
  function updateCurrent() {
    const mid = innerHeight * 0.4;
    let current = null;
    sections.forEach(s => {
      const r = s.getBoundingClientRect();
      if (r.top <= mid && r.bottom > mid) current = s.id;
    });
    links.forEach(a => a.classList.toggle('is-current', a.getAttribute('href') === '#' + current));
  }

  /* ---------- Loop de scroll (rAF) ---------- */
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      updateNav(); updateRaiox(); updateFill(); updateCurrent();
      ticking = false;
    });
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  /* ---------- Carrossel de marcas: so anima quando esta na tela ---------- */
  const track = $('.marquee__track');
  if (track) {
    new IntersectionObserver(([e]) => track.classList.toggle('is-off', !e.isIntersecting), { rootMargin: '80px 0px' }).observe(track.parentElement);
  }

  /* ---------- Reveal ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal, .gauge').forEach(el => io.observe(el));

  /* ---------- Contadores ---------- */
  const cio = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      cio.unobserve(e.target);
      const el = e.target;
      const to = parseInt(el.dataset.count, 10);
      if (!to || reduce) return;
      const from = el.hasAttribute('data-plain') ? to - 40 : 0;
      const t0 = performance.now(), dur = 1500;
      (function tick(t) {
        const k = clamp((t - t0) / dur);
        const eased = 1 - Math.pow(1 - k, 4);
        el.textContent = Math.round(from + (to - from) * eased);
        if (k < 1) requestAnimationFrame(tick);
      })(t0);
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach(el => cio.observe(el));

  /* ---------- Lojas: troca de mapa ---------- */
  const tabs = $$('.loja');
  const frame = $('#mapaFrame');
  const mapa = $('#mapa');
  const mapLink = $('#mapaLink');
  tabs.forEach(tab => tab.addEventListener('click', () => {
    if (tab.classList.contains('is-active')) return;
    tabs.forEach(t => {
      const on = t === tab;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', String(on));
    });
    mapa.classList.add('is-loading');
    frame.addEventListener('load', () => mapa.classList.remove('is-loading'), { once: true });
    setTimeout(() => mapa.classList.remove('is-loading'), 2500);
    frame.src = tab.dataset.map;
    mapLink.href = tab.dataset.link;
  }));

  /* ---------- Mapa: garante que o iframe sempre preencha a caixa ----------
     Ao mudar a escala da tela (ex.: arrastar a janela do monitor para o notebook em 125%),
     o navegador pode manter o mapa no tamanho antigo. Um ajuste de 1px por um instante
     obriga o iframe a recalcular o próprio tamanho. */
  if (frame && mapa) {
    const syncMap = () => {
      frame.style.height = 'calc(100% - 1px)';
      setTimeout(() => { frame.style.height = ''; }, 80);
    };
    let syncT;
    const syncSoon = () => { clearTimeout(syncT); syncT = setTimeout(syncMap, 250); };
    addEventListener('resize', syncSoon);
    addEventListener('pageshow', syncSoon);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) syncSoon(); });
    frame.addEventListener('load', syncSoon);
    new IntersectionObserver(es => es.forEach(e => e.isIntersecting && syncSoon()), { threshold: 0.15 }).observe(mapa);
    (function watchScale() {
      const mq = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      const onChange = () => { syncSoon(); watchScale(); };
      mq.addEventListener ? mq.addEventListener('change', onChange, { once: true }) : mq.addListener(onChange);
    })();
  }
})();
