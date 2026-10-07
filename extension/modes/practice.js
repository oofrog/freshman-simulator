// 실전 재현 모드 (#8·#9, 담당: 박태현)
// 지금은 Walking Skeleton: 희망수업 화면의 [신청] 버튼을 가짜 버튼으로 바꾸고, 누르면 "신청 성공" 모달.
// TODO(#8): 시작 카운트다운, SG.cell(tr, '희망인원') / SG.cell(tr, '제한인원')으로 과목별 마감 시각 계산
// TODO(#9): 마감 후 클릭 시 정원 마감 모달, 연습 종료 후 결과 요약
(() => {
  let swapped = []; // [실제 버튼, 원래 display, 가짜 버튼]

  SG.register('practice', {
    label: '실전 재현',
    async start() {
      if (SG.screen() !== '희망수업') {
        SG.goMenu('희망수업');
        await SG.waitFor(() => SG.screen() === '희망수업' && SG.rows().length);
      }
      for (const tr of SG.rows()) {
        const real = SG.findButton(tr, '신청');
        if (!real) continue;
        const name = SG.cell(tr, '교과목명')?.textContent.trim() || '이 과목';
        const fake = SG.el('button', {
          className: 'sg-btn on',
          textContent: '신청',
          onclick: () => SG.modal({ title: '신청 성공 (연습)', text: `${name} 신청에 성공했습니다.` }),
        });
        swapped.push([real, real.style.display, fake]);
        real.style.display = 'none';
        real.after(fake);
      }
      if (!swapped.length) throw new Error('희망수업에 신청할 과목이 없어요. 과목을 먼저 담아 주세요.');
    },
    stop() {
      swapped.forEach(([real, display, fake]) => { real.style.display = display; fake.remove(); });
      swapped = [];
    },
  });
})();
