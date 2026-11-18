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
  const tipsHere = (s = screen()) => (SG.tips || []).filter(t => t.screen === '공통' || t.screen === s);
  // 누른·올린 요소(또는 그 조상)에 해당하는 팁 → { tip, el }.
  // 자유 팁에서는 마우스를 올릴 때마다 불리므로 화면 이름·표·머리글은 한 번만, 칸의 열 이름은 칸마다 한 번만 읽는다
  const matchTip = target => {
    const tips = tipsHere(), g = grid();
    let hs;
    const columnOf = c => {
      if (!g?.contains(c)) return null;
      if (c.colSpan > 1) return null; // 한 줄을 다 차지하는 칸(조회 결과 없음, 표 아래 바닥 줄)은 어느 열도 아님
      if (c.tagName === 'TH') return norm(c.textContent);
      return (hs ??= headers())[cells(c.parentElement).indexOf(c)] ?? null;
    };
    for (let e = target; e && e !== document.body; e = e.parentElement) {
      let col; // 이 칸의 열 이름 (열 팁을 맞춰 볼 때 처음 한 번 계산)
      const column = () => col !== undefined ? col : (col = columnOf(e));
      for (const tip of tips) {
        const f = tip.find;
        if ((f.button && e.matches('input[type=button], input[type=submit], button') && norm(label(e)) === norm(f.button)) ||
          (f.menu && e.matches('#snb a[title]') && e.title === f.menu) ||
          (f.column && e.matches('th, td') && column() === norm(f.column)) ||
          (f.selector && e.matches(f.selector))) return { tip, el: e };
      }
    }
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
  // 클릭 차단(guard)이 보는 이벤트. 확장 요소에서 일어난 이 이벤트는 페이지 쪽으로 올려 보내지 않는다
  const EVENTS = ['click', 'dblclick', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'submit', 'keydown'];
  const stopUp = e => e.stopPropagation();
  // 확장용 요소: data-sg가 붙어 클릭 차단에서 빠지고, 안에서 일어난 이벤트는 여기서 멈춰 학교 코드(tbody·document 위임)에 닿지 않는다
  const el = (tag, props = {}, ...kids) => {
    const e = Object.assign(document.createElement(tag), props);
    e.dataset.sg = '';
    EVENTS.forEach(t => e.addEventListener(t, stopUp));
    e.append(...kids);
    return e;
  };
  let bubbleEl = null, modalEl = null, hovered = null;
  let lit = null; // 강조 중인 요소 { el, thin, prev: 원래 outline 값 }
  // 보이는 화면 크기. innerWidth/innerHeight는 스크롤바까지 포함해서 그 기준으로 놓으면 가로 스크롤바가 생길 수 있다
  const viewW = () => document.documentElement.clientWidth;
  const viewH = () => document.documentElement.clientHeight;
  // 요소에서 실제로 보이는 부분: 화면과 스크롤되는 조상(.grid-wrap 등)에 잘린 부분을 뺀다. 안 보이면 null
  const shownRect = t => {
    let { left, top, right, bottom } = t.getBoundingClientRect();
    [left, top, right, bottom] = [Math.max(left, 0), Math.max(top, 0), Math.min(right, viewW()), Math.min(bottom, viewH())];
    for (let p = t.parentElement; p && p !== document.body; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (s.overflowX === 'visible' && s.overflowY === 'visible') continue;
      const c = p.getBoundingClientRect(), l = c.left + p.clientLeft, tp = c.top + p.clientTop;
      [left, top, right, bottom] = [Math.max(left, l), Math.max(top, tp), Math.min(right, l + p.clientWidth), Math.min(bottom, tp + p.clientHeight)];
    }
    return right > left && bottom > top ? { left, top, right, bottom } : null;
  };
  // 오른쪽 위 "?" 배지: 호버 중인 요소와 자유 팁에서 누른 요소에 붙인다. 확장 요소로 따로 띄우므로 표를 다시 그려도 남는 것이 없다
  const badges = new Map(); // 화면 요소 → 배지
  const placeBadges = () => badges.forEach((b, t) => {
    const r = shownRect(t);
    b.hidden = !r; // 스크롤로 화면 밖·표 밖으로 나간 요소는 배지를 숨긴다
    if (!r) return;
    b.style.left = Math.max(2, Math.min(r.right - 10, viewW() - 18)) + scrollX + 'px';
    b.style.top = Math.max(2, r.top - 7) + scrollY + 'px';
  });
  // 페이지가 화면을 다시 그려 테두리 요소가 문서에서 빠지면 배지를 치운다 (누른 요소였으면 말풍선도 닫는다)
  const gone = new MutationObserver(() => {
    if (hovered && !hovered.isConnected) hover(null);
    if (lit?.thin && !lit.el.isConnected) { unhighlight(); bubbleEl?.remove(); }
  });
  const syncBadges = () => {
    const want = new Set([hovered, lit?.thin && lit.el].filter(Boolean));
    badges.forEach((b, t) => { if (!want.has(t)) { b.remove(); badges.delete(t); } });
    want.forEach(t => { if (!badges.has(t)) badges.set(t, document.body.appendChild(el('span', { className: 'sg-badge', textContent: '?' }))); });
    if (badges.size) gone.observe(document.body, { childList: true, subtree: true }); else gone.disconnect();
    placeBadges();
  };
  // 강조 테두리. thin이면 호버와 같은 모양(얇은 테두리 + 배지, 자유 팁에서 누른 요소), 아니면 굵게 (튜토리얼 단계)
  const highlight = (target, thin = false) => {
    unhighlight();
    if (!target) return;
    lit = { el: target, thin, prev: [target.style.outline, target.style.outlineOffset] };
    if (thin) { target.classList.add('sg-lit'); syncBadges(); return; }
    target.style.outline = '3px solid #f59e0b';
    target.style.outlineOffset = '2px';
  };
  const unhighlight = () => {
    if (!lit) return;
    const { el: t, thin, prev } = lit;
    lit = null;
    if (thin) { t.classList.remove('sg-lit'); syncBadges(); }
    else [t.style.outline, t.style.outlineOffset] = prev;
  };
  // 말풍선: target의 보이는 부분 아래(자리가 없으면 위)에 놓는다. 스크롤·창 크기 변경 때 다시 놓아 요소를 따라간다.
  // target이 가려지면 숨긴다. 단 버튼이 있는 말풍선(튜토리얼)은 눌러야 넘어가므로 숨기지 않고 원래 위치 기준으로 둔다
  let bubbleAt = null; // { el: 가리키는 요소, keep: 가려져도 보이게 둘지 }
  const placeBubble = () => {
    const box = bubbleEl, t = bubbleAt?.el;
    if (!box?.isConnected || !t?.isConnected) return; // 요소가 문서에서 빠졌으면 마지막 자리에 둔다
    const r = shownRect(t) || (bubbleAt.keep ? t.getBoundingClientRect() : null);
    box.hidden = !r;
    if (!r) return;
    const below = r.bottom + box.offsetHeight + 12 < viewH();
    box.style.left = Math.max(8, Math.min(r.left, viewW() - box.offsetWidth - 8)) + scrollX + 'px';
    box.style.top = (below ? r.bottom + 8 : r.top - box.offsetHeight - 8) + scrollY + 'px';
  };
  // 배지·말풍선 다시 놓기: 확장이 켜져 있는 동안 스크롤(표 가로 스크롤 등 안쪽 스크롤 포함)·창 크기 변경 때 부른다
  const place = () => { placeBadges(); placeBubble(); };
  // buttons를 주면 누른 버튼 글자로 resolve
  const bubble = (target, { title = '', text = '', buttons: btns = [] }) => new Promise(done => {
    bubbleEl?.remove();
    const box = el('div', { className: 'sg-bubble' },
      ...(title ? [el('b', { textContent: title })] : []),
      el('p', { textContent: text }),
      ...(btns.length ? [el('div', { className: 'sg-row' }, ...btns.map(b => el('button', { className: 'sg-btn', textContent: b, onclick: () => { box.remove(); done(b); } })))] : []));
    document.body.append(box);
    bubbleEl = box;
    bubbleAt = { el: target, keep: btns.length > 0 };
    placeBubble();
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
  // 마우스를 올린 요소에 얇은 테두리 + 오른쪽 위 "?" 배지 (자유 팁: 팁이 있는 요소만). null이면 지움.
  // 화면 요소에는 class 하나만 붙였다 뗀다
  const hover = target => {
    target ||= null;
    if (hovered === target) return;
    hovered?.classList.remove('sg-hover');
    hovered = target;
    hovered?.classList.add('sg-hover');
    syncBadges();
  };
  // 강조·말풍선·모달을 닫는다. 호버 테두리는 마우스를 따라가므로 그대로 둔다 (모드 종료 때 stop()이 지움)
  const clear = () => { unhighlight(); bubbleEl?.remove(); modalEl?.remove(); };

  // 페이지 자체 호버 끄기 (자유 팁): 학교 CSS의 :hover 규칙과 마우스 올림 이벤트를 막고, 커서를 기본 화살표로 통일한다.
  // :hover 규칙은 절대 맞지 않는 :not(*)로 바꿔 두었다가 끌 때 원래대로 되돌린다.
  // mousemove·pointermove는 막지 않는다: 활동 감지(자동 로그아웃 연장) 스크립트가 쓸 수 있어서
  const HOVER_EVENTS = ['mouseover', 'mouseout', 'mouseenter', 'mouseleave', 'pointerover', 'pointerout', 'pointerenter', 'pointerleave'];
  const stopHover = e => { if (!e.target.closest?.('[data-sg]')) e.stopPropagation(); };
  let muted = null; // [규칙, 원래 선택자] 목록
  const walk = list => {
    for (const r of list) {
      if (r.selectorText?.includes(':hover')) { muted.push([r, r.selectorText]); r.selectorText = r.selectorText.replace(/:hover\b/g, ':not(*)'); }
      if (r.styleSheet) muteSheet(r.styleSheet); // @import한 CSS
      if (r.cssRules) walk(r.cssRules); // @media 등 안쪽 규칙
    }
  };
  const muteSheet = sheet => {
    if (sheet.ownerNode?.dataset?.sg !== undefined) return;
    try { walk(sheet.cssRules); } catch { /* 다른 출처 CSS는 읽을 수 없어 건너뜀 */ }
  };
  // 이미 바꾼 규칙에는 :hover가 없으므로 여러 번 불러도 된다
  const muteAll = () => [...document.styleSheets, ...(document.adoptedStyleSheets || [])].forEach(muteSheet);
  // 켠 뒤에 추가되는 CSS: <style>은 head에 붙을 때, <link>는 내려받은 뒤(load)에야 규칙을 읽을 수 있다
  const lateCss = new MutationObserver(muteAll);
  const onCssLoad = e => { if (e.target.tagName === 'LINK') muteAll(); };
  const quiet = on => {
    if (!on === !muted) return;
    document.documentElement.classList.toggle('sg-quiet', on);
    HOVER_EVENTS.forEach(t => (on ? addEventListener : removeEventListener)(t, stopHover, true));
    (on ? addEventListener : removeEventListener)('load', onCssLoad, true);
    if (on) { muted = []; muteAll(); lateCss.observe(document.head, { childList: true }); return; }
    lateCss.disconnect();
    muted.forEach(([r, s]) => { r.selectorText = s; });
    muted = null;
  };

  // ---------- 실제 클릭 차단 ----------
  // 켜져 있는 동안 페이지 버튼은 기본적으로 전부 막는다. 모드가 allow(el)로 예외를 줄 수 있다.
  // 모드가 없을 때는 메뉴 이동·조회·입력칸만 허용 (서버 상태를 바꾸지 않는 것만)
  const SAFE = ['조회', '초기화', '▼상세조회'];
  const idleAllow = e => !!e.closest('#snb a[title]') || e.matches('input[type=text], select, option') ||
    (e.matches('input[type=button], button') && SAFE.includes(norm(label(e))));
  const guard = e => {
    const m = modes[current];
    // Esc: 모드가 escape()를 정의하면 그것만 부르고(예: 실전 재현은 메시지만 닫음), 없으면 모드 종료. 포커스가 확장 요소 안이어도 같다
    if (e.type === 'keydown' && e.key === 'Escape') return m?.escape ? m.escape() : stop();
    if (bypass || e.target.closest?.('[data-sg]')) return;
    if (e.type === 'keydown' && e.key !== 'Enter') return; // 글자 입력은 허용, Enter 제출만 막음
    if (m ? m.allow?.(e.target, e) : idleAllow(e.target)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.type === 'click') m?.blocked?.(e.target, e);
  };

  // ---------- 모드 · 패널 ----------
  // 모드 등록: SG.register('tip', { label, start(), stop(), allow(el)?, blocked(el)?, escape()? })
  const register = (name, mode) => { modes[name] = mode; ui && renderPanel(); };
  const start = async name => {
    stop();
    current = name;
    renderPanel();
    try { await modes[name].start?.(); } catch (err) { console.warn(err); modal({ title: '시작할 수 없어요', text: String(err.message || err) }); }
  };
  function stop() {
    if (!current) return;
    try { modes[current].stop?.(); } finally { current = null; clear(); hover(null); renderPanel(); }
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
    .sg-row{display:flex;gap:6px;justify-content:flex-end;margin-top:8px}
    .sg-hover,.sg-lit{outline:1.5px solid #f59e0b !important;outline-offset:-1.5px !important}
    .sg-badge{position:absolute;z-index:2147483645;width:16px;height:16px;border-radius:50%;background:#f59e0b;color:#fff;font:bold 11px/16px sans-serif;text-align:center;pointer-events:none;box-shadow:0 1px 3px #0005}
    html.sg-quiet :not([data-sg],[data-sg] *){cursor:default !important}
    html.sg-quiet .sg-hover.sg-hover,html.sg-quiet .sg-hover.sg-hover *{cursor:help !important}`;
  // 마지막 줄의 `*`: 테두리 요소 안의 글자·버튼도 바로 위 cursor:default를 받으므로 도움말 커서(운영체제 기본)를 같이 준다

  function toggle() {
    if (ui) {
      stop();
      EVENTS.forEach(t => removeEventListener(t, guard, true));
      ['scroll', 'resize'].forEach(t => removeEventListener(t, place, true));
      ui.panel.remove(); ui.style.remove(); ui = null;
      return;
    }
    ui = { style: el('style', { textContent: CSS }), panel: el('div', { className: 'sg-panel' }) };
    document.head.append(ui.style);
    document.body.append(ui.panel);
    EVENTS.forEach(t => addEventListener(t, guard, true));
    ['scroll', 'resize'].forEach(t => addEventListener(t, place, true));
    renderPanel();
  }

  return {
    register, start, stop, toggle, get mode() { return current; },
    screen, grid, headers, rows, cell, cells, buttons, findButton, label, norm, goMenu, waitFor,
    matchTip, tipEl, highlight, unhighlight, hover, quiet, bubble, modal, clear, el,
  };
})();
