// 결과 요약 판정 스크립트 (#9). 실행: 레포 폴더에서 node --test
// 완료 조건: 마감 전에 누르면 성공, 마감 후에 누르면 정원 마감이 뜨고, 요약에 모든 과목의 결과가 나온다
// #29부터 판정은 누른 시각이 아니라 서버 도착 시각(누른 시각 + 지연)으로 한다. 마감 전·후는 도착 시각 기준
// 지연·마감 배율은 화면이 연습마다 뽑아 넘기는 값이라, 여기서는 지연을 고정해 넘기고 배율은 넘기지 않는다(1배)
const test = require('node:test');
const assert = require('node:assert/strict');
const { arrive, closeSec, judge, summarize } = require('../extension/engine.js');

// 목업 희망수업 과목 (희망·제한) + 제한 0
const COURSES = [[176, 40], [140, 25], [95, 40], [70, 80], [52, 45], [38, 45], [64, 50], [5, 0]]
  .map(([hope, cap]) => ({ hope, cap }));
const close = c => closeSec(c.hope, c.cap);
const [movie, art, data, history, , , econ] = COURSES.map((_, i) => i); // 과목 번호
const LAG = 0.25; // 이번 연습의 지연이라고 치는 값
const START = { lag: LAG };
const press = s => s - LAG; // 서버에 s초에 닿도록 누르는 시각

test('마감 전에 누르면 성공, 마감 후에 누르면 정원 초과, 시작 전은 기간 아님', () => {
  for (const c of COURSES) {
    const end = close(c), at = t => judge(c, t), msg = `희망 ${c.hope}, 제한 ${c.cap}, 마감 ${end}초`;
    assert.equal(at(-0.001), 'notOpen', msg);
    if (end === Infinity) { // 마감되지 않는 과목은 언제 눌러도 성공
      for (const t of [0, 1, 60, 600]) assert.equal(at(t), 'done', msg);
      continue;
    }
    if (end > 0) {
      assert.equal(at(0), 'done', msg);
      assert.equal(at(end * 0.999), 'done', msg);
    }
    assert.equal(at(end), 'full', msg);
    assert.equal(at(end + 0.001), 'full', msg);
    assert.equal(at(end + 60), 'full', msg);
  }
});

test('요약에 모든 과목의 결과가 나온다', () => {
  const clicks = [
    { course: art, t: press(-0.2) },                  // 열리기 전에 닿음 → 기간 아님
    { course: data, t: press(close(COURSES[data]) * 0.5) }, // 마감 전에 닿음 → 성공
    { course: movie, t: press(close(COURSES[movie]) + 0.1) }, // 마감 후에 닿음 → 정원 초과
    { course: history, t: 3 },                        // 마감 안 되는 과목 → 성공
  ];
  const sum = summarize(COURSES, clicks, START);
  assert.equal(sum.length, COURSES.length, '과목 수만큼 결과가 나와야 한다');
  sum.forEach((r, i) => {
    assert.ok(['done', 'full', 'notOpen', 'none'].includes(r.result), `${i}번 과목 결과: ${r.result}`);
    assert.equal(r.close, close(COURSES[i]));
  });
  assert.equal(sum[data].result, 'done');
  assert.equal(sum[movie].result, 'full');
  assert.equal(sum[history].result, 'done');
  assert.equal(sum[art].result, 'notOpen', '열리기 전에만 닿은 과목은 기간 아님');
  assert.ok(sum[art].arrive < 0);
  assert.equal(sum[econ].result, 'none', '안 누른 과목도 요약에 나온다');
  assert.equal(sum[econ].at, null);
  assert.equal(sum[econ].arrive, null);
  // 누른 시각과 서버 도착 시각을 같이 돌려준다
  for (const k of clicks) {
    assert.equal(sum[k.course].at, k.t);
    assert.equal(sum[k.course].arrive, arrive(k.t, LAG));
  }
  // 화면이 띄운 메시지와 요약이 같은 판정(서버 도착 시각)을 쓴다
  for (const k of clicks) assert.equal(sum[k.course].result, judge(COURSES[k.course], arrive(k.t, LAG)));
});

test('같은 입력이면 같은 요약이 나온다', () => {
  const clicks = COURSES.map((c, i) => ({ course: i, t: 0.05 * (i + 1) }));
  assert.deepEqual(summarize(COURSES, clicks, START), summarize(COURSES, clicks, START));
  assert.deepEqual(summarize(COURSES, [], START), summarize(COURSES, [], START));
});
