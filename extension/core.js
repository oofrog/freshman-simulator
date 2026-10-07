// 공통 기반 (#5, 담당: 강준우) — 패널, 오버레이(강조·말풍선·모달), 실제 클릭 차단, 모드 등록, 화면 읽기.
// 원칙: 학교 서버로 요청을 보내지 않는다. 확장 파일 어디에도 fetch / XMLHttpRequest를 쓰지 않는다.
// 페이지에서 읽은 글자는 textContent로만 넣는다 (innerHTML 금지).
window.SG = (() => {
  const modes = {};
  let current = null; // 실행 중인 모드 이름
  let bypass = false; // 확장이 직접 누르는 클릭(메뉴 이동)은 차단하지 않음
  let ui = null;      // 켜져 있을 때의 패널·스타일

  // ---------- 화면 읽기 (실제 화면·목업 공통 선택자: docs/selectors.md) ----------
  const norm = s => (s || '').replace(/\s+/g, '');
  const visible = e => !!e && e.offsetParent !== null;
  const label = e => (e.value || e.textContent || '').trim();
  const screen = () => document.querySelector('#hyinContents h3')?.textContent.trim() || '';
  const grid = () => document.querySelector('#gdMain');
  const headers = () => [...(grid()?.querySelectorAll('thead th') || [])].map(th => norm(th.textContent));
  // 실제 수강신청 화면에는 숨김 칸(.hidden-type)이 섞여 있어 칸 위치를 셀 때 뺀다
  const cells = tr => [...tr.children].filter(td => td.tagName === 'TD' && !td.classList.contains('hidden-type') && getComputedStyle(td).display !== 'none');
  const rows = () => [...(grid()?.querySelectorAll('tbody tr') || [])].filter(tr => cells(tr).length > 1);
  const cell = (tr, name) => cells(tr)[headers().indexOf(norm(name))];
  const buttons = (root = document) => [...root.querySelectorAll('input[type=button], input[type=submit], button')].filter(b => visible(b) && !b.closest('[data-sg]'));
  const findButton = (root, text) => buttons(root).find(b => norm(label(b)) === norm(text));

  const goMenu = title => {
    const a = document.querySelector(`#snb a[title="${title}"]`);
    bypass = true; a?.click(); bypass = false;
    return !!a;
  };
  // 화면이 바뀌길 기다릴 때: await SG.waitFor(() => SG.screen() === '희망수업' && SG.rows().length)
  const waitFor = (test, ms = 5000) => new Promise((ok, fail) => {
    const t0 = Date.now();
    const id = setInterval(() => {
      if (test()) { clearInterval(id); ok(); } else if (Date.now() - t0 > ms) { clearInterval(id); fail(new Error('시간 초과')); }
    }, 100);
  });

  // ---------- 팁 찾기 (팁 데이터 형식: tips.js) ----------
  const tipsHere = () => (SG.tips || []).filter(t => t.screen === '공통' || t.screen === screen());
  const columnOf = e => {
    const c = e.closest('th, td');
    if (!c || !grid()?.contains(c)) return null;
    if (c.tagName === 'TH') return norm(c.textContent);
    return headers()[cells(c.parentElement).indexOf(c)];
  };
  const matches = (find, e) =>
    (find.button && e.matches('input[type=button], input[type=submit], button') && norm(label(e)) === norm(find.button)) ||
    (find.menu && e.matches('#snb a[title]') && e.title === find.menu) ||
    (find.column && e.matches('th, td') && columnOf(e) === norm(find.column)) ||
    (find.selector && e.matches(find.selector));
  // 누른 요소(또는 그 조상)에 해당하는 팁 → { tip, el }
  const matchTip = target => {
    for (let e = target; e && e !== document.body; e = e.parentElement)
      for (const tip of tipsHere()) if (matches(tip.find, e)) return { tip, el: e };
    return null;
  };
  // 팁이 가리키는 화면 요소 (튜토리얼에서 강조할 때)
  const tipEl = tip => {
    const f = tip.find;
    if (f.button) return findButton(document, f.button);
    if (f.menu) return document.querySelector(`#snb a[title="${f.menu}"]`);
    if (f.column) return [...(grid()?.querySelectorAll('thead th') || [])].find(th => norm(th.textContent) === norm(f.column));
    if (f.selector) return document.querySelector(f.selector);
  };

  // ---------- 오버레이 ----------
  const el = (tag, props = {}, ...kids) => {
    const e = Object.assign(document.createElement(tag), props);
    e.dataset.sg = '';
    e.append(...kids);
    return e;
  };
  let lit = null, bubbleEl = null, modalEl = null;
  const highlight = target => {
    unhighlight();
    if (!target) return;
    lit = [target, target.style.outline, target.style.outlineOffset];
    target.style.outline = '3px solid #f59e0b';
    target.style.outlineOffset = '2px';
  };
  const unhighlight = () => {
    if (lit) [lit[0].style.outline, lit[0].style.outlineOffset] = [lit[1], lit[2]];
    lit = null;
  };
  // 말풍선: target 근처에 표시. buttons를 주면 누른 버튼 글자로 resolve
  const bubble = (target, { title = '', text = '', buttons: btns = [] }) => new Promise(done => {
    bubbleEl?.remove();
    const box = el('div', { className: 'sg-bubble' },
      ...(title ? [el('b', { textContent: title })] : []),
      el('p', { textContent: text }),
      ...(btns.length ? [el('div', { className: 'sg-row' }, ...btns.map(b => el('button', { className: 'sg-btn', textContent: b, onclick: () => { box.remove(); done(b); } })))] : []));
    document.body.append(box);
    const r = target.getBoundingClientRect();
    const below = r.bottom + box.offsetHeight + 12 < innerHeight;
    box.style.left = Math.max(8, Math.min(r.left, innerWidth - box.offsetWidth - 8)) + scrollX + 'px';
    box.style.top = (below ? r.bottom + 8 : r.top - box.offsetHeight - 8) + scrollY + 'px';
    bubbleEl = box;
  });
  // 모달: 화면 가운데. 누른 버튼 글자로 resolve
  const modal = ({ title = '', text = '', buttons: btns = ['확인'] }) => new Promise(done => {
    modalEl?.remove();
    const back = el('div', { className: 'sg-back' },
      el('div', { className: 'sg-modal' },
        ...(title ? [el('b', { textContent: title })] : []),
        el('p', { textContent: text }),
        el('div', { className: 'sg-row' }, ...btns.map(b => el('button', { className: 'sg-btn', textContent: b, onclick: () => { back.remove(); done(b); } })))));
    document.body.append(back);
    modalEl = back;
  });
  const clear = () => { unhighlight(); bubbleEl?.remove(); modalEl?.remove(); };

  // ---------- 실제 클릭 차단 ----------
  // 켜져 있는 동안 페이지 버튼은 기본적으로 전부 막는다. 모드가 allow(el)로 예외를 줄 수 있다.
  // 모드가 없을 때는 메뉴 이동·조회·입력칸만 허용 (서버 상태를 바꾸지 않는 것만)
  const SAFE = ['조회', '초기화', '▼상세조회'];
  const idleAllow = e => !!e.closest('#snb a[title]') || e.matches('input[type=text], select, option') ||
    (e.matches('input[type=button], button') && SAFE.includes(norm(label(e))));
  const EVENTS = ['click', 'dblclick', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'submit', 'keydown'];
  const guard = e => {
    if (bypass || e.target.closest?.('[data-sg]')) return;
    if (e.type === 'keydown') {
      if (e.key === 'Escape') return stop();
      if (e.key !== 'Enter') return; // 글자 입력은 허용, Enter 제출만 막음
    }
    const m = modes[current];
    if (m ? m.allow?.(e.target, e) : idleAllow(e.target)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.type === 'click') m?.blocked?.(e.target, e);
  };

  // ---------- 모드 · 패널 ----------
  // 모드 등록: SG.register('tip', { label, start(), stop(), allow(el)?, blocked(el)? })
  const register = (name, mode) => { modes[name] = mode; ui && renderPanel(); };
  const start = async name => {
    stop();
    current = name;
    renderPanel();
    try { await modes[name].start?.(); } catch (err) { console.warn(err); modal({ title: '시작할 수 없어요', text: String(err.message || err) }); }
  };
  function stop() {
    if (!current) return;
    try { modes[current].stop?.(); } finally { current = null; clear(); renderPanel(); }
  }
  const renderPanel = () => {
    if (!ui) return;
    ui.panel.replaceChildren(
      el('b', { textContent: '📘 수강신청 연습' }),
      el('p', { textContent: '실제 신청은 되지 않습니다 · Esc로 모드 종료' }),
      ...Object.entries(modes).map(([name, m]) =>
        el('button', { className: 'sg-btn' + (name === current ? ' on' : ''), textContent: m.label, onclick: () => name === current ? stop() : start(name) })),
      el('button', { className: 'sg-btn off', textContent: '끄기', onclick: () => toggle() }));
  };
  const CSS = `
    [data-sg]{font:13px/1.5 sans-serif;color:#111;box-sizing:border-box}
    .sg-panel{position:fixed;top:12px;right:12px;z-index:2147483646;background:#fff;border:2px solid #2563eb;border-radius:10px;padding:10px;width:200px;box-shadow:0 4px 16px #0003;display:flex;flex-direction:column;gap:6px}
    .sg-panel p{margin:0;color:#555;font-size:12px}
    .sg-btn{all:unset;cursor:pointer;padding:5px 10px;border-radius:6px;background:#eef2ff;color:#1e3a8a;text-align:center;font:13px/1.5 sans-serif}
    .sg-btn.on{background:#2563eb;color:#fff}
    .sg-btn.off{background:#f3f4f6;color:#444}
    .sg-bubble{position:absolute;z-index:2147483646;max-width:300px;background:#111827;color:#fff;border-radius:8px;padding:10px 12px;box-shadow:0 4px 12px #0004}
    .sg-bubble *{color:#fff}
    .sg-bubble p,.sg-modal p{margin:4px 0;white-space:pre-line}
    .sg-back{position:fixed;inset:0;z-index:2147483647;background:#0006;display:flex;align-items:center;justify-content:center}
    .sg-modal{background:#fff;border-radius:10px;padding:18px 20px;min-width:260px;max-width:400px;box-shadow:0 8px 24px #0005}
    .sg-row{display:flex;gap:6px;justify-content:flex-end;margin-top:8px}`;

  function toggle() {
    if (ui) {
      stop();
      EVENTS.forEach(t => removeEventListener(t, guard, true));
      ui.panel.remove(); ui.style.remove(); ui = null;
      return;
    }
    ui = { style: el('style', { textContent: CSS }), panel: el('div', { className: 'sg-panel' }) };
    document.head.append(ui.style);
    document.body.append(ui.panel);
    EVENTS.forEach(t => addEventListener(t, guard, true));
    renderPanel();
  }

  return {
    register, start, stop, toggle, get mode() { return current; },
    screen, grid, headers, rows, cell, cells, buttons, findButton, label, norm, goMenu, waitFor,
    matchTip, tipEl, highlight, unhighlight, bubble, modal, clear, el,
  };
})();
