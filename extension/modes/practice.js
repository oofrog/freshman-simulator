// 실전 재현 모드 (#8·#9·#29, 담당: 박태현)
// 희망수업의 [신청]을 가짜 버튼으로 바꾸고(이미 신청해서 버튼이 없는 행에도 넣음), 오른쪽 위에 밀리초까지 흐르는 서버 시계를 띄운다 (#29).
// 시계는 10:59:55.000에서 시작하고 11:00:00.000에 신청이 열린다. [신청]은 누른 시각에 지연을 더한 서버 도착 시각으로 판정해서
// 실제처럼 열리기 직전에 미리 눌러야 하고, 너무 일찍 누르면 기간이 아니라고 나온다.
// 지연과 과목별 마감 시각은 연습을 시작할 때마다 engine.js RANGE 안에서 새로 뽑는다 (정답 시각을 외우지 않게). 엔진은 뽑은 값을 받아 계산만 한다
// 시계 창은 실제 화면에 없는 연습용이다 (실제로는 네이비즘 같은 서버 시간 사이트를 다른 창에 띄워 놓고 본다).
// 실제 화면처럼 남은 자리는 보여 주지 않고, 마감 여부는 [신청]을 눌렀을 때 메시지로만 알려 준다.
// 시계 창의 [연습 끝내기]를 누르면 결과 요약(누른 과목만: 결과, 누른 시각, 마감까지 여유·늦음, 이번 지연)을 띄운다.
// 정원 말고도 같은 학수번호(다른 분반)·학점 초과·시간 중복이면 신청이 막힌다 (#6). 재수강은 지난 수강 기록이 없어 재현하지 않는다
// 마감 시각·신청 판정·결과 요약 계산·시계 글자는 화면과 분리된 engine.js (SG.engine)
// 메시지는 실제 화면의 "시스템 메시지"와 같은 모양으로 띄운다. 실제 화면 정리·아직 필요한 데이터: docs/real-screen.md
(() => {
  const LEAD = 5; // 시계를 신청이 열리기 몇 초 전부터 보여 줄지 (5초 → 10:59:55.000부터)
  const { RANGE, arrive, clock, closeOf, replay, summarize, queueAt, parseTimes } = SG.engine;
  const hms = t => clock(t).slice(0, 8); // '11:00:00' (밀리초 뺀 시계 글자)
  // 범위 [가장 작게, 가장 크게] 안에서 하나를 고른다. 엔진은 무작위를 쓰지 않으므로 연습을 시작할 때 여기서 한 번 뽑아 넘긴다
  const pick = ([lo, hi]) => lo + Math.random() * (hi - lo);

  // 신청 결과 문구는 서버가 보내 줘서 화면 코드에 없다. 실제 문구를 확인하기 전까지 임시.
  const MSG = {
    notOpen: '수강신청 기간이 아닙니다.',
    full: '정원이 초과되었습니다.',
    done: '수강신청이 완료되었습니다.',
    same: '이미 신청한 과목입니다.', // 같은 학수번호의 다른 분반을 신청했을 때도
    credit: max => `최대 신청학점(${max}학점)을 초과합니다.`,
    time: '이미 신청한 과목과 수업시간이 중복됩니다.',
    queueClosed: '499 : 닫기 버튼을 클릭했습니다.', // 실제 문구 (포털 신청 코드 + 넷퍼넬 Close 코드 499)
  };

  // 실제 [신청] 버튼의 클래스 (2026-10-14 실제 화면). 표에 [신청]이 하나도 없을 때만 쓴다
  const REAL_LOOK = { wrap: 'btn_common_wrap btn_blue_wrap btn_small_wrap', btn: 'btn_common btn_blue btn_small' };

  const CSS = `
    .sg-sys[data-sg]{position:fixed;inset:0;z-index:2147483645;font:inherit;color:inherit}
    .sg-sys .ui-widget-overlay{position:absolute;inset:0}
    .sg-sys .ui-dialog{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:300px}
    .sg-sys .ui-dialog-content{min-height:55px}
    .sg-wait[data-sg]{position:fixed;inset:0;z-index:2147483645;background:#0005;display:flex;align-items:center;justify-content:center}
    .sg-wait-box{width:320px;max-width:calc(100vw - 32px);background:#fff;border-radius:8px;padding:20px;text-align:center;box-shadow:0 8px 24px #0005}
    .sg-wait-box p{margin:8px 0}
    .sg-wait-track{height:8px;border-radius:4px;background:#e5e7eb;overflow:hidden}
    .sg-wait-bar{height:100%;background:#2563eb}
    .sg-wait-note{color:#b45309;font-size:12px}
    .sg-result[data-sg]{position:fixed;inset:0;z-index:2147483647;background:#0006;display:flex;align-items:center;justify-content:center}
    .sg-result .sg-box{background:#fff;border-radius:10px;padding:18px 20px;max-width:calc(100vw - 32px);max-height:calc(100vh - 32px);overflow:auto;box-shadow:0 8px 24px #0005}
    .sg-result p{margin:4px 0 8px}
    .sg-result table{border-collapse:collapse;white-space:nowrap}
    .sg-result th,.sg-result td{border:1px solid #ddd;padding:4px 8px;text-align:center;font-size:12px}
    .sg-result th{background:#f3f4f6}
    .sg-result td.done{color:#15803d;font-weight:bold}
    .sg-result td.full,.sg-result td.notOpen,.sg-result td.same,.sg-result td.credit,.sg-result td.time{color:#dc2626;font-weight:bold}
    .sg-clock[data-sg]{position:fixed;top:12px;right:12px;z-index:2147483646;background:#fff;border:1px solid #d1d5db;border-radius:10px;padding:10px 16px 12px;box-shadow:0 4px 16px #0003;text-align:center;user-select:none}
    .sg-clock-name{color:#6b7280;font-size:12px}
    .sg-clock-time{color:#111827;font:bold 32px/1.2 Consolas,Menlo,'Courier New',monospace;font-variant-numeric:tabular-nums}
    .sg-clock-time small{color:#2563eb;font-size:24px}
    .sg-clock-note{margin:2px 0 8px;color:#6b7280;font-size:12px}`;
  // 목업처럼 jQuery UI 테마 CSS가 없는 화면에서만 넣는다 (값은 실제 화면에서 잰 것)
  const FALLBACK = `
    .sg-sys .ui-widget-overlay{background:#aaa;opacity:.3}
    .sg-sys .ui-dialog{padding:.2em;border:1px solid #ddd;border-radius:4px;background:#eee;color:#333;font-family:나눔고딕,'맑은 고딕',dotum,sans-serif;font-size:1.1em;box-shadow:0 0 25px #666}
    .sg-sys .ui-dialog-titlebar{position:relative;padding:.4em 1em;border:1px solid #e78f08;border-radius:4px;background:#f6a828;color:#fff;font-weight:bold}
    .sg-sys .ui-dialog-title{display:block;margin:.1em 16px .1em 0}
    .sg-sys .ui-dialog-titlebar-close{position:absolute;right:.3em;top:50%;margin-top:-10px;width:19px;height:18px;line-height:18px;text-align:center;cursor:pointer}
    .sg-sys .ui-dialog-titlebar-close::before{content:'×'}
    .sg-sys .ui-icon{display:none}
    .sg-sys .ui-dialog-content{padding:0 10px;font-size:11px;line-height:160%;color:#222}
    .sg-sys .ui-dialog-buttonpane{margin-top:.5em;padding:.3em 1em .5em .4em;text-align:center}
    .sg-sys .ui-button{margin:1em -.5em .5em 0;padding:0;border:1px solid #ccc;border-radius:4px;background:#f6f6f6;font-weight:bold;cursor:pointer}
    .sg-sys .ui-button.ui-state-focus,.sg-sys .ui-button.ui-state-hover{border-color:#fbcb09;background:#fdf5ce}
    .sg-sys .ui-button-text{display:inline-block;padding:6px 10px;font-size:9pt;color:#656565}`;
  const hasTheme = () => [...document.styleSheets].some(sh => /jquery-ui/i.test(sh.href || ''));

  // 진행 중인 연습: { rows, clicks, extras, dialog, timer, openAt, done, queue, left, start, credits, creditBox, creditWas }
  // openAt: 신청이 열리는 performance.now 시각 (시계가 뜨기 전에는 0), timer: 시계를 다시 그리는 requestAnimationFrame 번호
  // clicks: 누른 기록 (엔진 replay·summarize 형식, t는 누른 시각), done: 결과 요약을 띄움
  // queue: 대기 화면 타이머 (0이면 대기 중 아님), left: [닫기]로 나온 줄에 섰던 시각 (없으면 null)
  // start: 엔진에 넘기는 { credits: 시작 때 신청학점, max: 최대학점, lag: 이번 연습의 지연 }, credits: 지금 신청학점, creditBox·creditWas: 신청학점 칸과 원래 값
  // rows의 각 과목은 이번 연습의 마감 배율(scale)을 가진다. 지연·배율은 [시작] 전에 한 번 뽑고 연습 중에는 바꾸지 않는다
  let s = null;

  const num = (tr, col) => parseInt((SG.cell(tr, col)?.textContent || '').replace(/\D/g, ''), 10);
  const text = (tr, col) => SG.cell(tr, col)?.textContent.trim() || '';
  const decimal = str => parseFloat(String(str).replace(/[^\d.]/g, '')); // 학점은 소수일 수도 있어 숫자·점만 남겨 읽는다
  const h = (tag, className, ...kids) => {
    const e = document.createElement(tag);
    e.className = className;
    e.append(...kids);
    return e;
  };

  // 가짜 [신청]: 실제 버튼과 같은 클래스라 페이지 CSS로 똑같이 보인다.
  // 실제 화면은 tbody에서 #btn_apply 클릭을 받아 진짜 신청을 보내므로, id는 붙이지 않고 클릭도 위로 올려 보내지 않는다.
  const fakeButton = (look, onClick) => {
    const btn = Object.assign(document.createElement('input'), { type: 'button', value: '신청', className: look.btn });
    btn.addEventListener('click', e => { e.stopPropagation(); onClick(); });
    return SG.el('span', { className: look.wrap }, btn);
  };
  // 실제 화면의 [신청]은 span.btn_common_wrap에 싸여 있다 (목업은 input만)
  const hostOf = real => real.parentElement.matches('span.btn_common_wrap') ? real.parentElement : real;
  const lookOf = real => ({ wrap: hostOf(real) === real ? '' : real.parentElement.className, btn: real.className.replace(/\{[^}]*\}/, '').trim() });

  // 실제 "시스템 메시지"(jQuery UI 대화상자)와 같은 구조·클래스. [확인]·✕·Enter·Esc로 닫힌다.
  // 대기 화면·결과창과 함께 core 모달(SG.dialog)로 띄워, 떠 있는 동안 Tab으로 뒤의 가짜 [신청]에 갈 수 없다
  const sysMessage = text => new Promise(done => {
    s.dialog?.remove();
    const ok = h('button', 'ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only', h('span', 'ui-button-text', '확인'));
    const x = h('a', 'ui-dialog-titlebar-close ui-corner-all', h('span', 'ui-icon ui-icon-closethick', 'close'));
    const close = () => { box.remove(); done(); };
    const box = SG.dialog({ className: 'sg-sys' }, [
      h('div', 'ui-widget-overlay'),
      h('div', 'ui-dialog ui-widget ui-widget-content ui-corner-all',
        h('div', 'ui-dialog-titlebar ui-widget-header ui-corner-all ui-helper-clearfix', h('span', 'ui-dialog-title', '시스템 메시지'), x),
        h('div', 'ui-dialog-content ui-widget-content', document.createElement('br'), text),
        h('div', 'ui-dialog-buttonpane ui-widget-content ui-helper-clearfix', h('div', 'ui-dialog-buttonset', ok)))], close);
    ok.type = 'button';
    ok.addEventListener('click', close);
    x.addEventListener('click', close);
    ok.addEventListener('focus', () => ok.classList.add('ui-state-focus'));
    ok.addEventListener('blur', () => ok.classList.remove('ui-state-focus'));
    ok.addEventListener('mouseenter', () => ok.classList.add('ui-state-hover'));
    ok.addEventListener('mouseleave', () => ok.classList.remove('ui-state-hover'));
    s.dialog = box;
    ok.focus();
  });

  // 신청이 열린 뒤 지난 시간(초). 열리기 전은 음수
  const elapsed = me => me.openAt ? (performance.now() - me.openAt) / 1000 : -Infinity;

  // 대기열을 통과해 서버에 도착한 신청. t는 누른 시각이고, 판정은 서버에 닿아 줄을 선 시각(arrive)으로 한다.
  // 기간 → 학수번호·학점·시간 → 정원 순서로 본다 (엔진 replay). 마감이나 막힌 신청은 실제 화면처럼 [신청]이 그대로 남는다
  const submit = (row, t) => {
    s.clicks.push({ course: s.rows.indexOf(row), t });
    const result = replay(s.rows, s.clicks, s.start).at(-1);
    if (result === 'done') {
      row.fake.style.display = 'none'; // 실제 화면도 신청에 성공하면 그 행의 [신청] 버튼을 숨기고
      s.credits += row.credit;          // 학점 칸을 서버 값으로 바꾼다
      if (s.creditBox) s.creditBox.value = String(s.credits);
    }
    const msg = MSG[result];
    return sysMessage(typeof msg === 'function' ? msg(s.start.max) : msg);
  };

  const waitText = sec => sec < 60 ? '1분 이내' : `${Math.ceil(sec / 60)}분`;

  // 대기 화면. 표시 항목(앞 대기 인원, 예상 시간, 진행률, 닫기)은 넷퍼넬 코드 기준이고, 모양과 글자는 실제 템플릿을 못 봐서 임시다.
  // 넷퍼넬 코드에는 뒤 대기 인원도 있지만, 실제 수강신청 화면에서 본 적이 없어 띄우지 않는다 (2026-11-18 팀원 기억)
  // 줄을 끝까지 기다려야 서버로 간다. [닫기]로 나오면 자리를 잃고, 다시 누르면 그 신청이 닿는 시각에 맨 뒤로 새로 선다. Esc로는 나가지 않는다 ([닫기]로만)
  // t·left는 누른 시각이고, 줄은 신청이 서버에 닿은 시각(arrive, 이번 연습의 지연)에 선다
  const enterQueue = (row, t, left) => {
    const me = s, reach = x => arrive(x, me.start.lag);
    const at = reach(t), first = queueAt(at).ahead, stayed = left === null ? first : queueAt(reach(left), at).ahead;
    const time = h('b', ''), ahead = h('b', ''), bar = h('div', 'sg-wait-bar');
    const leave = () => {
      clearTimeout(me.queue);
      me.queue = 0;
      me.left = t;
      sysMessage(MSG.queueClosed);
    };
    // 안내 문구는 실제 화면에 없는, 연습용으로 넣은 것
    const note = first > stayed ? [h('p', 'sg-wait-note', `[닫기]로 줄에서 나와 맨 뒤로 다시 섰어요. 그대로 기다렸다면 대기자 ${stayed}명이었는데 지금은 ${first}명입니다.`)] : [];
    me.dialog?.remove();
    const box = SG.dialog({ className: 'sg-wait' }, [
      h('div', 'sg-wait-box',
        h('b', '', '접속 대기 중입니다'),
        h('p', '', '예상 대기 시간 ', time),
        h('div', 'sg-wait-track', bar),
        h('p', '', '대기자 ', ahead, '명'),
        ...note,
        h('div', 'sg-row', SG.el('button', { className: 'sg-btn', textContent: '닫기', onclick: leave })))]);
    me.dialog = box;
    const tick = () => {
      const q = queueAt(at, elapsed(me));
      if (q.wait <= 0) {
        me.queue = 0;
        return submit(row, t);
      }
      time.textContent = waitText(q.wait);
      ahead.textContent = q.ahead;
      bar.style.width = `${q.progress}%`;
      me.queue = setTimeout(tick, 100);
    };
    tick();
  };

  // 실제 넷퍼넬도 줄이 돌고 있으면 다시 호출해도 아무 일 없이 끝난다 (순번이 늘지 않는다). 대기 화면이 덮어도 Enter로 다시 눌릴 수 있어 여기서 막는다
  const apply = row => {
    if (s.done || s.queue) return;
    const t = elapsed(s), left = s.left;
    s.left = null;
    return queueAt(arrive(t, s.start.lag)).wait > 0 ? enterQueue(row, t, left) : submit(row, t);
  };

  // 결과 요약: 누른 과목만 결과·누른 시각(시계 시각)·마감까지 여유·늦음. [다시 하기]는 처음부터(지연·마감도 새로 뽑음), [닫기]·Esc는 연습을 끝내고 화면을 되돌린다
  // [연습 끝내기]에 포커스가 남아 Enter·Space로 다시 눌릴 수 있으므로 한 번만 띄운다
  // 요약 줄: 성공·정원 초과는 늘, 너무 일찍 누름·학수번호·학점·시간으로 막힌 결과는 있을 때만. 그 뒤에 안 누른 과목 수와 이번 지연
  // 지연은 연습마다 달라서, 같은 시각에 눌렀는데 결과가 다른 이유를 알 수 있게 보여 준다. 마감도 매번 달라 여유·늦음을 보여 줘도 외울 수 없다
  const RESULT = { done: '성공', full: '정원 초과', notOpen: '기간 아님', same: '이미 신청', credit: '학점 초과', time: '시간 중복' };
  const ALWAYS = ['done', 'full'];
  const sec = x => `${x.toFixed(2)}초`;
  // 서버 도착 시각 기준 (판정이 그 시각으로 나므로). 여유·늦음은 자리를 두고 겨룬 결과(성공·정원 초과)에만, 막힌 신청과 마감되지 않는 과목은 비운다
  const gapText = r => r.result === 'notOpen' ? `${sec(-r.arrive)} 일찍`
    : r.close === Infinity || !['done', 'full'].includes(r.result) ? ''
      : r.close > r.arrive ? `${sec(r.close - r.arrive)} 여유` : `${sec(r.arrive - r.close)} 늦음`;
  const finish = me => {
    if (me.done) return;
    me.done = true;
    cancelAnimationFrame(me.timer); // 시계는 [연습 끝내기]를 누른 시각에 멈춘다
    clearTimeout(me.queue);
    me.queue = 0;
    me.dialog?.remove();
    const sum = summarize(me.rows, me.clicks, me.start).map((r, i) => ({ ...r, label: me.rows[i].label }));
    const pressed = sum.filter(r => r.result !== 'none');
    const count = k => sum.filter(r => r.result === k).length;
    const skipped = sum.length - pressed.length;
    const line = Object.keys(RESULT).filter(k => ALWAYS.includes(k) || count(k)).map(k => `${RESULT[k]} ${count(k)}`).join(' · ')
      + (skipped ? ` (안 누른 과목 ${skipped}개)` : '') + ` · 이번 지연 ${sec(me.start.lag)}`;
    const td = (text, className = '') => h('td', className, text);
    const table = h('table', '',
      h('thead', '', h('tr', '', ...['과목', '결과', '누른 시각', ''].map(t => h('th', '', t)))),
      h('tbody', '', ...pressed.map(r => h('tr', '', td(r.label), td(RESULT[r.result], r.result), td(clock(r.at)), td(gapText(r))))));
    const button = (text, onclick) => SG.el('button', { className: 'sg-btn', textContent: text, onclick });
    const box = SG.dialog({ className: 'sg-result' }, [
      h('div', 'sg-box',
        h('b', '', '연습 결과'),
        h('p', '', line),
        ...(pressed.length ? [table] : []),
        h('div', 'sg-row', button('다시 하기', () => SG.start('practice')), button('닫기', () => SG.stop())))], () => SG.stop());
    me.extras.push(box);
  };

  // 네이비즘식 서버 시계 창 (실제 화면에 없는 연습용). 10:59:55.000부터 밀리초까지 흐르고 11:00:00.000에 신청이 열린다.
  // 열리는 순간 따로 알려 주지 않는다: 실제처럼 시계만 보고 누른다. 그래서 [연습 끝내기]도 처음부터 띄워 둔다 (열릴 때 창 모양이 바뀌지 않게)
  // 상태 바는 쓰지 않는다 (start에서 SG.bar(false)). 시스템 메시지·대기 화면·결과창은 core 모달(SG.dialog)이라 항상 시계 위에 그려진다.
  // 그동안 시계는 반투명 배경 아래로 보이고 [연습 끝내기]는 눌리지 않는다 (모달을 닫은 뒤에 누른다. core 상태 바의 [끝내기]와 같은 규칙)
  const run = me => {
    me.openAt = performance.now() + LEAD * 1000;
    const time = h('span', ''), milli = h('small', '');
    const box = SG.el('div', { className: 'sg-clock' },
      h('div', 'sg-clock-name', '서버 시간'),
      h('div', 'sg-clock-time', time, milli),
      h('div', 'sg-clock-note', `${hms(0)}에 신청이 열려요`),
      SG.el('button', { className: 'sg-btn', textContent: '연습 끝내기', onclick: () => finish(me) }));
    document.body.append(box);
    me.extras.push(box);
    // 오른쪽 위에 두되 학점 칸(.hakjeom-area, 실제·목업 공통)은 가리지 않게 그 아래로 내린다. 신청에 성공하면 신청학점이 바뀌는 걸 봐야 해서
    // 맨 위로 스크롤했을 때의 학점 칸 위치(+ scrollY)를 기준으로 한다. [시작] 때 내려 둔 상태여도 다시 올리면 학점 칸을 가리지 않게
    // (창 스크롤 기준. 실제 포털이 안쪽 영역을 따로 스크롤하는지는 확인 못 함)
    const credits = document.querySelector('.hakjeom-area')?.getBoundingClientRect();
    const below = credits ? credits.bottom + scrollY + 12 : 12;
    box.style.top = `${Math.max(12, Math.min(below, innerHeight - box.offsetHeight - 12))}px`;
    // 화면을 그릴 때마다 (보통 1초에 60번) 새로 쓴다
    const tick = () => {
      const [a, b] = clock(elapsed(me)).split('.');
      time.textContent = a;
      milli.textContent = `.${b}`;
      me.timer = requestAnimationFrame(tick);
    };
    tick();
  };

  SG.register('practice', {
    label: '실전 재현',
    async start() {
      if (SG.screen() !== '희망수업') {
        SG.goMenu('희망수업');
        await SG.waitFor(() => SG.screen() === '희망수업' && SG.grid());
      }
      const me = s = { rows: [], clicks: [], extras: [], dialog: null, timer: 0, openAt: 0, done: false, queue: 0, left: null, creditBox: null };
      // 이번 연습의 지연. 요약에 0.01초 단위로 보여 주므로 그 단위로 맞춘다 (보이는 값과 판정 값이 같게)
      const lag = Math.round(pick(RANGE.lag) * 100) / 100;
      const trs = SG.rows();
      const sample = trs.map(tr => SG.findButton(tr, '신청')).find(Boolean);
      const look = sample ? lookOf(sample) : REAL_LOOK;
      for (const tr of trs) {
        const real = SG.findButton(tr, '신청');
        const cell = SG.cell(tr, '수강신청');
        if (!real && !cell) continue;
        const hope = num(tr, '희망인원'), cap = num(tr, '제한인원');
        const name = SG.cell(tr, '교과목명')?.textContent.trim() || '이 과목';
        const no = SG.cell(tr, '수업번호')?.textContent.trim();
        const row = {
          name,
          label: no ? `${name} (${no})` : name, // 결과 요약에서 같은 이름 과목(분반)을 구분
          hope, cap, // 마감 시각은 저장하지 않고 필요할 때 SG.engine closeOf로 계산한다 (판정·요약과 값이 어긋나지 않게)
          scale: pick(RANGE.close), // 이번 연습의 마감 배율 (과목마다 따로)
          // 신청이 막히는지 볼 값 (엔진 blocked). 열이 없으면 그 검사는 건너뛴다
          code: text(tr, '학수번호'),
          credit: decimal(text(tr, '학점')) || 0,
          times: parseTimes(text(tr, '수업시간')),
        };
        row.fake = fakeButton(look, () => apply(row));
        if (real) {
          row.host = hostOf(real);
          row.display = row.host.style.display;
          row.host.style.display = 'none';
          row.host.after(row.fake);
        } else {
          cell.append(row.fake);
        }
        // 기간 밖의 신청인원은 지난 신청 결과(대부분 꽉 참)라, 신청 시작 직전처럼 0으로 둔다. 실제 화면처럼 저절로 늘지 않는다
        row.count = SG.cell(tr, '신청인원');
        row.countWas = [...(row.count?.childNodes || [])];
        if (row.count) row.count.textContent = '0';
        me.rows.push(row);
      }
      if (!me.rows.length) throw new Error('희망수업에 신청할 과목이 없어요. 과목을 먼저 담아 주세요.');

      // 학점 칸 (실제·목업 공통 id, docs/selectors.md). 이미 신청해서 [신청]이 없던 행도 연습에서는 신청 전으로 되돌리므로
      // 지금 신청학점에서 그 학점을 뺀 값에서 시작한다. 최대학점을 못 읽으면 학점 검사는 하지 않는다
      const max = decimal(document.getElementById('edMaxHakjeom')?.value ?? '');
      me.creditBox = document.getElementById('edSincheongHakjeom');
      me.creditWas = me.creditBox?.value;
      const already = me.rows.filter(r => !r.host).reduce((sum, r) => sum + r.credit, 0);
      me.credits = Math.max(0, (decimal(me.creditWas ?? '') || 0) - already);
      me.start = { credits: me.credits, max: max > 0 ? max : Infinity, lag };
      if (me.creditBox) me.creditBox.value = String(me.credits);
      // 확인용 (화면에는 안 보임). 마감·지연은 연습마다 달라진다
      console.info(`실전 재현: 이번 지연 ${lag}초`);
      console.table(me.rows.map(r => {
        const close = closeOf(r);
        return { 과목: r.name, 희망: r.hope, 제한: r.cap, 배율: +r.scale.toFixed(2), '마감 (서버 도착 기준)': close === Infinity ? '마감 안 됨' : clock(close) };
      }));

      const style = SG.el('style', { textContent: CSS + (hasTheme() ? '' : FALLBACK) });
      document.head.append(style);
      me.extras.push(style);

      SG.bar(false); // 상태 바는 쓰지 않는다. 시계와 [연습 끝내기]는 [시작]을 누르면 뜨는 시계 창에 있다
      await SG.modal({
        title: '실전 재현',
        text: '희망수업의 [신청]으로 실제처럼 연습해요.\n'
          + `• 오른쪽 위 시계가 ${hms(-LEAD)}부터 흐르고, ${hms(0)}에 신청이 열려요.\n`
          + '• 누른 뒤 서버에 닿기까지 조금 걸려요. 정각에 맞춰 누르면 늦을 수 있어요.\n'
          + "• 너무 일찍 누르면 '기간 아님'이 나와요.\n"
          + '• 남은 자리는 안 보여요. 마감인지는 눌러 봐야 알아요.',
        buttons: ['시작'],
      });
      if (s === me) run(me);
    },
    stop() {
      if (!s) return;
      cancelAnimationFrame(s.timer);
      clearTimeout(s.queue);
      s.rows.forEach(r => {
        r.fake.remove();
        if (r.host) r.host.style.display = r.display;
        r.count?.replaceChildren(...r.countWas);
      });
      if (s.creditBox) s.creditBox.value = s.creditWas;
      s.extras.forEach(e => e.remove());
      s.dialog?.remove();
      s = null;
    },
    // Esc는 core가 맨 위 모달에 맞게 처리한다 (시스템 메시지는 닫고 연습은 계속, 대기 화면은 그대로, 결과창은 [닫기]와 같음)
  });
})();
