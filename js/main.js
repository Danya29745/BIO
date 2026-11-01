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

  select(fromHash() || keys[0], { remember: false });
})();
