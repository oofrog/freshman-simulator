// 자유 팁 모드 (#6, 담당: 최지범) — 누른 요소의 팁을 말풍선으로 보여 준다. 실제 동작은 core가 막는다.
// 기존 데모(content.js)를 새 구조로 옮긴 최소 버전. 완료 조건(#6)은 팁 데이터가 채워진 뒤 확인.
SG.register('tip', {
  label: '자유 팁',
  start() {
    SG.modal({ title: '자유 팁', text: '궁금한 버튼이나 표의 칸을 눌러 보세요. 눌러도 실제로 동작하지 않습니다.' });
  },
  blocked(target) {
    const hit = SG.matchTip(target);
    SG.highlight(hit?.el || target);
    SG.bubble(hit?.el || target, hit
      ? { title: hit.tip.title, text: hit.tip.text }
      : { text: '이 요소에는 아직 설명이 없어요.' });
  },
});
