// 실전 재현 모드 (#8·#9, 담당: 박태현)
// 희망수업의 [신청]을 가짜 버튼으로 바꾸고(이미 신청해서 버튼이 없는 행에도 넣음), 카운트다운 뒤 신청이 열린다.
// 실제 화면처럼 남은 자리는 보여 주지 않고, 마감 여부는 [신청]을 눌렀을 때 메시지로만 알려 준다.
// 시작 배너 옆의 [연습 끝내기]를 누르면 결과 요약(과목별 성공·실패, 플랜 B 전환 시간)을 띄운다.
// 마감 시각·신청 판정·결과 요약 계산은 화면과 분리된 engine.js (SG.engine)
// 메시지는 실제 화면의 "시스템 메시지"와 같은 모양으로 띄운다. 실제 화면 정리·아직 필요한 데이터: docs/real-screen.md
(() => {
  const COUNTDOWN = 5; // 시작 전 카운트다운(초)
  const { closeSec, judge, summarize } = SG.engine;

  // 신청 결과 문구는 서버가 보내 줘서 화면 코드에 없다. 실제 문구를 확인하기 전까지 임시.
  const MSG = {
    notOpen: '수강신청 기간이 아닙니다.',
    full: '정원이 초과되었습니다.',
    done: '수강신청이 완료되었습니다.',
  };

  // 실제 [신청] 버튼의 클래스 (2026-10-14 실제 화면). 표에 [신청]이 하나도 없을 때만 쓴다
  const REAL_LOOK = { wrap: 'btn_common_wrap btn_blue_wrap btn_small_wrap', btn: 'btn_common btn_blue btn_small' };

  const CSS = `
    .sg-count{position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:2147483646;background:#111827;color:#fff;border-radius:8px;padding:8px 18px;font-size:15px;font-weight:bold;box-shadow:0 4px 12px #0004}
    .sg-sys[data-sg]{position:fixed;inset:0;z-index:2147483645;font:inherit;color:inherit}
    .sg-sys .ui-widget-overlay{position:absolute;inset:0}
    .sg-sys .ui-dialog{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:300px}
    .sg-sys .ui-dialog-content{min-height:55px}
    .sg-count .sg-btn{margin-left:12px;background:#fff;color:#111827;font-weight:bold}
    .sg-result[data-sg]{position:fixed;inset:0;z-index:2147483647;background:#0006;display:flex;align-items:center;justify-content:center}
    .sg-result .sg-box{background:#fff;border-radius:10px;padding:18px 20px;max-width:calc(100vw - 32px);max-height:calc(100vh - 32px);overflow:auto;box-shadow:0 8px 24px #0005}
    .sg-result p{margin:4px 0 8px}
    .sg-result table{border-collapse:collapse;white-space:nowrap}
    .sg-result th,.sg-result td{border:1px solid #ddd;padding:4px 8px;text-align:center;font-size:12px}
    .sg-result th{background:#f3f4f6}
    .sg-result td.done{color:#15803d;font-weight:bold}
    .sg-result td.full{color:#dc2626;font-weight:bold}
    .sg-result td.none{color:#888}`;
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

  // 진행 중인 연습: { rows, clicks, extras, dialog, timer, openAt, done }
  // openAt: 신청이 열리는 performance.now 시각 (카운트다운 전에는 0), clicks: 누른 기록 (엔진 summarize 형식), done: 결과 요약을 띄움
  let s = null;

  const num = (tr, col) => parseInt((SG.cell(tr, col)?.textContent || '').replace(/\D/g, ''), 10);
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

  // 실제 "시스템 메시지"(jQuery UI 대화상자)와 같은 구조·클래스. [확인]·✕·Enter로 닫힌다
  const sysMessage = text => new Promise(done => {
    s.dialog?.remove();
    const ok = h('button', 'ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only', h('span', 'ui-button-text', '확인'));
    const x = h('a', 'ui-dialog-titlebar-close ui-corner-all', h('span', 'ui-icon ui-icon-closethick', 'close'));
    const box = SG.el('div', { className: 'sg-sys' },
      h('div', 'ui-widget-overlay'),
      h('div', 'ui-dialog ui-widget ui-widget-content ui-corner-all',
        h('div', 'ui-dialog-titlebar ui-widget-header ui-corner-all ui-helper-clearfix', h('span', 'ui-dialog-title', '시스템 메시지'), x),
        h('div', 'ui-dialog-content ui-widget-content', document.createElement('br'), text),
        h('div', 'ui-dialog-buttonpane ui-widget-content ui-helper-clearfix', h('div', 'ui-dialog-buttonset', ok))));
    const close = () => { box.remove(); done(); };
    ok.type = 'button';
    ok.addEventListener('click', close);
    x.addEventListener('click', close);
    ok.addEventListener('focus', () => ok.classList.add('ui-state-focus'));
    ok.addEventListener('blur', () => ok.classList.remove('ui-state-focus'));
    ok.addEventListener('mouseenter', () => ok.classList.add('ui-state-hover'));
    ok.addEventListener('mouseleave', () => ok.classList.remove('ui-state-hover'));
    document.body.append(box);
    s.dialog = box;
    ok.focus();
  });

  // 신청이 열린 뒤 지난 시간(초). 열리기 전은 음수
  const elapsed = me => me.openAt ? (performance.now() - me.openAt) / 1000 : -Infinity;

  // 마감 여부는 누른 순간의 시각으로 정한다. 마감이면 실제 화면처럼 [신청]이 그대로 남는다
  const apply = row => {
    if (s.done) return;
    const t = elapsed(s);
    s.clicks.push({ course: s.rows.indexOf(row), t });
    const result = judge(row.hope, row.cap, t);
    if (result === 'done') row.fake.style.display = 'none'; // 실제 화면도 신청에 성공하면 그 행의 [신청] 버튼을 숨긴다
    return sysMessage(MSG[result]);
  };

  // 결과 요약: 과목마다 결과·누른 시각·마감·차이·플랜 B 전환 시간. [다시 하기]는 처음부터, [닫기]는 연습을 끝내고 화면을 되돌린다
  const RESULT = { done: '성공', full: '정원 초과', none: '안 누름' };
  const sec = x => `${x.toFixed(2)}초`;
  const finish = me => {
    me.done = true;
    clearTimeout(me.timer);
    me.dialog?.remove();
    const sum = summarize(me.rows, me.clicks);
    const count = k => sum.filter(r => r.result === k).length;
    const td = (text, className = '') => h('td', className, text);
    const lines = sum.map((r, i) => {
      const gap = r.at === null || r.close === Infinity ? '—' : r.close > r.at ? `${sec(r.close - r.at)} 여유` : `${sec(r.at - r.close)} 늦음`;
      const planB = r.result !== 'full' ? '—' : r.planB === null ? '안 바꿈' : sec(r.planB);
      return h('tr', '', td(me.rows[i].label), td(RESULT[r.result], r.result), td(r.at === null ? '—' : sec(r.at)),
        td(r.close === Infinity ? '안 참' : sec(r.close)), td(gap), td(planB));
    });
    const button = (text, onclick) => SG.el('button', { className: 'sg-btn', textContent: text, onclick });
    const box = SG.el('div', { className: 'sg-result' },
      h('div', 'sg-box',
        h('b', '', '연습 결과'),
        h('p', '', `성공 ${count('done')}과목 · 정원 초과 ${count('full')}과목 · 안 누름 ${count('none')}과목`),
        h('table', '',
          h('thead', '', h('tr', '', ...['과목', '결과', '누른 시각 (시작 후)', '마감', '차이', '플랜 B 전환'].map(t => h('th', '', t)))),
          h('tbody', '', ...lines)),
        h('div', 'sg-row', button('다시 하기', () => SG.start('practice')), button('닫기', () => SG.stop()))));
    document.body.append(box);
    me.extras.push(box);
  };

  const run = me => {
    const banner = SG.el('div', { className: 'sg-count' });
    document.body.append(banner);
    me.extras.push(banner);
    me.openAt = performance.now() + COUNTDOWN * 1000;
    // 숫자가 바뀌는 순간에 맞춰 다시 부른다. 인기 과목은 0.3초쯤에 마감되므로 '시작!'이 늦게 뜨면 안 된다
    const tick = () => {
      const t = elapsed(me);
      if (t >= 0) {
        banner.textContent = '수강신청 시작!';
        banner.append(SG.el('button', { className: 'sg-btn', textContent: '연습 끝내기', onclick: () => finish(me) }));
        return;
      }
      banner.textContent = `수강신청 시작까지 ${Math.ceil(-t)}초`;
      me.timer = setTimeout(tick, (-t % 1 || 1) * 1000 + 1);
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
      const me = s = { rows: [], clicks: [], extras: [], dialog: null, timer: 0, openAt: 0, done: false };
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
          hope, cap,
          closeSec: closeSec(hope, cap),
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
      console.table(me.rows.map(r => ({ 과목: r.name, 희망: r.hope, 제한: r.cap, '마감(초)': r.closeSec === Infinity ? '마감 안 됨' : +r.closeSec.toFixed(1) })));

      const style = SG.el('style', { textContent: CSS + (hasTheme() ? '' : FALLBACK) });
      document.head.append(style);
      me.extras.push(style);

      await SG.modal({
        title: '실전 재현',
        text: `희망수업의 [신청] 버튼으로 실제처럼 연습합니다.\n[시작]을 누르면 ${COUNTDOWN}초 뒤에 신청이 열려요.\n실제처럼 남은 자리는 보이지 않고, 마감 여부는 [신청]을 눌러야 알 수 있어요.`,
        buttons: ['시작'],
      });
      if (s === me) run(me);
    },
    stop() {
      if (!s) return;
      clearTimeout(s.timer);
      s.rows.forEach(r => {
        r.fake.remove();
        if (r.host) r.host.style.display = r.display;
        r.count?.replaceChildren(...r.countWas);
      });
      s.extras.forEach(e => e.remove());
      s.dialog?.remove();
      s = null;
    },
    escape() { s?.dialog?.remove(); }, // Esc는 시스템 메시지만 닫고 연습은 계속
  });
})();
