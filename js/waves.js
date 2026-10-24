// Фон: лёгкая сеть узлов со связями и «пульсами», бегущими между ними —
// как граф запросов между сайтом/ботом и сервером. Один холст, без библиотек.
// Цвета берёт из токенов в :root, на скрытой вкладке стоит на паузе, при
// prefers-reduced-motion рисует один неподвижный кадр.
(() => {
  'use strict';

  const canvas = document.getElementById('waves');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const css = getComputedStyle(document.documentElement);
  const token = (name) => css.getPropertyValue(name).trim();
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const LINK_DIST = 170; // расстояние в css-пикселях, на котором узлы соединяются линией
  const rand = (a, b) => a + Math.random() * (b - a);

  let w = 0;
  let h = 0;
  let scale = 1;
  let light = false;
  let nodes = [];
  let pulses = [];

  const makeNodes = () => {
    const area = (w / scale) * (h / scale);
    // на телефонах и при экономии трафика — заметно меньше узлов и без «пульсов»
    const raw = Math.round(area / (light ? 42000 : 24000));
    const n = Math.max(10, Math.min(raw, light ? 20 : 46));
    nodes = Array.from({ length: n }, () => ({
      x: rand(0, w),
      y: rand(0, h),
      vx: rand(-0.06, 0.06) * scale,
      vy: rand(-0.05, 0.05) * scale,
      r: rand(1.1, 2.3) * scale,
      tone: Math.random() < 0.5 ? '--wave-a' : '--wave-b',
    }));
    pulses = [];
  };

  const resize = () => {
    // та же логика экономии, что и раньше: на узких экранах и при saveData рисуем вполовину меньше пикселей
    light = innerWidth < 700 || Boolean(navigator.connection && navigator.connection.saveData);
    scale = light ? 0.5 : Math.min(devicePixelRatio || 1, 1.5) * 0.75;
    w = Math.max(1, Math.round(innerWidth * scale));
    h = Math.max(1, Math.round(innerHeight * scale));
    canvas.width = w;
    canvas.height = h;
    makeNodes();
  };

  // запускает «пульс» — точку, бегущую по одной из связей, как запрос к боту
  const spawnPulse = () => {
    if (still || !nodes.length) return;
    const a = nodes[(Math.random() * nodes.length) | 0];
    const limit = LINK_DIST * scale;
    let best = null;
    let bestD = limit;
    for (const b of nodes) {
      if (b === a) continue;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < bestD) { bestD = d; best = b; }
    }
    if (best) pulses.push({ a, b: best, t: 0 });
  };

  // сама по себе сеть изредка пульсирует фоном — не в light-режиме, чтобы не грузить слабые экраны
  const maybeSpawnPulse = () => {
    if (light || pulses.length >= 4 || Math.random() > 0.012) return;
    spawnPulse();
  };

  // а ещё пульс летит по сети при каждом выборе пункта меню — как будто сайт «стучится» к боту
  document.addEventListener('xmb:select', () => {
    if (pulses.length < 6) spawnPulse();
  });

  const draw = () => {
    ctx.clearRect(0, 0, w, h);
    const accent = token('--accent') || '#8bd8e8';
    const limit2 = (LINK_DIST * scale) ** 2;

    // связи между близкими узлами — чем ближе, тем виднее линия
    ctx.lineWidth = Math.max(1, scale);
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > limit2) continue;
        ctx.globalAlpha = (1 - d2 / limit2) * 0.16;
        ctx.strokeStyle = token(a.tone) || '#3fb0c8';
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    // сами узлы
    for (const n of nodes) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = token(n.tone) || '#3fb0c8';
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // пульсы — плавно загораются и гаснут на пути между узлами
    for (const p of pulses) {
      ctx.globalAlpha = Math.sin(Math.min(1, p.t) * Math.PI);
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(p.a.x + (p.b.x - p.a.x) * p.t, p.a.y + (p.b.y - p.a.y) * p.t, 2.4 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  const step = () => {
    for (const n of nodes) {
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < 0 || n.x > w) n.vx *= -1;
      if (n.y < 0 || n.y > h) n.vy *= -1;
    }
    for (const p of pulses) p.t += 0.018;
    pulses = pulses.filter((p) => p.t < 1);
    maybeSpawnPulse();
  };

  let raf = 0;
  let last = 0;
  const loop = (now) => {
    raf = requestAnimationFrame(loop);
    if (now - last < 33) return; // 30 кадров в секунду достаточно
    last = now;
    step();
    draw();
  };

  const start = () => { if (!raf && !still) raf = requestAnimationFrame(loop); };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };

  resize();
  draw();
  start();
  addEventListener('resize', () => { resize(); draw(); });
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
})();
