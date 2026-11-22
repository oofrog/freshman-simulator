// 실전 재현 엔진 (#8·#9·#29, 담당: 박태현) — 과목별 마감 시각·남은 자리 계산, 신청 판정(정원·학점·시간·학수번호), 결과 요약. 화면을 읽지 않는 순수 함수만 둔다.
// 같은 입력이면 항상 같은 결과 (무작위·현재 시각을 쓰지 않음). 연습마다 흔드는 값(지연·마감 배율)은 화면(practice.js)이 RANGE에서 뽑아 넘긴다.
// 판정 스크립트: test/engine.test.js, test/summary.test.js, test/fail.test.js, test/clock.test.js
// 브라우저에서는 SG.engine, 판정 스크립트(node)에서는 require로 쓴다.
// 시각은 모두 '신청이 열린 뒤 몇 초'로 센다 (열리기 전은 음수). [신청]을 누른 시각과 서버에 닿은 시각은 지연(lag)만큼 다르다
(() => {
  // 연습마다 흔드는 값의 범위 [가장 작게, 가장 크게]. 화면이 연습을 시작할 때 이 안에서 하나씩 뽑아 엔진에 넘긴다.
  // 늘 같은 값이면 몇 번 만에 "10:59:59.800에 누르면 된다", "이 과목은 0.333초까지 된다" 같은 정답을 외우게 된다.
  // 실제로는 그날 내 지연도, 과목이 언제 차는지도 정확히 모르니 여유를 두고 눌러야 한다.
  // 둘 다 근거 없는 임시값이다 (docs/real-screen.md "아직 필요한 데이터" 1·9번). 자료가 생기면 이 값만 고친다
  // - lag: [신청]을 누른 순간부터 서버에 닿기까지 걸리는 시간(초). 사람들이 10:59:59.800쯤 미리 누른다는 경험(0.2초쯤)이 범위 안에 들게 했다
  // - close: 과목별 마감 시각 배율 (closeSec에 곱한다). 0.7~1.3이면 ±30%
  const RANGE = { lag: [0.1, 0.4], close: [0.7, 1.3] };

  // t초에 누른 신청이 서버에 닿는 시각 (lag: 이번 연습의 지연, 없으면 0). 기간·정원 판정과 대기열 줄 서기는 모두 이 시각으로 한다
  const arrive = (t, lag = 0) => t + lag;

  // 신청이 열리는 시각 (자정부터 초). 수강신청은 보통 오전 11시에 열린다 (학교 공지로는 확인 안 함 → docs/real-screen.md "아직 필요한 데이터" 5번)
  const OPEN = 11 * 3600;

  // 열린 뒤 t초를 시계 글자로: 0 → '11:00:00.000', -0.2 → '10:59:59.800'. 밀리초 아래는 버린다 (시계가 미리 넘어가지 않게).
  // 소수점 오차로 0.57초가 569.999…밀리초가 되지 않도록 마이크로초에서 한 번 반올림한 뒤 버린다
  const clock = t => {
    const ms = Math.floor(Math.round((OPEN + t) * 1e6) / 1e3);
    const day = ((ms % 86400000) + 86400000) % 86400000;
    const pad = (n, w = 2) => String(n).padStart(w, '0');
    return `${pad(Math.floor(day / 3600000))}:${pad(Math.floor(day / 60000) % 60)}:${pad(Math.floor(day / 1000) % 60)}.${pad(day % 1000, 3)}`;
  };

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

  // 이번 연습에서 과목 c가 마감되는 시각. c: { hope, cap, scale: 마감 배율 (RANGE.close에서 뽑은 값, 없으면 1) }
  // 화면에서 쓰는 마감은 모두 이것으로 계산한다 (seatsLeft는 화면에서 안 써서 배율 없이 closeSec 기준)
  const closeOf = c => closeSec(c.hope, c.cap) * (c.scale ?? 1);

  // 신청이 시작 후 t초에 서버에 닿았을 때의 자리 판정: 'notOpen'(시작 전) · 'full'(정원 초과) · 'done'(성공). c는 closeOf와 같다.
  // t는 누른 시각이 아니라 서버 도착 시각(arrive). 학점·시간·학수번호까지 보는 신청 판정은 replay (누른 시각을 받아 arrive로 바꾼다)
  const judge = (c, t) => t < 0 ? 'notOpen' : t >= closeOf(c) ? 'full' : 'done';

  // 수업시간 글자 → [{ day, from, to }] (시각은 자정부터 분). 실제는 '금(09:00-10:30),금(10:30-12:00)'처럼 쉼표로,
  // 목업은 공백(화면 글자로는 붙어 있음)으로 나눠서, 구분자 대신 '요일(시각-시각)'만 골라 읽는다. 시간이 없는 과목은 []
  const parseTimes = text => [...String(text || '').matchAll(/([월화수목금토일])\s*\(\s*(\d{1,2}):(\d{2})\s*[-~]\s*(\d{1,2}):(\d{2})\s*\)/g)]
    .map(([, day, h1, m1, h2, m2]) => ({ day, from: h1 * 60 + +m1, to: h2 * 60 + +m2 }));

  // 두 수업시간이 겹치는지. 앞 수업이 끝나는 시각에 시작하면 겹치지 않는다 (10:30 끝 → 10:30 시작)
  const clash = (a = [], b = []) => a.some(x => b.some(y => x.day === y.day && x.from < y.to && y.from < x.to));

  // 자리와 상관없이 신청이 막히는 이유: 'same'(같은 학수번호를 이미 신청 — 다른 분반 포함) · 'credit'(최대학점 초과) · 'time'(시간 중복). 없으면 null
  // course·mine의 과목: { code: 학수번호, credit: 학점, times: parseTimes 결과 }, mine: 이미 신청에 성공한 과목, credits: 지금 신청학점
  // 실제 서버가 어떤 순서로 보는지는 모른다 (임시). 막히는 이유를 자리(정원)보다 먼저 본다
  const blocked = (course, mine, credits, max) =>
    course.code && mine.some(c => c.code === course.code) ? 'same'
      : credits + (course.credit || 0) > max ? 'credit'
        : mine.some(c => clash(c.times, course.times)) ? 'time' : null;

  // 누른 기록을 처음부터 따라가며 클릭마다 신청 결과를 낸다: 'notOpen' · 'same' · 'credit' · 'time' · 'full' · 'done'.
  // 성공한 과목만 신청학점·시간표에 들어간다. 화면(practice.js)과 결과 요약이 이 함수 하나로 판정한다
  // courses: [{ hope, cap, scale, code, credit, times }], clicks: [{ course: courses의 번호, t: 누른 시각 (시작 후 초) }] (누른 순서대로)
  // 판정은 서버 도착 시각(arrive)으로 한다: 열리기 직전에 눌러도 열린 뒤에 닿으면 신청되고, 열린 순간에 눌러도 그사이 마감되면 정원 초과
  // start: { credits: 연습을 시작할 때의 신청학점, max: 최대학점 (없으면 학점 제한 없음), lag: 이번 연습의 지연 (없으면 0) }
  const replay = (courses, clicks, start = {}) => {
    const mine = [];
    let credits = start.credits || 0;
    return clicks.map(({ course, t }) => {
      const c = courses[course], at = arrive(t, start.lag);
      const result = at < 0 ? 'notOpen' : blocked(c, mine, credits, start.max ?? Infinity) || judge(c, at);
      if (result === 'done') {
        mine.push(c);
        credits += c.credit || 0;
      }
      return result;
    });
  };

  // 연습 결과 요약. courses·clicks·start는 replay와 같다.
  // 과목마다 { result: replay의 결과 또는 'none'(안 누름), at: 누른 시각, arrive: 서버 도착 시각, close: 이번 연습의 마감 시각(closeOf) } 를 courses 순서대로 돌려준다
  // (안 누른 과목은 at·arrive가 null). 열린 뒤 서버에 닿은 첫 클릭이 결과를 정한다: 성공하면 [신청]이 사라지고,
  // 막히거나 마감된 과목은 신청한 과목·시각이 늘기만 하므로 다시 눌러도 성공하지 않는다.
  // 열리기 전에 닿은 클릭은 다시 누르면 되므로 결과를 정하지 않는다. 열리기 전에만 닿은 과목은 'notOpen'이고, 얼마나 일렀는지 보이게 그중 마지막 클릭을 돌려준다
  const summarize = (courses, clicks, start = {}) => {
    const results = replay(courses, clicks, start);
    const reach = t => arrive(t, start.lag);
    return courses.map((c, i) => {
      const close = closeOf(c);
      const tries = clicks.map((x, k) => ({ ...x, k })).filter(x => x.course === i);
      const pick = tries.find(x => reach(x.t) >= 0) || tries.at(-1);
      if (!pick) return { result: 'none', at: null, arrive: null, close };
      return { result: results[pick.k], at: pick.t, arrive: reach(pick.t), close };
    });
  };

  // 대기열(넷퍼넬) 임시값. 실제 대기 시간 자료가 없어 근거 없음 (docs/real-screen.md "아직 필요한 데이터" 3번). 자료가 생기면 이 값만 고친다
  // - crowd: 신청을 시작하는 전체 인원 (MODEL의 doneBy 곡선대로 줄에 선다)
  // - drain: 1초에 줄을 통과하는 인원
  const QUEUE = { crowd: 3000, drain: 300 };

  // 시작 후 t초까지 줄에 선 사람 수
  const arrived = t => t <= 0 ? 0 : QUEUE.crowd * doneBy(t);

  // 시작 후 t초에 줄을 선 사람이 now초에 보는 대기 화면 값. t는 신청이 서버에 닿은 시각(arrive)이다
  // { ahead: 앞 대기 인원, wait: 남은 시간(초), progress: 진행률(0~100) }. 시작 전이나 줄이 없으면 wait는 0
  // now가 t보다 이르면(신청이 아직 서버로 가는 중) 줄을 선 순간의 값을 돌려준다
  // 넷퍼넬 코드에는 뒤 대기 인원도 있지만 실제 화면에서 본 적이 없어 계산하지 않는다
  // 줄은 먼저 선 순서대로 빠지므로 뒤에 선 사람은 앞사람보다 먼저 빠지지 않는다. 그래서 판정은 대기가 끝난 시각이 아니라 줄을 선 시각(judge의 t)으로 한다
  const queueAt = (t, now = t) => {
    const line = Math.max(0, arrived(t) - QUEUE.drain * Math.max(t, 0)); // 줄을 선 순간의 앞 인원 (소수)
    const start = Math.ceil(line);
    if (!start) return { ahead: 0, wait: 0, progress: 100 };
    const ahead = Math.max(0, Math.ceil(line - QUEUE.drain * Math.max(0, now - t)));
    return { ahead, wait: ahead / QUEUE.drain, progress: Math.floor(100 * (1 - ahead / start)) };
  };

  const engine = { MODEL, QUEUE, RANGE, arrive, clock, closeSec, closeOf, seatsLeft, judge, parseTimes, clash, blocked, replay, summarize, queueAt };
  if (globalThis.SG) SG.engine = engine;
  else module.exports = engine;
})();
