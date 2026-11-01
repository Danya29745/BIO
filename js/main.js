(() => {
  'use strict';

  const list = document.querySelector('.keys');
  const keys = [...document.querySelectorAll('.key')];
  const panels = new Map([...document.querySelectorAll('.panel')].map((p) => [p.id, p]));
  const main = document.querySelector('.js-tg');
  if (!list || !keys.length || !main) return;

  /* Ник меняется в одном месте: в href главной кнопки в index.html */
  const base = main.getAttribute('href').split('?')[0];
  const HELLO = 'Здравствуйте, Данил! ';

  /* Каждая кнопка «Написать» открывает Telegram с уже готовым сообщением */
  document.querySelectorAll('[data-msg]').forEach((a) => {
    a.href = `${base}?text=${encodeURIComponent(HELLO + a.dataset.msg)}`;
  });

  function select(key, { focus = false, remember = true } = {}) {
    keys.forEach((k) => {
      const on = k === key;
      k.setAttribute('aria-selected', String(on));
      k.tabIndex = on ? 0 : -1;
      const panel = panels.get(k.getAttribute('aria-controls'));
      if (panel) {
        panel.toggleAttribute('data-active', on);
        panel.inert = !on;
      }
    });
    if (focus) key.focus();
    if (remember) {
      try { history.replaceState(null, '', `#${key.dataset.slug}`); } catch (_) { /* file:// */ }
    }
  }

  keys.forEach((k) => k.addEventListener('click', () => select(k)));

  /* Стрелки, Home и End двигаются по клавиатуре как в нативных вкладках */
  list.addEventListener('keydown', (e) => {
    const i = keys.indexOf(document.activeElement);
    if (i < 0) return;
    const step = {
      ArrowRight: i + 1, ArrowDown: i + 1,
      ArrowLeft: i - 1, ArrowUp: i - 1,
      Home: 0, End: keys.length - 1,
    }[e.key];
    if (step === undefined) return;
    e.preventDefault();
    select(keys[(step + keys.length) % keys.length], { focus: true });
  });

  /* Ссылка вида сайт/#bot сразу открывает нужную услугу */
  const fromHash = () => keys.find((k) => k.dataset.slug === location.hash.slice(1));
  window.addEventListener('hashchange', () => {
    const k = fromHash();
    if (k) select(k, { remember: false });
  });

  /* ---------- Окошко с примером ---------- */
  const dlg = document.getElementById('dlg');
  if (dlg) {
    const stage = document.getElementById('dlg-stage');
    const title = document.getElementById('dlg-title');
    const cta = document.getElementById('dlg-cta');

    /* Нарисованный QR-подобный узор для примера: одинаковый при каждом открытии */
    const drawQr = (el) => {
      const n = 21;
      let seed = 7;
      const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
      const inFinder = (x, y) => (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
      let d = '';
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          if (!inFinder(x, y) && rnd() > 0.52) d += `M${x + 2} ${y + 2}h1v1h-1z`;
        }
      }
      const finder = (ox, oy) =>
        `<path d="M${ox} ${oy}h7v7h-7zM${ox + 1} ${oy + 1}v5h5v-5z" fill-rule="evenodd"/>` +
        `<rect x="${ox + 2}" y="${oy + 2}" width="3" height="3"/>`;
      el.innerHTML =
        `<svg viewBox="0 0 ${n + 4} ${n + 4}" shape-rendering="crispEdges" aria-hidden="true">` +
        `<rect width="${n + 4}" height="${n + 4}" fill="#fff"/><g fill="#0e1a24">` +
        `<path d="${d}"/>${finder(2, 2)}${finder(n - 5, 2)}${finder(2, n - 5)}</g></svg>`;
    };

    const openExample = (slug) => {
      const tpl = document.getElementById(`ex-${slug}`);
      if (!tpl) return;
      stage.replaceChildren(tpl.content.cloneNode(true));
      stage.querySelectorAll('[data-qr]').forEach(drawQr);
      title.textContent = tpl.dataset.title;
      cta.href = `${base}?text=${encodeURIComponent(HELLO + (tpl.dataset.msg || ''))}`;
      dlg.querySelector('.dlg__body').scrollTop = 0;
      dlg.showModal();
    };

    document.querySelectorAll('[data-example]').forEach((b) =>
      b.addEventListener('click', () => openExample(b.dataset.example)));

    dlg.querySelector('[data-close]').addEventListener('click', () => dlg.close());
    /* Клик по затемнению закрывает окошко. Esc работает сам */
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  }

  select(fromHash() || keys[0], { remember: false });
})();
