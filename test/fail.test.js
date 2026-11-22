// 추가 실패 판정 스크립트 (#6). 실행: 레포 폴더에서 node --test
// 완료 조건: 같은 학수번호(다른 분반)·학점 초과·시간 중복 상황을 만들면 그 결과가 나온다
const test = require('node:test');
const assert = require('node:assert/strict');
const { NET, arrive, closeSec, parseTimes, clash, blocked, replay, summarize } = require('../extension/engine.js');

// 판정용 고정 데이터. 희망수업 화면 데이터와 상관없이 상황마다 일부러 만든 과목이다 (화면 데이터가 바뀌어도 그대로 둔다)
// [이름, 학수번호, 학점, 수업시간, 희망인원, 제한인원]
const COURSES = [
  ['hot', 'A101', 3, '월(09:00-10:30) 수(09:00-10:30)', 150, 30], // 금방 마감되는 인기 과목
  ['b1', 'B201', 3, '월(10:00-12:00)', 40, 45], // hot과 월요일 10시대가 겹침
  ['b2', 'B201', 3, '화(13:00-15:00)', 40, 45], // b1과 같은 학수번호, 다른 분반 (아무것과도 안 겹침)
  ['b3', 'B201', 3, '월(11:00-12:00)', 40, 45], // b1과 같은 학수번호이면서 시간도 겹침
  ['long', 'C301', 3, '목(09:00-12:00)', 30, 40],
  ['inner', 'D401', 2, '목(10:30-11:00)', 30, 40], // long 안에 들어감
  ['f1', 'E501', 2, '금(09:00-10:30)', 20, 40],
  ['f2', 'E502', 2, '금(10:30-12:00)', 20, 40], // f1이 끝나는 시각에 시작 (안 겹침)
  ['big', 'F601', 3, '화(09:00-12:00)', 20, 40],
].map(([id, code, credit, time, hope, cap]) => ({ id, code, credit, times: parseTimes(time), hope, cap }));
const START = { credits: 0, max: 12 };
const at = id => {
  const i = COURSES.findIndex(c => c.id === id);
  assert.ok(i >= 0, `없는 과목: ${id}`);
  return i;
};
const course = id => COURSES[at(id)];
// 서버에 s초에 닿도록 누르는 시각 (판정은 누른 시각이 아니라 서버 도착 시각으로 하므로, 지연 값과 상관없이 같은 상황을 만든다)
const press = s => s - NET.lag;
// 과목을 누른 순서대로 (모두 열린 직후 0.01초에 서버에 닿음 — 아직 마감 전)
const clicks = (...ids) => ids.map(id => ({ course: at(id), t: press(0.01) }));
const run = (...ids) => replay(COURSES, clicks(...ids), START);

test('수업시간은 쉼표·공백으로 나뉘거나 붙어 있는 형식을 모두 읽는다', () => {
  // 실제 화면은 쉼표, 목업은 공백으로 나누고, 칸 글자(textContent)는 붙어 있다
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
  assert.deepEqual(run('b2', 'b1'), ['done', 'same']);
});

test('신청한 과목과 시간이 겹치면 시간 중복', () => {
  assert.deepEqual(run('hot', 'b1'), ['done', 'time']);
  assert.deepEqual(run('long', 'inner'), ['done', 'time'], '한 수업이 다른 수업 안에 들어감');
  assert.deepEqual(run('f1', 'f2'), ['done', 'done'], '끝나는 시각에 시작하면 안 겹침');
});

test('최대학점을 넘기면 학점 초과', () => {
  // 0 + 3 + 3 + 3 + 2 = 11, 3학점을 더하면 14 > 12
  assert.deepEqual(run('hot', 'b2', 'long', 'f1', 'big'), ['done', 'done', 'done', 'done', 'credit']);
  assert.deepEqual(run('hot', 'b2', 'long', 'big'), Array(4).fill('done'), '딱 최대학점은 된다');
  assert.equal(blocked(course('hot'), [], 10, 12), 'credit');
  assert.equal(blocked(course('hot'), [], 9, 12), null);
  assert.equal(blocked(course('hot'), [], 100, Infinity), null, '최대학점을 모르면 학점 검사를 하지 않는다');
});

