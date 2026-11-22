// 서버 시계·지연 판정 스크립트 (#29). 실행: 레포 폴더에서 node --test
// 완료 조건: 11:00 직전에 누른 클릭이 지연 덕분에 열린 뒤 도착하면 신청이 되고, 너무 일찍 누르면 기간 아님이 나온다
// 판정은 누른 시각이 아니라 서버 도착 시각(누른 시각 + NET.lag)으로 한다
const test = require('node:test');
const assert = require('node:assert/strict');
const { NET, arrive, clock, closeSec, replay, summarize } = require('../extension/engine.js');

// NET.lag(지금은 임시값)를 실제 자료로 고쳐도 판정이 유지되는지. 첫 값이 기본값
const LAGS = [NET.lag, 0.05, 0.5, 1];
const eachLag = fn => LAGS.forEach(lag => {
  const was = NET.lag;
  NET.lag = lag;
  try { fn(lag); } finally { NET.lag = was; }
});
const CALM = { hope: 10, cap: 50 }; // 마감되지 않는 과목
const HOT = { hope: 1000, cap: 10 }; // 열리자마자 마감되는 과목 (기본 MODEL로 0.01초쯤)

test('시계는 열린 시각을 11:00:00.000으로, 그 전후를 밀리초까지 보여 준다', () => {
  assert.equal(clock(0), '11:00:00.000');
  assert.equal(clock(-5), '10:59:55.000', '시계가 뜨는 시각');
  assert.equal(clock(-0.2), '10:59:59.800');
  assert.equal(clock(-0.0001), '10:59:59.999', '밀리초 아래는 버린다 (열리기 전에 11:00:00으로 넘어가지 않음)');
  assert.equal(clock(0.0009), '11:00:00.000');
  assert.equal(clock(0.57), '11:00:00.570', '소수점 오차로 .569가 되지 않는다');
  assert.equal(clock(1.2345), '11:00:01.234');
  assert.equal(clock(59.999), '11:00:59.999');
  assert.equal(clock(60), '11:01:00.000');
  assert.equal(clock(3600), '12:00:00.000');
});

test('서버 도착 시각은 누른 시각 + 지연', () => eachLag(lag => {
  for (const t of [-5, -lag, -0.1, 0, 0.3, 10]) assert.equal(arrive(t), t + lag, `lag=${lag} t=${t}`);
}));

test('11:00 직전에 눌러도 열린 뒤에 닿으면 신청되고, 너무 일찍 누르면 기간 아님', () => eachLag(lag => {
  const at = t => replay([CALM], [{ course: 0, t }])[0];
  const msg = `lag=${lag}`;
  assert.equal(at(-lag), 'done', `${msg}: 누른 신청이 정확히 열린 순간에 닿음`);
  assert.equal(at(-lag / 2), 'done', `${msg}: 열리기 전에 눌렀지만 열린 뒤에 닿음`);
  assert.equal(at(0), 'done', msg);
  assert.equal(at(-lag - 0.001), 'notOpen', `${msg}: 1밀리초 일찍 닿음`);
  assert.equal(at(-lag * 1.5), 'notOpen', msg);
  assert.equal(at(-5), 'notOpen', `${msg}: 시계가 뜨자마자 누름`);
}));

test('지연 동안 마감되는 인기 과목은 열리는 순간에 누르면 놓치고, 미리 누르면 잡는다', () => eachLag(lag => {
  const close = closeSec(HOT.hope, HOT.cap), msg = `lag=${lag}, 마감 ${close}초`;
  assert.ok(close > 0 && close < lag, `${msg}: 지연보다 먼저 마감되는 과목이어야 한다`);
  const at = t => replay([HOT], [{ course: 0, t }])[0];
  assert.equal(at(0), 'full', `${msg}: 11:00:00.000에 누르면 늦다`);
  assert.equal(at(-lag), 'done', `${msg}: 지연만큼 미리 누르면 열리는 순간에 닿는다`);
  assert.equal(at(close - lag - 0.001), 'done', `${msg}: 마감 직전에 닿음`);
  assert.equal(at(close - lag + 0.001), 'full', `${msg}: 마감 직후에 닿음`); // 마감 시각 딱 그때는 (마감 − 지연) + 지연의 소수점 오차로 흔들려서 1밀리초 뒤로 본다
}));

test('요약: 열리기 전에만 닿은 과목은 기간 아님(가장 늦은 클릭), 열린 뒤 닿은 첫 클릭이 결과를 정한다', () => eachLag(lag => {
  const msg = `lag=${lag}`;
  // 누른 순서대로
  const clicks = [
    { course: 0, t: -1 - lag },   // 0번: 열리기 1초 전에 닿음
    { course: 1, t: -0.5 - lag }, // 1번: 열리기 0.5초 전에 닿음
    { course: 0, t: -0.3 - lag }, // 0번: 다시 눌렀지만 또 0.3초 일찍 닿음
    { course: 1, t: -lag / 2 },   // 1번: 다시 눌러 열린 뒤에 닿음
    { course: 2, t: -lag / 2 },   // 2번: 열린 뒤에 닿음
    { course: 2, t: 0.5 },        // 2번: 성공한 뒤 또 누름 (같은 학수번호라 막힘)
  ];
  const courses = [CALM, CALM, { ...CALM, code: 'X' }, CALM];
  const sum = summarize(courses, clicks);
  assert.equal(sum[0].result, 'notOpen', msg);
  assert.equal(sum[0].at, clicks[2].t, `${msg}: 가장 늦게 닿은 클릭을 보여 준다 (얼마나 일렀는지)`);
  assert.equal(sum[0].arrive, arrive(clicks[2].t), msg);
  assert.ok(sum[0].arrive < 0, msg);
  assert.equal(sum[1].result, 'done', `${msg}: 일찍 눌러도 다시 누르면 된다`);
  assert.equal(sum[1].at, clicks[3].t, msg);
  assert.equal(replay(courses, clicks).at(-1), 'same', msg);
  assert.equal(sum[2].result, 'done', `${msg}: 열린 뒤 처음 닿은 클릭이 결과를 정한다`);
  assert.equal(sum[2].at, clicks[4].t, msg);
  assert.deepEqual(sum[3], { result: 'none', at: null, arrive: null, close: Infinity }, msg);
}));

test('같은 입력이면 같은 결과', () => eachLag(() => {
  const clicks = [-1, -0.25, -0.15, 0, 0.01, 0.2].map((t, i) => ({ course: i % 2, t }));
  assert.deepEqual(summarize([HOT, CALM], clicks), summarize([HOT, CALM], clicks));
  assert.deepEqual(replay([HOT, CALM], clicks), replay([HOT, CALM], clicks));
}));
