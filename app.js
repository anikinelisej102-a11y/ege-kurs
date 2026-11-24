// ЕГЭ Информатика 2027 — Telegram Mini App
(function () {
const C = window.COURSE;
const tg = window.Telegram && window.Telegram.WebApp;
const inTG = !!(tg && tg.initData);
const app = document.getElementById('app');

// ---------- тема Telegram ----------
function applyTheme() {
  if (!inTG) return;
  const p = tg.themeParams || {}, r = document.documentElement.style;
  document.documentElement.dataset.theme = tg.colorScheme === 'dark' ? 'dark' : 'light';
  const map = { '--bg': p.secondary_bg_color, '--paper': p.section_bg_color || p.bg_color, '--ink': p.text_color,
    '--muted': p.hint_color, '--accent': p.button_color, '--accent-ink': p.button_text_color, '--link': p.link_color };
  for (const k in map) if (map[k]) r.setProperty(k, map[k]);
  try { tg.setHeaderColor(p.secondary_bg_color || p.bg_color); tg.setBackgroundColor(p.secondary_bg_color || p.bg_color); } catch (e) {}
}
if (tg) {
  try { tg.ready(); tg.expand(); } catch (e) {}
  applyTheme();
  try { tg.onEvent('themeChanged', applyTheme); } catch (e) {}
}
const haptic = t => { try { tg.HapticFeedback.notificationOccurred(t); } catch (e) {} };

// ---------- прогресс: localStorage + облако Telegram ----------
const KEY = 'ege_progress_v1';
let data = {};
try { data = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
const cloud = inTG && tg.CloudStorage && tg.isVersionAtLeast && tg.isVersionAtLeast('6.9');
const store = {
  get: k => data[k],
  set(k, v) {
    data[k] = v;
    const s = JSON.stringify(data);
    try { localStorage.setItem(KEY, s); } catch (e) {}
    if (cloud && s.length < 4000) try { tg.CloudStorage.setItem(KEY, s); } catch (e) {}
  },
};
const readSet = () => store.get('read') || {};
const isRead = id => !!readSet()[id];

// ---------- утилиты ----------
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fileToId = {};
for (const id in C.docs) fileToId[C.docs[id].file] = id;
fileToId['03_shpargalka_po_nomeram.md'] = '#/cheats';
fileToId['00_NACHNI_ZDES.md'] = '#/';
const tasksBy = {}; C.tasks.forEach(t => tasksBy[t.n] = t);

function toast(msg) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 1600);
}
function splitTitle(title) {
  const m = title.match(/^(Урок \d+)\.\s*(.+)$/);
  return m ? [m[1], m[2]] : ['', title];
}
function level(t) {
  if (t.n === 1) return 'full';
  if (t.template || t.lessons.length) return 'some';
  if (t.theory.length) return 'theory';
  return 'soon';
}
const LEVEL_TXT = { full: 'Полный курс', some: 'Уроки', theory: 'Теория', soon: 'Скоро' };

const MODULES = [
  ['Основы Python', ['L01', 'L02']], ['Рекурсия · №16', ['L03', 'L04']], ['Условие Фано · №4', ['L05']],
  ['Системы счисления · №14', ['L06', 'L07']], ['Алгоритмы · №5', ['L08', 'L09']],
  ['Количество информации · №11, №7', ['L10', 'L11', 'L12']], ['Исполнители · №6, №12', ['L13', 'L14']],
  ['Excel · №3, №22', ['L15']], ['IP-адреса · №13', ['L16', 'L17', 'L18']],
  ['Комбинаторика · №8', ['L19', 'L20', 'L21']], ['Поиск в тексте · №10 + демоверсия', ['L22']],
];

function docItem(id, sub) {
  const d = C.docs[id]; if (!d) return '';
  const [a, b] = splitTitle(d.title);
  const num = a ? a.replace('Урок ', '') : '§';
  const ok = isRead(id);
  return `<button class="item" data-go="#/doc/${id}"><span class="ico ${ok ? 'ok' : ''}">${ok ? '✓' : num}</span>
    <span class="tx"><b>${esc(b)}</b>${sub || a ? `<span>${esc(sub || a)}</span>` : ''}</span><span class="chev">›</span></button>`;
}

// ---------- экраны ----------
function home() {
  const lessons = Object.keys(C.docs).filter(id => C.docs[id].kind === 'lesson');
  const done = lessons.filter(isRead).length;
  const st = store.get('t1') || {};
  const last = store.get('last');
  let h = `<div class="card hero">
      <span class="eyebrow">ЕГЭ · информатика · Python</span>
      <h1>Курс подготовки 2027</h1>
      <p class="muted">27 заданий · 22 урока · ответы проверены кодом</p>
      <div class="progress"><i style="width:${Math.round(done / lessons.length * 100)}%"></i></div>
      <div class="stats">
        <div class="stat"><b>${done}/${lessons.length}</b><span>уроков</span></div>
        <div class="stat"><b>${st.ok || 0}</b><span>задач №1</span></div>
        <div class="stat"><b>${st.best || 0}</b><span>лучшая серия</span></div>
      </div>
    </div>`;
  if (last && C.docs[last]) h += `<div class="section-title">Продолжить</div><div class="list">${docItem(last)}</div>`;
  h += `<div class="section-title">Задания экзамена</div><div class="grid">`;
  for (const t of C.tasks) {
    const lv = level(t);
    const allRead = t.lessons.length && t.lessons.every(isRead);
    h += `<button class="tile ${lv === 'theory' ? 'some' : lv}" data-go="#/task/${t.n}">
      ${allRead ? '<span class="done">✓</span>' : ''}
      <span class="num">${t.n}</span><span class="t">${esc(t.title)}</span><span class="b">${LEVEL_TXT[lv]}</span></button>`;
  }
  h += `</div><div class="section-title">Материалы</div><div class="list">
    <button class="item" data-go="#/lessons"><span class="ico">22</span><span class="tx"><b>Все уроки по порядку</b><span>11 модулей</span></span><span class="chev">›</span></button>
    <button class="item" data-go="#/cheats"><span class="ico">{ }</span><span class="tx"><b>Шпаргалка по номерам</b><span>шаблон кода на каждый номер</span></span><span class="chev">›</span></button>
    ${docItem('oshibki', 'все ⚠ курса в одном месте')}
    ${docItem('struktura', 'какой номер о чём')}
  </div>`;
  app.innerHTML = h;
}

function lessonsList() {
  let h = `<div class="head"><span class="eyebrow">Курс</span><h1>Все уроки</h1></div>`;
  for (const [name, ids] of MODULES) h += `<div class="section-title">${esc(name)}</div><div class="list">${ids.map(id => docItem(id)).join('')}</div>`;
  h += `<div class="section-title">Теория по темам</div><div class="list">${Object.keys(C.docs).filter(id => C.docs[id].kind === 'theory').map(id => docItem(id, C.docs[id].file)).join('')}</div>`;
  app.innerHTML = h;
}

function cheats() {
  let h = `<div class="head"><span class="eyebrow">Повторение</span><h1>Шпаргалка по номерам</h1><p class="muted">Один шаблон на номер. Нажми на номер, чтобы открыть.</p></div><div class="card md" id="md"></div>`;
  app.innerHTML = h;
  const md = C.tasks.filter(t => t.template).map(t => t.template.replace(/^### /, '## Задача ')).join('\n\n');
  renderMD(document.getElementById('md'), md);
  document.querySelectorAll('#md summary').forEach(s => s.textContent = s.textContent.replace(/^Задача /, ''));
}

function taskPage(n, tab) {
  const t = tasksBy[n]; if (!t) return home();
  const tabs = [];
  if (n === 1) tabs.push(['theory', 'Теория'], ['protos', 'Прототипы'], ['train', 'Тренажёр']);
  if (t.template) tabs.push(['tpl', 'Шаблон']);
  if (t.lessons.length) tabs.push(['lessons', 'Уроки']);
  if (t.theory.length) tabs.push(['th', 'Конспекты']);
  if (t.traps.length) tabs.push(['traps', 'Ловушки']);
  if (!tab || !tabs.find(x => x[0] === tab)) tab = tabs.length ? tabs[0][0] : '';
  let h = `<div class="head"><span class="eyebrow">Задание ${n} · ${t.points} ${t.points === 2 ? 'балла' : 'балл'}</span><h1>№${n}. ${esc(t.title)}</h1></div>`;
  if (tabs.length > 1) h += `<div class="tabs">${tabs.map(([k, v]) => `<button class="tab ${k === tab ? 'on' : ''}" data-go="#/task/${n}/${k}" data-replace="1">${v}</button>`).join('')}</div>`;
  h += '<div id="pane" style="display:flex;flex-direction:column;gap:14px"></div>';
  app.innerHTML = h;
  const pane = document.getElementById('pane');
  if (!tabs.length) {
    pane.innerHTML = `<div class="card empty"><p>Этот номер ещё не разбирали на уроках.</p><p>Материалы появятся после следующих уроков.</p></div><div class="list">${docItem('struktura', 'что будет в этом номере')}</div>`;
    return;
  }
  if (tab === 'theory') pane.innerHTML = TASK1.theory;
  else if (tab === 'protos') pane.innerHTML = TASK1.protos;
  else if (tab === 'train') TASK1.mountTrainer(pane, store, haptic);
  else if (tab === 'tpl') { pane.innerHTML = '<div class="card md" id="md"></div>'; renderMD(pane.querySelector('#md'), t.template.replace(/^### .+\n/, '')); }
  else if (tab === 'lessons') pane.innerHTML = `<div class="list">${t.lessons.map(id => docItem(id)).join('')}</div>`;
  else if (tab === 'th') pane.innerHTML = `<div class="list">${t.theory.map(id => docItem(id, 'конспект листка')).join('')}</div>`;
  else if (tab === 'traps') pane.innerHTML = `<div class="traps">${t.traps.map(x => `<div class="trap"><div class="md" data-md="${esc(x)}"></div></div>`).join('')}</div>`;
  pane.querySelectorAll('[data-md]').forEach(el => el.innerHTML = marked.parseInline(el.dataset.md));
}

function docPage(id) {
  const d = C.docs[id]; if (!d) return home();
  store.set('last', id);
  const [a, b] = splitTitle(d.title);
  app.innerHTML = `<div class="head"><span class="eyebrow">${esc(a || (d.kind === 'theory' ? 'Теория' : 'Справка'))}</span><h1>${esc(b)}</h1></div>
    <div class="btns"><button class="btn ghost" id="openall">Развернуть все задачи</button></div>
    <div class="card md" id="md"></div>
    <button class="btn ${isRead(id) ? 'ok' : ''}" id="mark">${isRead(id) ? '✓ Пройдено' : 'Отметить как пройденный'}</button>`;
  renderMD(document.getElementById('md'), d.md.replace(/^#\s+.+\n/, ''));
  const tasks = document.querySelectorAll('#md details');
  const oa = document.getElementById('openall');
  if (!tasks.length) oa.remove();
  else oa.onclick = () => { const open = ![...tasks].every(x => x.open); tasks.forEach(x => x.open = open); oa.textContent = open ? 'Свернуть все задачи' : 'Развернуть все задачи'; };
  document.getElementById('mark').onclick = () => {
    const r = readSet(); if (r[id]) delete r[id]; else { r[id] = 1; haptic('success'); toast('Урок отмечен'); }
    store.set('read', r); docPage(id);
  };
}

// Markdown → HTML; задачи сворачиваются в аккордеоны, у кода кнопка «Копировать»
function renderMD(el, md) {
  el.innerHTML = marked.parse(md, { gfm: true });
  const kids = [...el.children];
  const isTaskHead = node => /^H[23]$/.test(node.tagName) && /^(Задача|Прототип|Пример|Задание|Домашк)/i.test(node.textContent.trim());
  const lvl = node => /^H[1-6]$/.test(node.tagName) ? +node.tagName[1] : 9;
  for (let i = 0; i < kids.length; i++) {
    const hd = kids[i];
    if (!isTaskHead(hd)) continue;
    const L = lvl(hd);
    const det = document.createElement('details');
    const sum = document.createElement('summary'); sum.textContent = hd.textContent;
    const body = document.createElement('div'); body.className = 'body';
    det.append(sum, body);
    hd.replaceWith(det);
    let j = i + 1;
    while (j < kids.length && lvl(kids[j]) > L && kids[j].tagName !== 'HR') { body.appendChild(kids[j]); j++; }
    i = j - 1;
  }
  el.querySelectorAll('pre').forEach(pre => {
    const w = document.createElement('div'); w.className = 'pre';
    pre.replaceWith(w); w.appendChild(pre);
    const b = document.createElement('button'); b.className = 'copy'; b.textContent = 'Копировать';
    b.onclick = e => { e.stopPropagation(); copy(pre.innerText); };
    w.appendChild(b);
  });
  el.querySelectorAll('a[href]').forEach(a => {
    const href = a.getAttribute('href');
    const f = href.split('/').pop().split('#')[0];
    if (/^https?:/.test(href)) {
      a.onclick = e => { e.preventDefault(); if (inTG) tg.openLink(href); else window.open(href, '_blank'); };
    } else if (fileToId[f]) {
      const tgt = fileToId[f];
      a.setAttribute('href', tgt.startsWith('#') ? tgt : '#/doc/' + tgt);
    } else {
      a.replaceWith(document.createTextNode(a.textContent));
    }
  });
}
function copy(text) {
  const done = () => { toast('Код скопирован'); haptic('success'); };
  if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
  function fallback() {
    const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done(); } catch (e) {} ta.remove();
  }
}

// ---------- роутер ----------
let depth = 0;
function route() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  window.scrollTo(0, 0);
  if (parts[0] === 'task') taskPage(+parts[1], parts[2]);
  else if (parts[0] === 'doc') docPage(parts[1]);
  else if (parts[0] === 'lessons') lessonsList();
  else if (parts[0] === 'cheats') cheats();
  else home();
  if (tg && tg.BackButton) { try { parts.length ? tg.BackButton.show() : tg.BackButton.hide(); } catch (e) {} }
}
app.addEventListener('click', e => {
  const b = e.target.closest('[data-go]'); if (!b) return;
  const to = b.dataset.go;
  if (b.dataset.replace) { history.replaceState(null, '', to); route(); }
  else { depth++; location.hash = to; }
});
if (tg && tg.BackButton) tg.BackButton.onClick(() => { if (depth > 0) { depth--; history.back(); } else { location.hash = '#/'; } });
window.addEventListener('hashchange', route);

// облачный прогресс подтягиваем при запуске (если он новее — по количеству пройденного)
if (cloud) {
  try {
    tg.CloudStorage.getItem(KEY, (err, val) => {
      if (err || !val) return;
      try {
        const c = JSON.parse(val);
        const score = x => Object.keys(x.read || {}).length + ((x.t1 || {}).tries || 0);
        if (score(c) > score(data)) { data = c; try { localStorage.setItem(KEY, val); } catch (e) {} route(); }
      } catch (e) {}
    });
  } catch (e) {}
}
route();
})();
