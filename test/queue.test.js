// 대기열 판정 스크립트 (#5). 실행: 레포 폴더에서 node --test
// 완료 조건: 줄이 시간에 따라 줄어 통과되고, [닫기] 후 다시 서면 그대로 기다렸을 때보다 순번이 앞서지 않는다
const test = require('node:test');
const assert = require('node:assert/strict');
const { MODEL, QUEUE, queueAt } = require('../extension/engine.js');

const TIMES = [0.01, 0.05, 0.1, 0.3, 0.5, 1, 1.5, 2, 3, 5];
// 값(지금은 임시)을 실제 자료로 고쳐도 판정이 유지되는지. 첫 줄이 기본값
const CASES = [
  [{ ...MODEL }, { ...QUEUE }],
  [{ ...MODEL }, { crowd: 500, drain: 50 }],
  [{ ...MODEL }, { crowd: 10000, drain: 2000 }],
  [{ show: 0.6, burst: 0.9, fast: 0.1, slow: 10 }, { crowd: 3000, drain: 300 }],
  [{ show: 0.7, burst: 0, fast: 0.3, slow: 60 }, { crowd: 3000, drain: 100 }],
];
const each = fn => CASES.forEach(([m, q]) => {
  const was = [{ ...MODEL }, { ...QUEUE }];
  Object.assign(MODEL, m);
  Object.assign(QUEUE, q);
  try { fn(JSON.stringify([m, q])); } finally { Object.assign(MODEL, was[0]); Object.assign(QUEUE, was[1]); }
});

test('시작 전에는 대기가 없다', () => {
  for (const t of [-5, -0.001, 0, -Infinity]) assert.equal(queueAt(t).wait, 0, `t=${t}`);
});

test('기본값이면 시작 직후에 줄이 생긴다', () => assert.ok(queueAt(0.5).wait > 0));

test('기다릴수록 앞 인원은 줄고 진행률은 오르다가, 예상 시간이 지나면 통과한다', () => each(msg => {
  for (const t of TIMES) {
    const { wait, ahead } = queueAt(t);
    if (!wait) continue;
    assert.equal(queueAt(t).progress, 0, msg);
    let last = queueAt(t);
    for (const f of [0.25, 0.5, 0.75]) {
      const q = queueAt(t, t + wait * f);
      assert.ok(q.ahead <= last.ahead && q.progress >= last.progress && q.behind >= last.behind, `${msg} t=${t} f=${f}`);
      assert.ok(q.ahead > 0 && q.ahead <= ahead, `${msg} t=${t} f=${f}`);
      last = q;
    }
    const end = queueAt(t, t + wait + 1e-6); // 소수점 오차 여유
    assert.equal(end.ahead, 0, `${msg} t=${t}`);
    assert.equal(end.wait, 0, `${msg} t=${t}`);
    assert.equal(end.progress, 100, `${msg} t=${t}`);
  }
}));

test('[닫기] 후 다시 서면 그대로 기다렸을 때보다 앞서지 않는다', () => each(msg => {
  for (const t0 of TIMES) for (const gap of [0.1, 0.5, 1, 3]) {
    const t1 = t0 + gap;
    assert.ok(queueAt(t1).ahead >= queueAt(t0, t1).ahead, `${msg} t0=${t0} t1=${t1}`);
  }
}));

test('몰리는 동안 늦게 줄을 서면 순번이 뒤로 밀린다 (기본값)', () => {
  const stayed = queueAt(0.1, 1).ahead;
  assert.ok(queueAt(1).ahead > stayed, `그대로 ${stayed}명, 다시 서면 ${queueAt(1).ahead}명`);
});

test('같은 입력이면 같은 결과', () => each(msg => {
  for (const t of TIMES) assert.deepEqual(queueAt(t, t + 0.5), queueAt(t, t + 0.5), msg);
}));
