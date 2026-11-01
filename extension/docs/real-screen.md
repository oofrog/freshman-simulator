# 실제 화면 정리 (#8)

실전 재현이 따라 해야 할 실제 수강신청 화면의 모양과 동작.
확인일: 2026-10-14 (2026-2학기 실제 화면, 수강신청 기간 아님). 신청·삭제 버튼은 누르지 않고 화면 구조와 이미 불러온 코드만 봤다.

광클스탑(gcstop.co.kr)은 흉내 낸 사이트라 열 구성·팝업 모양이 실제와 다르다. 참고하지 않는다.

## 시스템 메시지
포털 공통 함수 `MessageUtils.show(문구)`가 띄우는 jQuery UI 1.8.16 대화상자. 브라우저 `alert`이 아니다.
(희망삭제만 브라우저 기본 `confirm('삭제하시겠습니까?')`를 쓴다.)

```html
<div class="ui-dialog ui-widget ui-widget-content ui-corner-all" style="width:300px">
  <div class="ui-dialog-titlebar ui-widget-header ui-corner-all ui-helper-clearfix">
    <span class="ui-dialog-title">시스템 메시지</span>
    <a href="#" class="ui-dialog-titlebar-close ui-corner-all"><span class="ui-icon ui-icon-closethick">close</span></a>
  </div>
  <div id="messageBox" class="ui-dialog-content ui-widget-content"><br>문구</div>
  <div class="ui-dialog-buttonpane ui-widget-content ui-helper-clearfix">
    <div class="ui-dialog-buttonset"><button class="ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only"><span class="ui-button-text">확인</span></button></div>
  </div>
</div>
<!-- 뒤에 .ui-widget-overlay (회색 반투명) -->
```

| 부분 | 모양 |
|---|---|
| 제목줄 | 주황 `#f6a828`, 테두리 `#e78f08`, 흰 굵은 글씨 13.2px, 오른쪽 ✕ |
| 상자 | 폭 300px, 연회색 `#eee`, 테두리 `#ddd`, 모서리 4px, 그림자 `0 0 25px #666` |
| 본문 | 11px, `#222`, 위에 빈 줄(`<br>`) 하나 |
| [확인] | 열리면 포커스가 가서 크림색 `#fdf5ce` + 노란 테두리 `#fbcb09`. Enter로 닫힘 |
| 뒷배경 | 회색 `#aaa`, 투명도 0.3 |

- `practice.js`는 같은 구조·클래스로 만든다. 실제 화면에서는 페이지 CSS(`jquery-ui-1.8.16.custom.css`)가 그대로 입혀진다.
- 목업에는 이 CSS가 없어서, 그때만 `practice.js`가 위 값으로 비슷하게 그린다.
- 포털 함수를 직접 부르지 않는다: 확장은 페이지와 다른 환경에서 돌아 부를 수 없고, 그 함수는 문구를 HTML로 넣는다.

## [신청] 버튼 (희망수업)
```html
<span class="btn_common_wrap btn_blue_wrap btn_small_wrap">
  <input type="button" class="btn_common btn_blue btn_small" id="btn_apply" value="신청">
</span>
```
- **이미 신청한 과목 행에는 [신청]이 아예 없다** (행 데이터 `sincheongSuupCnt` = 1). 그 칸에는 숨긴 [추가]만 있다.
- **페이지는 표 본문(tbody)에서 `#btn_apply` 클릭을 받아 진짜 신청을 보낸다.** 확장이 만든 버튼에 id `btn_apply`를 붙이거나 클릭을 tbody까지 올려 보내면 안 된다.
- 행 클릭 처리는 전부 tbody에 jQuery로 위임돼 있어서, `core.js`의 클릭 차단(window, capture 단계)이 먼저 걸린다.

## 신청 흐름 (화면 코드 기준)
1. [신청] → 확인창 없이 넷퍼넬(STCLab NetFUNNEL) 대기열로 들어간다.
2. 대기열 결과
   - 통과 → 서버에 신청 요청
   - 대기 중 닫기 / 매크로 판정 / 넷퍼넬 오류 / 네트워크 오류 → 상태 코드가 붙은 시스템 메시지
