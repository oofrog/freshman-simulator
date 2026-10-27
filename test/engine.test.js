// 실전 재현 엔진 판정 스크립트 (#8). 실행: 레포 폴더에서 node --test (Node 18 이상, 설치할 것 없음)
// 완료 조건: 같은 입력이면 같은 결과가 나오고, 희망/제한 비율이 높은 과목이 먼저 마감된다
// 더해서: 희망자가 전부 신청하지는 않으므로, 희망 × 신청 비율이 제한 이하인 아슬아슬한 과목은 마감되지 않는다
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const FILE = path.join(__dirname, '../extension/engine.js');
const { MODEL, closeSec, seatsLeft } = require(FILE);

// 목업 희망·제한 인원 + 경계값
// (경쟁률 같은 쌍, 희망 = 제한, 희망 0, 제한 1, 제한 0, 희망 × 신청 비율이 딱 제한인 과목, 정원 20·희망 100, 정원 50·희망 55)
const MOCK = [[52, 45], [38, 45], [64, 60], [57, 60], [40, 35], [41, 40], [27, 25], [176, 40], [64, 50], [88, 30],
  [140, 25], [30, 60], [95, 40], [70, 80], [85, 70], [26, 30]];
const EDGE = [[80, 40], [100, 50], [40, 40], [0, 30], [2, 1], [1000, 10], [5, 0], [55, 44], [10, 7], [5, 3], [100, 20], [55, 50]];
// 넓은 범위: 희망 0~400, 제한 1~120 격자
const GRID = [];
for (let hope = 0; hope <= 400; hope += 7) for (let cap = 1; cap <= 120; cap += 5) GRID.push([hope, cap]);
const ALL = [...MOCK, ...EDGE, ...GRID];
const TIMES = [-5, 0, 0.1, 0.5, 1, 2, 3, 5, 8, 13, 21, 60, 600];
// MODEL 값(지금은 임시)을 실제 자료로 고쳐도 판정이 유지되는지. 첫 줄이 기본값
const MODELS = [{ half: 5, show: 0.8 }, { half: 0.5, show: 1 }, { half: 30, show: 0.7 }, { half: 5, show: 0.6 }];

const withModel = (m, fn) => {
  const was = { ...MODEL };
  Object.assign(MODEL, m);
  try { fn(); } finally { Object.assign(MODEL, was); }
};
const each = fn => MODELS.forEach(m => withModel(m, () => fn(`half=${m.half}, show=${m.show}`)));
const result = ([hope, cap]) => [closeSec(hope, cap), ...TIMES.map(t => seatsLeft(hope, cap, t))];
// 경쟁률 비교는 나눗셈 없이 정수로: a가 더 높으면 양수
const cmpRatio = ([ha, ca], [hb, cb]) => ha * cb - hb * ca;
// 실제로 신청하는 인원(희망 × 신청 비율)이 제한을 넘는지. 소수점 오차가 없게 정수로 (신청 비율은 1% 단위)
const overCap = (hope, cap) => hope * Math.round(MODEL.show * 100) > cap * 100;

test('같은 입력이면 같은 결과가 나온다', () => {
  each(() => {
    const first = ALL.map(result);
    assert.deepEqual(ALL.map(result), first, '두 번 계산한 결과가 다르다');
    // 다른 과목을 먼저 계산해도(순서를 뒤집어도) 각 과목의 결과는 그대로
    assert.deepEqual([...ALL].reverse().map(result).reverse(), first, '계산 순서에 따라 결과가 바뀐다');
  });
  // 결과가 실행할 때마다 달라질 수 있는 것(무작위·현재 시각)을 엔진에서 쓰지 않는다
  const src = fs.readFileSync(FILE, 'utf8').replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(src, /Math\.random|Date\b|performance|crypto/, '엔진에 무작위·현재 시각이 들어 있다');
});

test('희망/제한 비율이 높은 과목이 먼저 마감된다', () => {
  each(model => {
    for (const a of ALL) for (const b of ALL) {
      const r = cmpRatio(a, b), ta = closeSec(...a), tb = closeSec(...b);
      const ok = r > 0 ? ta < tb || tb === Infinity // 비율이 낮은 과목이 마감되면, 높은 과목은 그보다 먼저 마감
        : r === 0 ? ta === tb : true;               // 비율이 같으면 같은 시각
      if (!ok) assert.fail(`${model}: 희망/제한 ${a.join('/')}(${ta}초) vs ${b.join('/')}(${tb}초)`);
    }
  });
  // 목업 과목 중 마감되는 것을 마감 순서대로 늘어놓으면 경쟁률 내림차순
  const order = MOCK.filter(c => closeSec(...c) < Infinity).sort((a, b) => closeSec(...a) - closeSec(...b));
  assert.deepEqual(order, [...order].sort((a, b) => cmpRatio(b, a)));
  assert.deepEqual(order.slice(0, 2), [[140, 25], [176, 40]]); // 경쟁률 5.6, 4.4
});

test('희망 × 신청 비율이 제한 이하면 마감되지 않는다', () => {
  each(model => {
    for (const [hope, cap] of ALL) {
      const msg = `${model}: 희망 ${hope}, 제한 ${cap}`;
      if (cap === 0 || overCap(hope, cap)) assert.ok(closeSec(hope, cap) < Infinity, `${msg}: 마감돼야 한다`);
      else {
        assert.equal(closeSec(hope, cap), Infinity, `${msg}: 마감되면 안 된다`);
        assert.ok(seatsLeft(hope, cap, 1e6) > 0, `${msg}: 남은 자리가 0이 됐다`);
      }
    }
  });
});

test('정원 20·희망 100은 금방 마감되고, 정원 50·희망 55는 차지 않는다 (기본 MODEL)', () => {
  // 신청할 사람의 절반이 신청을 마치기도 전에 마감
  assert.ok(closeSec(100, 20) < MODEL.half, `정원 20·희망 100: ${closeSec(100, 20)}초`);
  // 희망자가 전부 신청하지는 않아서 아슬아슬한 과목은 안 찬다
  assert.equal(closeSec(55, 50), Infinity);
  assert.ok(seatsLeft(55, 50, 600) > 0);
});

test('남은 자리는 제한인원에서 줄어들어 마감 시각에 정확히 0이 된다', () => {
  each(model => {
    for (const [hope, cap] of ALL) {
      const end = closeSec(hope, cap), msg = `${model}: 희망 ${hope}, 제한 ${cap}`;
      assert.equal(seatsLeft(hope, cap, -1), cap, msg);
      assert.equal(seatsLeft(hope, cap, 0), cap, msg);
      let prev = cap;
      for (const t of TIMES) {
        const left = seatsLeft(hope, cap, t);
        assert.ok(Number.isInteger(left) && left >= 0 && left <= prev, `${msg}, ${t}초: ${left}`);
        prev = left;
      }
      if (cap > 0 && end !== Infinity) {
        assert.equal(seatsLeft(hope, cap, end), 0, msg);
        assert.ok(seatsLeft(hope, cap, end * 0.999) >= 1, msg); // 마감 직전에는 자리가 있다
      }
    }
  });
});
