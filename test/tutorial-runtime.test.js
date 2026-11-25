// 튜토리얼을 실제로 시작하고 진행하며 검사한다. 브라우저 배치/학교 선택자는 별도 목업 확인 대상이다.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

class Element {
  constructor(tag, props = {}, ...children) {
    this.tagName = tag.toUpperCase();
    this.dataset = {};
    this.style = {};
    this.attributes = {};
    this.children = [];
    this.className = '';
    this.parentElement = null;
    this.classList = {
      contains: name => this.className.split(' ').includes(name),
      toggle: (name, on) => {
        const names = new Set(this.className.split(' ').filter(Boolean));
        if (on) names.add(name); else names.delete(name);
        this.className = [...names].join(' ');
      },
    };
    Object.assign(this, props);
    this.append(...children);
  }
  click() { this.clicks = (this.clicks || 0) + 1; }
  append(...children) {
    for (const child of children) {
      this.children.push(child);
      if (child instanceof Element) child.parentElement = this;
    }
  }
  replaceChildren(...children) { this.children = []; this.append(...children); }
  remove() {
    if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(child => child !== this);
    this.parentElement = null;
  }
  contains(node) { return this === node || this.children.some(child => child instanceof Element && child.contains(node)); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  scrollIntoView() {}
  focus() {}
  matches(selector) {
    return selector.split(',').some(part => {
      const rule = part.trim();
      if (rule === '.search-box') return this.classList.contains('search-box');
      if (rule === 'input:not([type])') return this.tagName === 'INPUT' && this.type === undefined;
      const match = rule.match(/^(input|select|option|textarea|button|label|td|th)(?:\[type=["']?([^\]"']+)["']?\])?$/);
      return !!match && this.tagName === match[1].toUpperCase() && (!match[2] || this.type === match[2]);
    });
  }
  closest(selector) { return this.matches(selector) ? this : this.parentElement?.closest(selector) || null; }
}

function descendants(root) {
  return [root, ...root.children.flatMap(child => child instanceof Element ? descendants(child) : [])];
}

function setup(initialScreen = '수강편람') {
  const state = { screen: initialScreen, menus: [], bubbles: [], modals: [], waits: [], missing: new Set(), failMenu: false, deferMenu: false, active: false };
  const nodes = new Map();
  const document = { head: new Element('head'), body: new Element('body') };
  const heading = new Element('h3');
  document.body.append(heading);
  document.querySelector = selector => selector === '#hyinContents h3' ? heading : null;
  const modes = {};
  function overlay(kind, target, options) {
    return new Promise(resolve => {
      const record = { target, options, resolve, screen: state.screen };
      state[kind + 's'].push(record);
      state[kind] = record;
    });
  }
  const SG = {
    register: (name, mode) => { modes[name] = mode; },
    el: (tag, props, ...children) => new Element(tag, props, ...children),
    screen: () => state.screen,
    goMenu: name => {
      state.menus.push(name);
      if (state.failMenu) return false;
      if (state.deferMenu) return true;
      state.screen = name;
      return true;
    },
    waitFor: predicate => new Promise((resolve, reject) => {
      state.waits.push({ predicate, resolve, reject });
    }),
    tipEl: tip => {
      if (state.missing.has(tip.id)) return null;
      if (!nodes.has(tip.id)) {
        const tag = tip.find.menu ? 'a' : tip.find.button ? 'button' : tip.find.column ? 'th' : 'div';
        const node = new Element(tag, { tip });
        if (tip.id === 'basic.hopeAdd') node.append(new Element('input', { type: 'button' }));
        // [조회]는 실제 화면처럼 검색 영역(.search-box) 안에 둔다 (튜토리얼은 그 영역의 조건 칸도 허용)
        if (tip.find.button === '조회') new Element('div', { className: 'search-box' }, node);
        nodes.set(tip.id, node);
      }
      return nodes.get(tip.id);
    },
    highlight: target => { state.highlight = target; },
    rows: () => [{}],
    cell: (_row, column) => column === '희망신청' ? SG.tipEl(modes.tutorial.tipOf('basic.hopeAdd')) : null,
    buttons: cell => cell.children.filter(node => node.tagName === 'INPUT'),
    unhighlight: () => { state.highlight = null; },
    bubble: (target, options) => overlay('bubble', target, options),
    modal: options => overlay('modal', null, options),
    clear: () => { state.highlight = state.bubble = state.modal = null; },
    bar: () => {},
    stop: () => { modes.tutorial.stop(); state.active = false; SG.clear(); },
    start: name => { SG.stop(); state.active = true; return modes[name].start(); },
  };
  const context = vm.createContext({ SG, document, console, setTimeout, clearTimeout });
  for (const file of ['extension/tips.js', 'extension/modes/tutorial.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context, { filename: file });
  }
  const mode = modes.tutorial;
  const flush = async () => {
    for (let count = 0; count < 5; count++) {
      for (const wait of [...state.waits]) {
        if (wait.predicate()) {
          state.waits.splice(state.waits.indexOf(wait), 1);
          wait.resolve();
        }
      }
      await new Promise(resolve => setImmediate(resolve));
    }
  };
  const start = async () => {
    if (state.active) SG.stop();
    state.active = true;
    const run = { settled: false, error: null };
    run.promise = mode.start().then(() => { run.settled = true; }, error => { run.error = error; run.settled = true; });
    await flush();
    assert.equal(run.error, null);
    return run;
  };
  const press = async label => {
    const shown = state.modal || state.bubble;
    assert.ok(shown, `표시된 안내가 없음: ${label}`);
    assert.ok((shown.options.buttons || ['확인']).includes(label), `버튼이 없음: ${label}`);
    shown.resolve(label);
    await flush();
  };
  const advance = async () => {
    const shown = state.bubble;
    assert.ok(shown, '진행할 팁이 없음');
    const buttons = shown.options.buttons || [];
    const next = buttons.includes('다음') ? '다음' : buttons.includes('완료') ? '완료' : null;
    if (next) return press(next);
    assert.equal(mode.allow(shown.target, { type: 'click' }), true);
    const menu = shown.target.tip?.find.menu;
    if (menu) state.screen = menu;
    await flush();
  };
  const expire = async () => {
    for (const wait of state.waits.splice(0)) wait.reject(new Error('시간 초과'));
    await flush();
  };
  return { state, mode, SG, document, heading, start, flush, press, advance, expire };
}

test('모든 시작 화면에서 수강편람으로 이동하고 팁 원문 그대로 마지막까지 진행한다', async t => {
  for (const entry of ['수강편람', '기본수업', '희망수업', '수강신청', '신청내역']) {
    await t.test(entry, async () => {
      const h = setup(entry);
      const run = await h.start();
      assert.equal(h.state.screen, '수강편람');
      assert.equal(h.state.menus[0], '수강편람', '이미 첫 화면이어도 메뉴 클릭으로 시작');
      for (const [index, [id]] of h.mode.steps.entries()) {
        const tip = h.mode.tipOf(id);
        assert.equal(h.state.bubble?.options.title, tip.title, id);
        assert.equal(h.state.bubble?.options.text, tip.text, id);
        const ui = descendants(h.document.body);
        const progress = ui.find(node => node.tagName === 'PROGRESS');
        assert.equal(progress.value, index + 1);
        assert.equal(progress.max, h.mode.steps.length);
        assert.equal(ui.find(node => node.classList?.contains('sg-step-count')).textContent, `튜토리얼 ${index + 1} / ${h.mode.steps.length}`);
        await h.advance();
      }
      assert.ok(h.state.modal, '마지막 단계 뒤 완료 안내');
      assert.equal(h.state.screen, '신청내역');
      await h.press('닫기');
      assert.equal(run.settled, true);
      assert.equal(run.error, null);
      assert.equal(h.state.active, false);
      assert.equal(h.document.head.children.length, 0);
      assert.equal(h.document.body.children.length, 1, '진행 패널이 정리됨');
    });
  }
});

test('조회와 초기화가 같은 칸에 있어도 조회 버튼만 강조하고 허용한다', async () => {
  const h = setup();
  const search = h.SG.tipEl(h.mode.tipOf('pyunram.search'));
  const reset = new Element('input', { type: 'button', value: '초기화' });
  search.parentElement.append(new Element('td', {}, reset, search));
  await h.start();
  assert.equal(h.state.bubble.target, search);
  assert.equal(h.mode.allow(reset, { type: 'click' }), false);
  assert.equal(h.mode.allow(search, { type: 'click' }), true);
  await h.flush();
  assert.equal(h.state.bubble.options.title, h.mode.tipOf('common.col.no').title);
  h.SG.stop();
});

test('[조회] 단계에서 [다음]을 누르면 조회를 대신 누른 뒤 넘어간다', async () => {
  const h = setup();
  const search = h.SG.tipEl(h.mode.tipOf('pyunram.search'));
  await h.start();
  assert.equal(h.state.bubble.target, search);
  await h.press('다음');
  assert.equal(search.clicks, 1);
  assert.equal(h.state.bubble.options.title, h.mode.tipOf('common.col.no').title);
  h.SG.stop();
});

test('버튼을 포함한 셀 전체를 안내하지만 신청 버튼 실행은 막는다', async () => {
  const h = setup();
  const button = new Element('input', { type: 'button' });
  const applied = new Element('td'); // 이미 신청해 [신청]이 없는 행
  const cell = new Element('td', {}, button);
  const rows = [new Element('tr', {}, applied), new Element('tr', {}, cell)];
  const cellOf = h.SG.cell;
  h.SG.rows = () => rows;
  h.SG.cell = (tr, column) => column === '수강신청' ? tr.children[0] : cellOf(tr, column);
  await h.start();
  const index = h.mode.steps.findIndex(([id]) => id === 'basic.apply');
  for (let i = 0; i < index; i++) await h.advance();
  assert.equal(h.state.bubble.options.title, h.mode.tipOf('basic.apply').title);
  assert.equal(h.state.bubble.target, cell);
  assert.equal(h.mode.allow(button, { type: 'click' }), false);
  assert.equal(h.mode.allow(cell, { type: 'click' }), false);
  h.SG.stop();
});

// 열 설명 단계(수업번호)에서 말풍선이 붙는 곳 (#34)
const columnTarget = async rows => {
  const h = setup();
  h.SG.rows = () => rows.map(td => new Element('tr', {}, td));
  h.SG.cell = tr => tr.children[0];
  await h.start();
  await h.advance();
  assert.equal(h.state.bubble.options.title, h.mode.tipOf('common.col.no').title);
  const target = h.state.bubble.target;
  h.SG.stop();
  return { h, target };
};

test('열 설명은 열 제목 대신 첫 행의 칸을 가리킨다', async () => {
  const first = new Element('td', { textContent: '10001', innerText: '10001' });
  const { target } = await columnTarget([first, new Element('td', { textContent: '10002', innerText: '10002' })]);
  assert.equal(target, first);
});

test('열 설명은 첫 행 칸이 비어 있으면 내용이 있는 다음 행의 칸을 가리킨다', async () => {
  const filled = new Element('td', { textContent: 'Y', innerText: 'Y' });
  const { target } = await columnTarget([
    new Element('td', { textContent: ' ', innerText: ' ' }),
    new Element('td', { textContent: '숨김', innerText: '' }), // 숨긴 글자만 있는 칸
    filled,
  ]);
  assert.equal(target, filled);
});

test('열 설명은 행이 없거나 모든 칸이 비어 있으면 열 제목을 가리킨다', async () => {
  for (const rows of [[], [new Element('td', { textContent: '', innerText: '' })]]) {
    const { h, target } = await columnTarget(rows);
    assert.equal(target, h.SG.tipEl(h.mode.tipOf('common.col.no')));
    assert.equal(target.tagName, 'TH');
  }
});

test('이전은 앞 화면으로 돌아가며 다시 진행하면 같은 메뉴를 한 번만 누른다', async () => {
  const h = setup();
  await h.start();
  const menuIndex = h.mode.steps.findIndex(([id]) => id === 'menu:기본수업');
  for (let i = 0; i <= menuIndex; i++) await h.advance();
  assert.equal(h.state.screen, '기본수업');
  await h.press('이전');
  assert.equal(h.state.screen, '수강편람');
  assert.equal(h.state.bubble.target.tip.id, 'menu:기본수업');
  const automaticMenus = h.state.menus.length;
  assert.equal(h.mode.allow(h.state.bubble.target, { type: 'click' }), true);
  h.state.screen = '기본수업';
  await h.flush();
  assert.equal(h.state.screen, '기본수업');
  assert.equal(h.state.bubble.target.tip.id, 'basic.apply');
  assert.equal(h.state.menus.length, automaticMenus, '사용자 메뉴 클릭을 goMenu로 중복 실행하지 않음');
  h.SG.stop();
});

test('다음 대기와 직접 클릭 대기에서 종료한 실행이 해소되고 재시작은 첫 단계부터 진행한다', async () => {
  for (const index of [1, 0]) { // 1: [다음] 대기, 0: [조회] 직접 클릭 대기
    const h = setup();
    const oldRun = await h.start();
    for (let i = 0; i < index; i++) await h.advance();
    h.SG.stop();
    await h.flush();
    assert.equal(oldRun.settled, true, `종료하지 못한 단계 ${index}`);
    assert.equal(h.state.bubble, null);
    assert.equal(h.document.head.children.length, 0);
    const newRun = await h.start();
    assert.equal(h.state.bubble.target.tip.id, 'pyunram.search');
    assert.equal(newRun.settled, false);
    h.SG.stop();
    await h.flush();
    assert.equal(newRun.settled, true);
  }
});

test('화면 이동을 기다리는 중 종료해도 실행이 즉시 해소되고 뒤늦은 응답은 재시작에 간섭하지 않는다', async () => {
  const h = setup('신청내역');
  h.state.deferMenu = true;
  const oldRun = await h.start();
  assert.ok(h.state.waits.length, '화면 이동 대기 중');
  h.SG.stop();
  await h.flush();
  assert.equal(oldRun.settled, true);
  h.state.deferMenu = false;
  const newRun = await h.start();
  await h.expire();
  assert.equal(h.state.bubble?.target.tip.id, 'pyunram.search');
  assert.equal(h.state.modal, null);
  assert.equal(newRun.settled, false);
  h.SG.stop();
});

test('완료 모달과 실패 모달에서 종료해도 실행이 대기 상태로 남지 않는다', async () => {
  for (const fail of [false, true]) {
    const h = setup();
    h.state.failMenu = fail;
    const run = await h.start();
    if (!fail) for (const _step of h.mode.steps) await h.advance();
    assert.ok(h.state.modal);
    h.SG.stop();
    await h.flush();
    assert.equal(run.settled, true);
    assert.equal(run.error, null);
    assert.equal(h.state.modal, null);
    assert.equal(h.document.head.children.length, 0);
    assert.equal(h.document.body.children.length, 1);
  }
});

test('이동 실패 후 재시도하면 첫 단계로 정상 복귀한다', async () => {
  const h = setup('신청내역');
  h.state.failMenu = true;
  const run = await h.start();
  await h.expire();
  assert.ok(h.state.modal, '화면 이동 실패 안내');
  const retry = h.state.modal.options.buttons.find(label => /다시|재시도/.test(label));
  assert.ok(retry, '재시도 버튼');
  h.state.failMenu = false;
  await h.press(retry);
  assert.equal(h.state.screen, '수강편람');
  assert.equal(h.state.bubble?.target.tip.id, 'pyunram.search');
  assert.equal(run.error, null);
  h.SG.stop();
});

test('열·이동 메뉴·마지막 요소가 없어도 원문을 생략하지 않고 다음 단계로 진행한다', async t => {
  for (const id of ['pyunram.search', 'common.col.no', 'menu:기본수업', 'done.type']) {
    await t.test(id, async () => {
      const h = setup();
      h.state.missing.add(id);
      await h.start();
      const index = h.mode.steps.findIndex(([stepId]) => stepId === id);
      for (let i = 0; i < index; i++) await h.advance();
      await h.expire();
      const tip = h.mode.tipOf(id);
      assert.equal(h.state.bubble?.target, h.heading);
      assert.equal(h.state.bubble.options.title, tip.title);
      assert.equal(h.state.bubble.options.text, tip.text);
      await h.advance();
      if (index === h.mode.steps.length - 1) assert.ok(h.state.modal);
      else assert.equal(h.state.bubble.target.tip.id, h.mode.steps[index + 1][0]);
      h.SG.stop();
    });
  }
});

test('없는 희망신청 칸은 다음과 이전 모두 자동으로 건너뛴다', async () => {
  const h = setup();
  h.state.missing.add('basic.hopeAdd'); // 희망신청 기간이 아니라 칸이 없는 기본수업
  await h.start();
  const index = h.mode.steps.findIndex(([id]) => id === 'basic.apply');
  for (let i = 0; i <= index; i++) { await h.advance(); await h.expire(); }
  assert.equal(h.state.bubble.target.tip.id, 'menu:희망수업');
  await h.press('이전');
  await h.expire();
  assert.equal(h.state.bubble.target.tip.id, 'basic.apply');
  h.SG.stop();
});

test('희망신청 열 제목만 있고 추가 버튼이 없어도 자동으로 건너뛴다', async () => {
  const h = setup();
  h.SG.tipEl(h.mode.tipOf('basic.hopeAdd')).replaceChildren();
  await h.start();
  const index = h.mode.steps.findIndex(([id]) => id === 'basic.apply');
  for (let i = 0; i <= index; i++) await h.advance();
  await h.expire();
  assert.equal(h.state.bubble.target.tip.id, 'menu:희망수업');
  await h.press('이전');
  await h.expire();
  assert.equal(h.state.bubble.target.tip.id, 'basic.apply');
  h.SG.stop();
});

test('[조회] 단계는 검색 영역의 안전한 입력만 허용하고 신청 버튼과 Enter 제출은 차단한다', async () => {
  const h = setup();
  await h.start();
  const filter = h.state.bubble.target.parentElement; // [조회]가 든 검색 영역
  const text = new Element('input', { type: 'text' });
  const select = new Element('select');
  const radio = new Element('input', { type: 'radio' });
  const checkbox = new Element('input', { type: 'checkbox' });
  const defaultInput = new Element('input');
  const apply = new Element('button', { textContent: '신청' });
  const wrappedLabel = new Element('label', { control: checkbox }, checkbox, new Element('span'));
  const radioLabel = new Element('label', { control: radio });
  const buttonLabel = new Element('label', { control: apply });
  const outsideInput = new Element('input', { type: 'text' });
  const outsideLabel = new Element('label', { control: outsideInput });
  filter.append(text, select, radio, defaultInput, apply, wrappedLabel, radioLabel, buttonLabel, outsideLabel);
  for (const input of [text, select, radio, checkbox, defaultInput, wrappedLabel, wrappedLabel.children[1], radioLabel]) {
    assert.equal(h.mode.allow(input, { type: 'click' }), true, input.tagName);
  }
  assert.equal(h.mode.allow(text, { type: 'keydown', key: 'Enter' }), false);
  assert.equal(h.mode.allow(text, { type: 'submit' }), false);
  assert.equal(h.mode.allow(apply, { type: 'click' }), false);
  assert.equal(h.mode.allow(buttonLabel, { type: 'click' }), false);
  assert.equal(h.mode.allow(outsideInput, { type: 'click' }), false);
  assert.equal(h.mode.allow(outsideLabel, { type: 'click' }), false);
  const search = h.state.bubble.target;
  assert.equal(h.mode.allow(search, { type: 'keydown', key: 'Enter' }), true);
  await h.flush();
  assert.equal(h.state.bubble.target, search, 'Enter keydown만으로 다음 단계로 넘어가지 않음');
  assert.equal(h.mode.allow(apply, { type: 'click' }), false);
  assert.equal(h.mode.allow(search, { type: 'click' }), true);
  await h.flush();
  assert.equal(h.state.bubble.target.tip.id, 'common.col.no');
  h.SG.stop();
});
