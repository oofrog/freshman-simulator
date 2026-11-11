// 자유 팁 모드 (#6, 담당: 최지범) — 누른 요소의 팁을 말풍선으로 보여 준다. 실제 동작은 core가 막는다.
// 팁이 있는 요소는 마우스를 올리면 점선 테두리가 생기고, 팁이 없는 요소는 눌러도 반응하지 않는다 (#16).
// 테두리는 올릴 때마다 팁을 다시 찾으므로 [조회]·화면 이동으로 표를 다시 그려도 따로 할 일이 없다.
(() => {
  const onOver = e => SG.hover(e.target.closest?.('[data-sg]') ? null : SG.matchTip(e.target)?.el);
  const onOut = e => { if (!e.relatedTarget) SG.hover(null); }; // 창 밖으로 나가면 지움

  SG.register('tip', {
    label: '자유 팁',
    start() {
      addEventListener('mouseover', onOver, true);
      addEventListener('mouseout', onOut, true);
      SG.modal({ title: '자유 팁', text: '궁금한 버튼이나 표의 칸에 마우스를 올려 보세요. 테두리가 생기는 곳을 누르면 설명이 떠요. 눌러도 실제로 동작하지 않습니다.' });
    },
    stop() {
      removeEventListener('mouseover', onOver, true);
      removeEventListener('mouseout', onOut, true);
    },
    blocked(target) {
      const hit = SG.matchTip(target);
      if (!hit) return SG.clear(); // 팁 없는 곳: 떠 있던 말풍선만 닫는다
      SG.highlight(hit.el);
      SG.bubble(hit.el, { title: hit.tip.title, text: hit.tip.text });
    },
  });
})();
