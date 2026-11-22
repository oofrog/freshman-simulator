// 공통 기반 (#5, 담당: 강준우) — 패널, 오버레이(강조·말풍선·모달), 실제 클릭 차단, 모드 등록, 화면 읽기.
// 원칙: 학교 서버로 요청을 보내지 않는다. 확장 파일 어디에도 fetch / XMLHttpRequest를 쓰지 않는다.
// 페이지에서 읽은 글자는 textContent로만 넣는다 (innerHTML 금지).
window.SG = (() => {
  const modes = {};
  let current = null; // 실행 중인 모드 이름
  let bypass = false; // 확장이 직접 누르는 클릭(메뉴 이동)은 차단하지 않음
  let ui = null;      // 켜져 있을 때의 패널·상태 바·스타일

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
  // 누른·올린 요소(또는 그 조상)에 해당하는 팁 → { tip, el }. 직접 눌러 보는 요소(tryable)는 팁 없음으로 친다.
  // 자유 팁에서는 마우스를 올릴 때마다 불리므로 화면 이름·표·머리글은 한 번만, 칸의 열 이름은 칸마다 한 번만 읽는다
  const matchTip = target => {
    if (tryable(target)) return null;
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
  // 확장 모달 공통: <dialog>를 showModal()로 띄운다. 바깥(페이지·가짜 [신청]·상태 바)은 브라우저가 Tab·클릭 모두 막고(inert),
  // dialog는 z-index와 상관없이 맨 위에 그려진다. 닫을 때는 remove()
  // esc: Esc를 눌렀을 때 할 일 (없으면 Esc로 닫히지 않음). 브라우저 자체 Esc 닫기는 막고 guard가 맨 위 모달의 esc만 부른다.
  // 포커스는 dialog 자체에 둔다 (첫 버튼에 두면 [닫기] 같은 버튼이 Enter 한 번에 눌림). 버튼에 둘 곳은 띄운 쪽에서 focus()
  let dialogs = []; // 띄운 순서대로 { box, esc }
  const dialog = (props, kids, esc = null) => {
    const box = el('dialog', props, ...kids);
    box.addEventListener('cancel', e => e.preventDefault());
    document.body.append(box);
    box.tabIndex = -1;
    box.showModal();
    box.focus();
    dialogs.push({ box, esc });
    return box;
  };
  const topDialog = () => (dialogs = dialogs.filter(d => d.box.isConnected && d.box.open)).at(-1);
  // 모달: 화면 가운데. 누른 버튼 글자로 resolve. 버튼이 하나뿐이면 Esc는 그 버튼을 누른 것과 같다 (예: 시작 실패 안내 → 확장도 꺼짐).
  // 고를 버튼이 여럿이면 모드가 답을 기다리므로 Esc로 닫지 않는다
  const modal = ({ title = '', text = '', buttons: btns = ['확인'] }) => new Promise(done => {
    modalEl?.remove();
    const keys = btns.map(b => el('button', { className: 'sg-btn', textContent: b, onclick: () => { back.remove(); done(b); } }));
    const back = dialog({ className: 'sg-back' }, [
      el('div', { className: 'sg-modal' },
        ...(title ? [el('b', { textContent: title })] : []),
        el('p', { textContent: text }),
        el('div', { className: 'sg-row' }, ...keys))], keys.length === 1 ? () => keys[0].click() : null);
    keys[0]?.focus(); // Enter로 첫 버튼([확인]·[시작] 등)
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
  // 마우스가 올라간 요소가 직접 눌러 보는 요소(tryable)이면 html에 sg-try를 붙여 손가락 커서를 준다 (판정은 tryable 한 곳에서만)
  const stopHover = e => {
    if (e.type === 'mouseover') document.documentElement.classList.toggle('sg-try', tryable(e.target));
    if (!e.target.closest?.('[data-sg]')) e.stopPropagation();
  };
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
    document.documentElement.classList.remove('sg-try');
    muted.forEach(([r, s]) => { r.selectorText = s; });
    muted = null;
  };

  // ---------- 실제 클릭 차단 ----------
  // 켜져 있는 동안 페이지 버튼은 기본적으로 전부 막는다. 모드가 allow(el)로 예외를 줄 수 있다.
  // 직접 눌러 보는 요소: 설명보다 눌러 보는 게 빠른 것. 자유 팁에서도 누를 수 있고 팁이 뜨지 않는다 (위쪽 메뉴, 표 아래 페이지 링크, 상세조회↔일반조회)
  const TRY = ['▼상세조회', '▲일반조회'];
  // 누른 요소가 버튼 안쪽 글자·아이콘이어도 버튼으로 본다
  const buttonOf = e => e?.closest?.('input[type=button], button');
  // aria-disabled 메뉴(목업에서 만들지 않은 화면)는 눌러도 아무 일이 없으므로 직접 눌러 보는 요소로 보지 않는다
  const tryable = e => !!e?.closest?.('#snb a[title]:not([aria-disabled=true]), #pagingPanel a') || TRY.includes(norm(label(buttonOf(e) || {})));
  const guard = e => {
    const m = modes[current];
    // Esc: 맨 위에 떠 있는 것 하나만 닫는다. 모드는 끄지 않는다 (끄기는 [끝내기] 등 버튼으로만). 포커스가 확장 요소 안이어도 같다
    // 패널이 열려 있으면 패널, 아니면 맨 위 모달의 esc(없으면 아무것도 안 함), 모달이 없으면 모드의 escape() (자유 팁의 말풍선 등)
    if (e.type === 'keydown' && e.key === 'Escape') {
      const d = topDialog();
      if (d) e.preventDefault(); // 브라우저가 dialog를 직접 닫으면 기다리던 Promise가 끝나지 않으므로 막는다
      return panelOpen() ? closePanel() : d ? d.esc?.() : m?.escape?.();
    }
    if (bypass) return;
    // 패널이 열려 있을 때 패널 밖을 누르면 그 누름은 막고 패널만 닫는다 (팝업처럼 닫히면서 실제 버튼이 눌리지 않게).
    // 확장 요소(가짜 [신청], 말풍선, 상태 바 등)도 페이지와 똑같이 막는다
    if (panelOpen() && e.type !== 'keydown' && !ui.panel.contains(e.target)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.type === 'click') closePanel();
      return;
    }
    if (e.target.closest?.('[data-sg]')) return;
    if (e.type === 'keydown' && e.key !== 'Enter') return; // 글자 입력은 허용, Enter 제출만 막음
    // 모드가 없으면(패널이 열려 있음·시작 실패 안내·패널을 닫고 확장이 꺼지기 전 0.5초) 전부 막는다
    if (m?.allow?.(e.target, e)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.type === 'click') m?.blocked?.(e.target, e);
  };

  // ---------- 모드 · 패널 ----------
  // 모드 등록: SG.register('tip', { label, start(), stop(), allow(el)?, blocked(el)?, escape()? }). escape()는 모달이 없을 때 Esc
  // 패널은 확장 팝업처럼 동작: 아이콘으로 열고, 바깥을 누르거나 모드를 시작하면 닫힌다. 모드 없이 닫히면 확장도 꺼진다.
  // 모드 중에는 오른쪽 위 상태 창이 뜬다. 기본은 '모드 이름 중' + [끝내기]이고, 모드가 SG.bar()로 내용을 바꾸거나 숨길 수 있다
  const register = (name, mode) => { modes[name] = mode; ui && renderPanel(); };
  let runs = 0; // 시작할 때마다 1씩 늘린다. 늦게 실패한 이전 시작이 지금 켠 모드를 끄지 않게 한다
  const start = async name => {
    // 없는 모드 이름(목업 ?sg= 오타, 콘솔 등)이면 아무것도 바꾸지 않는다. 팝업은 등록된 이름만 보낸다
    if (!modes[name]) return console.warn(`SG: '${name}' 모드가 없어요. 있는 모드: ${Object.keys(modes).join(', ')}`);
    stopMode();
    if (!ui) on(); // 켜지지 않은 채 시작하면 클릭 차단이 없으므로 먼저 켠다
    const run = ++runs;
    current = name;
    barSpec = undefined;
    ui.panel.hidden = true;
    renderPanel();
    renderBar();
    try { await modes[name].start?.(); } catch (err) {
      console.warn(err);
      // 그사이 모드를 끄거나 다시 켰거나 확장을 껐으면 아무것도 하지 않는다
      if (run !== runs || current !== name || !ui) return;
      stopMode(); // 모드만 남으면 페이지 클릭이 계속 막힌다. stopMode()가 모달을 지우므로 먼저 부른다
      // 안내를 닫으면 확장도 끈다 (모드도 패널도 없이 클릭만 막힌 채 남지 않게)
      modal({ title: '시작할 수 없어요', text: String(err.message || err) }).then(() => { if (run === runs && !current && !panelOpen()) off(); });
    }
  };
  function stopMode() {
    if (!current) return;
    try { modes[current].stop?.(); } finally { current = null; barSpec = undefined; clear(); hover(null); renderPanel(); renderBar(); }
  }
  // 모드를 끝내면 확장도 끈다 ([끝내기]·모드가 스스로 끝날 때). 다시 쓰려면 아이콘. 모드 정리는 off()가 한다
  function stop() { off(); }
  const panelOpen = () => !!ui && !ui.panel.hidden;
  const showPanel = () => { ui.panel.hidden = false; renderPanel(); };
  // 모드 없이 닫히면 확장을 끄되 잠깐 늦춘다: 바깥 클릭으로 닫을 때 더블클릭의 두 번째 클릭까지 막히게 (더블클릭 간격 ≈ 0.5초).
  // 그사이 패널을 다시 열거나 모드를 시작하면 끄지 않는다
  let offTimer = 0;
  const closePanel = () => {
    ui.panel.hidden = true;
    clearTimeout(offTimer);
    if (!current) offTimer = setTimeout(() => { if (!current && !panelOpen()) off(); }, 500);
  };
  const renderPanel = () => {
    if (!ui) return;
    ui.panel.replaceChildren(
      el('b', { textContent: '신입생 시뮬레이터' }),
      ...Object.entries(modes).map(([name, m]) =>
        el('button', { className: 'sg-btn' + (name === current ? ' on' : ''), textContent: m.label, onclick: () => name === current ? stop() : start(name) })));
  };
  // 상태 바 내용: undefined면 기본, false면 숨김, { text, buttons: [[글자, 누를 때 함수], ...] }면 그 내용 (buttons를 빼면 버튼 없음).
  // 모드를 시작하거나 끝내면 기본으로 돌아간다
  let barSpec;
  const renderBar = () => {
    if (!ui) return;
    const m = modes[current];
    ui.bar.hidden = !m || barSpec === false;
    if (ui.bar.hidden) return;
    const { text, buttons = [] } = barSpec || { text: `${m.label} 중`, buttons: [['끝내기', () => stop()]] };
    ui.bar.replaceChildren(
      el('span', { className: 'sg-win-title', textContent: text }),
      ...buttons.map(([label, onclick]) => el('button', { className: 'sg-btn off', textContent: label, onclick })));
  };
  // 상태 창(.sg-win): 모드 중 오른쪽 위 창. 상태 바·튜토리얼 진행 패널·실전 재현 시계 창이 같이 쓴다 (#40).
  //   모드 패널이 있던 자리에 내려앉듯 나타나고, 잡고 끌어 옮길 수 있다 (dragWin). 첫 줄(.sg-win-head)은 제목(.sg-win-title) + [끝내기류] 버튼(sg-btn off)
  // 모드가 상태 바를 바꿀 때: SG.bar({ text: '수강신청 시작까지 3초' }), SG.bar({ text, buttons: [['그만하기', fn]] }),
  // SG.bar(false)(숨김, 자기 패널을 그리는 튜토리얼), SG.bar()(기본으로)
  const bar = spec => { barSpec = spec; renderBar(); };
  // 상태 창 옮기기: 창을 잡고 끌면 옮겨진다 (화면을 가릴 때). 버튼을 누를 때는 옮기지 않는다.
  // 옮긴 자리는 모든 상태 창이 같이 쓰고, 확장을 껐다 켜도 페이지를 새로 열기 전까지 남는다.
  // 창마다 높이가 달라서(상태 바 < 튜토리얼 패널), 화면 아래쪽 절반에 놓으면 아래 거리로 기억해 더 높은 창은 위로 자라게 한다 (아래가 잘리지 않게).
  // 브라우저 창 크기가 바뀌어도 화면 안에 남게 CSS clamp로 묶는다 (가장 높은 창 ≈ 130px)
  let winAt = null; // { right, top } 또는 { right, bottom } (px). null이면 CSS 기본 자리(오른쪽 위 12px)
  const placeWins = () => {
    if (!ui) return;
    const y = winAt && ('top' in winAt ? `top:clamp(0px,${winAt.top}px,calc(100vh - 140px))` : `top:auto;bottom:clamp(0px,${winAt.bottom}px,calc(100vh - 140px))`);
    ui.at.textContent = winAt ? `.sg-win[data-sg]{right:clamp(0px,${winAt.right}px,calc(100vw - 120px));${y}}` : '';
  };
  const dragWin = e => {
    const box = e.target.closest?.('.sg-win');
    if (!box || e.button !== 0 || e.target.closest('button, input, select, textarea, a')) return;
    e.preventDefault(); // 글자 선택 대신 옮기기
    const r = box.getBoundingClientRect(), dx = e.clientX - r.right, dy = e.clientY - r.top;
    const move = m => {
      const right = Math.round(Math.max(0, Math.min(viewW() - r.width, viewW() - m.clientX + dx)));
      const top = Math.round(Math.max(0, Math.min(viewH() - r.height, m.clientY - dy)));
      winAt = top + r.height / 2 > viewH() / 2 ? { right, bottom: viewH() - top - r.height } : { right, top };
      placeWins();
    };
    const end = () => ['pointermove', 'pointerup', 'pointercancel'].forEach((t, i) => box.removeEventListener(t, i ? end : move));
    box.setPointerCapture(e.pointerId);
    ['pointermove', 'pointerup', 'pointercancel'].forEach((t, i) => box.addEventListener(t, i ? end : move));
  };
  const CSS = `
    [data-sg]{font:13px/1.5 sans-serif;color:#111;box-sizing:border-box}
    .sg-panel{position:fixed;top:12px;right:12px;z-index:2147483647;background:#fff;border:2px solid #2563eb;border-radius:10px;padding:10px;width:200px;box-shadow:0 4px 16px #0003;display:flex;flex-direction:column;gap:6px}
    .sg-panel[hidden],.sg-win[hidden]{display:none}
    .sg-win[data-sg]{position:fixed;top:12px;right:12px;z-index:2147483646;width:min(260px,calc(100vw - 24px));padding:12px;background:#fff;border:2px solid #2563eb;border-radius:10px;box-shadow:0 4px 16px #0003;transform-origin:top right;animation:sg-win-in .28s cubic-bezier(.2,.8,.2,1) .12s both}
    @keyframes sg-win-in{from{opacity:0;transform:translateY(-8px) scale(.98)}}
    @media (prefers-reduced-motion:reduce){.sg-win[data-sg]{animation:none}}
    .sg-win[data-sg]{cursor:move;user-select:none;touch-action:none}
    .sg-win-head{display:flex;align-items:center;gap:12px}
    .sg-win-title{margin-right:auto;font-weight:bold;color:#1e3a8a}
    .sg-btn{all:unset;cursor:pointer;padding:5px 10px;border-radius:6px;background:#eef2ff;color:#1e3a8a;text-align:center;font:13px/1.5 sans-serif}
    .sg-btn:focus-visible{outline:2px solid #2563eb;outline-offset:2px}
    .sg-btn.on{background:#2563eb;color:#fff}
    .sg-btn.off{background:#f3f4f6;color:#444}
    .sg-bubble{position:absolute;z-index:2147483646;max-width:300px;background:#111827;color:#fff;border-radius:8px;padding:10px 12px;box-shadow:0 4px 12px #0004}
    .sg-bubble *{color:#fff}
    .sg-bubble .sg-btn{color:#1e3a8a}
    .sg-bubble p,.sg-modal p{margin:4px 0;white-space:pre-line}
    :where(dialog[data-sg]){position:fixed;inset:0;width:auto;height:auto;max-width:none;max-height:none;margin:0;padding:0;border:0;background:transparent;color:inherit;overflow:visible}
    :where(dialog[data-sg])::backdrop{background:transparent}
    :where(dialog[data-sg]):focus{outline:none}
    .sg-back[open]{background:#0006;display:flex;align-items:center;justify-content:center}
    .sg-modal{background:#fff;border-radius:10px;padding:18px 20px;min-width:260px;max-width:400px;box-shadow:0 8px 24px #0005}
    .sg-row{display:flex;gap:6px;justify-content:flex-end;margin-top:8px}
    .sg-hover,.sg-lit{outline:1.5px solid #f59e0b !important;outline-offset:-1.5px !important}
    .sg-badge{position:absolute;z-index:2147483645;width:16px;height:16px;border-radius:50%;background:#f59e0b;color:#fff;font:bold 11px/16px sans-serif;text-align:center;pointer-events:none;box-shadow:0 1px 3px #0005}
    html.sg-quiet :not([data-sg],[data-sg] *){cursor:default !important}
    html.sg-quiet .sg-hover.sg-hover,html.sg-quiet .sg-hover.sg-hover *{cursor:help !important}
    html.sg-quiet.sg-try :not([data-sg],[data-sg] *){cursor:pointer !important}
    html.sg-quiet :is(input,select,textarea,button):disabled{pointer-events:none}`;
  // help 줄의 `*`: 테두리 요소 안의 글자·버튼도 바로 위 cursor:default를 받으므로 도움말 커서(운영체제 기본)를 같이 준다
  // sg-try 줄: 직접 눌러 보는 요소 위에서는 손가락 커서 (stopHover가 sg-try를 붙였다 뗀다. 커서는 마우스 밑 요소 것만 보이므로 전체에 줘도 된다)
  // 마지막 줄: disabled 칸·버튼은 클릭 이벤트가 아예 안 와서 팁이 안 뜬다 → 클릭을 부모로 넘겨 묶음 팁(.hakjeom-area, 열 팁 등)이 받게 한다.
  //   자유 팁(sg-quiet)에서만 적용한다. 실전 재현 등은 실제 화면과 같아야 해서

  function on() {
    ui = { style: el('style', { textContent: CSS }), at: el('style'), panel: el('div', { className: 'sg-panel' }), bar: el('div', { className: 'sg-win sg-win-head sg-bar', hidden: true }) };
    document.head.append(ui.style, ui.at);
    document.body.append(ui.panel, ui.bar);
    placeWins();
    EVENTS.forEach(t => addEventListener(t, guard, true));
    addEventListener('pointerdown', dragWin, true); // guard 뒤에 둔다: 패널이 열려 있으면 guard가 먼저 막는다
    ['scroll', 'resize'].forEach(t => addEventListener(t, place, true));
    renderPanel();
  }
  function off() {
    if (!ui) return;
    clearTimeout(offTimer);
    // 모드의 stop()이 예외를 던져도 클릭 차단 해제와 패널·바 제거는 반드시 한다 (클릭만 막힌 채 남지 않게). 예외는 콘솔에 그대로 남긴다
    // clear(): 모드 없이 떠 있던 모달(시작 실패 안내)도 지운다. stopMode()는 모드가 없으면 아무것도 안 하고, CSS가 빠지면 모달이 맨 아래에 남는다
    try { stopMode(); } finally {
      clear();
      EVENTS.forEach(t => removeEventListener(t, guard, true));
      ['scroll', 'resize'].forEach(t => removeEventListener(t, place, true));
      removeEventListener('pointerdown', dragWin, true);
      ui.panel.remove(); ui.bar.remove(); ui.style.remove(); ui.at.remove(); ui = null;
    }
  }
  // 목업의 확장 켜기 버튼: 꺼져 있으면 켜고 패널을 연다. 켜져 있으면 패널 열기↔닫기
  // (크롬 확장은 페이지 위 패널 대신 브라우저 팝업을 쓴다: popup.js가 SG.modes를 읽고 SG.start·SG.stop을 부른다)
  function toggle() {
    if (!ui) return on();
    panelOpen() ? closePanel() : showPanel();
  }

  return {
    register, start, stop, toggle, bar, get mode() { return current; },
    get modes() { return Object.entries(modes).map(([name, m]) => ({ name, label: m.label })); },
    screen, grid, headers, rows, cell, cells, buttons, findButton, label, norm, goMenu, waitFor,
    matchTip, tryable, tipEl, highlight, unhighlight, hover, quiet, bubble, modal, dialog, clear, el,
  };
})();
