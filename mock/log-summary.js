// 사용자 테스트 기록 요약 (#42) — log.js가 남긴 이벤트로 요약 CSV를 만든다. 화면을 읽지 않는 순수 함수라 node에서도 쓴다 (test/log.test.js)
// 브라우저(lab.html)에서는 SGLOG_SUMMARY, node에서는 require로 쓴다
(() => {
  const SEGMENTS = ['사전 과제', '튜토리얼', '확인 과제', '실전 재현', '자유 팁 과제'];
  const RESULT = { done: '성공', full: '정원 초과', notOpen: '기간 아님', same: '이미 신청', credit: '학점 초과', time: '시간 중복', none: '안 누름' };
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  // 시각(ms) → '14:03:21.045' (이 컴퓨터 시간대)
  const hms = t => { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`; };
  const sec = ms => +(ms / 1000).toFixed(1);

  // 줄마다 [구분, 번호, 항목, 값, 비고]. 구간 시간, 튜토리얼 단계별 시간·이전 횟수·완주, 실전 재현 회차별 표, 막힌 클릭 수
  const summary = events => {
    const out = [['구분', '번호', '항목', '값', '비고']];
    const end = events.at(-1)?.t ?? 0;

    // 구간: 시작부터 끝(끝이 없으면 마지막 기록)까지
    let open = null, segNo = 0;
    const closeSeg = t => { out.push(['구간', ++segNo, open.name, sec(t - open.t), `${hms(open.t)}~${hms(t)}`]); open = null; };
    for (const e of events) {
      if (e.type === 'seg.start') { if (open) closeSeg(e.t); open = e; }
      if (e.type === 'seg.end' && open) closeSeg(e.t);
    }
    if (open) closeSeg(end);

    // 튜토리얼: 시작(mode.start)부터 끝(mode.end)까지를 한 번으로. 단계 시간 = 다음 단계(또는 완료·끝)까지
    let run = null, runNo = 0;
    const closeRun = t => {
      const steps = run.steps;
      steps.forEach((s, i) => { if (!s.done) out.push(['튜토리얼', runNo, `${s.n}단계`, sec((steps[i + 1]?.t ?? t) - s.t), '']); });
      const back = steps.filter((s, i) => i && !s.done && s.n < steps[i - 1].n).length;
      const last = steps.filter(s => !s.done).at(-1);
      out.push(['튜토리얼', runNo, '결과', steps.some(s => s.done) ? '완주' : '중단',
        `이전 ${back}회 · 마지막 단계 ${last ? `${last.n}/${last.total}` : '-'} · 걸린 시간 ${sec(t - run.t)}초`]);
      run = null;
    };
    for (const e of events) {
      if (e.type === 'mode.start' && e.mode === 'tutorial') { if (run) closeRun(e.t); run = { t: e.t, steps: [] }; runNo++; }
      if (e.type === 'tutorial.step' && run) run.steps.push(e);
      // 새로고침·다음 단계로 페이지가 바뀌면 mode.end 없이 끝난다 → 다음 page.load에서 끊는다
      if (run && ((e.type === 'mode.end' && e.mode === 'tutorial') || e.type === 'page.load')) closeRun(e.t);
    }
    if (run) closeRun(end);

    // 실전 재현: 회차마다 결과 요약 표 (결과 보기를 안 눌렀으면 누른 기록만)
    const rounds = [...new Set(events.filter(e => e.round).map(e => e.round))];
    for (const r of rounds) {
      const of = type => events.filter(e => e.type === type && e.round === r);
      const result = of('practice.result').at(-1);
      const applies = of('practice.apply');
      out.push(['실전 재현', r, '신청 응답 수', applies.length,
        `대기 화면 ${of('practice.queue').length}회 · [닫기] ${of('practice.queueClose').length}회 · 결과 보기 ${result ? '함' : '안 함'}`]);
      if (result) {
        out.push(['실전 재현', r, '이번 지연(초)', result.lag ?? '', '']);
        for (const row of result.rows.filter(x => x.result !== 'none')) {
          const gap = row.result === 'notOpen' ? `${(-row.arriveSec).toFixed(2)}초 일찍`
            : row.closeSec === null || !['done', 'full'].includes(row.result) ? ''
              : row.closeSec > row.arriveSec ? `${(row.closeSec - row.arriveSec).toFixed(2)}초 여유` : `${(row.arriveSec - row.closeSec).toFixed(2)}초 늦음`;
          out.push(['실전 재현', r, row.course, RESULT[row.result] || row.result, `누른 시각 ${row.pressed}${gap ? ` · ${gap}` : ''}`]);
        }
      } else {
        for (const a of applies) out.push(['실전 재현', r, a.course, RESULT[a.result] || a.result, `누른 시각 ${a.pressed}`]);
      }
    }

    // 클릭: 전체와 구간별 막힌 클릭 (확장에 막힌 페이지 클릭)
    const clicks = events.filter(e => e.type === 'click');
    out.push(['클릭', '', '막힌 클릭', clicks.filter(c => c.blocked).length, `전체 클릭 ${clicks.length}`]);
    for (const name of SEGMENTS) {
      const here = clicks.filter(c => c.seg === name);
      if (here.length) out.push(['클릭', name, '막힌 클릭', here.filter(c => c.blocked).length, `전체 클릭 ${here.length}`]);
    }
    const tips = events.filter(e => e.type === 'tip');
    if (tips.length) out.push(['자유 팁', '', '팁 본 횟수', tips.length, `서로 다른 팁 ${new Set(tips.map(x => x.title)).size}개`]);
    return out;
  };
  const csv = rows => rows.map(r => r.map(v => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',')).join('\n');

  const api = { summary, csv, SEGMENTS };
  if (typeof window === 'undefined') module.exports = api;
  else window.SGLOG_SUMMARY = api;
})();
