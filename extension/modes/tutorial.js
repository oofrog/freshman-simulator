// 신입생 튜토리얼 모드 (#7, 담당: 최지범)
// 지금은 뼈대: 수강편람으로 이동 → STEPS의 팁을 차례로 강조하고 말풍선의 [다음]으로 넘어감 → 끝 모달.
// TODO(#7): 단계 구성 (수강편람 → 기본수업 → 희망수업 → 수강신청), 단계 사이 화면 이동(SG.goMenu + SG.waitFor),
//           "사용자가 직접 눌러서 넘어가기"(allow로 해당 요소만 클릭 허용), 진행 표시(3/12 등)
(() => {
  // 단계 = tips.js의 팁 id. 문구는 tips.js에만 둔다.
  const STEPS = ['common.menu.hope', 'common.col.limit'];

  SG.register('tutorial', {
    label: '튜토리얼',
    async start() {
      if (SG.screen() !== '수강편람') {
        SG.goMenu('수강편람');
        await SG.waitFor(() => SG.screen() === '수강편람');
      }
      for (const id of STEPS) {
        const tip = SG.tips.find(t => t.id === id);
        const el = tip && SG.tipEl(tip);
        if (!el) continue; // 이 화면에 없는 요소는 건너뜀
        SG.highlight(el);
        await SG.bubble(el, { title: tip.title, text: tip.text, buttons: ['다음'] });
      }
      SG.unhighlight();
      await SG.modal({ title: '튜토리얼 끝', text: '궁금한 부분은 [자유 팁]에서 언제든 다시 볼 수 있어요.' });
      SG.stop();
    },
  });
})();
