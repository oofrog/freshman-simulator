// 실전 재현 엔진 (#8·#9, 담당: 박태현) — 과목별 마감 시각·남은 자리 계산, 신청 판정, 결과 요약. 화면을 읽지 않는 순수 함수만 둔다.
// 같은 입력이면 항상 같은 결과 (무작위·현재 시각을 쓰지 않음). 판정 스크립트: test/engine.test.js, test/summary.test.js
// 브라우저에서는 SG.engine, 판정 스크립트(node)에서는 require로 쓴다.
(() => {
  // 희망자가 전부 신청하지는 않는다 (플랜 B로 담아 둔 사람, 다른 과목을 먼저 잡은 사람 등).
  // 실제로 신청하는 인원 = 희망인원 × show. 이 인원이 제한인원 이하면 마감되지 않는다 (예: 정원 50에 희망 55)
  // 신청하는 사람은 두 무리로 나눈다.
  // - burst 비율: 시작하자마자 몰리는 사람. fast초마다 남은 사람의 절반이 신청을 마친다 → 인기 과목은 순식간에 마감
  // - 나머지: 플랜 B로 넘어오거나 늦게 누른 사람. slow초마다 절반 → 경쟁률이 낮은 과목은 한참 버틴다
  // 모두 근거 데이터가 없는 임시값 (정원 20·희망 100이 0.3초쯤에 마감된다는 팀원 감각에 맞춤).
  // 실제 자료가 생기면 이 값만 고친다 (docs/real-screen.md "아직 필요한 데이터" 1번).
  // - show: 꽉 차지 않은 과목의 최종 신청인원 ÷ 희망인원 평균
  // - burst·fast·slow: 과목별 실제 마감(초)에 맞춘다. 인기 과목의 마감 시각으로 fast, 경쟁률 낮은 과목으로 slow
  const MODEL = { show: 0.8, burst: 0.7, fast: 0.45, slow: 20 };

  // 시작 후 t초까지 신청할 사람 중 신청을 마친 몫 (0에서 1로 늘어난다)
  const doneBy = t => MODEL.burst * (1 - 2 ** (-t / MODEL.fast)) + (1 - MODEL.burst) * (1 - 2 ** (-t / MODEL.slow));

  // 시작 후 몇 초에 마감되는지. 마감되지 않으면 Infinity, 제한 0이면 처음부터 마감.
  // 경쟁률이 높을수록 빠르다. 희망·제한 대신 그 비율로 계산해서 경쟁률이 같은 과목은 정확히 같은 시각에 마감된다
  const closeSec = (hope, cap) => {
    if (cap <= 0) return 0;
    const fill = cap / hope / MODEL.show; // 신청할 사람 중 자리를 얻는 몫. 1 이상이면 다 들어가서 마감되지 않는다
    if (!(fill < 1)) return Infinity;
    // doneBy(t) = fill인 t를 이분법으로 찾는다 (반복 횟수가 정해져 있어 같은 입력이면 같은 결과)
    let lo = 0, hi = MODEL.fast;
    for (let i = 0; i < 64 && doneBy(hi) < fill; i++) hi *= 2;
    if (doneBy(hi) < fill) return Infinity; // 소수점 한계까지 가도 안 차면 마감되지 않는 것으로 본다
    for (let i = 0; i < 80; i++) {
      const mid = (lo + hi) / 2;
      if (doneBy(mid) < fill) lo = mid; else hi = mid;
    }
    return hi;
  };

  // 시작 후 t초의 남은 자리 (t ≤ 0은 시작 전). closeSec 전에는 1 이상, closeSec부터 0이 되도록 맞춘다
  // 실제 화면은 남은 자리를 보여 주지 않으므로 화면(연습 중·결과 요약)에서는 쓰지 않는다. 지금은 판정 스크립트(test/engine.test.js)에서만 쓴다
  const seatsLeft = (hope, cap, t) => {
    if (cap <= 0 || t >= closeSec(hope, cap)) return 0;
    if (t <= 0) return cap;
    return cap - Math.min(cap - 1, Math.floor(hope * MODEL.show * doneBy(t)));
  };

  // 시작 후 t초에 [신청]을 눌렀을 때의 결과: 'notOpen'(시작 전) · 'full'(정원 초과) · 'done'(성공).
  // 화면(practice.js)과 결과 요약이 같은 판정을 쓴다
  const judge = (hope, cap, t) => t < 0 ? 'notOpen' : t >= closeSec(hope, cap) ? 'full' : 'done';

  // 연습 결과 요약. courses: [{ hope, cap }], clicks: [{ course: courses의 번호, t: 시작 후 초 }] (누른 순서대로)
  // 과목마다 { result: 'done'·'full'·'none'(안 누름), at: 처음 누른 시각, close: 마감 시각 } 를 courses 순서대로 돌려준다.
  // 시작 전 클릭은 결과에 넣지 않는다. 마감 전에 누르면 성공하고 [신청]이 사라지므로 처음 누른 클릭이 결과를 정한다.
  const summarize = (courses, clicks) => courses.map(({ hope, cap }, i) => {
    const close = closeSec(hope, cap);
    const first = clicks.find(k => k.course === i && k.t >= 0);
    if (!first) return { result: 'none', at: null, close };
    return { result: judge(hope, cap, first.t), at: first.t, close };
  });

  // 대기열(넷퍼넬) 임시값. 실제 대기 시간 자료가 없어 근거 없음 (docs/real-screen.md "아직 필요한 데이터" 3번). 자료가 생기면 이 값만 고친다
  // - crowd: 신청을 시작하는 전체 인원 (MODEL의 doneBy 곡선대로 줄에 선다)
  // - drain: 1초에 줄을 통과하는 인원
  const QUEUE = { crowd: 3000, drain: 300 };

  // 시작 후 t초까지 줄에 선 사람 수
  const arrived = t => t <= 0 ? 0 : QUEUE.crowd * doneBy(t);

  // 시작 후 t초에 줄을 선 사람이 now초에 보는 대기 화면 값.
  // { ahead: 앞 대기 인원, behind: 뒤 대기 인원, wait: 남은 시간(초), progress: 진행률(0~100) }. 시작 전이나 줄이 없으면 wait는 0
  // 줄은 먼저 선 순서대로 빠지므로 뒤에 선 사람은 앞사람보다 먼저 빠지지 않는다. 그래서 판정은 대기가 끝난 시각이 아니라 줄을 선 시각(judge의 t)으로 한다
  const queueAt = (t, now = t) => {
    const line = Math.max(0, arrived(t) - QUEUE.drain * Math.max(t, 0)); // 줄을 선 순간의 앞 인원 (소수)
    const start = Math.ceil(line);
    if (!start) return { ahead: 0, behind: 0, wait: 0, progress: 100 };
    const ahead = Math.max(0, Math.ceil(line - QUEUE.drain * (now - t)));
    return { ahead, behind: Math.round(arrived(now) - arrived(t)), wait: ahead / QUEUE.drain, progress: Math.floor(100 * (1 - ahead / start)) };
  };

  const engine = { MODEL, QUEUE, closeSec, seatsLeft, judge, summarize, queueAt };
  if (globalThis.SG) SG.engine = engine;
  else module.exports = engine;
})();
