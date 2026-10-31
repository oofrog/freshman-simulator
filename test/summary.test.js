// 결과 요약 판정 스크립트 (#9). 실행: 레포 폴더에서 node --test
// 완료 조건: 마감 전에 누르면 성공, 마감 후에 누르면 정원 마감이 뜨고, 요약에 모든 과목의 결과가 나온다
const test = require('node:test');
const assert = require('node:assert/strict');
const { closeSec, judge, summarize } = require('../extension/engine.js');

// 목업 희망수업 과목 (희망·제한) + 제한 0
const COURSES = [[176, 40], [140, 25], [95, 40], [70, 80], [52, 45], [38, 45], [64, 50], [5, 0]]
  .map(([hope, cap]) => ({ hope, cap }));
const close = c => closeSec(c.hope, c.cap);
const [movie, art, data, history, , , econ] = COURSES.map((_, i) => i); // 과목 번호

test('마감 전에 누르면 성공, 마감 후에 누르면 정원 초과, 시작 전은 기간 아님', () => {
  for (const c of COURSES) {
    const end = close(c), at = t => judge(c.hope, c.cap, t), msg = `희망 ${c.hope}, 제한 ${c.cap}, 마감 ${end}초`;
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
    { course: art, t: -0.2 },                  // 시작 전 클릭 (결과에 안 들어감)
    { course: data, t: close(COURSES[data]) * 0.5 }, // 마감 전 → 성공
    { course: movie, t: close(COURSES[movie]) + 0.1 }, // 마감 후 → 정원 초과
    { course: history, t: 3 },                 // 마감 안 되는 과목 → 성공
  ];
  const sum = summarize(COURSES, clicks);
  assert.equal(sum.length, COURSES.length, '과목 수만큼 결과가 나와야 한다');
  sum.forEach((r, i) => {
    assert.ok(['done', 'full', 'none'].includes(r.result), `${i}번 과목 결과: ${r.result}`);
    assert.equal(r.close, close(COURSES[i]));
  });
  assert.equal(sum[data].result, 'done');
  assert.equal(sum[movie].result, 'full');
  assert.equal(sum[history].result, 'done');
  assert.equal(sum[art].result, 'none', '시작 전에만 누른 과목은 안 누름');
  assert.equal(sum[econ].result, 'none', '안 누른 과목도 요약에 나온다');
  assert.equal(sum[econ].at, null);
  // 화면이 띄운 메시지와 요약이 같은 판정을 쓴다
  for (const k of clicks.filter(k => k.t >= 0)) assert.equal(sum[k.course].result, judge(COURSES[k.course].hope, COURSES[k.course].cap, k.t));
});

test('플랜 B 전환 시간: 정원 초과가 뜬 순간부터 다른 과목을 누를 때까지', () => {
  const failAt = close(COURSES[movie]) + 0.2;
  const clicks = [
    { course: movie, t: failAt },        // 정원 초과
    { course: movie, t: failAt + 0.4 },  // 같은 과목 다시 누름 → 전환 아님
    { course: econ, t: failAt + 1.3 },   // 다른 과목 → 여기까지가 전환 시간
    { course: art, t: failAt + 2 },      // 정원 초과, 그 뒤로 아무것도 안 누름
  ];
  const sum = summarize(COURSES, clicks);
  assert.equal(sum[movie].result, 'full');
  assert.equal(sum[movie].at, failAt, '처음 누른 시각');
  assert.ok(Math.abs(sum[movie].planB - 1.3) < 1e-9, `전환 ${sum[movie].planB}초`);
  assert.equal(sum[art].result, 'full');
  assert.equal(sum[art].planB, null, '다른 과목으로 안 바꿨으면 null');
  assert.equal(sum[econ].planB, null, '성공한 과목은 전환 시간이 없다');
});

test('같은 입력이면 같은 요약이 나온다', () => {
  const clicks = COURSES.map((c, i) => ({ course: i, t: 0.05 * (i + 1) }));
  assert.deepEqual(summarize(COURSES, clicks), summarize(COURSES, clicks));
  assert.deepEqual(summarize(COURSES, []), summarize(COURSES, []));
});
