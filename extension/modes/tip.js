// 자유 팁 모드 (#6, 담당: 최지범) — 누른 요소의 팁을 말풍선으로 보여 준다. 실제 동작은 core가 막는다.
// 팁이 있는 요소는 마우스를 올리면 얇은 테두리와 "?" 배지가 생기고, 팁이 없는 요소는 눌러도 반응하지 않는다 (#16).
// 켜져 있는 동안 페이지 자체 호버(밑줄·배경색 등)는 끄고, 커서는 팁 있는 곳만 운영체제 도움말 커서·나머지는 기본 화살표 (SG.quiet).
// 테두리는 올릴 때마다 팁을 다시 찾으므로 [조회]·화면 이동으로 표를 다시 그려도 따로 할 일이 없다.
(() => {
  const onOver = e => SG.hover(e.target.closest?.('[data-sg]') ? null : SG.matchTip(e.target)?.el);
  const onOut = e => { if (!e.relatedTarget) SG.hover(null); }; // 창 밖으로 나가면 지움

  SG.register('tip', {
    label: '자유 팁',
    start() {
      SG.quiet(true);
      addEventListener('mouseover', onOver, true);
      addEventListener('mouseout', onOut, true);
      SG.modal({ title: '자유 팁', text: '궁금한 버튼이나 표의 칸에 마우스를 올려 보세요. 테두리가 생기는 곳을 누르면 설명이 떠요. 눌러도 실제로 동작하지 않습니다.' });
    },
    stop() {
      removeEventListener('mouseover', onOver, true);
      removeEventListener('mouseout', onOut, true);
      SG.quiet(false);
    },
    // 위쪽 메뉴·상세조회처럼 직접 눌러 보는 요소(SG.tryable)는 실제로 동작하게 둔다. 화면이 바뀌므로 떠 있던 말풍선은 닫는다
    allow(el, e) {
      if (!SG.tryable(el)) return false;
      if (e.type === 'click') SG.clear();
      return true;
    },
    blocked(target) {
      const hit = SG.matchTip(target);
      if (!hit) return SG.clear(); // 팁 없는 곳: 떠 있던 말풍선만 닫는다 (호버 테두리는 그대로)
      SG.highlight(hit.el, true); // 호버와 같은 모양 (얇은 테두리 + 배지)
      SG.bubble(hit.el, { title: hit.tip.title, text: hit.tip.text });
    },
  });
})();
