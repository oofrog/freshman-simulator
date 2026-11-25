// 사용자 테스트 기록의 요약 CSV 판정 스크립트 (#42). 실행: 레포 폴더에서 node --test
// 완료 조건: 구간 시간, 튜토리얼 단계별 시간·이전 횟수·완주 여부, 실전 재현 회차별 결과, 막힌 클릭 수가 요약에 나온다
const test = require('node:test');
const assert = require('node:assert/strict');
const { summary, csv } = require('../mock/log-summary.js');

const at = s => 1_700_000_000_000 + s * 1000; // 기준 시각에서 s초 뒤
const E = (s, type, data = {}) => ({ t: at(s), p: 'P0', seg: data.seg ?? null, type, ...data });
const find = (rows, ...head) => rows.filter(r => head.every((h, i) => h === undefined || r[i] === h));

const EVENTS = [
  E(0, 'seg.start', { name: '튜토리얼' }),
  E(1, 'click', { seg: '튜토리얼', blocked: true }),
  E(2, 'mode.start', { mode: 'tutorial' }),
  E(3, 'tutorial.step', { n: 1, total: 17, done: false }),
  E(13, 'tutorial.step', { n: 2, total: 17, done: false }),
  E(18, 'tutorial.step', { n: 1, total: 17, done: false }), // [이전]
  E(20, 'tutorial.step', { n: 2, total: 17, done: false }),
  E(30, 'mode.end', { mode: 'tutorial', how: '그만하기' }),
  E(40, 'seg.end', { name: '튜토리얼' }),
  E(41, 'mode.start', { mode: 'practice', round: 1 }),
  E(50, 'practice.queue', { round: 1 }),
  E(51, 'practice.apply', { round: 1, course: '영화 (1)', pressed: '11:00:00.100', result: 'done' }),
  E(60, 'practice.result', { round: 1, lag: 0.2, rows: [
    { course: '영화 (1)', result: 'done', pressed: '11:00:00.100', pressedSec: 0.1, arriveSec: 0.3, closeSec: 0.5 },
    { course: '미술 (2)', result: 'none', pressed: null, pressedSec: null, arriveSec: null, closeSec: 0.4 },
  ] }),
  E(61, 'click', { seg: null, blocked: false }),
];

test('구간 시간', () => {
  assert.deepEqual(find(summary(EVENTS), '구간')[0].slice(0, 4), ['구간', 1, '튜토리얼', 40]);
});

test('튜토리얼: 단계별 시간, 이전 횟수, 중단', () => {
  const rows = find(summary(EVENTS), '튜토리얼');
  assert.deepEqual(rows.filter(r => r[2] !== '결과').map(r => [r[2], r[3]]), [['1단계', 10], ['2단계', 5], ['1단계', 2], ['2단계', 10]]);
  const [result] = find(rows, '튜토리얼', 1, '결과');
  assert.equal(result[3], '중단');
  assert.match(result[4], /이전 1회/);
});

test('튜토리얼 완료 단계가 있으면 완주', () => {
  const done = [...EVENTS.slice(0, 7), E(25, 'tutorial.step', { n: 17, total: 17, done: true }), EVENTS[7]];
  assert.equal(find(summary(done), '튜토리얼', 1, '결과')[0][3], '완주');
});

test('실전 재현: 누른 과목만 결과와 여유', () => {
  const rows = find(summary(EVENTS), '실전 재현', 1);
  assert.match(find(rows, undefined, undefined, '신청 응답 수')[0][4], /대기 화면 1회/);
  assert.equal(find(rows, undefined, undefined, '이번 지연(초)')[0][3], 0.2);
  const [movie] = find(rows, undefined, undefined, '영화 (1)');
  assert.equal(movie[3], '성공');
  assert.match(movie[4], /0\.20초 여유/);
  assert.equal(find(rows, undefined, undefined, '미술 (2)').length, 0);
});

test('막힌 클릭 수 (전체와 구간별)', () => {
  const rows = summary(EVENTS);
  assert.deepEqual(find(rows, '클릭', '')[0].slice(2), ['막힌 클릭', 1, '전체 클릭 2']);
  assert.deepEqual(find(rows, '클릭', '튜토리얼')[0].slice(2), ['막힌 클릭', 1, '전체 클릭 1']);
});

test('CSV: 쉼표·따옴표가 든 값은 따옴표로 감싼다', () => {
  assert.equal(csv([['a', 'b,c', 'd"e']]), 'a,"b,c","d""e"');
});
