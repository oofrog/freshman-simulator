// 실전 재현 엔진 (#8, 담당: 박태현) — 과목별 마감 시각·남은 자리 계산. 화면을 읽지 않는 순수 함수만 둔다.
// 같은 입력이면 항상 같은 결과 (무작위·현재 시각을 쓰지 않음). 판정 스크립트: test/engine.test.js
// 브라우저에서는 SG.engine, 판정 스크립트(node)에서는 require로 쓴다.
(() => {
  // 희망자가 전부 신청하지는 않는다 (플랜 B로 담아 둔 사람, 다른 과목을 먼저 잡은 사람 등).
  // 실제로 신청하는 인원 = 희망인원 × show. 이 인원이 제한인원 이하면 마감되지 않는다 (예: 정원 50에 희망 55)
  // 신청이 열리면 신청할 사람이 한꺼번에 몰리고 갈수록 줄어든다: t초까지 신청한 인원 = 희망인원 × show × (1 − 2^(−t / half))
  // half = 신청할 사람의 절반이 신청을 마치는 시간(초).
  // 둘 다 근거 데이터가 없는 임시값. 실제 자료가 생기면 이 두 값만 고친다 (docs/real-screen.md "아직 필요한 데이터" 1번).
  // - show: 꽉 차지 않은 과목의 최종 신청인원 ÷ 희망인원 평균
  // - half: 마감된 과목마다 마감(초) ÷ log2(수요 ÷ (수요 − 제한)) 평균 (수요 = 희망 × show)
  const MODEL = { half: 5, show: 0.8 };

  // 시작 후 몇 초에 마감되는지. 마감되지 않으면 Infinity, 제한 0이면 처음부터 마감.
  // 경쟁률이 높을수록 빠르다. 희망·제한 대신 그 비율로 계산해서 경쟁률이 같은 과목은 정확히 같은 시각에 마감된다
  const closeSec = (hope, cap) => {
    if (cap <= 0) return 0;
    const fill = cap / hope / MODEL.show; // 신청할 사람 중 자리를 얻는 몫. 1 이상이면 다 들어가서 마감되지 않는다
    return fill < 1 ? -MODEL.half * Math.log2(1 - fill) : Infinity;
  };

  // 시작 후 t초의 남은 자리 (t ≤ 0은 시작 전). closeSec 전에는 1 이상, closeSec부터 0이 되도록 맞춘다
  const seatsLeft = (hope, cap, t) => {
    if (cap <= 0 || t >= closeSec(hope, cap)) return 0;
    if (t <= 0) return cap;
    return cap - Math.min(cap - 1, Math.floor(hope * MODEL.show * (1 - 2 ** (-t / MODEL.half))));
  };

  const engine = { MODEL, closeSec, seatsLeft };
  if (globalThis.SG) SG.engine = engine;
  else module.exports = engine;
})();
