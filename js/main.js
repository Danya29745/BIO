(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const root = document.documentElement;

  /* ---------- XMB: ряд разделов и столбец пунктов ---------- */
  const xmb = $('#xmb');
  const cats = $$('.cat', xmb);

  const catBar = document.createElement('div');
  catBar.className = 'xmb-cats';
  catBar.setAttribute('role', 'tablist');
  catBar.setAttribute('aria-label', 'Разделы');

  const catButtons = cats.map((cat, k) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'xmb-cat';
    btn.id = `tab-${cat.id}`;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-controls', cat.id);

    const icon = document.createElement('img');
    icon.src = cat.dataset.icon;
    icon.alt = '';
    const label = document.createElement('span');
    label.className = 'xmb-cat__label';
    label.textContent = $('.cat__label', cat).textContent;

    btn.append(icon, label);
    btn.addEventListener('click', () => {
      selectCat(k);
      btn.blur(); // иначе браузер рисует рамку фокуса при листании стрелками
    });
    catBar.append(btn);

    cat.setAttribute('role', 'tabpanel');
    cat.setAttribute('aria-labelledby', btn.id);
    return btn;
  });
  xmb.prepend(catBar);

  let current = 0;
  const selected = cats.map(() => 0); // PS3 помнит выбранный пункт в каждом разделе
  const itemsOf = (k) => $$('.cat__items > .item', cats[k]);

  let geo = null;
  const px = (name) => parseFloat(getComputedStyle(root).getPropertyValue(name)) || 0;

  const measure = () => {
    const vw = innerWidth;
    const vh = innerHeight;
    const narrow = vw < 640;
    const catIcon = px('--cat-icon');
    const col = px('--col');
    const anchorX = narrow ? Math.max(16, vw * 0.08) : vw * 0.2;
    const tiny = vw < 260; // часы: ряд разделов выше и пункты ближе к нему
    const catY = vh * (tiny ? 0.15 : narrow ? 0.2 : 0.25);
    // на телефоне кнопки не втискиваем все в экран: крайние уезжают вправо, как на ПК
    const catStep = narrow ? Math.max(72, (vw - 32) / cats.length) : clamp(vw * 0.1, 112, 160);
    // на широких экранах разделов немного, и вся полоска их иконок целиком помещается
    // на экране — поэтому ставим её по центру, а не прижимаем к левому краю и не листаем
    const rowWidth = (cats.length - 1) * catStep + catIcon;
    const catRowStartX = Math.max(24, (vw - rowWidth) / 2);
    geo = {
      narrow,
      anchorX,
      catRowStartX,
      catY,
      catIcon,
      catStep,
      selY: catY + catIcon / 2 + (tiny ? 30 : 52),
      aboveBottom: catY - catIcon / 2 - 18,
      step: tiny ? 46 : narrow ? 58 : Math.max(64, vh * 0.085),
    };
    // отступ колонки с пунктами считаем от прежнего, левого анкора — список не должен
    // прыгать по горизонтали в зависимости от того, какой раздел сейчас выбран
    root.style.setProperty('--ix', `${Math.max(8, anchorX + catIcon / 2 - col / 2)}px`);
  };

  const loadThumb = (item) => {
    const img = $('img[data-src]', item);
    if (!img) return;
    img.src = img.dataset.src;
    img.removeAttribute('data-src');
  };

  const render = () => {
    catButtons.forEach((btn, k) => {
      const on = k === current;
      // на телефоне ряд сдвигается, как на ПК, но выбранный раздел стоит во втором слоте,
      // чтобы предыдущая кнопка оставалась на экране и на неё можно было нажать
      const slot = Math.min(current, 1) + (k - current);
      const x = geo.narrow
        ? 16 + slot * geo.catStep + (geo.catStep - geo.catIcon) / 2
        : geo.catRowStartX + k * geo.catStep;
      btn.style.transform = `translate(${x}px, ${geo.catY - geo.catIcon / 2}px)`;
      btn.classList.toggle('is-current', on);
      btn.setAttribute('aria-selected', String(on));
      btn.tabIndex = on ? 0 : -1;
    });

    cats.forEach((cat, k) => {
      const on = k === current;
      cat.classList.toggle('is-current', on);
      const items = itemsOf(k);
      const s = clamp(selected[k], 0, Math.max(0, items.length - 1));
      selected[k] = s;
      items.forEach((item, j) => item.classList.toggle('is-selected', j === s));

      // скрытые разделы тоже раскладываем, чтобы при переключении пункты не прилетали сверху
      const selHeight = items[s] ? items[s].offsetHeight : 0;
      items.forEach((item, j) => {
        let y;
        if (j === s) y = geo.selY;
        else if (j > s) y = geo.selY + selHeight + 20 + (j - s - 1) * geo.step;
        else y = geo.aboveBottom - (s - j) * geo.step;
        item.style.transform = `translate3d(0, ${y}px, 0)`;
        const far = y < -geo.step * 2 || y > innerHeight + geo.step;
        item.classList.toggle('is-far', far);
        if (on && !far) loadThumb(item);
      });
    });

    // листаем пункты — на телефоне прячем термометр, чтобы не мешался
    root.classList.toggle('items-scrolled', selected[current] > 0);
    // стикерам (js/stickers.js): какой пункт выбран, чтобы играл только он
    document.dispatchEvent(new Event('xmb:render'));
  };

  function selectCat(k) {
    const next = clamp(k, 0, cats.length - 1);
    if (next === current) return;
    current = next;
    render();
    document.dispatchEvent(new Event('xmb:select'));
  }

  function selectItem(j) {
    const items = itemsOf(current);
    const next = clamp(j, 0, items.length - 1);
    if (next === selected[current]) return;
    selected[current] = next;
    render();
    document.dispatchEvent(new Event('xmb:select'));
  }

  const activate = () => {
    const item = itemsOf(current)[selected[current]];
    const row = item && $('.item__row', item);
    if (row && row.href) row.click();
  };

  /* клавиатура */
  addEventListener('keydown', (e) => {
    // пока открыта игра или просмотрщик, клавиши сайту не нужны
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const inPanel = e.target instanceof Element && e.target.closest('.item__panel');
    switch (e.key) {
      case 'ArrowLeft': selectCat(current - 1); break;
      case 'ArrowRight': selectCat(current + 1); break;
      case 'ArrowUp': selectItem(selected[current] - 1); break;
      case 'ArrowDown': selectItem(selected[current] + 1); break;
      case 'Home': selectItem(0); break;
      case 'End': selectItem(itemsOf(current).length - 1); break;
      case 'Enter':
      case ' ':
        if (inPanel) return;
        activate();
        break;
      default: return;
    }
    e.preventDefault();
  });

  /* мышь: клик выбирает пункт, повторный клик открывает */
  let swiped = false;
  xmb.addEventListener('click', (e) => {
    if (swiped) {
      e.preventDefault();
      swiped = false;
      return;
    }
    if (e.target.closest('.item__panel a')) return;
    const item = e.target.closest('.cat.is-current .item');
    if (!item) return;
    const j = itemsOf(current).indexOf(item);
    if (j !== selected[current]) {
      e.preventDefault();
      selectItem(j);
      return;
    }
  });

  /* колесо и тачпад: копим сдвиг, чтобы один жест не пролистывал десяток пунктов */
  let wheelAcc = 0;
  let wheelLast = 0;
  let wheelLockUntil = 0;
  addEventListener('wheel', (e) => {
    e.preventDefault();
    const now = performance.now();
    if (now - wheelLast > 220) wheelAcc = 0;
    wheelLast = now;
    if (now < wheelLockUntil) return;

    const horizontal = e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY);
    wheelAcc += horizontal ? (e.deltaX || e.deltaY) : e.deltaY;
    if (Math.abs(wheelAcc) < 40) return;

    const dir = Math.sign(wheelAcc);
    wheelAcc = 0;
    if (horizontal) {
      selectCat(current + dir);
      wheelLockUntil = now + 260;
    } else {
      selectItem(selected[current] + dir);
      wheelLockUntil = now + 70;
    }
  }, { passive: false });

  /* свайпы на телефоне */
  let touchStart = null;
  xmb.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    touchStart = { x: e.clientX, y: e.clientY };
    swiped = false;
  });
  xmb.addEventListener('pointerup', (e) => {
    if (!touchStart) return;
    const dx = e.clientX - touchStart.x;
    const dy = e.clientY - touchStart.y;
    touchStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return;
    swiped = true;
    setTimeout(() => { swiped = false; }, 400);
    if (Math.abs(dx) > Math.abs(dy)) selectCat(current - Math.sign(dx));
    else selectItem(selected[current] - Math.sign(dy) * Math.max(1, Math.round(Math.abs(dy) / geo.step)));
  });
  xmb.addEventListener('pointercancel', () => { touchStart = null; });

  /* ---------- Размер экрана в разделе «Почему я» ---------- */
  const screenSize = $('#screenSize');
  const showScreen = () => {
    if (screenSize) screenSize.textContent = `${innerWidth} × ${innerHeight}`;
  };

  /* ---------- Подсказка управления: исчезает после первого действия ---------- */
  const hint = $('#hint');
  if (hint) {
    const hideHint = () => hint.classList.add('is-off');
    ['keydown', 'wheel', 'pointerdown'].forEach((ev) => addEventListener(ev, hideHint, { once: true, passive: true }));
    if (matchMedia('(pointer: coarse)').matches) hint.innerHTML = 'Листай пальцем: влево и вправо разделы, вверх и вниз пункты';
  }

  /* ---------- Запуск ---------- */
  root.classList.add('xmb-on', 'xmb-init');
  measure();
  render();
  showScreen();
  const endInit = () => root.classList.remove('xmb-init');
  requestAnimationFrame(() => requestAnimationFrame(endInit));
  setTimeout(endInit, 500); // вкладка в фоне не отдаёт кадры

  addEventListener('resize', () => {
    measure();
    render();
    showScreen();
  });
  if (document.fonts) document.fonts.ready.then(render);
})();
