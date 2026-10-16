/* ==========================================================================
   cunhopam - Thư viện hợp âm guitar
   Application Logic & Data
   ========================================================================== */

// --- 1. Dữ liệu và cấu hình âm nhạc ---
const N = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const V = ['Đô', 'Đô#', 'Rê', 'Rê#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];

const Q = {
  major: { l: 'Trưởng', s: '', i: [0, 4, 7] },
  minor: { l: 'Thứ', s: 'm', i: [0, 3, 7] },
  '7': { l: 'Bảy', s: '7', i: [0, 4, 7, 10] },
  maj7: { l: 'Trưởng bảy', s: 'maj7', i: [0, 4, 7, 11] },
  m7: { l: 'Thứ bảy', s: 'm7', i: [0, 3, 7, 10] },
  sus4: { l: 'Sus4', s: 'sus4', i: [0, 5, 7] }
};

const SUF = { '': 'major', m: 'minor', '7': '7', maj7: 'maj7', m7: 'm7', sus4: 'sus4' };

const EF = {
  major: [0, 2, 2, 1, 0, 0],
  minor: [0, 2, 2, 0, 0, 0],
  '7': [0, 2, 0, 1, 0, 0],
  maj7: [0, 2, 1, 1, 0, 0],
  m7: [0, 2, 0, 0, 0, 0],
  sus4: [0, 2, 2, 2, 0, 0]
};

const AF = {
  major: [-1, 0, 2, 2, 2, 0],
  minor: [-1, 0, 2, 2, 1, 0],
  '7': [-1, 0, 2, 0, 2, 0],
  maj7: [-1, 0, 2, 1, 2, 0],
  m7: [-1, 0, 2, 0, 1, 0],
  sus4: [-1, 0, 2, 2, 3, 0]
};

const OPEN = {
  '0major': [-1, 3, 2, 0, 1, 0],
  '7major': [3, 2, 0, 0, 0, 3],
  '2major': [-1, -1, 0, 2, 3, 2],
  '2minor': [-1, -1, 0, 2, 3, 1],
  '7 7': [3, 2, 0, 0, 0, 1],
  '0maj7': [-1, 3, 2, 0, 0, 0]
};

const OS = [82.41, 110, 146.83, 196, 246.94, 329.63];

// --- 2. Danh sách bài hát mẫu ---
const songs = [
  {
    id: 1,
    t: 'Phố nhỏ mưa bay',
    r: 'Ballad',
    h: 1320,
    l: '[C]Chiều rơi trên phố nhỏ, mưa [G]bay qua ngõ vắng\n[Am]Anh đi tìm bóng em, [F]giữa ngàn hàng cây lặng\n[C]Một mình ôm nỗi nhớ, nhìn [G]ô cửa sổ sáng\n[F]Ước gì mưa thôi rơi, [G]cho lòng anh thôi nặng'
  },
  {
    id: 2,
    t: 'Chờ em cuối con hẻm',
    r: 'Ballad',
    h: 980,
    l: '[Am]Cuối con hẻm đèn vàng, anh [F]đứng đợi em sang\n[C]Gió thổi qua mái tóc, [G]chuyện mình chưa kịp nói\n[Am]Nếu mai em không đến, anh [F]vẫn đứng đây thôi\n[C]Vì có những ngày [G]chờ cũng là hạnh phúc'
  },
  {
    id: 3,
    t: 'Nắng trên vai',
    r: 'Pop',
    h: 760,
    l: '[G]Nắng trên vai áo, bước [D]chân nhẹ như gió\n[Em]Ta đi qua mùa hè, [C]cười vang cả con đường\n[G]Đừng hỏi ngày mai sẽ [D]ra sao nhé\n[C]Hôm nay ta có nhau, [G]thế là đủ rồi'
  },
  {
    id: 4,
    t: 'Về nhà thôi',
    r: 'Slow Rock',
    h: 640,
    l: '[D]Mệt rồi thì về nhà, [A]cơm canh còn nóng đó\n[Bm]Ngoài kia đời bộn bề, [G]trong này có mẹ chờ\n[D]Dù đi xa bao nhiêu, [A]lòng vẫn nhớ lối cũ\n[G]Về nhà thôi con ơi, [D]bình yên ở đó'
  },
  {
    id: 5,
    t: 'Hoàng hôn trên sông',
    r: 'Bolero',
    h: 510,
    l: '[Am]Hoàng hôn buông trên sông, con [Dm]thuyền trôi lặng lẽ\n[E]Người ơi có nhớ không, [Am]lời hẹn năm nào\n[Am]Sông vẫn chảy về xa, [Dm]tình mình đã phai nhạt\n[E]Chỉ còn tiếng đàn [Am]buồn'
  },
  {
    id: 6,
    t: 'Sáng chủ nhật',
    r: 'Valse',
    h: 430,
    l: '[C]Sáng chủ nhật thong dong, [Am]cà phê thơm bên cửa\n[Dm]Tiếng chim hót trên cành, [G7]nắng rót vàng sân nhỏ\n[C]Ta ngồi bên nhau đây, [Am]chẳng cần nói điều gì\n[Dm]Bình yên là thế thôi, [G7]xin dừng lại ở [C]đây'
  },
  {
    id: 7,
    t: 'Chuyến tàu đêm',
    r: 'Blues',
    h: 390,
    l: '[Em]Chuyến tàu đêm rời ga, [C]mang theo bao tiếc nuối\n[G]Anh ngồi bên khung cửa, [D]đếm những vì sao rơi\n[Em]Em ở lại phía sau, [C]anh đi về phương xa\n[G]Hẹn một ngày gặp [D]lại, chuyến tàu đêm [Em]này'
  },
  {
    id: 8,
    t: 'Hai tách cà phê',
    r: 'Disco',
    h: 280,
    l: '[F]Hai tách cà phê trên [C]bàn còn bốc khói\n[Dm]Một người ngồi chờ đợi, [Am]một người chưa kịp đến\n[F]Thời gian trôi thật nhanh, [C]ta nào hay biết\n[Dm]Chỉ còn lại tách [Am]nguội, và một [F]nỗi nhớ'
  }
];

songs.forEach(s => {
  s.a = 'Bài mẫu';
  s.ch = [...new Set([...s.l.matchAll(/\[([^\]]+)\]/g)].map(m => m[1]))];
});

