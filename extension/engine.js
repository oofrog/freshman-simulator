// 실전 재현 엔진 (#8, 담당: 박태현) — 과목별 마감 시각·남은 자리 계산. 화면을 읽지 않는 순수 함수만 둔다.
// 같은 입력이면 항상 같은 결과 (무작위·현재 시각을 쓰지 않음). 판정 스크립트: test/engine.test.js
// 브라우저에서는 SG.engine, 판정 스크립트(node)에서는 require로 쓴다.
(() => {
  // 신청이 열리면 희망자가 한꺼번에 몰리고 갈수록 줄어든다: t초까지 신청한 인원 = 희망인원 × (1 − 2^(−t / half))
  // half = 희망자의 절반이 신청을 마치는 시간(초). 경쟁률 2:1 과목이 딱 이 시간에 마감된다.
  // 근거 데이터가 없는 임시값 — 실제 마감 시간 자료가 생기면 half만 고친다.
  // 과목마다 half = 마감(초) ÷ log2(희망 ÷ (희망 − 제한))를 구해 평균 내면 된다 (docs/real-screen.md "아직 필요한 데이터" 1번).
  const MODEL = { half: 5 };

  // 시작 후 몇 초에 마감되는지. 경쟁률(희망 / 제한)이 높을수록 빠르고, 희망 ≤ 제한이면 마감되지 않는다(Infinity). 제한 0이면 처음부터 마감
  const closeSec = (hope, cap) => cap <= 0 ? 0 : hope > cap ? MODEL.half * Math.log2(hope / (hope - cap)) : Infinity;

  // 시작 후 t초의 남은 자리 (t ≤ 0은 시작 전). closeSec 전에는 1 이상, closeSec부터 0이 되도록 맞춘다
  const seatsLeft = (hope, cap, t) => {
    if (cap <= 0 || t >= closeSec(hope, cap)) return 0;
    if (t <= 0) return cap;
    return cap - Math.min(cap - 1, Math.floor(hope * (1 - 2 ** (-t / MODEL.half))));
  };

  const engine = { MODEL, closeSec, seatsLeft };
  if (globalThis.SG) SG.engine = engine;
  else module.exports = engine;
})();
