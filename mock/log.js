// 사용자 테스트용 행동 기록 (#42, 담당: 강준우) — 실험 페이지(lab.html)가 목업을 index.html?log=P1&seg=구간 으로 열 때만 켜진다.
// ?log가 없으면 아무것도 하지 않는다 (배포 주소의 일반 방문자는 지금과 똑같다). 화면에 보이는 것은 없다.
// 기록은 이 브라우저 localStorage('sg-log:P1')에만 두고, 내보내기는 실험 페이지가 한다. 외부 요청은 하지 않는다.
// extension/ 코드는 고치지 않고 감싸서 듣는다. 목업이 engine.js를 불러온 직후 SGLOG.hook()을 부른다
//   (모드 파일보다 먼저 불러야 한다: practice.js가 불러올 때 SG.engine을 구조분해하고, 모드는 SG.register로 등록되므로)
// 모든 이벤트: { t: 시각(ms, Date.now), p: 참가자, seg: 현재 구간(없으면 null), type, ...내용 }
//   seg.start/seg.end · page.load · click · alert · screen · mode.start/mode.end/mode.error · tutorial.step
//   practice.apply · practice.queue · practice.queueClose · practice.result · tip
(() => {
  const params = new URLSearchParams(location.search);
  const param = params.get('log');
  if (param === null) return;

  // ---------- 저장 ----------
  const P = param.trim() || '미지정';
  const KEY = 'sg-log:' + P;
  let events = [];
  try { events = JSON.parse(localStorage.getItem(KEY)) || []; } catch {}
  // 새로고침해도 진행 중이던 구간을 이어 간다 (마지막 구간 기록에서 다시 계산)
  let seg = null;
  for (let i = events.length; i--;) {
    if (events[i].type === 'seg.start') { seg = events[i].name; break; }
    if (events[i].type === 'seg.end') break;
  }
  let saveTimer = 0;
  const save = () => {
    clearTimeout(saveTimer);
    saveTimer = 0;
    try { localStorage.setItem(KEY, JSON.stringify(events)); } catch (err) { console.warn('SGLOG: 기록을 저장하지 못했어요', err); }
  };
  const later = () => { saveTimer ||= setTimeout(save, 300); };
  addEventListener('pagehide', save);
  const log = (type, data = {}) => {
    const rec = { t: Date.now(), p: P, seg, type, ...data };
    events.push(rec);
    later();
    return rec;
  };
  // 구간 바꾸기 (null이면 끝내기만). 실험 페이지가 단계를 넘길 때 부른다
  const segment = name => {
    if (name === seg) return;
    if (seg) log('seg.end', { name: seg });
    seg = name || null;
    if (seg) log('seg.start', { name: seg });
    save();
  };
  // 실험 페이지가 단계를 열 때 주소로 구간을 넘긴다 (&seg=튜토리얼). 같은 단계를 다시 열면(새로고침) 그대로 이어 간다
  if (params.get('seg')) segment(params.get('seg'));

  // ---------- 화면 읽기 (확장이 꺼져 있어도 쓰므로 SG 없이) ----------
  const norm = s => (s || '').replace(/\s+/g, '');
  const screenName = () => document.querySelector('#hyinContents h3')?.textContent.trim() || '';
  // 누를 만한 요소. 그 밖(대화상자 배경, 빈 영역 등)을 누르면 안의 글자 전체가 라벨이 되지 않게 글자를 읽지 않는다
  const CONTROL = 'button, input, select, a, label, th, td, [data-act]';
  const labelOf = e => String((e.matches?.('input[type=button], input[type=submit]') ? e.value : '')
    || (e.matches?.(CONTROL) ? e.textContent?.trim() : '') || e.getAttribute?.('aria-label') || e.title || '').replace(/\s+/g, ' ').trim().slice(0, 60);
  const TRANSIENT = ['sg-hover', 'sg-lit']; // 자유 팁이 잠깐 붙이는 클래스
  const selectorOf = e => {
    const parts = [];
    for (let n = e; n?.nodeType === 1 && n !== document.body && parts.length < 4; n = n.parentElement) {
      if (n.id) { parts.unshift('#' + CSS.escape(n.id)); break; }
      let s = n.tagName.toLowerCase() + [...n.classList].filter(c => !TRANSIENT.includes(c)).slice(0, 2).map(c => '.' + CSS.escape(c)).join('');
      const same = n.parentElement ? [...n.parentElement.children].filter(c => c.tagName === n.tagName) : [];
      if (same.length > 1) s += `:nth-of-type(${same.indexOf(n) + 1})`;
      parts.unshift(s);
    }
    return parts.join(' > ');
  };
  // 표 행 안을 눌렀으면 그 행의 교과목명
  const courseOf = e => {
    const tr = e.closest?.('#gdMain tbody tr');
    if (!tr) return null;
    const i = [...tr.closest('table').querySelectorAll('thead th')].findIndex(th => norm(th.textContent) === '교과목명');
    return i >= 0 ? tr.cells[i]?.textContent.trim() || null : null;
  };

  // ---------- 클릭 ----------
  // window 캡처에서 가장 먼저 받는다 (확장의 클릭 차단 guard보다 먼저 등록됨). guard가 막으면 stopImmediatePropagation이라
  // document까지 내려가지 못하므로, document 캡처에 닿았는지로 막혔는지를 판단한다 (목업 자체가 preventDefault하는 링크도 있어서 defaultPrevented로는 못 가린다)
  // busy: 지금 처리 중인 누름 글자 또는 'Esc'. 모드가 끝난 방식(끝내기·그만하기·닫기 등)에 쓰고 다음 차례에 비운다
  let busy = null;
  const reached = new WeakSet();
  addEventListener('click', e => {
    if (!e.isTrusted) return; // 확장이 직접 누르는 메뉴 이동(goMenu) 등은 사람 클릭이 아니다
    const el = e.target.closest?.(CONTROL) || e.target;
    const label = labelOf(el);
    const rec = log('click', {
      label, selector: selectorOf(el), screen: screenName(), mode: window.SG?.mode ?? null,
      ext: !!el.closest?.('[data-sg]'), // 확장 화면(가짜 [신청]·말풍선·패널 등)을 누름
      course: courseOf(el), blocked: null,
    });
    if (el.closest?.('.sg-wait') && label === '닫기') log('practice.queueClose', { round });
    busy = label;
    setTimeout(() => { rec.blocked = !reached.has(e); busy = null; later(); });
  }, true);
  document.addEventListener('click', e => reached.add(e), true);
  addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    busy = 'Esc';
    setTimeout(() => { busy = null; });
  }, true);

  // 확장이 꺼져 있을 때 목업 자체 신청 결과 (사전 과제·확인 과제)
  const alert0 = window.alert;
  window.alert = msg => { log('alert', { text: String(msg) }); return alert0.call(window, msg); };

  // ---------- 화면 이동 · 튜토리얼 단계 ----------
  // 튜토리얼 단계는 진행 패널 글자('튜토리얼 3 / 17')로 잡는다 (progress.value는 속성이 아니라 관찰되지 않음)
  let lastScreen = null, lastStep = null;
  const watch = () => {
    const s = screenName();
    if (s !== lastScreen) { lastScreen = s; if (s) log('screen', { name: s }); }
    const c = document.querySelector('.sg-step-count')?.textContent ?? null;
    if (c === lastStep) return;
    lastStep = c;
    const m = c?.match(/(\d+)\s*\/\s*(\d+)/);
    if (m) log('tutorial.step', { n: +m[1], total: +m[2], done: c.includes('완료') });
  };

  // ---------- 확장 감싸기 ----------
  let hooked = false, round = 0, ending = null;
  const courseName = c => c?.label ?? c?.name ?? null;
  const hook = () => {
    if (hooked || !window.SG?.engine) return;
    hooked = true;
    const { engine } = SG;
    // 실전 재현의 신청 응답: practice.js가 서버에 닿은 신청마다 replay(...).at(-1)로 판정한다. 마지막 클릭이 방금 응답한 신청
    const replay0 = engine.replay;
    engine.replay = (courses, clicks, start = {}) => {
      const out = replay0(courses, clicks, start);
      const last = clicks.at(-1);
      if (last) log('practice.apply', { round, course: courseName(courses[last.course]), pressed: engine.clock(last.t), pressedSec: last.t, result: out.at(-1), lag: start.lag ?? null });
      return out;
    };
    // [결과 보기]: 결과 요약에 쓰는 summarize 결과 그대로 (마감 시각은 이번 연습의 배율을 곱한 값, 마감 안 되면 null)
    const summarize0 = engine.summarize;
    engine.summarize = (courses, clicks, start = {}) => {
      const out = summarize0(courses, clicks, start);
      log('practice.result', {
        round, lag: start.lag ?? null,
        rows: out.map((r, i) => ({ course: courseName(courses[i]), result: r.result, pressed: r.at === null ? null : engine.clock(r.at), pressedSec: r.at, arriveSec: r.arrive, closeSec: Number.isFinite(r.close) ? r.close : null })),
      });
      return out;
    };
    // 대기 화면 (practice.js enterQueue가 SG.dialog로 띄운다)
    const dialog0 = SG.dialog;
    SG.dialog = (props, ...rest) => {
      if (/\bsg-wait\b/.test(props?.className || '')) log('practice.queue', { round });
      return dialog0(props, ...rest);
    };
    // 자유 팁 말풍선
    const bubble0 = SG.bubble;
    SG.bubble = (target, spec = {}) => {
      if (SG.mode === 'tip') log('tip', { title: spec.title || '', label: labelOf(target), selector: selectorOf(target), screen: screenName() });
      return bubble0(target, spec);
    };
    // 모드 시작·종료. 종료 방식(how)은 그때 누른 버튼 글자(끝내기·그만하기·닫기·다시 하기 등)나 Esc.
    // core는 다른 모드를 시작할 때 이전 모드의 stop() 바로 다음에 새 모드의 start()를 부르므로, 같은 차례에 시작이 오면 '전환'으로 고친다
    const register0 = SG.register;
    SG.register = (name, mode) => {
      const start0 = mode.start, stop0 = mode.stop;
      mode.start = function (...args) {
        if (ending) { ending.to = name; if (ending.mode !== name) ending.how = '전환'; }
        if (name === 'practice') round = events.filter(e => e.type === 'mode.start' && e.mode === 'practice').length + 1;
        log('mode.start', { mode: name, ...(name === 'practice' && { round }) });
        const p = start0?.apply(this, args);
        p?.catch?.(err => log('mode.error', { mode: name, message: String(err?.message || err) }));
        return p;
      };
      mode.stop = function (...args) {
        const rec = ending = log('mode.end', { mode: name, how: busy || '기타' });
        queueMicrotask(() => { if (ending === rec) ending = null; });
        return stop0?.apply(this, args);
      };
      return register0(name, mode);
    };
  };

  // 실험 페이지(lab.js)가 부르는 것: 구간 바꾸기, 저장, 지금까지의 기록
  window.SGLOG = { hook, segment, save, get events() { return events; }, get seg() { return seg; } };
  document.addEventListener('DOMContentLoaded', () => {
    log('page.load', { url: location.pathname + location.search + location.hash, screen: screenName() });
    watch();
    new MutationObserver(watch).observe(document.body, { childList: true, subtree: true, characterData: true });
  });
})();