const KN = ['C', 'D', 'E', 'F', 'G', 'A', 'G7', 'Am', 'Bm', 'Dm', 'Em'];

// --- 3. Trạng thái ứng dụng ---
let vn = 0,
    q = '',
    rh = '',
    sort = 'h',
    known = new Set(['C', 'G', 'Am', 'F']),
    tp = 0,
    fs = 18,
    fav = [],
    cr = 0,
    cq = 'major',
    pi = 0,
    focus = 'C',
    cs = null,
    ctx,
    timer = 0;

try {
  fav = JSON.parse(localStorage.getItem('cnm') || '[]');
} catch (e) {}

const save = () => {
  try {
    localStorage.setItem('cnm', JSON.stringify(fav));
  } catch (e) {}
};

const $ = s => document.querySelector(s);
const app = $('#app');
const nm = x => (vn ? V : N)[((x % 12) + 12) % 12];
const parse = c => {
  const m = c.match(/^([A-G]#?)(.*)$/);
  return { r: N.indexOf(m[1]), k: SUF[m[2]] || 'major' };
};
const cname = (c, t = 0) => {
  const p = parse(c);
  return nm(p.r + t) + Q[p.k].s;
};
const cn = (r, k) => nm(r) + Q[k].s;

// --- 4. Xử lý đồ hoạ & âm thanh hợp âm ---
function positions(r, k) {
  const out = [];
  const seen = new Set();
  const add = (f, t, b, s) => {
    const key = f.join();
    if (!seen.has(key)) {
      seen.add(key);
      out.push({ f, t, b, s });
    }
  };

  const o = OPEN[r + (k === '7' ? ' 7' : k)];
  if (o) add(o, 'Thế mở', 0, 0);

  const ef = (r - 4 + 12) % 12;
  const af = (r - 9 + 12) % 12;
  add(EF[k].map(x => (x < 0 ? -1 : x + ef)), ef ? 'Barre ô ' + ef : 'Thế mở', ef, 0);
  add(AF[k].map(x => (x < 0 ? -1 : x + af)), af ? 'Barre ô ' + af : 'Thế mở', af, 1);
  return out;
}

function svg(p) {
  const f = p.f,
        b = p.b,
        s = p.s,
        sx = i => 40 + i * 32,
        top = 60,
        rh = 42,
        pos = f.filter(x => x > 0),
        mx = Math.max(0, ...pos),
        base = mx <= 5 ? 1 : Math.min(...pos);

  let h = '';
  for (let i = 0; i <= 5; i++) {
    h += `<line class="ln2" x1="40" x2="200" y1="${top + i * rh}" y2="${top + i * rh}" stroke-width="${i === 0 && base === 1 ? 6 : 1.2}" opacity="${i === 0 && base === 1 ? 1 : 0.35}"/>`;
  }
  for (let i = 0; i < 6; i++) {
    h += `<line class="ln2" x1="${sx(i)}" x2="${sx(i)}" y1="${top}" y2="${top + 5 * rh}" stroke-width="${1 + (5 - i) * 0.25}" opacity=".7"/>`;
  }
  if (b > 0 && b >= base && b < base + 5) {
    const y = top + (b - base + 0.5) * rh;
    h += `<rect x="${sx(s) - 11}" y="${y - 11}" width="${sx(5) - sx(s) + 22}" height="22" rx="11" fill="var(--accent)"/>`;
  }
  f.forEach((x, i) => {
    if (x < 0) {
      h += `<text class="tx" x="${sx(i)}" y="44" text-anchor="middle" font-size="18" font-weight="600">×</text>`;
    } else if (x === 0) {
      h += `<circle cx="${sx(i)}" cy="38" r="7" fill="none" stroke="var(--muted)" stroke-width="2"/>`;
    } else {
      h += `<circle cx="${sx(i)}" cy="${top + (x - base + 0.5) * rh}" r="13" fill="var(--pick)" stroke="var(--ink)" stroke-width="1.5"/>`;
    }
  });
  if (base > 1) {
    h += `<text class="tx" x="10" y="${top + rh * 0.5 + 5}" font-size="13" font-weight="600">ô ${base}</text>`;
  }
  return `<svg viewBox="0 0 240 290" aria-hidden="true">${h}</svg>`;
}

function playF(f) {
  try {
    const c = ctx || (ctx = new (window.AudioContext || window.webkitAudioContext)());
    c.resume();
    let t = c.currentTime + 0.02;
    let k = 0;
    f.forEach((fr, i) => {
      if (fr < 0) return;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'triangle';
      o.frequency.value = OS[i] * Math.pow(2, fr / 12);
      g.gain.setValueAtTime(0, t + k);
      g.gain.linearRampToValueAtTime(0.25, t + k + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + k + 1.6);
      o.connect(g);
      g.connect(c.destination);
      o.start(t + k);
      o.stop(t + k + 1.7);
      k += 0.06;
    });
  } catch (e) {}
}

const cpos = (c, t = 0) => {
  const p = parse(c);
  return positions((p.r + t + 12) % 12, p.k);
};

// --- 5. Giao diện trang chủ & danh sách bài hát ---
const items = (arr, note) =>
  arr.map((s, i) =>
    `<a class="item" href="#/song/${s.id}"><b class="rk">${i + 1}</b><span class="mt"><strong>${s.t}</strong><small>${s.a}</small><span class="cs">${s.ch.map(c => `<i>${cname(c)}</i>`).join('')}</span></span><span class="rt"><em>${s.r}</em><small>${note ? note(s) : s.h + ' lượt xem'}</small></span></a>`
  ).join('');

function paintList() {
  const t = q.toLowerCase();
  const a = songs
    .filter(s => (!rh || s.r === rh) && (s.t + s.a).toLowerCase().includes(t))
    .sort((x, y) => y[sort] - x[sort]);
  $('#list').innerHTML = a.length
    ? items(a)
    : '<p class="empty">Không có bài nào khớp. Thử bỏ bộ lọc điệu hoặc đổi từ khoá.</p>';
}

function vHome() {
  const rs = {};
  songs.forEach(s => rs[s.r] = (rs[s.r] || 0) + 1);
  app.innerHTML = `
    <div class="hero">
      <h1>Thư viện hợp âm cho người chơi guitar</h1>
      <p class="lead">Tra bài hát có hợp âm, đổi tông, xem sơ đồ ngón bấm và lưu vào playlist của riêng bạn.</p>
    </div>
    <div class="grid">
      <section>
        <div class="head">
          <h2>Bài hát</h2>
          <div class="seg">
            <button data-a="sort" data-s="h" aria-pressed="${sort === 'h'}">Xem nhiều</button>
            <button data-a="sort" data-s="id" aria-pressed="${sort === 'id'}">Mới đăng</button>
          </div>
        </div>
        <div id="list" class="list"></div>
      </section>
      <aside>
        <div class="card">
          <h3>Điệu bài hát</h3>
          <div class="tags">
            ${Object.entries(rs).map(([k, n]) => `<button class="tg" data-a="rh" data-v="${k}" aria-pressed="${rh === k}">${k} <small>${n}</small></button>`).join('')}
          </div>
        </div>
        <div class="card">
          <h3>Chưa biết chơi bài nào?</h3>
          <p class="sub" style="margin-bottom:14px">Chọn những hợp âm bạn đã biết, cunhopam gợi ý bài hát vừa sức.</p>
          <a class="btn" href="#/find">Tìm theo hợp âm</a>
        </div>
      </aside>
    </div>`;
  paintList();
}

// --- 6. Giao diện chi tiết bài hát ---
function sheet(s, t) {
  return s.l.split('\n').map(line => {
    const [a, ...b] = line.split('[');
    let h = a ? `<span class="s"><i class="c">&nbsp;</i><span class="l">${a}</span></span>` : '';
    b.forEach(x => {
      const i = x.indexOf(']');
      const c = x.slice(0, i);
      const w = x.slice(i + 1);
      h += `<span class="s"><button class="c" data-a="ch" data-c="${c}">${cname(c, t)}</button><span class="l">${w || ' '}</span></span>`;
    });
    return `<div class="ln">${h}</div>`;
  }).join('');
}

function paintSide() {
  const s = cs;
  const p = cpos(focus, tp)[0];
  $('#fc').innerHTML = `<h3>${cname(focus, tp)}</h3>${svg(p)}<button class="btn" data-a="pf" style="margin-top:8px">Nghe thử</button>`;
  $('#chs').innerHTML = `<h3>Hợp âm trong bài</h3><div class="minis">${s.ch.map(c => `<button data-a="ch" data-c="${c}" aria-label="${cname(c, tp)}">${svg(cpos(c, tp)[0])}<b>${cname(c, tp)}</b></button>`).join('')}</div>`;
}

function vSong(s) {
  cs = s;
  const f = fav.includes(s.id);
  app.innerHTML = `
    <a class="back" href="#/">Quay lại danh sách</a>
    <div class="grid">
      <article class="card">
        <h1 class="st">${s.t}</h1>
        <p class="sa">${s.a}</p>
        <span class="tag">Điệu ${s.r}</span>
        <div class="tools">
          <div class="grp">
            <button data-a="tp" data-d="-1" aria-label="Giảm tông">−</button>
            <span>Tông ${tp > 0 ? '+' : ''}${tp}</span>
            <button data-a="tp" data-d="1" aria-label="Tăng tông">+</button>
          </div>
          <div class="grp">
            <button data-a="fs" data-d="-2" aria-label="Chữ nhỏ lại">A−</button>
            <button data-a="fs" data-d="2" aria-label="Chữ to lên">A+</button>
          </div>
          <button class="tl" data-a="scroll" aria-pressed="${!!timer}">Tự cuộn</button>
          <button class="tl" data-a="fav" aria-pressed="${f}">${f ? 'Đã lưu' : 'Lưu vào playlist'}</button>
        </div>
        <div id="sheet" style="font-size:${fs}px">${sheet(s, tp)}</div>
        <p class="note">Bấm vào một hợp âm để xem thế bấm và nghe thử. Đây là bài mẫu do cunhopam viết để minh hoạ giao diện.</p>
      </article>
      <aside>
        <div class="card" id="fc"></div>
        <div class="card" id="chs"></div>
      </aside>
    </div>`;
  paintSide();
}

// --- 7. Giao diện tra cứu hợp âm ---
function vChords() {
  const ps = positions(cr, cq);
  if (pi >= ps.length) pi = 0;
  app.innerHTML = `
    <div class="hero">
      <h1>Tra cứu hợp âm</h1>
      <p class="lead">Chọn nốt gốc và loại hợp âm để xem các thế bấm.</p>
    </div>
    <div class="grid">
      <div class="card">
        <div class="cd">
          <div>
            <h2 class="cname">${cn(cr, cq)}</h2>
            <p class="sub">${nm(cr)} ${Q[cq].l.toLowerCase()}</p>
            <div class="tags" style="margin:10px 0">
              ${Q[cq].i.map(i => `<span class="chip">${nm(cr + i)}</span>`).join('')}
            </div>
            <button class="btn" data-a="pl">Nghe thử</button>
          </div>
          ${svg(ps[pi])}
        </div>
        <div class="tags" style="justify-content:center;margin-top:12px">
          ${ps.map((x, i) => `<button class="tg" data-a="pos" data-p="${i}" aria-pressed="${i === pi}">${x.t}</button>`).join('')}
        </div>
      </div>
      <div class="card">
        <h3>Nốt gốc</h3>
        <div class="roots">
          ${N.map((_, i) => `<button class="root" data-a="root" data-r="${i}" aria-pressed="${i === cr}">${nm(i)}</button>`).join('')}
        </div>
        <h3 style="margin-top:18px">Loại hợp âm</h3>
        <div class="quals">
          ${Object.keys(Q).map(k => `<button class="q" data-a="qual" data-q="${k}" aria-pressed="${k === cq}">${Q[k].l}</button>`).join('')}
        </div>
      </div>
    </div>
    <h2 style="margin:10px 0 12px">Hợp âm phổ biến</h2>
    <div class="pop">
      ${['C', 'G', 'Am', 'F', 'D', 'Em', 'A', 'E'].map(c => `<button data-a="pop" data-c="${c}" aria-label="${cname(c)}">${svg(cpos(c)[0])}<b>${cname(c)}</b></button>`).join('')}
    </div>`;
}

// --- 8. Tìm theo hợp âm & Playlist ---
function vFind() {
  const ok = songs.filter(s => s.ch.every(c => known.has(c)));
  const near = songs.filter(s => s.ch.filter(c => !known.has(c)).length === 1 && !ok.includes(s));
  app.innerHTML = `
    <div class="hero">
      <h1>Tìm bài hát theo hợp âm</h1>
      <p class="lead">Bấm chọn những hợp âm bạn đã biết. Chúng mình chỉ hiện các bài bạn chơi được ngay.</p>
    </div>
    <div class="card">
      <div class="tags">
        ${KN.map(c => `<button class="tg" data-a="kn" data-c="${c}" aria-pressed="${known.has(c)}">${cname(c)}</button>`).join('')}
      </div>
    </div>
    <h2 style="margin-bottom:12px">Chơi được ngay (${ok.length})</h2>
    <div class="list">
      ${ok.length ? items(ok) : '<p class="empty">Chưa có bài nào chỉ dùng các hợp âm đã chọn. Chọn thêm một vài hợp âm nhé.</p>'}
    </div>
    ${near.length ? `<h2 style="margin:26px 0 12px">Chỉ thiếu một hợp âm (${near.length})</h2><div class="list">${items(near, s => 'Thiếu ' + cname(s.ch.find(c => !known.has(c))))}</div>` : ''}`;
}

function vPlaylist() {
  const a = songs.filter(s => fav.includes(s.id));
  app.innerHTML = `
    <div class="hero">
      <h1>Playlist của tôi</h1>
      <p class="lead">Những bài bạn đã lưu, lưu ngay trên trình duyệt này.</p>
    </div>
    ${a.length ? `<div class="list">${items(a)}</div>` : '<div class="empty">Playlist đang trống. Mở một bài hát và bấm “Lưu vào playlist” để thêm vào đây.<br><br><a class="btn" href="#/">Xem danh sách bài hát</a></div>'}`;
}

// --- 9. Điều hướng Router & Xử lý sự kiện ---
function route(keep) {
  if (!keep && timer) {
    clearInterval(timer);
    timer = 0;
  }
  const h = location.hash.slice(2).split('/');
  const v = h[0] || '';
  document.querySelectorAll('nav a').forEach(a => {
    a.setAttribute('aria-current', String(a.dataset.v === (v === 'song' ? '' : v)));
  });

  if (v === 'song') {
    const s = songs.find(x => x.id == h[1]);
    if (s) {
      if (!keep) {
        tp = 0;
        focus = s.ch[0];
      }
      vSong(s);
      if (!keep) scrollTo(0, 0);
      return;
    }
  }

  ({ chords: vChords, find: vFind, playlist: vPlaylist }[v] || vHome)();
  if (!keep) scrollTo(0, 0);
}

addEventListener('hashchange', () => route());

$('#q').addEventListener('input', e => {
  q = e.target.value;
  if ($('#list')) {
    paintList();
  } else if (location.hash !== '#/' && location.hash !== '') {
    location.hash = '#/';
  } else {
    route(1);
  }
});

document.addEventListener('click', e => {
  const t = e.target.closest('[data-a]');
  if (!t) return;
  const d = t.dataset;
  switch (d.a) {
    case 'nm':
      vn = 1 - vn;
      t.textContent = vn ? 'Đô Rê Mi' : 'C D E';
      route(1);
      break;
    case 'theme': {
      const r = document.documentElement;
      const dk = r.dataset.theme
        ? r.dataset.theme === 'dark'
        : matchMedia('(prefers-color-scheme:dark)').matches;
      r.dataset.theme = dk ? 'light' : 'dark';
      break;
    }
    case 'sort':
      sort = d.s;
      route(1);
      break;
    case 'rh':
      rh = rh === d.v ? '' : d.v;
      route(1);
      break;
    case 'tp':
      tp = Math.max(-11, Math.min(11, tp + +d.d));
      route(1);
      break;
    case 'fs':
      fs = Math.max(14, Math.min(30, fs + +d.d));
      $('#sheet').style.fontSize = fs + 'px';
      break;
    case 'scroll':
      if (timer) {
        clearInterval(timer);
        timer = 0;
      } else {
        timer = setInterval(() => scrollBy(0, 1), 40);
      }
      t.setAttribute('aria-pressed', String(!!timer));
      break;
    case 'fav': {
      const i = fav.indexOf(cs.id);
      i < 0 ? fav.push(cs.id) : fav.splice(i, 1);
      save();
      route(1);
      break;
    }
    case 'ch':
      focus = d.c;
      paintSide();
      playF(cpos(d.c, tp)[0].f);
      break;
    case 'pf':
      playF(cpos(focus, tp)[0].f);
      break;
    case 'root':
      cr = +d.r;
      pi = 0;
      vChords();
      break;
    case 'qual':
      cq = d.q;
      pi = 0;
      vChords();
      break;
    case 'pos':
      pi = +d.p;
      vChords();
      break;
    case 'pl':
      playF(positions(cr, cq)[pi].f);
      break;
    case 'pop': {
      const p = parse(d.c);
      cr = p.r;
      cq = p.k;
      pi = 0;
      vChords();
      scrollTo({ top: 0, behavior: 'smooth' });
      break;
    }
    case 'kn':
      known.has(d.c) ? known.delete(d.c) : known.add(d.c);
      vFind();
      break;
  }
});

// Khởi chạy ứng dụng
route();

