// 추가 실패 판정 스크립트 (#6). 실행: 레포 폴더에서 node --test
// 완료 조건: 같은 학수번호(다른 분반)·학점 초과·시간 중복 상황을 만들면 그 결과가 나온다
const test = require('node:test');
const assert = require('node:assert/strict');
const { closeSec, parseTimes, clash, blocked, replay, summarize } = require('../extension/engine.js');

// 목업 희망수업 (mock/index.html의 hope 순서). 시작 신청학점 2(영어회화1), 최대학점 20
const MOCK = [
  ['30001', 'GEN2101', 3, '월(10:30-12:00) 수(10:30-12:00)', 176, 40],
  ['30004', 'GEN2104', 2, '수(15:00-17:00)', 140, 25],
  ['30006', 'GEN2106', 3, '목(09:00-12:00)', 95, 40],
  ['30007', 'GEN2107', 3, '월(15:00-16:30) 수(15:00-16:30)', 70, 80],
  ['10101', 'SWE1001', 3, '월(09:00-11:00) 수(09:00-11:00)', 52, 45],
  ['10102', 'SWE1001', 3, '화(13:00-15:00) 목(13:00-15:00)', 38, 45],
  ['30002', 'GEN2102', 3, '화(10:30-12:00) 목(10:30-12:00)', 64, 50],
  ['10104', 'SWE1003', 3, '월(13:00-14:30) 수(13:00-14:30)', 57, 60],
  ['20001', 'GEN1001', 2, '금(10:00-12:00)', 40, 35],
  ['20002', 'GEN1002', 2, '목(15:00-17:00)', 41, 40],
  ['30005', 'GEN2105', 3, '금(13:00-16:00)', 30, 60],
].map(([no, code, credit, time, hope, cap]) => ({ no, code, credit, times: parseTimes(time), hope, cap }));
const START = { credits: 2, max: 20 };
const at = no => MOCK.findIndex(c => c.no === no);
// 과목 번호를 누른 순서대로 (모두 시작 직후 0.01초 — 아직 마감 전)
const clicks = (...nos) => nos.map(no => ({ course: at(no), t: 0.01 }));
const run = (...nos) => replay(MOCK, clicks(...nos), START);

test('수업시간은 실제(쉼표)·목업(공백)·화면 글자(붙어 있음) 형식을 모두 읽는다', () => {
  const two = [{ day: '금', from: 540, to: 630 }, { day: '금', from: 630, to: 720 }];
  assert.deepEqual(parseTimes('금(09:00-10:30),금(10:30-12:00)'), two);
  assert.deepEqual(parseTimes('금(09:00-10:30) 금(10:30-12:00)'), two);
  assert.deepEqual(parseTimes('금(09:00-10:30)금(10:30-12:00)'), two);
  assert.deepEqual(parseTimes(''), []);
  assert.deepEqual(parseTimes(undefined), []);
});

test('같은 요일에 시간이 겹칠 때만 시간 중복이다 (끝나는 시각에 시작하면 안 겹침)', () => {
  const t = s => parseTimes(s);
  assert.ok(clash(t('월(09:00-11:00)'), t('월(10:30-12:00)')));
  assert.ok(clash(t('목(09:00-12:00)'), t('목(10:30-11:00)')), '한 수업이 다른 수업 안에 들어감');
  assert.ok(!clash(t('금(09:00-10:30)'), t('금(10:30-12:00)')), '끝 = 시작');
  assert.ok(!clash(t('월(09:00-11:00)'), t('화(09:00-11:00)')), '다른 요일');
  assert.ok(!clash(t(''), t('월(09:00-11:00)')), '시간 없는 과목');
});

test('같은 학수번호를 이미 신청했으면 다른 분반도 막힌다', () => {
  assert.deepEqual(run('10102', '10101'), ['done', 'same']);
});

test('신청한 과목과 시간이 겹치면 시간 중복', () => {
  assert.deepEqual(run('30001', '10101'), ['done', 'time']);
  assert.deepEqual(run('30006', '30002'), ['done', 'time']);
});

