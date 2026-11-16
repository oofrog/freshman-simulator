// 튜토리얼 단계 판정 스크립트 (#7). 실행: 레포 폴더에서 node --test
// 완료 조건 중 화면 없이 확인할 수 있는 것: 단계가 모두 tips.js의 팁이고(문구는 팁 데이터에서만 옴),
// 수강편람에서 시작해 메뉴 단계를 따라가면 각 단계가 그 화면의 팁이며, 직접 누르는 단계는 서버 상태를 바꾸지 않는 것뿐이다
const test = require('node:test');
const assert = require('node:assert/strict');

const modes = {};
global.SG = { register: (name, mode) => { modes[name] = mode; } };
require('../extension/tips.js');
require('../extension/modes/tutorial.js');
const { steps } = modes.tutorial;
const tipOf = id => SG.tips.find(t => t.id === id);

test('모든 단계가 tips.js에 있는 팁이고, 화면에서 찾을 방법(find)이 있다', () => {
  assert.ok(steps.length > 0);
  for (const [id, how] of steps) {
    const tip = tipOf(id);
    assert.ok(tip, `tips.js에 없는 팁: ${id}`);
    assert.ok(Object.keys(tip.find).length, `find가 비어 화면에 안 뜨는 팁: ${id}`);
    assert.ok(['next', 'click'].includes(how), `알 수 없는 동작: ${id} ${how}`);
  }
});

test('직접 누르는 단계는 메뉴 이동이나 [조회]뿐이다 (실제 신청 버튼은 안 됨)', () => {
  for (const [id, how] of steps.filter(s => s[1] === 'click')) {
    const { find } = tipOf(id);
    assert.ok(find.menu || find.button === '조회', `누르게 하면 안 되는 단계: ${id}`);
  }
});

test('수강편람에서 시작해 메뉴 단계를 따라가면 각 단계가 그 화면(또는 공통)의 팁이다', () => {
  // [이전]으로 돌아갈 때도 이 화면 목록(screensOf)으로 이동한다
  const screens = modes.tutorial.screensOf(steps);
  steps.forEach(([id], i) => {
    const tip = tipOf(id);
    assert.ok(tip.screen === '공통' || tip.screen === screens[i], `${id}는 ${tip.screen} 팁인데 이때 화면은 ${screens[i]}`);
  });
  assert.deepEqual([...new Set(screens)], ['수강편람', '기본수업', '희망수업', '수강신청', '신청내역']);
});