3. 서버 결과 코드

   | 코드 | 화면 |
   |---|---|
   | `CAP` | 캡차 팝업 (500×150). 코드 주석: "캡차 제한에 걸렸을 때" |
   | `DON`, `DAE` | 동일·대치 교과목(재수강) 확인 팝업 (700×300) |
   | `PBL`, `SUN`, `SN2`, `SN3` | 확인 팝업 (700×300). 뜻 미확인 |
   | 그 밖 (성공 `OK` 포함) | **서버가 보낸 문구**를 시스템 메시지로 |
4. 성공(`OK`)이면 누른 [신청]을 숨기고, 학점 칸(최소·최대·신청)을 서버 값으로 바꾼다.
5. 신청 중에 남은 자리는 화면에 보이지 않는다. 마감은 [신청]을 눌렀을 때 메시지로만 알 수 있다 (2026-10-27 확인). `practice.js`도 같게 한다.

## 데이터
- 희망수업 열 순서: (체크) · 정렬순서 · 수강신청 · 신청인원 · 제한인원 · 희망인원 · 이수구분 · … · 교과목명 · … · 수업시간 · …
- 수업시간 값: `금(09:00-10:30),금(10:30-12:00)` (쉼표로 구분). 목업은 공백으로 구분해서 다르다 — 시간 중복 검사 때 맞출 것.
- 기간 밖의 신청인원은 지난 신청 결과(대부분 꽉 참)다. 연습은 0명에서 시작한다고 보고 희망인원·제한인원만 쓴다.
- 화면에 없는 `yesangInwon`(예상인원?) 값이 행 데이터에 있다. 뜻 미확인.

## 아직 필요한 데이터
우선순위 순. 1~2가 없으면 #9(정원 마감·결과 요약)를 실제처럼 만들 수 없다.

| # | 무엇 | 쓰는 곳 | 모으는 방법 |
|---|---|---|---|
| 1 | 과목별 실제 마감 시간 (시작 후 몇 초 만에 찼는지)과 그 과목의 희망·제한 인원 | `engine.js`의 `MODEL.burst`·`fast`·`slow` (지금은 근거 없는 임시값. 고치는 법은 파일 주석) | 수강신청 때 팀원이 직접 신청하며 결과 시각 기록, 선배 경험 수집. 새로고침으로 재는 건 금지 |
| 1-1 | 희망자 중 실제로 신청하는 비율 (정원 50·희망 55 같은 과목이 보통 안 차는 이유) | `engine.js`의 `MODEL.show` (지금은 임시 0.8) | 기간 밖 희망수업 화면의 **꽉 차지 않은 과목**에서 신청인원 ÷ 희망인원. 기간 밖 신청인원은 지난 신청의 최종 결과라 지금도 모을 수 있다. 희망인원이 같은 학기 값인지는 확인 필요 |
| 2 | 신청 결과 문구: 성공 · 정원 초과 · 학점 초과 · 시간 중복 · 이미 신청 · 기간 아님 | `practice.js`의 `MSG` | 모의수강신청·실제 기간에 화면 녹화 (서버가 보내는 문구라 코드에 없음) |
| 3 | 넷퍼넬 대기 화면 모양, 실제 대기 시간 | 대기열 재현 | 모의수강신청 녹화 |
| 4 | 캡차 팝업 모양과 뜨는 조건 | 캡차 재현 | 모의수강신청 녹화 |
| 5 | 수강신청 시작 시각, 시작 전에 화면이 어떤지 | 카운트다운 (지금은 5초 고정) | 수강안내 원문, 녹화 |
| 6 | 학점 제한 규칙 원문 (신입생 교양 10학점 등) | 학점 초과 재현 | 수강안내 원문 (목업 규칙의 출처인 CLAUDE.md가 레포에 없음) |
| 7 | `PBL`·`SUN`·`SN2`·`SN3` 팝업 내용 | 특수 과목 재현 | 해당 학생 녹화. 신입생은 거의 해당 없어 낮음 |

데이터와 별개로 팀에서 정할 것: 결과 요약(#9)에 무엇을 보여 줄지 (반응 속도, 과목별 성공/실패 등).