test('최대학점을 넘기면 학점 초과 (목업 희망수업을 겹치지 않게 다 신청하면 생긴다)', () => {
  // 2 + 3 + 3 + 3 + 2 + 2 + 3 = 18, 3학점을 더하면 21 > 20
  assert.deepEqual(run('30001', '10102', '10104', '20001', '20002', '30007', '30006'),
    ['done', 'done', 'done', 'done', 'done', 'done', 'credit']);
  assert.deepEqual(run('30001', '10102', '10104', '20001', '20002', '30004'), Array(6).fill('done'), '딱 20학점은 된다');
  assert.equal(blocked(MOCK[0], [], 18, 20), 'credit');
  assert.equal(blocked(MOCK[0], [], 17, 20), null);
  assert.equal(blocked(MOCK[0], [], 100, Infinity), null, '최대학점을 모르면 학점 검사를 하지 않는다');
});

test('목업 희망수업을 위에서부터 다 누르면 시간 중복과 학점 초과가 둘 다 나온다', () => {
  const nos = MOCK.map(c => c.no);
  assert.deepEqual(run(...nos), ['done', 'done', 'done', 'time', 'time', 'done', 'time', 'done', 'done', 'done', 'credit']);
});

test('막힌 신청은 학점·시간표에 들어가지 않는다', () => {
  // 10101이 시간 중복으로 막혔으니 같은 학수번호의 10102는 막히지 않는다
  assert.deepEqual(run('30001', '10101', '10102'), ['done', 'time', 'done']);
  // 30006(3)이 학점 초과로 막혔으니 신청학점은 3 그대로 → 30004(2)는 5학점으로 딱 들어간다
  assert.deepEqual(replay(MOCK, clicks('30001', '30006', '30004'), { credits: 0, max: 5 }), ['done', 'credit', 'done']);
});

test('막히는 이유는 학수번호 → 학점 → 시간 → 정원 순서로 본다 (실제 순서는 모름, 임시)', () => {
  const late = 600; // 인기 과목은 모두 마감된 뒤
  const k = (no, t = 0.01) => ({ course: at(no), t });
  // 시간도 겹치고 학번도 같음 → same
  assert.deepEqual(replay(MOCK, [k('10102'), k('10101')], START), ['done', 'same']);
  // 시간이 겹치는데 학점도 넘음 → credit
  assert.deepEqual(replay(MOCK, [k('30001'), k('10101')], { credits: 15, max: 20 }), ['done', 'credit']);
  // 마감됐는데 시간도 겹침 → time
  assert.ok(closeSec(MOCK[at('30001')].hope, MOCK[at('30001')].cap) < late, '30001은 마감되는 과목');
  assert.deepEqual(replay(MOCK, [k('10101'), k('30001', late)], START), ['done', 'time']);
  // 막히지 않으면 정원으로 판정, 시작 전은 무엇보다 먼저 기간 아님
  assert.deepEqual(replay(MOCK, [k('30001', late)], START), ['full']);
  assert.deepEqual(replay(MOCK, [k('10102'), k('10101', -1)], START), ['done', 'notOpen']);
});

test('결과 요약은 화면과 같은 판정(replay)을 쓰고, 처음 누른 클릭이 과목 결과를 정한다', () => {
  const k = (no, t) => ({ course: at(no), t });
  const list = [k('30001', -0.5), k('30001', 0.01), k('10101', 0.05), k('10101', 0.5), k('10102', 0.1), k('10101', 0.2)];
  const results = replay(MOCK, list, START);
  const sum = summarize(MOCK, list, START);
  assert.equal(sum.length, MOCK.length);
  assert.equal(sum[at('30001')].result, 'done');
  assert.equal(sum[at('30001')].at, 0.01, '시작 전 클릭은 빼고 처음 누른 시각');
  assert.equal(sum[at('10101')].result, 'time');
  assert.equal(sum[at('10102')].result, 'done');
  assert.equal(sum[at('30005')].result, 'none');
  for (const [i, c] of list.entries()) {
    const first = list.findIndex(x => x.course === c.course && x.t >= 0);
    if (first === i) assert.equal(sum[c.course].result, results[i]);
  }
  assert.deepEqual(summarize(MOCK, list, START), sum, '같은 입력이면 같은 요약');
});
