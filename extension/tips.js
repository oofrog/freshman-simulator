// 팁 데이터 (#3, 담당: 최지범) — 설명 문구는 여기에만 둔다. 자유 팁(#6)과 튜토리얼(#7)이 id로 가져다 쓴다.
//
// 형식: {
//   id:     '화면.요소' 형태의 고유 이름 (튜토리얼 단계에서 이 id를 씀)
//   screen: 화면 제목(수강편람·기본수업·희망수업·수강신청·신청내역) 또는 '공통'(모든 화면)
//   find:   요소 찾는 방법 — 하나만 쓴다
//           { button: '신청' }        버튼 글자 (공백 무시)
//           { menu: '희망수업' }      왼쪽 메뉴
//           { column: '희망인원' }    과목 표의 열 이름 (머리글과 그 열의 칸 모두)
//           { selector: '#edQuickSuupNo' }  위로 안 되면 CSS 선택자 (docs/selectors.md에 추가)
//   title, text: 말풍선 제목과 설명 (사실은 수강안내 원문과 대조, 모르는 건 쓰지 않는다)
//   source: 근거 — 수강안내 항목 번호 등. 사실 확인은 김형인
// }
// 같은 요소에 팁이 여러 개 맞으면 위에 있는 것이 먼저 쓰인다.
// selector는 누른 요소의 조상까지 거슬러 올라가며 맞춰 본다. 표(#gdMain)처럼 여러 칸을 감싸는 요소를 쓰면
// 팁이 없는 칸을 눌렀을 때 그 팁이 대신 뜨므로, 감싸는 요소 대신 그 화면에만 있는 작은 요소를 가리킨다.
// 화면별 팁은 위에, 여러 화면에 같은 열이 있는 공통 열 팁은 맨 아래에 둔다 (화면별 설명이 먼저 쓰이도록).
//
// 내용 원본: Figma "프레쉬맨시뮬레이터 팁 데이터" (2026-10-20 검토본). source의 "Figma N01" 등이 그 항목 번호.
//   검정 = 그대로 사용 / 파랑 = 사용하되 생략 검토 중 (주석 "파랑"으로 표시)
//   빨강(정보 모름·보충 필요)과 연결할 화면 요소를 아직 모르는 항목은 위에 "[보류]" 주석을 단다 — 확인되면 주석만 지운다.
//   find: {} 는 연결할 요소가 없어 화면에서 뜨지 않는 팁.
SG.tips = [
  // ---------- 공통: 위쪽 바·왼쪽 메뉴 (Figma 01) ----------
  {
    id: 'common.menu.pyunram',
    screen: '공통',
    find: { menu: '수강편람' },
    title: '수강편람',
    text: '개설 수업을 조건별로 찾아보는 메뉴예요. 조회한 수업이 자동으로 신청되는 것은 아니에요.',
    source: 'Figma N01 | ERICA 수강신청 프로그램 이용방법',
  },
  // 파랑: 생략 검토 중
  {
    id: 'common.menu.guide',
    screen: '공통',
    find: { menu: '수강안내' },
    title: '수강안내',
    text: '해당 학기의 신청 일정과 유의사항을 확인하는 메뉴예요. 신청 전에 ERICA 안내를 확인해 주세요.',
    source: 'Figma N02 | ERICA 수강신청 프로그램 이용방법',
  },
  {
    id: 'common.menu.basic',
    screen: '공통',
    find: { menu: '기본수업' },
    title: '기본수업',
    text: '내 소속 학과·반의 기본수업을 모아 보는 메뉴예요. 실제 신청 여부는 [신청내역]에서 확인해 주세요.',
    source: 'Figma N03 | ERICA 수강신청 프로그램 이용방법',
  },
  {
    id: 'common.menu.apply',
    screen: '공통',
    find: { menu: '수강신청' },
    title: '수강신청',
    text: '수업을 검색하고 실제 수강신청을 진행하는 메뉴예요. 본인의 신청 기간과 이수제한을 확인해 주세요.',
    source: 'Figma N04 | ERICA 수강신청 프로그램 이용방법, ERICA 수강신청 이수제한 안내',
  },
  {
    id: 'common.menu.hope',
    screen: '공통',
    find: { menu: '희망수업' },
    title: '희망수업',
    text: '관심 수업을 미리 담아 두는 메뉴예요. 담아 두기만 해서는 신청이 완료되지 않아요.',
    source: 'Figma N05 | ERICA 수강신청 프로그램 이용방법',
  },
  {
    id: 'common.menu.done',
    screen: '공통',
    find: { menu: '신청내역' },
    title: '신청내역',
    text: '실제로 신청된 과목을 확인하는 메뉴예요. 신청 후에는 과목과 적용 이수구분을 확인해 주세요.',
    source: 'Figma N06 | ERICA 수강신청 프로그램 이용방법',
  },
  {
    id: 'common.menu.graduation',
    screen: '공통',
    find: { menu: '졸업사정조회' },
    title: '졸업사정조회',
    text: '졸업요건별 이수 현황을 확인하는 메뉴예요. 학과별 별도 졸업요건도 함께 확인해 주세요.',
    source: 'Figma N08 | ERICA 2026 졸업요건 사전확인 안내',
  },
  {
    id: 'common.menu.volunteer',
    screen: '공통',
    find: { menu: '사회봉사' },
    title: '사회봉사',
    text: '사회봉사 교과목의 안내와 신청 관련 기능을 확인하는 메뉴예요. 일반 수업과 신청 일정이 다를 수 있어요.',
    source: 'Figma N10 | ERICA 포털 이용안내 사회봉사 기능',
  },
  // 파랑: 생략 검토 중
  {
    id: 'common.menu.keyword',
    screen: '공통',
    find: { menu: '키워드검색' },
    title: '키워드검색',
    text: '키워드로 정보를 찾는 메뉴예요. 어떤 정보를 검색하는지는 연결 화면의 안내를 확인해 주세요.',
    source: 'Figma N12 | 실제 화면 표시 확인',
  },
  {
    id: 'common.quick',
    screen: '공통',
    find: { selector: '#edQuickSuupNo, #btn_save_quick' },
    title: '수업번호 빠른 신청',
    text: '개별 수업의 수업번호를 입력해 바로 신청하는 기능이에요. 학수번호와 구분하고 신청 후 결과를 확인해 주세요.',
    source: 'Figma N16 | ERICA 수강신청 프로그램 이용방법',
  },
  {
    id: 'common.credit.min',
    screen: '공통',
    find: { selector: '#edMinHakjeom' },
    title: '최소학점',
    text: '이번 학기에 신청해야 하는 최소학점으로 표시된 값이에요. 본인의 학적과 해당 학기 기준을 확인해 주세요.',
    source: 'Figma N13 | ERICA 수강신청 프로그램 이용방법',
  },
  {
    id: 'common.credit.max',
    screen: '공통',
    find: { selector: '#edMaxHakjeom' },
    title: '최대학점',
    text: '이번 학기에 신청할 수 있는 최대학점으로 표시된 값이에요. 화면의 본인 적용값을 기준으로 확인해 주세요.',
    source: 'Figma N14 | ERICA 수강신청 프로그램 이용방법',
  },
  {
    id: 'common.credit.sum',
    screen: '공통',
    find: { selector: '#edSincheongHakjeom' },
    title: '신청학점',
    text: '현재 실제로 신청된 과목의 학점 합계를 확인하는 항목이에요. 희망수업의 후보 학점 합계와 구분해 주세요.',
    source: 'Figma N15 | ERICA 수강신청 프로그램 이용방법, 실제 화면 표시 확인',
  },
  // [보류] 연결할 화면 요소(선택자) 미확인
  {
    id: 'common.grade',
    screen: '공통',
    find: {},
    title: '학년 반',
    text: '현재 로그인한 학생의 학년·반 정보예요. 수업 목록의 대상 학년·반이나 검색 조건과 구분해 주세요.',
    source: 'Figma N18 | 실제 화면 표시 확인',
  },
  // [보류] 빨강(정보 모름·보충 필요)
  {
    id: 'common.menu.increase',
    screen: '공통',
    find: { menu: '증원신청내역' },
    title: '증원신청내역',
    text: '제출한 증원 요청과 처리 결과를 확인하는 메뉴예요. 요청 제출과 승인 확정은 구분해 주세요.',
    source: 'Figma N07 | 2026-2 ERICA 증원신청 공지, 실제 화면 표시 확인',
  },
  // [보류] 빨강(정보 모름·보충 필요)
  {
    id: 'common.menu.bachmaster',
    screen: '공통',
    find: { menu: '학석사공통신청' },
    title: '학석사공통신청',
    text: '학사·석사 공통교과목 신청 관련 메뉴예요. 이용 대상과 신청 조건은 해당 학기 안내에서 확인해 주세요.',
    source: 'Figma N09 | 실제 화면 표시 확인',
  },
  // [보류] 빨강(정보 모름·보충 필요)
  {
    id: 'common.menu.summer',
    screen: '공통',
    find: { menu: '국제여름/겨울학교' },
    title: '국제여름 겨울학교',
    text: '국제여름·겨울학교 관련 메뉴예요. 개설 강좌와 참가 자격, 신청 일정은 해당 프로그램 공지를 확인해 주세요.',
    source: 'Figma N11 | 국제여름학교·국제교류 안내(서울 운영 사례), 실제 화면 표시 확인',
  },
  // [보류] 빨강(정보 모름·보충 필요)
  {
    id: 'common.mock',
    screen: '공통',
    find: {},
    title: '모의수강 참여여부',
    text: '모의수강 참여 여부가 표시되는 항목이에요. 실제 수강신청 완료 여부와는 다른 정보예요.',
    source: 'Figma N17 | 실제 화면 표시 확인',
  },
  // ---------- 수강편람 (Figma 02) — 표 열 설명은 다른 화면에도 같은 열이 있어 맨 아래 공통 열로 ----------
  {
    id: 'pyunram.filter',
    screen: '수강편람',
    find: { selector: '.search-box' },
    title: '검색 필터',
    text: '원하는 조건으로 수업을 찾을 수 있어요. 조건을 고른 뒤 [조회]를 눌러 주세요.',
    source: 'Figma 01 | ERICA 수강신청 프로그램 이용방법, 실제 화면 표시 확인',
  },
  // 파랑: 생략 검토 중
  {
    id: 'pyunram.search',
    screen: '수강편람',
    find: { button: '조회' },
    title: '조회',
    text: '선택한 검색 조건에 맞는 수업 목록을 불러와요. 조건을 바꿨다면 [조회]를 다시 눌러 주세요.',
    source: 'Figma 07 | ERICA 수강신청 프로그램 이용방법, 실제 화면 표시 확인',
  },
  // ---------- 기본수업 (Figma 03) ----------
  // 파랑: 생략 검토 중
  {
    id: 'basic.list',
    screen: '기본수업',
    find: { selector: '#hyinContents h3' },
    title: '기본수업 조회',
    text: '내 소속 학과·반의 기본수업을 모아 보는 곳이에요. 목록에 있는 수업이 자동으로 신청되는 것은 아니에요.',
    source: 'Figma B01 | ERICA 수강신청 프로그램 이용방법, 실제 화면 표시 확인',
  },
  {
    id: 'basic.apply',
    screen: '기본수업',
    find: { column: '수강신청' },
    title: '수강신청의 신청 버튼',
    text: '해당 수업을 실제로 수강 신청하는 버튼이에요. 본인의 신청 기간과 조건을 확인한 뒤 신청하고, [신청내역]에서 결과를 확인해 주세요.',
    source: 'Figma B02 | ERICA 수강신청 프로그램 이용방법, 실제 화면 표시 확인',
  },
  {
    id: 'basic.hopeAdd',
    screen: '기본수업',
    find: { column: '희망신청' },
    title: '희망신청의 추가 버튼',
    text: '관심 있는 수업을 [희망수업]에 담는 버튼이에요. 담아 두기만 해서는 수강 신청이 완료되지 않아요. 신청 기간에 실제 신청을 따로 해 주세요.',
    source: 'Figma B03 | ERICA 수강신청 프로그램 이용방법, 실제 화면 표시 확인',
  },
  {
    id: 'basic.increase',
    screen: '기본수업',
    find: { column: '증원신청' },
    title: '증원신청의 신청 버튼',
    text: '해당 수업의 증원을 요청하는 버튼이에요. 요청만으로 수강 신청이 확정되지는 않아요. 대상과 신청 기간을 확인하고, 신청 후 승인 결과도 확인해 주세요.',
    source: 'Figma B04 | 2026-2 ERICA 증원신청 공지, 실제 화면 표시 확인',
  },
  // [보류] 빨강(정보 모름·보충 필요)
  {
    id: 'basic.increaseTarget',
    screen: '기본수업',
    find: { column: '증원신청대상자' },
    title: '증원신청 대상자',
    text: '증원을 신청할 수 있도록 지정된 학년·졸업예정자 등의 대상이 표시돼요. 본인이 해당하는지 확인한 뒤 증원신청을 진행해 주세요.',
    source: 'Figma B05 | 2026-2 ERICA 증원신청 공지, 실제 화면 표시 확인',
  },
  // [보류] 빨강(정보 모름·보충 필요)
  {
    id: 'basic.increaseNone',
    screen: '기본수업',
    find: {},
    title: '증원신청불가 대상자 미설정',
    text: '증원신청 대상이 설정되지 않아 신청할 수 없다는 안내예요. 일반 수강신청 가능 여부와는 별개이므로, 이 표시만으로 해당 수업을 들을 수 없다고 판단하지 마세요.',
    source: 'Figma B06 | 2026-2 ERICA 증원신청 공지, 실제 화면 표시 확인',
  },
  // [보류] 빨강(정보 모름·보충 필요)
  {
    id: 'basic.dongil',
    screen: '기본수업',
    find: { selector: '#btn_dongil' },
    title: '동일 대치 교과목 확인',
    text: '이전에 이수한 과목과 동일·대치 관계로 지정된 과목을 확인하는 버튼이에요. 재수강을 계획한다면 이름만 비교하지 말고, 지정 관계와 재수강 조건을 함께 확인해 주세요.',
    source: 'Figma B07 | ERICA 성적상승 재수강 안내, 2026-2 동일대치 버튼 설명(서울 공식 안내), 실제 화면 표시 확인',
  },
  // [보류] 빨강(정보 모름·보충 필요)
  {
    id: 'basic.timeUnset',
    screen: '기본수업',
    find: {},
    title: '시간미지정강좌',
    text: '수업시간에 ‘시간미지정강좌’로 표시된 항목이에요. 표시된 시간과 함께 강의계획서·수업 공지에서 실제 운영 일정을 확인해 주세요.',
    source: 'Figma BC03 | 실제 화면 표시 확인',
  },
  // [보류] 빨강(정보 모름·보충 필요)
  {
    id: 'basic.roomUnset',
    screen: '기본수업',
    find: {},
    title: '비지정 ERICA',
    text: '강의실이 구체적인 건물·호실로 표시되지 않은 상태예요. 온라인 수업이라고 단정하지 말고 강의계획서와 수업 공지에서 장소를 확인해 주세요.',
    source: 'Figma BC04 | 실제 화면 표시 확인',
  },
  // [보류] 빨강(정보 모름·보충 필요)
  {
    id: 'basic.english',
    screen: '기본수업',
    find: {},
    title: '영어전용E',
    text: '영어전용 강좌로 표시된 수업이에요. 수업·평가에 사용되는 언어와 세부 운영 방식은 강의계획서에서 확인해 주세요.',
    source: 'Figma BC05 | 한양대 수업방법 공동강의·영어전용 설명, 실제 화면 표시 확인',
  },
  // [보류] 빨강(정보 모름·보충 필요)
  {
    id: 'basic.coteach',
    screen: '기본수업',
    find: {},
    title: '공동강의',
    text: '여러 교강사가 함께 담당하는 수업으로 표시돼요. 교강사별 담당 내용과 진행 방식은 강의계획서에서 확인해 주세요.',
    source: 'Figma BC06 | 한양대 수업방법 공동강의·영어전용 설명, 실제 화면 표시 확인',
  },
  // ---------- 희망수업 (Figma 04) ----------
  {
    id: 'hope.apply',
    screen: '희망수업',
    find: { column: '수강신청' },
    title: '신청 버튼',
    text: '희망수업에 담긴 과목을 실제로 신청하는 버튼이에요. 신청 후에는 [신청내역]에서 결과를 확인해 주세요.',
    source: 'Figma H08 | ERICA 수강신청 프로그램 이용방법',
  },
  // 파랑: 생략 검토 중
  {
    id: 'hope.list',
    screen: '희망수업',
    find: { selector: '#hyinContents h3' },
    title: '희망수업 목록',
    text: '미리 담아 둔 관심 수업 목록이에요. 실제로 신청된 과목은 [신청내역]에서 따로 확인해 주세요.',
    source: 'Figma H01 | ERICA 수강신청 프로그램 이용방법',
  },
  // 파랑: 생략 검토 중
  {
    id: 'hope.check',
    screen: '희망수업',
    find: { selector: 'input[name=editBox]' },
    title: '과목 선택 체크박스',
    text: '시간표에서 함께 살펴볼 과목을 선택할 때 사용하는 항목이에요. 체크만으로 수강신청되지는 않아요.',
    source: 'Figma H02 | 실제 화면 표시 확인',
  },
  // 파랑: 생략 검토 중
  {
    id: 'hope.checkAll',
    screen: '희망수업',
    find: { selector: '#chooseAll' },
    title: '전체 선택 체크박스',
    text: '목록의 과목을 한꺼번에 선택하는 항목으로 보여요. 선택 범위를 확인한 뒤 기능을 이용해 주세요.',
    source: 'Figma H03 | 실제 화면 표시 확인',
  },
  {
    id: 'hope.timetable',
    screen: '희망수업',
    find: { button: '선택과목 시간표보기' },
    title: '선택과목 시간표보기',
    text: '선택한 과목의 시간표를 미리 살펴보는 버튼이에요. 실제 신청 완료 시간표와 구분해 주세요.',
    source: 'Figma H04 | 실제 화면 표시 확인',
  },
  {
    id: 'hope.total',
    screen: '희망수업',
    find: { selector: '#edGwamok, #edHakjeom' },
    title: '과목 수 학점 합계',
    text: '희망수업에 담긴 후보 과목 수와 학점 합계예요. 실제 신청된 학점이나 이번 학기 최대학점과는 구분해 주세요.',
    source: 'Figma H05 | ERICA 수강신청 프로그램 이용방법, 실제 화면 표시 확인',
  },
  {
    id: 'hope.notice',
    screen: '희망수업',
    find: { selector: '.notice' },
    title: '신청 전 최종 확인',
    text: '희망수업에 담은 뒤에도 수업시간이나 이수제한이 바뀔 수 있어요. 실제 신청 직전에 다시 확인해 주세요.',
    source: 'Figma H13 | 실제 화면 표시 확인',
  },
  {
    id: 'hope.enrolled',
    screen: '희망수업',
    find: { column: '신청인원' },
    title: '신청인원',
    text: '현재 수강을 신청한 인원으로 표시된 값이에요. 내 희망수업에 담긴 인원과는 구분해 주세요.',
    source: 'Figma H09 | 실제 화면 표시 확인',
  },
  {
    id: 'hope.cap',
    screen: '희망수업',
    find: { column: '제한인원' },
    title: '제한인원',
    text: '해당 수업의 수강 인원 제한으로 표시된 값이에요. 남은 자리뿐 아니라 이수제한과 신청 기간도 확인해 주세요.',
    source: 'Figma H10 | 실제 화면 표시 확인, ERICA 수강신청 이수제한 안내',
  },
  {
    id: 'hope.delete',
    screen: '희망수업',
    find: { button: '희망삭제' },
    title: '희망삭제',
    text: '이 과목을 희망수업 목록에서 빼는 버튼이에요. 이미 신청한 수업을 취소하는 기능과는 달라요.',
    source: 'Figma H12 | ERICA 수강신청 프로그램 이용방법',
  },
  // [보류] 빨강(정보 모름·보충 필요)
  {
    id: 'hope.order',
    screen: '희망수업',
    find: { column: '정렬순서' },
    title: '정렬순서',
    text: '목록에서 사용할 정렬 순서를 지정하는 항목이에요. 순서를 정해도 자동으로 신청되거나 우선권이 생기지는 않아요.',
    source: 'Figma H06 | 실제 화면 표시 확인',
  },
  // [보류] 빨강(정보 모름·보충 필요)
  {
    id: 'hope.orderSave',
    screen: '희망수업',
    find: { button: '정렬순서저장' },
    title: '정렬순서저장',
    text: '지정한 정렬 순서를 저장하는 버튼이에요. 정렬 저장은 실제 수강신청과 별개예요.',
    source: 'Figma H07 | 실제 화면 표시 확인',
  },
  // [보류] 빨강(정보 모름·보충 필요)
  {
    id: 'hope.hope',
    screen: '희망수업',
    find: { column: '희망인원' },
    title: '희망인원',
    text: '희망수업에 담은 인원으로 표시된 값이에요. 실제 신청인원이나 확정 경쟁률과는 달라요.',
    source: 'Figma H11 | 실제 화면 표시 확인',
  },
  // [보류] 빨강(정보 모름·보충 필요)
  {
    id: 'hope.retake',
    screen: '희망수업',
    find: { column: '재수강여부' },
    title: '재수강 여부',
    text: '해당 신청이 재수강으로 처리되는지 확인하는 항목이에요. 기존 성적과 동일·대치 관계도 함께 확인해 주세요.',
    source: 'Figma H14 | ERICA 성적상승 재수강 안내, 실제 화면 표시 확인',
  },
  // [보류] 빨강(정보 모름·보충 필요)
  {
    id: 'hope.retakeCode',
    screen: '희망수업',
    find: { column: '재수강학수번호' },
    title: '재수강 학수번호',
    text: '재수강과 연결되는 이전 교과목의 학수번호를 확인하는 항목이에요. 신청하려는 과목의 학수번호와 구분해 주세요.',
    source: 'Figma H15 | ERICA 성적상승 재수강 안내, 실제 화면 표시 확인',
  },
  // [보류] 빨강(정보 모름·보충 필요)
  {
    id: 'hope.retakeName',
    screen: '희망수업',
    find: { column: '재수강과목명' },
    title: '재수강 과목명',
    text: '재수강과 연결된 교과목명을 확인하는 항목이에요. 재수강 여부와 학수번호를 함께 확인해 주세요.',
    source: 'Figma H16 | ERICA 성적상승 재수강 안내, 실제 화면 표시 확인',
  },
  // ---------- 수강신청 (Figma 05) ----------
  // 파랑: 생략 검토 중
  {
    id: 'apply.screen',
    screen: '수강신청',
    find: { selector: '#hyinContents h3' },
    title: '수강신청 화면',
    text: '수업을 검색하고 실제 신청하는 화면이에요. 조회만 하거나 희망수업에 담는 것과는 달라요.',
    source: 'Figma A01 | ERICA 수강신청 프로그램 이용방법',
  },
  {
    id: 'apply.scope',
    screen: '수강신청',
    find: { selector: 'select[name=gubun]' },
    title: '공통과목 학과과목',
    text: '공통과목과 학과과목 등 검색 범위를 고르는 항목이에요. 졸업학점 인정 여부는 본인의 교육과정에서 따로 확인해 주세요.',
    source: 'Figma A07 | ERICA 수강신청 프로그램 이용방법, 실제 화면 표시 확인',
  },
  {
    id: 'apply.filter',
    screen: '수강신청',
    find: { selector: '.search-box' },
    title: '검색 조건',
    text: '조직·연도·학기·학년·과목명 등의 조건으로 수업을 찾을 수 있어요. ERICA와 원하는 학기가 맞는지 먼저 확인해 주세요.',
    source: 'Figma A02 | ERICA 수강신청 프로그램 이용방법, 실제 화면 표시 확인',
  },
  // 파랑: 생략 검토 중
  {
    id: 'apply.search',
    screen: '수강신청',
    find: { button: '조회' },
    title: '조회',
    text: '선택한 조건에 맞는 수업 목록을 불러오는 버튼이에요. 조건을 바꿨다면 다시 조회해 주세요.',
    source: 'Figma A03 | ERICA 수강신청 프로그램 이용방법, 실제 화면 표시 확인',
  },
  // 파랑: 생략 검토 중
  {
    id: 'apply.reset',
    screen: '수강신청',
    find: { button: '초기화' },
    title: '초기화',
    text: '검색 조건을 기본 상태로 되돌리는 버튼이에요. 신청된 과목을 취소하는 버튼과는 달라요.',
    source: 'Figma A04 | 실제 화면 표시 확인',
  },
  {
    id: 'apply.detail',
    screen: '수강신청',
    find: { button: '상세조회' },
    title: '상세조회',
    text: '추가 검색 조건을 확인하는 버튼이에요. 특수강좌 등 필요한 조건을 함께 확인해 주세요.',
    source: 'Figma A05 | ERICA 수강신청 프로그램 이용방법',
  },
  {
    id: 'apply.apply',
    screen: '수강신청',
    find: { column: '수강신청' },
    title: '수강신청 열',
    text: '해당 수업을 실제로 신청하는 열이에요. 신청 가능한 기간과 조건을 확인하고, 처리 후 [신청내역]에서 결과를 확인해 주세요.',
    source: 'Figma A08 | ERICA 수강신청 프로그램 이용방법',
  },
  {
    id: 'apply.increase',
    screen: '수강신청',
    find: { column: '증원신청' },
    title: '증원신청 열',
    text: '교강사가 허용한 수업에 증원을 요청하는 열이에요. 요청만으로 수강이 확정되지는 않아요.',
    source: 'Figma A09 | 2026-2 ERICA 증원신청 공지',
  },
  {
    id: 'apply.hopeAdd',
    screen: '수강신청',
    find: { column: '희망신청' },
    title: '희망신청 열',
    text: '관심 수업을 희망수업 목록에 담는 열이에요. 좌석 예약이나 실제 수강신청 완료를 의미하지 않아요.',
    source: 'Figma A11 | ERICA 수강신청 프로그램 이용방법',
  },
  // 파랑: 생략 검토 중
  {
    id: 'apply.empty',
    screen: '수강신청',
    find: { selector: '#gdMain td.empty' },
    title: '조회 결과 없음',
    text: '아직 조회하지 않았거나 조건에 맞는 결과가 없다는 안내예요. 먼저 조회하고 검색 조건을 다시 확인해 주세요.',
    source: 'Figma A12 | 실제 화면 표시 확인',
  },
  // [보류] 스크롤 막대만 가리킬 요소가 없음 (.grid-wrap은 표 전체를 감싸서 팁 없는 칸을 누르면 이 팁이 뜸)
  {
    id: 'apply.scroll',
    screen: '수강신청',
    find: {},
    title: '가로 스크롤',
    text: '표의 오른쪽에 더 있는 항목을 확인할 수 있어요. 이수제한·과목상세 정보 등 숨겨진 열도 확인해 주세요.',
    source: 'Figma A13 | 실제 화면 표시 확인',
  },
  // [보류] 빨강(정보 모름·보충 필요)
  {
    id: 'apply.special',
    screen: '수강신청',
    find: {},
    title: '특수강좌 필터',
    text: '영어강의·E-러닝·SMART-F·B·PBL 등 표시된 유형을 조건으로 찾을 수 있어요. 실제 운영 방식은 강의계획서에서 확인해 주세요.',
    source: 'Figma A06 | ERICA 수강신청 프로그램 이용방법, ERICA 온라인 및 SMART-F 강좌 정의, 실제 화면 표시 확인',
  },
  // [보류] 빨강(정보 모름·보충 필요)
  {
    id: 'apply.increaseTarget',
    screen: '수강신청',
    find: { column: '증원신청대상자' },
    title: '증원신청 대상자',
    text: '교강사가 지정한 증원 요청 대상을 표시해요. 일반 이수제한과 함께 본인이 대상인지 확인해 주세요.',
    source: 'Figma A10 | 2026-2 ERICA 증원신청 공지, 실제 화면 표시 확인',
  },
  // ---------- 신청내역 (Figma 06) ----------
  // 파랑: 생략 검토 중
  {
    id: 'done.list',
    screen: '신청내역',
    find: { selector: '#hyinContents h3' },
    title: '신청내역 목록',
    text: '수강신청이 완료된 과목을 확인하는 화면이에요. 희망수업 목록과 구분해 신청 결과를 확인해 주세요.',
    source: 'Figma C01 | ERICA 수강신청 프로그램 이용방법',
  },
  {
    id: 'done.cancel',
    screen: '신청내역',
    find: { button: '수강취소' },
    title: '수강취소',
    text: '이미 신청한 수업을 취소하는 버튼이에요. 취소 가능 기간과 제한을 확인하고, 처리 후 신청내역을 다시 확인해 주세요.',
    source: 'Figma C02 | ERICA 수강신청 프로그램 이용방법, 2026-2 ERICA 증원신청 공지',
  },
  {
    id: 'done.type',
    screen: '신청내역',
    find: { column: '이수구분' },
    title: '적용 이수구분 확인',
    text: '신청한 과목이 본인에게 어떤 이수구분으로 적용되는지 확인해 주세요. 다전공생은 적용 예정 이수구분도 확인해야 해요.',
    source: 'Figma C06 | 실제 화면 표시 확인, ERICA 2026 졸업요건 사전확인 안내',
  },
  {
    id: 'done.time',
    screen: '신청내역',
    find: { column: '수업시간' },
    title: '최종 수업시간 강의실',
    text: '최종 신청된 과목의 요일·시간·강의실을 함께 확인해 주세요. 서로 다른 요일에 장소가 달라질 수 있어요.',
    source: 'Figma C09 | 실제 화면 표시 확인',
  },
  // [보류] 연결할 화면 요소(선택자) 미확인
  {
    id: 'done.volunteer',
    screen: '신청내역',
    find: {},
    title: '사회봉사 제외 안내',
    text: '이 화면의 신청내역에는 사회봉사 과목이 포함되지 않는다고 안내돼요. 사회봉사는 해당 메뉴에서 별도로 확인해 주세요.',
    source: 'Figma C07 | 실제 화면 표시 확인, ERICA 포털 이용안내 사회봉사 기능',
  },
  // [보류] 빨강(정보 모름·보충 필요)
  {
    id: 'done.retake',
    screen: '신청내역',
    find: { column: '재수강여부' },
    title: '재수강 여부',
    text: '해당 수업이 재수강으로 처리됐는지 확인하는 항목이에요. 일반수강과 잘못 선택되지 않았는지 확인해 주세요.',
    source: 'Figma C03 | ERICA 성적상승 재수강 안내, 실제 화면 표시 확인',
  },
  // [보류] 빨강(정보 모름·보충 필요)
  {
    id: 'done.retakeCode',
    screen: '신청내역',
    find: { column: '재수강학수번호' },
    title: '재수강 학수번호',
    text: '재수강과 연결된 교과목 코드를 확인하는 항목이에요. 재수강 대상 과목이 맞는지 함께 살펴봐 주세요.',
    source: 'Figma C04 | ERICA 성적상승 재수강 안내, 실제 화면 표시 확인',
  },
  // [보류] 빨강(정보 모름·보충 필요)
  {
    id: 'done.retakeName',
    screen: '신청내역',
    find: { column: '재수강과목명' },
    title: '재수강 과목명',
    text: '재수강과 연결된 교과목 이름을 확인하는 항목이에요. 재수강 여부와 코드까지 함께 확인해 주세요.',
    source: 'Figma C05 | ERICA 성적상승 재수강 안내, 실제 화면 표시 확인',
  },
  // [보류] 빨강(정보 모름·보충 필요)
  {
    id: 'done.print',
    screen: '신청내역',
    find: { button: '신청과목시간표확인' },
    title: '신청과목시간표확인 고지서출력',
    text: '신청한 과목의 시간표와 수강신청 확인서 등을 확인·출력하는 버튼이에요. 필요한 출력 종류는 팝업에서 선택해 주세요.',
    source: 'Figma C08 | ERICA 학사 FAQ 수강신청 확인서 출력',
  },
  // ---------- 공통: 과목 표의 열 (Figma 02 수강편람·03 기본수업) — 같은 열이 있는 모든 화면에서 쓰임 ----------
  {
    id: 'common.col.year',
    screen: '공통',
    find: { column: '학년' },
    title: '학년',
    text: '해당 수업의 대상 학년을 나타내요. 신청 가능 여부는 학년별 신청 일정과 [이수제한 여부]에서 확인해 주세요.',
    source: 'Figma 02 | ERICA 수강신청 이수제한 안내, 2026 LIONS칼리지 신입생 OT 자료, 실제 화면 표시 확인',
  },
  {
    id: 'common.col.type',
    screen: '공통',
    find: { column: '이수구분' },
    title: '이수구분',
    text: '이 과목이 전공·교양·필수·선택 중 어떤 구분에 속하는지 나타내요. 본인에게 적용되는 구분은 [신청내역]과 졸업요건에서 확인해 주세요.',
    source: 'Figma 04 | 2026 LIONS칼리지 신입생 OT 자료, 실제 화면 표시 확인',
  },
  {
    id: 'common.col.no',
    screen: '공통',
    find: { column: '수업번호' },
    title: '수업번호',
    text: '이번 학기에 개설된 개별 수업을 구분하는 번호예요. 수업번호를 누르면 강의계획서를 확인할 수 있어요.',
    source: 'Figma 08 | ERICA 수강신청 프로그램 이용방법, 2026 LIONS칼리지 신입생 OT 자료, 실제 화면 표시 확인',
  },
  {
    id: 'common.col.code',
    screen: '공통',
    find: { column: '학수번호' },
    title: '학수번호',
    text: '교과목을 구분하는 코드예요. 같은 교과목이라도 분반마다 수업번호는 달라요.',
    source: 'Figma 09 | ERICA 수강신청 프로그램 이용방법, 실제 화면 표시 확인',
  },
  // 파랑: 생략 검토 중
  {
    id: 'common.col.oldName',
    screen: '공통',
    find: { column: '(변경전)교과목명' },
    title: '변경전 교과목명',
    text: '이름이 변경된 교과목의 이전 이름이에요. 과거에 들은 과목과 비교할 때 참고해 주세요.',
    source: 'Figma 10 | 실제 화면 표시 확인',
  },
  {
    id: 'common.col.name',
    screen: '공통',
    find: { column: '교과목명' },
    title: '교과목명',
    text: '교과목명을 누르면 교과목 개요서를 확인할 수 있어요. 같은 이름의 수업이 여러 개라면 수업번호·교강사·수업시간을 함께 확인해 주세요.',
    source: 'Figma 11 | ERICA 수강신청 프로그램 이용방법, 실제 화면 표시 확인',
  },
  // 파랑: 생략 검토 중
  {
    id: 'common.col.preview',
    screen: '공통',
    find: { column: '강좌미리보기' },
    title: '강좌 미리보기',
    text: '미리보기가 등록된 강좌의 소개 자료를 확인할 수 있어요.',
    source: 'Figma 12 | 실제 화면 표시 확인',
  },
  {
    id: 'common.col.guide',
    screen: '공통',
    find: { column: '과목안내' },
    title: '과목안내',
    text: '수강 대상 반이나 신청 전 유의사항 등 과목별 안내가 표시돼요. 내용이 있으면 신청 전에 확인해 주세요.',
    source: 'Figma 13 | 2026 LIONS칼리지 신입생 OT 자료, 실제 화면 표시 확인',
  },
  // 파랑: 생략 검토 중
  {
    id: 'common.col.degree',
    screen: '공통',
    find: { column: '학위과정' },
    title: '학위과정',
    text: '이 수업이 학사·석사 등 어떤 학위과정에 개설됐는지 나타내요.',
    source: 'Figma 15 | 2026 LIONS칼리지 신입생 OT 자료, 실제 화면 표시 확인',
  },
  // 파랑: 생략 검토 중
  {
    id: 'common.col.prof',
    screen: '공통',
    find: { column: '교강사' },
    title: '교강사',
    text: '해당 수업을 담당하는 교수님이나 강사 이름이에요. 같은 과목이라도 담당 교강사가 다를 수 있으니 수업번호와 함께 확인해 주세요.',
    source: 'Figma BC01 | 실제 화면 표시 확인',
  },
  {
    id: 'common.col.credit',
    screen: '공통',
    find: { column: '학점' },
    title: '학점',
    text: '이 과목을 이수했을 때 인정받는 학점이에요. 성적의 평점과는 다른 값이에요.',
    source: 'Figma 16 | ERICA 성적처리 안내, 실제 화면 표시 확인',
  },
  {
    id: 'common.col.lecLab',
    screen: '공통',
    find: { column: '강의' },
    title: '강의 실습',
    text: '한 주에 배정된 강의·실습 시간을 나타내요. 수업을 여는 횟수와는 달라요. 실제 요일과 시간은 [수업시간]에서 확인해 주세요.',
    source: 'Figma 17 | 한양대 교과과정 강의·실습시간 표기, 실제 화면 표시 확인',
  },
  {
    id: 'common.col.style',
    screen: '공통',
    find: { column: '강좌유형' },
    title: '강좌유형',
    text: '수업을 운영하는 방식을 나타내요. 팀티칭은 여러 교강사가 요일별로, 옴니버스는 주차별로 나누어 강의하는 방식이에요.',
    source: 'Figma 18 | 한양대 수업 안내 팀티칭·옴니버스 정의, 실제 화면 표시 확인',
  },
  {
    id: 'common.col.seat',
    screen: '공통',
    find: { column: '수강/정원' },
    title: '수강 정원',
    text: '왼쪽은 수강 신청 인원, 오른쪽은 정원이에요. 정원이 차면 일반 신청이 어려워요. 증원을 원하면 해당 학기의 증원신청 안내를 확인해 주세요.',
    source: 'Figma 19 | ERICA 수강신청 이수제한 안내, 2026-2 ERICA 증원신청 공지, 실제 화면 표시 확인',
  },
  {
    id: 'common.col.time',
    screen: '공통',
    find: { column: '수업시간' },
    title: '수업시간',
    text: '수업이 열리는 요일과 시간이에요. 다른 수업과 시간이 겹치지 않는지 확인해 주세요.',
    source: 'Figma 21 | 2026 LIONS칼리지 신입생 OT 자료, 실제 화면 표시 확인',
  },
  {
    id: 'common.col.room',
    screen: '공통',
    find: { column: '강의실' },
    title: '강의실',
    text: '수업이 열리는 캠퍼스·건물·호실이에요. 요일마다 장소가 다를 수 있으니 수업시간과 짝지어 확인하고, 변경 공지도 확인해 주세요.',
    source: 'Figma BC02 | 실제 화면 표시 확인',
  },
  {
    id: 'common.col.limit',
    screen: '공통',
    find: { column: '이수제한 여부' },
    title: '이수제한 여부',
    text: '학과·학년 등 수강 대상에 제한이 있는지 확인하는 항목이에요. ○ 또는 [신청불가] 표시를 누르면 제한 내용을 확인할 수 있어요.',
    source: 'Figma 22 | ERICA 수강신청 이수제한 안내, 2026 LIONS칼리지 신입생 OT 자료, 실제 화면 표시 확인',
  },
  {
    id: 'common.col.detail',
    screen: '공통',
    find: { column: '과목상세정보' },
    title: '과목상세 정보',
    text: '수업의 특수강좌 유형과 성적부여형태 등을 확인할 수 있어요. SMART-F는 온라인과 대면을 병행하는 수업이에요. P/F는 통과·탈락으로 성적을 부여하는 방식이에요.',
    source: 'Figma 23 | ERICA 성적처리 안내, ERICA 온라인 및 SMART-F 강좌 정의, 실제 화면 표시 확인',
  },
  // 파랑: 생략 검토 중
  {
    id: 'common.col.dept',
    screen: '공통',
    find: { column: '설강학과' },
    title: '설강학과',
    text: '해당 수업이 개설된 학과나 부서예요. 수강 가능 여부는 [이수제한 여부]에서 따로 확인해 주세요.',
    source: 'Figma 25 | 2026 LIONS칼리지 신입생 OT 자료, 실제 화면 표시 확인',
  },
  {
    id: 'common.col.manageDept',
    screen: '공통',
    find: { column: '관장학과' },
    title: '관장학과',
    text: '해당 과목을 관리하는 학과나 부서예요. 이수제한 등 과목 관련 문의가 있다면 확인해 주세요.',
    source: 'Figma 26 | ERICA 수강신청 이수제한 안내, 한양대 공통기초과목 관장학과 문의 안내(서울 사례), 실제 화면 표시 확인',
  },
  // [보류] 빨강(정보 모름·보충 필요)
  {
    id: 'common.col.cls',
    screen: '공통',
    find: { column: '반' },
    title: '반',
    text: '해당 수업의 반을 구분하는 번호예요. 학과·반별로 지정된 수업이 있는지 [기본수업]과 [과목안내]를 확인해 주세요.',
    source: 'Figma 03 | ERICA 수강신청 프로그램 이용방법, 2026 LIONS칼리지 신입생 OT 자료, 실제 화면 표시 확인',
  },
  // [보류] 빨강(정보 모름·보충 필요)
  {
    id: 'common.col.unit',
    screen: '공통',
    find: { column: '이수단위' },
    title: '이수단위',
    text: '교과목의 수준과 이수 체계를 나타내는 항목이에요. 자세한 기준은 해당 학과의 교육과정 안내를 확인해 주세요.',
    source: 'Figma 05 | 서울 학사안내 이수단위·6C 정의, 실제 화면 표시 확인',
  },
  // [보류] 빨강(정보 모름·보충 필요)
  {
    id: 'common.col.area',
    screen: '공통',
    find: { column: '영역' },
    title: '영역',
    text: '교과목이 속한 영역을 나타내요. 필요한 영역을 이수했는지는 본인의 교육과정과 졸업요건을 함께 확인해 주세요.',
    source: 'Figma 06 | 2026 LIONS칼리지 신입생 OT 자료, 실제 화면 표시 확인',
  },
  // [보류] 빨강(정보 모름·보충 필요)
  {
    id: 'common.col.abeek',
    screen: '공통',
    find: { column: '공학인증구분' },
    title: '공학인증 구분',
    text: '공학교육인증과 관련된 과목인지 나타내요. 인증과정을 이수 중이라면 소속 학과의 인증 이수 기준을 함께 확인해 주세요.',
    source: 'Figma 14 | 2026 LIONS칼리지 신입생 OT 자료, ERICA 2026-2 공학교육인증 공지, 실제 화면 표시 확인',
  },
  // [보류] 빨강(정보 모름·보충 필요)
  {
    id: 'common.col.form',
    screen: '공통',
    find: { column: '수업형태' },
    title: '수업형태',
    text: '대면·원격 등 수업이 진행되는 형태를 나타내요. 비어 있다면 강의계획서와 수업 공지에서 운영 방식을 확인해 주세요.',
    source: 'Figma 20 | 2026 LIONS칼리지 신입생 OT 자료, 실제 화면 표시 확인',
  },
  // [보류] 빨강(정보 모름·보충 필요)
  {
    id: 'common.col.6c',
    screen: '공통',
    find: { column: '6C핵심역량' },
    title: '6C핵심역량',
    text: '교과목과 연결된 핵심역량을 나타내요. 어떤 역량을 기르는 수업인지 참고할 수 있어요.',
    source: 'Figma 24 | 서울 학사안내 이수단위·6C 정의, 실제 화면 표시 확인',
  },
];
