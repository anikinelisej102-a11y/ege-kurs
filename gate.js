// Вход по коду: курс лежит в vault.js в зашифрованном виде и открывается только правильным кодом
(function () {
const V = window.VAULT;
const tg = window.Telegram && window.Telegram.WebApp;
const inTG = !!(tg && tg.initData);
const app = document.getElementById('app');
const KEY = 'ege_access_v1';
const enc = new TextEncoder();
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const b64 = u8 => btoa(String.fromCharCode(...u8));
const norm = c => c.toUpperCase().replace(/[^A-Z0-9]/g, '');
const cloud = inTG && tg.CloudStorage && tg.isVersionAtLeast && tg.isVersionAtLeast('6.9');

if (tg) {
  try { tg.ready(); tg.expand(); } catch (e) {}
  if (inTG) {
    const p = tg.themeParams || {}, r = document.documentElement.style;
    document.documentElement.dataset.theme = tg.colorScheme === 'dark' ? 'dark' : 'light';
    const map = { '--bg': p.secondary_bg_color, '--paper': p.section_bg_color || p.bg_color, '--ink': p.text_color,
      '--muted': p.hint_color, '--accent': p.button_color, '--accent-ink': p.button_text_color };
    for (const k in map) if (map[k]) r.setProperty(k, map[k]);
  }
}

async function fingerprint(raw) {
  return b64(new Uint8Array(await crypto.subtle.digest('SHA-256', raw)).slice(0, 8));
}

async function openWith(raw) {
  const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(V.iv) }, key, unb64(V.ct));
  const s = document.createElement('script');
  s.textContent = new TextDecoder().decode(pt);
  document.body.appendChild(s);
  const a = document.createElement('script');
  a.src = 'app.js';
  document.body.appendChild(a);
}

async function tryCode(code) {
  const base = await crypto.subtle.importKey('raw', enc.encode(norm(code)), 'PBKDF2', false, ['deriveKey']);
  for (const sl of V.slots) {
    const kek = await crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: unb64(sl.s), iterations: V.it },
      base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    try { return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(sl.i) }, kek, unb64(sl.k))); }
    catch (e) { /* не этот слот */ }
  }
  return null;
}

function remember(raw) {
  const v = JSON.stringify({ fp: V.fp, k: b64(raw) });
  try { localStorage.setItem(KEY, v); } catch (e) {}
  if (cloud) try { tg.CloudStorage.setItem(KEY, v); } catch (e) {}
}

async function useSaved(str) {
  try {
    const o = JSON.parse(str);
    if (!o || o.fp !== V.fp) return false;
    const raw = unb64(o.k);
    if (await fingerprint(raw) !== V.fp) return false;
    await openWith(raw);
    return true;
  } catch (e) { return false; }
}

function showLogin() {
  app.innerHTML = `
    <div class="card hero" style="margin-top:8vh;text-align:center;align-items:center">
      <div style="font-size:44px;line-height:1">🔐</div>
      <span class="eyebrow">ЕГЭ · информатика · Python</span>
      <h1>Курс подготовки 2027</h1>
      <p class="muted">Доступ к курсу — по коду. Введи код, который тебе выдали.</p>
      <div class="inp" style="width:100%">
        <input id="code" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXX-XXXX-XXXX" style="text-align:center;letter-spacing:.08em">
      </div>
      <button class="btn" id="go" style="width:100%">Войти</button>
      <p id="msg" class="muted" style="min-height:1.5em"></p>
    </div>`;
  const inp = document.getElementById('code'), go = document.getElementById('go'), msg = document.getElementById('msg');
  inp.addEventListener('input', () => {
    const c = norm(inp.value).slice(0, 12);
    inp.value = c.match(/.{1,4}/g)?.join('-') || '';
    inp.classList.remove('wrong');
  });
  async function submit() {
    const c = norm(inp.value);
    if (c.length < 12) { msg.textContent = 'Код — 12 символов'; return; }
    go.disabled = true; go.textContent = 'Проверяю…'; msg.textContent = '';
    const raw = await tryCode(c);
    if (raw) {
      try { tg.HapticFeedback.notificationOccurred('success'); } catch (e) {}
      remember(raw);
      app.innerHTML = '';
      await openWith(raw);
    } else {
      try { tg.HapticFeedback.notificationOccurred('error'); } catch (e) {}
      await new Promise(r => setTimeout(r, 700));
      inp.classList.add('wrong'); msg.textContent = 'Неверный код';
      go.disabled = false; go.textContent = 'Войти';
    }
  }
  go.onclick = submit;
  inp.onkeydown = e => { if (e.key === 'Enter') submit(); };
}

(async function start() {
  if (!window.crypto || !crypto.subtle) { app.innerHTML = '<div class="card empty">Обнови Telegram: этой версии не хватает функций шифрования.</div>'; return; }
  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  if (saved && await useSaved(saved)) return;
  if (cloud) {
    tg.CloudStorage.getItem(KEY, async (err, val) => {
      if (!err && val && await useSaved(val)) { try { localStorage.setItem(KEY, val); } catch (e) {} return; }
      showLogin();
    });
  } else showLogin();
})();
})();