test('위에서부터 다 누르면 시간 중복·같은 학수번호·학점 초과가 모두 나온다', () => {
  assert.deepEqual(run(...COURSES.map(c => c.id)),
    ['done', 'time', 'done', 'same', 'done', 'time', 'done', 'credit', 'credit']);
});

test('막힌 신청은 학점·시간표에 들어가지 않는다', () => {
  // b1이 시간 중복으로 막혔으니 같은 학수번호의 b2는 막히지 않는다
  assert.deepEqual(run('hot', 'b1', 'b2'), ['done', 'time', 'done']);
  // long(3)이 학점 초과로 막혔으니 신청학점은 3 그대로 → f1(2)은 5학점으로 딱 들어간다
  assert.deepEqual(replay(COURSES, clicks('hot', 'long', 'f1'), { credits: 0, max: 5 }), ['done', 'credit', 'done']);
});

test('막히는 이유는 학수번호 → 학점 → 시간 → 정원 순서로 본다 (실제 순서는 모름, 임시)', () => {
  const late = 600; // 인기 과목은 마감된 뒤
  const k = (id, t = 0.01) => ({ course: at(id), t: press(t) }); // t: 서버에 닿는 시각
  // 시간도 겹치고 학수번호도 같음 → same
  assert.ok(clash(course('b1').times, course('b3').times), 'b1과 b3은 시간이 겹치는 과목');
  assert.deepEqual(replay(COURSES, [k('b1'), k('b3')], START), ['done', 'same']);
  // 시간이 겹치는데 학점도 넘음 → credit
  assert.deepEqual(replay(COURSES, [k('hot'), k('b1')], { credits: 7, max: 12 }), ['done', 'credit']);
  // 마감됐는데 시간도 겹침 → time
  assert.ok(closeSec(course('hot').hope, course('hot').cap) < late, 'hot은 마감되는 과목');
  assert.deepEqual(replay(COURSES, [k('b1'), k('hot', late)], START), ['done', 'time']);
  // 막히지 않으면 정원으로 판정, 시작 전은 무엇보다 먼저 기간 아님
  assert.deepEqual(replay(COURSES, [k('hot', late)], START), ['full']);
  assert.deepEqual(replay(COURSES, [k('b2'), k('b1', -1)], START), ['done', 'notOpen']);
});

test('결과 요약은 화면과 같은 판정(replay)을 쓰고, 열린 뒤 처음 닿은 클릭이 과목 결과를 정한다', () => {
  const k = (id, t) => ({ course: at(id), t: press(t) }); // t: 서버에 닿는 시각
  const list = [k('hot', -0.5), k('hot', 0.01), k('b1', 0.05), k('b1', 0.5), k('b2', 0.1), k('b1', 0.2)];
  const results = replay(COURSES, list, START);
  const sum = summarize(COURSES, list, START);
  assert.equal(sum.length, COURSES.length);
  assert.equal(sum[at('hot')].result, 'done');
  assert.equal(sum[at('hot')].at, list[1].t, '열리기 전에 닿은 클릭은 빼고 열린 뒤 처음 닿은 클릭의 누른 시각');
  assert.equal(sum[at('b1')].result, 'time', '나중 클릭(같은 학수번호로 막힘)이 아니라 처음 클릭 결과');
  assert.equal(sum[at('b2')].result, 'done');
  assert.equal(sum[at('big')].result, 'none');
  for (const [i, c] of list.entries()) {
    const first = list.findIndex(x => x.course === c.course && arrive(x.t) >= 0);
    if (first === i) assert.equal(sum[c.course].result, results[i]);
  }
  assert.deepEqual(summarize(COURSES, list, START), sum, '같은 입력이면 같은 요약');
});
