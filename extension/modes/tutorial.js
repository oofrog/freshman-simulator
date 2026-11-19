// 신입생 튜토리얼 모드 (#7, 담당: 최지범)
// 어느 화면에서 시작해도 수강편람으로 이동한 뒤, STEPS를 차례로 강조하고 말풍선을 띄운다.
//   수강편람 → 기본수업 → 희망수업 → 수강신청 → 신청내역 → 끝 모달
// 말풍선 문구는 tips.js의 title·text를 그대로 쓴다 (화면 이동 단계만 navTip의 이동 안내). 진행과 조작 안내는 별도 패널에 표시한다.
(() => {
  // 단계 = [tips.js의 팁 id, 넘어가는 동작]
  //   'next'  말풍선의 [다음]  (두 번째로 보인 단계부터는 [이전]도 있어, 다른 화면의 단계면 그 화면으로 돌아간다)
  //   'click' 강조된 요소를 사용자가 직접 누름 (그 요소만 클릭 허용). 서버 상태를 바꾸지 않는 메뉴·[조회]에만 쓴다.
  //           메뉴 팁(find.menu)이면 그 화면으로 바뀔 때까지 기다린다.
  // 화면에 요소가 없으면 화면 제목 옆에서 같은 팁을 읽고 [다음]으로 진행한다.
  // 화면 이동 단계: 왼쪽 메뉴는 자유 팁에서도 직접 눌러 이동하는 요소(SG.tryable)라 tips.js에 팁이 없다 (#19).
  // 그래서 설명 대신 이동 안내만 보여 주고, 이 안내 문구는 tips.js가 아닌 여기(navTip)에 둔다
  const move = name => [`menu:${name}`, 'click'];
  // [팁 id, 넘어가는 동작('next' 버튼 | 'click' 직접 누름), 'skip'이면 화면에 그 요소가 없을 때 건너뜀]
  const STEPS = [
    ['pyunram.search', 'click'], // 검색 조건을 바꿔 본 뒤 [조회]를 직접 누름
    ['common.col.no', 'next'],
    ['common.col.code', 'next'],
    ['common.col.seat', 'next'],
    ['common.col.limit', 'next'],
    move('기본수업'),
    ['basic.apply', 'next'],
    ['basic.hopeAdd', 'next', 'skip'], // 희망신청 기간이 아니면 칸이 없다
    move('희망수업'),
    ['hope.cap', 'next'],
    ['hope.hope', 'next'],
    ['hope.apply', 'next'],
    move('수강신청'),
    ['apply.apply', 'next'],
    move('신청내역'),
    ['done.cancel', 'next'],
    ['done.type', 'next'],
  ];
  const FIRST = '수강편람';
  const NAV_MS = 10000; // 화면 이동을 기다리는 최대 시간 (실제 화면은 서버 응답을 기다림)
  const SKIP_MS = 300;  // 건너뛰는 단계는 오래 기다리지 않는다 (같은 화면의 표는 이미 그려져 있음)
  const FIND_MS = 1500; // 요소가 그려지길 기다리는 시간. 넘으면 화면 제목에 설명 표시
  const MOVE_MS = 450;  // 강조 테두리가 다음 요소로 날아가는 시간
  const EASE = `${MOVE_MS}ms cubic-bezier(.2,.8,.2,1)`;
  // 강조 테두리 바깥을 어둡게 하는 그림자. 비우면 화면이 어두워지지 않는다 (어둡게: ',0 0 0 9999px #0000002e')
  const DIM = '';

  const CSS = `
    /* 진행 패널은 모드 패널이 있던 오른쪽 위에 내려앉듯 나타난다 (모드 패널은 core가 시작할 때 숨긴다) */
    .sg-step[data-sg]{position:fixed;top:12px;right:12px;z-index:2147483646;width:min(260px,calc(100vw - 24px));padding:12px;background:#fff;border:2px solid #2563eb;border-radius:10px;box-shadow:0 4px 16px #0003;transform-origin:top right;animation:sg-step-in .28s cubic-bezier(.2,.8,.2,1) .12s both}
    @keyframes sg-step-in{from{opacity:0;transform:translateY(-8px) scale(.98)}}
    @media (prefers-reduced-motion:reduce){.sg-step[data-sg]{animation:none}}
    .sg-step-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
    .sg-step-count{font-weight:bold;color:#1e3a8a}
    .sg-step progress{display:block;width:100%;height:6px;margin:10px 0;accent-color:#2563eb}
    .sg-step-hint{margin:10px 0 0;line-height:1.5}
    .sg-step button:focus-visible{outline:3px solid #2563eb;outline-offset:2px}
    .sg-ring[data-sg]{position:fixed;z-index:2147483645;pointer-events:none;border:3px solid #f59e0b;border-radius:8px;box-shadow:0 0 0 4px #f59e0b55${DIM};transition:left ${EASE},top ${EASE},width ${EASE},height ${EASE},opacity ${EASE},border-color ${EASE}}
    .sg-ring.jump{transition:none}
    /* 말풍선 버튼: [다음]·[완료]는 진한 파란 주 버튼(오른쪽), [이전]은 테두리만 있는 보조 버튼(왼쪽 끝) */
    .sg-bubble .sg-btn.sg-next{background:#2563eb;color:#fff;font-weight:bold}
    .sg-bubble .sg-btn.sg-prev{margin-right:auto;background:transparent;color:#cbd5e1;box-shadow:inset 0 0 0 1px #64748b}
    .sg-ring.off{opacity:0}
    /* 시작해서 첫 단계가 뜨기 전(화면 이동 중): 테두리는 숨기고, DIM이 있으면 어두운 배경만 깔아 둔다 */
    .sg-ring.wait{border-color:transparent;box-shadow:${DIM.slice(1) || 'none'}}
    .sg-ring.end .sg-ring-tag{left:auto;right:-3px}
    .sg-ring.below .sg-ring-tag{bottom:auto;top:100%;margin:8px 0 0}
    .sg-ring-tag[data-sg]{display:none;position:absolute;left:-3px;bottom:100%;margin-bottom:8px;white-space:nowrap;padding:3px 10px;border-radius:999px;background:#2563eb;color:#fff;font-weight:bold;box-shadow:0 2px 8px #0004}
    /* 직접 누르는 단계: 파란 테두리가 맥박처럼 퍼지고 "직접 눌러 보세요" 표가 붙는다 ([다음] 단계는 주황 고정) */
    .sg-ring.act{border-color:#2563eb;animation:sg-pulse 1.2s ease-out infinite}
    .sg-ring.act .sg-ring-tag{display:block}
    @keyframes sg-pulse{0%{box-shadow:0 0 0 0 #2563ebaa${DIM}}70%,100%{box-shadow:0 0 0 14px #2563eb00${DIM}}}
    @media (prefers-reduced-motion:reduce){.sg-ring[data-sg]{transition:none}.sg-ring.act{animation:none;box-shadow:0 0 0 4px #2563eb66${DIM}}}
  `;

  let run = 0;        // 시작할 때마다 1 증가. 멈추면 증가시켜 이전 진행을 끊는다
  let target = null;  // 'click' 단계에서 누르길 기다리는 요소
  let clicked = null; // 그 요소를 눌렀을 때 부를 함수
  let filter = null;  // 현재 설명 중인 검색 조건 영역
  let cancel = null;  // 말풍선·화면 대기 중에도 즉시 끝내기
  let extras = [];    // 스타일·진행 패널 (멈출 때 지움)
  let ring = null;    // 요소에서 요소로 날아가는 강조 테두리 (시선이 따라가도록)
  let ringOn = null;  // 테두리가 감싸고 있는 요소

  // 움직임 줄이기 설정이거나 위치를 잴 수 없는 환경(판정 스크립트)이면 애니메이션 없이 바로
  const still = () => !globalThis.matchMedia || matchMedia('(prefers-reduced-motion: reduce)').matches;
  let from = null;    // 직전 말풍선 위치 { left, top } (다음 말풍선이 여기서 미끄러져 옴)

  // 요소를 가로로 품은 스크롤 영역(표의 .grid-wrap 등). 페이지 자체는 가로로 움직이지 않는다
  const hScroller = el => {
    for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement)
      if (p.scrollWidth > p.clientWidth && /auto|scroll/.test(getComputedStyle(p).overflowX)) return p;
    return null;
  };
  // 요소가 보이게 스크롤한다. inline:'center'는 표를 끝까지 민 뒤 페이지까지 가로로 밀어 오른쪽 빈 곳이 보이므로,
  // 세로·바깥 스크롤은 브라우저에 'nearest'로 맡기고(필요한 만큼만), 표 스크롤 영역 안에서만 직접 가운데로 맞춘다(끝을 넘지 않게).
  // 부드럽게 움직이고, 요소 위치가 몇 프레임 그대로면(또는 1초 지나면) 끝난 것으로 본다
  const scrollTo = el => new Promise(done => {
    const behavior = still() ? 'auto' : 'smooth';
    el.scrollIntoView({ behavior, block: 'nearest', inline: 'nearest' });
    if (!el.getBoundingClientRect || !globalThis.getComputedStyle) return done();
    const box = hScroller(el); // 위의 smooth 스크롤 중 이 영역의 가로 이동만 가운데 맞춤으로 바꾼다
    if (box) {
      const r = el.getBoundingClientRect(), w = box.getBoundingClientRect();
      const want = box.scrollLeft + r.left - w.left - (box.clientWidth - r.width) / 2;
      const left = Math.max(0, Math.min(box.scrollWidth - box.clientWidth, want));
      if (r.left < w.left || r.right > w.right) box.scrollTo({ left, behavior }); // 이미 다 보이면 가로로는 안 움직임
    }
    if (behavior === 'auto' || !globalThis.requestAnimationFrame) return done();
    const t0 = Date.now();
    let last = '', same = 0;
    const tick = () => {
      const r = el.getBoundingClientRect(), at = `${r.left},${r.top}`;
      same = at === last ? same + 1 : 0;
      last = at;
      if (same >= 3 || !el.isConnected || Date.now() - t0 > 1000) done(); else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  // 테두리를 사각형 r(화면 좌표)에 맞춘다. 오른쪽 끝·위쪽 끝이면 "직접 눌러 보세요" 표를 안쪽으로 돌린다
  const setRect = r => {
    Object.assign(ring.style, { left: r.left - 4 + 'px', top: r.top - 4 + 'px', width: r.width + 8 + 'px', height: r.height + 8 + 'px' });
    ring.classList.toggle('end', r.left + 240 > innerWidth);
    ring.classList.toggle('below', r.top < 44);
  };
  // 테두리를 ringOn 위치에 맞춘다. 스크롤·창 크기가 바뀌면 다시 부른다. 화면이 다시 그려져 요소가 사라졌거나 숨었으면 그대로 둔다
  const place = () => {
    const r = ring && ringOn?.isConnected && ringOn.getBoundingClientRect?.();
    if (r && (r.width || r.height)) setRect(r);
  };
  // 스크롤·창 크기가 바뀔 때: 테두리를 애니메이션 없이 요소에 붙여 둔다 (요소와 같이 움직이게)
  const follow = () => { if (ring && !ring.classList.contains('wait')) instantly(ring, 'jump', place); };
  // 애니메이션 없이 바로 적용 (출발 위치를 잡을 때)
  const instantly = (node, cls, apply) => {
    node.classList.toggle(cls, true);
    apply();
    void node.offsetWidth; // 위치를 먼저 적용한 뒤 애니메이션을 다시 켬
    node.classList.toggle(cls, false);
  };
  // 테두리를 다음 요소로 날린다. 첫 단계는 날아오지 않고 첫 요소 자리에서 바로 나타난다 (DIM이 있으면 배경은 시작할 때부터 깔려 있음)
  const fly = el => {
    ringOn = el;
    if (ring.classList.contains('wait')) instantly(ring, 'jump', place); else place();
    ring.classList.toggle('wait', false);
    ring.classList.toggle('off', false);
  };
  // 열 팁인데 그 열 칸에 버튼이 있으면(수강신청의 [신청], 희망신청의 [추가] 등) 머리글 대신 첫 번째로 보이는 실제 버튼을 강조.
  // 이미 신청해 [신청]이 없는 행은 건너뛰고, 버튼이 있는 행이 없으면 null (머리글 강조)
  const buttonIn = tip => {
    if (!tip.find.column || !SG.rows) return null;
    for (const tr of SG.rows()) {
      const td = SG.cell(tr, tip.find.column);
      const btn = td && SG.buttons(td).find(b => b.matches('input')); // 돋보기 같은 <button>은 빼고 [신청]·[추가] 같은 input 버튼만
      if (btn) return btn;
    }
    return null;
  };
  // 방금 만든 말풍선의 버튼에 모양 구분용 클래스를 붙인다 (core 말풍선은 버튼 글자만 받으므로)
  const markButtons = () => {
    const box = [...(document.querySelectorAll?.('.sg-bubble') || [])].at(-1);
    for (const btn of box?.querySelectorAll('.sg-btn') || [])
      btn.classList.add(btn.textContent === '이전' ? 'sg-prev' : 'sg-next');
  };
  // 방금 만든 말풍선을 직전 말풍선 자리에서 제자리로 미끄러뜨린다.
  // 첫 단계는 미끄러져 오지 않고, 테두리가 나타나는 첫 요소(el)에서 커지며 나온다
  const glide = el => {
    const box = [...(document.querySelectorAll?.('.sg-bubble') || [])].at(-1);
    if (!box) return;
    const to = { left: box.style.left, top: box.style.top };
    const start = from;
    from = to;
    if (still()) return;
    if (!start) {
      const r = el?.getBoundingClientRect?.(), b = box.getBoundingClientRect?.();
      if (r && b) box.style.transformOrigin = `${r.left + r.width / 2 - b.left}px ${r.top + r.height / 2 - b.top}px`; // 요소 쪽에서 커지게
      box.style.transition = 'none';
      Object.assign(box.style, { opacity: '0', transform: 'scale(.6)' });
      void box.offsetWidth;
      box.style.transition = 'opacity 260ms ease-out 80ms,transform 260ms cubic-bezier(.2,.8,.2,1) 80ms';
      Object.assign(box.style, { opacity: '1', transform: 'none' });
      return;
    }
    box.style.transition = 'none';
    Object.assign(box.style, { left: start.left, top: start.top, opacity: '1' });
    void box.offsetWidth;
    box.style.transition = `left ${EASE},top ${EASE},opacity ${EASE}`;
    Object.assign(box.style, to);
  };

  // 화면 이동 단계의 안내 (팁 데이터가 아님). 같은 단계면 같은 객체를 돌려준다
  const navTips = {};
  const navTip = name => navTips[name] ||= {
    id: `menu:${name}`, screen: '공통', find: { menu: name }, nav: true,
    title: `${name}으로 이동`, text: `왼쪽 메뉴에서 [${name}]을 직접 눌러 보세요.`,
  };
  // 단계 id → 팁 (화면 이동 단계는 navTip, 나머지는 tips.js)
  const tipOf = id => id.startsWith('menu:') ? navTip(id.slice(5)) : SG.tips.find(t => t.id === id);
  // 단계마다 그 단계를 보여 줄 화면: 수강편람에서 시작해 메뉴를 누르는 단계 다음부터 그 메뉴의 화면
  const screensOf = steps => {
    let at = FIRST;
    return steps.map(([id, how]) => {
      const here = at, menu = how === 'click' && tipOf(id)?.find.menu;
      if (menu) at = menu;
      return here;
    });
  };

  SG.register('tutorial', {
    label: '튜토리얼',
    steps: STEPS, screensOf, tipOf, // 판정 스크립트(test/tutorial*.test.js)가 읽음
    async start() {
      SG.bar(false); // 오른쪽 위 진행 패널(진행률·[그만하기])을 직접 그리므로 core 상태 바는 숨김
      const me = ++run, alive = () => me === run;
      const cancelled = new Promise(done => { cancel = done; });
      const wait = promise => Promise.race([promise, cancelled]);
      // 중단되면 waitFor의 타이머도 다음 확인 때 정리된다.
      const until = (test, ms) => wait(SG.waitFor(() => !alive() || test(), ms).then(() => true, () => false));
      const style = SG.el('style', { textContent: CSS });
      const count = SG.el('span', { className: 'sg-step-count' });
      const progress = SG.el('progress', { max: STEPS.length, value: 0 });
      progress.setAttribute('aria-label', '튜토리얼 진행');
      const hint = SG.el('p', { className: 'sg-step-hint' });
      hint.setAttribute('role', 'status');
      const screens = screensOf(STEPS);
      const panel = SG.el('section', { className: 'sg-step' },
        SG.el('div', { className: 'sg-step-head' }, count,
          SG.el('button', { className: 'sg-btn off', textContent: '그만하기', onclick: () => SG.stop() })),
        progress, hint);
      panel.setAttribute('aria-label', '튜토리얼 진행 안내');
      // 테두리는 첫 단계 전까지 감춰 두고(화면 이동 중 노란 테두리가 멈춰 있지 않게) (DIM이 있으면) 어두운 배경만 바로 깐다.
      // 첫 단계에서 테두리는 첫 요소 자리에 바로 나타나고, 말풍선은 그 요소에서 커지며 나온다
      ring = SG.el('div', { className: 'sg-ring off wait' }, SG.el('span', { className: 'sg-ring-tag', textContent: '👆 여기를 직접 눌러 보세요' }));
      document.body.append(ring);
      from = null;
      document.head.append(style);
      document.body.append(panel);
      void ring.offsetWidth; // 스타일이 붙은 뒤 off를 풀어야 배경이 서서히 어두워진다
      ring.classList.toggle('off', false);
      extras = [style, panel, ring];
      globalThis.addEventListener?.('scroll', follow, true); // 표(.grid-wrap) 안 가로 스크롤도 잡도록 capture
      globalThis.addEventListener?.('resize', follow);

      const show = (i, message) => {
        count.textContent = `튜토리얼 ${i + 1} / ${STEPS.length}`;
        progress.value = i + 1;
        hint.textContent = message;
      };

      // 그 화면이 아니면 메뉴로 이동하고 바뀔 때까지 기다린다. 멈췄으면 false
      const goTo = async (name, force = false) => {
        if (!alive()) return false;
        if (!force && SG.screen() === name) return true;
        hint.textContent = `${name}으로 이동하고 있어요.`;
        if (!SG.goMenu(name)) throw new Error(`${name} 메뉴를 찾지 못했어요.`);
        const ok = await until(() => SG.screen() === name, NAV_MS);
        if (!alive()) return false;
        if (!ok) throw new Error(`${name} 화면으로 이동하지 못했어요.`);
        return true;
      };

      try {
        show(0, '수강편람에서 시작해 다섯 화면을 차례로 살펴봐요.');
        if (!await goTo(FIRST, true)) return;
        let dir = 1; // 마지막으로 움직인 방향 (건너뛰는 단계는 이 방향으로 지나감)
        for (let i = 0; i < STEPS.length;) {
          const [id, how, skip] = STEPS[i];
          if (!await goTo(screens[i])) return;
          const tip = tipOf(id);
          if (!tip) throw new Error(`설명 데이터를 찾지 못했어요: ${id}`);
          await until(() => SG.tipEl(tip), skip ? SKIP_MS : FIND_MS);
          if (!alive()) return;
          const found = SG.tipEl(tip);
          if (!found && skip === 'skip' && i + dir >= 0) { i += dir; continue; }
          const el = (found && buttonIn(tip)) || found || document.querySelector('#hyinContents h3') || panel;

          const direct = how === 'click' && !!found;
          const go = direct && tip.find.menu; // 다음 화면으로 넘어가는 단계
          const back = i ? ['이전'] : [];
          const next = i === STEPS.length - 1 ? '완료' : '다음';
          // [조회] 단계에서는 그 버튼이 든 검색 영역의 조건 칸도 바꿔 볼 수 있다 (검색 영역 팁은 #16에서 지움)
          filter = found && id === 'pyunram.search' ? found.closest?.('.search-box') || null : null;
          // 먼저 스크롤하고(그동안 테두리는 지금 요소에 붙어 따라감), 멈춘 뒤에 테두리와 말풍선이 다음 요소로 이동한다.
          // 스크롤 중에 날리면 스크롤할 때마다 목표가 바뀌어 테두리가 튄다
          await wait(scrollTo(el));
          if (!alive()) return;
          ring.classList.toggle('act', direct); // 직접 누를 곳이면 다른 모양으로
          fly(el); // core의 outline 강조 대신
          show(i, !found ? `현재 화면에는 이 항목이 없어요. 설명을 읽고 [${next}] 버튼을 눌러 주세요.`
            : filter ? '검색 조건을 바꿔 볼 수 있어요. 준비되면 강조된 [조회]를 직접 눌러 보세요.'
            : direct ? `강조된 [${tip.find.menu || tip.find.button}]를 직접 눌러 보세요.`
            : `강조된 항목의 설명을 읽고 [${next}] 버튼을 눌러 주세요.`);
          const bubble = SG.bubble(el, { title: tip.title, text: tip.text, buttons: direct ? back : [...back, next] });
          markButtons();
          glide(el);
          const pressed = await wait(direct
            ? Promise.race([bubble, new Promise(done => { target = el; clicked = () => done('click'); })])
            : bubble);
          if (!alive()) return;
          target = clicked = null;
          filter = null;
          SG.clear();

          if (pressed === '이전') { i--; dir = -1; continue; }
          i++;
          dir = 1;
          if (go) { // 사용자가 누른 메뉴의 화면이 뜰 때까지 (goTo가 메뉴를 한 번 더 누르지 않도록)
            hint.textContent = `${go}으로 이동하고 있어요.`;
            const ok = await until(() => SG.screen() === go, NAV_MS);
            if (!alive()) return;
            if (!ok) throw new Error(`${go} 화면으로 이동하지 못했어요.`);
          }
        }
        SG.unhighlight();
        count.textContent = `튜토리얼 ${STEPS.length} / ${STEPS.length} · 완료`;
        hint.textContent = '다섯 화면을 모두 살펴봤어요.';
        await wait(SG.modal({ title: '튜토리얼 완료', text: '수강편람부터 신청내역까지 모두 살펴봤어요. 궁금한 부분은 [자유 팁]에서 다시 확인하거나 [실전 재현]에서 연습해 보세요.', buttons: ['닫기'] }));
        if (alive()) SG.stop();
      } catch (err) {
        if (!alive()) return;
        target = clicked = filter = null;
        SG.clear();
        hint.textContent = '진행이 멈췄어요. 화면을 확인한 뒤 다시 시작할 수 있어요.';
        const choice = await wait(SG.modal({ title: '튜토리얼을 이어갈 수 없어요', text: String(err.message || err), buttons: ['그만하기', '다시 시작'] }));
        if (!alive()) return;
        if (choice === '다시 시작') return SG.start('tutorial');
        SG.stop();
      }
    },
    stop() {
      run++;
      cancel?.();
      target = clicked = filter = cancel = null;
      extras.forEach(e => e.remove());
      extras = [];
      ring = ringOn = from = null;
      globalThis.removeEventListener?.('scroll', follow, true);
      globalThis.removeEventListener?.('resize', follow);
    },
    // 'click' 단계에서 강조된 요소만 통과. 실제 click 이벤트에서만 다음 단계로
    // (Enter keydown에서 넘기면 뒤따르는 click이 막혀 메뉴 이동이 안 된다)
    allow(el, e) {
      // 검색 조건만 조작 가능. Enter 제출이나 신청·추가·삭제 버튼은 허용하지 않는다.
      const input = el.closest('label')?.control || el;
      if (filter?.contains(el) && filter.contains(input) && input.matches('input:not([type]), input[type=text], input[type=number], input[type=radio], input[type=checkbox], select, option'))
        return e.type !== 'submit' && e.type !== 'keydown';
      if (!target || !target.contains(el)) return false;
      if (e.type === 'click') clicked?.();
      return true;
    },
  });
})();
