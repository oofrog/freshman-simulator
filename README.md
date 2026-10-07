# 수강신청 연습 확장 (개발 안내)

실제 수강신청 화면 위에 튜토리얼·실전 재현·팁을 덧씌우는 크롬 확장. **실제 신청은 되지 않는다.**

## 원칙 (모든 파일 공통)
- 외부 서버 연결 금지: `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`을 쓰지 않는다 (LLM 포함).
- 페이지 글자는 `textContent`로만 넣는다. `innerHTML`에 페이지 데이터를 넣지 않는다.
- 학교의 제한(새로고침 차단, 대기열, 매크로 방지)을 건드리지 않는다.
- 실제 화면 테스트는 수강신청 기간이 아닐 때만 한다.

## 실행
- **목업에서 (평소 개발)**: 레포 폴더를 VS Code로 열고 `mock/index.html` 우클릭 → **Open with Live Server**
  (또는 레포 폴더에서 `npx live-server`). 저장할 때마다 자동 새로고침된다.
  - 주소 뒤에 `?sg`를 붙이면 열자마자 확장이 켜지고, `?sg=모드이름`이면 그 모드까지 시작한다.
    예: `/mock/index.html?sg=practice`, `?sg=tutorial`, `?sg=tip`
  - 수동으로 켜고 끌 때는 오른쪽 아래 **🧪 확장 켜기/끄기**.
- **크롬 확장으로 (가끔 최종 확인)**: 아래처럼 로드한 뒤, 코드를 고치면 `chrome://extensions`의 ↻ → 페이지 새로고침 → 아이콘.
  목업에서 확장 아이콘을 쓸 때는 🧪 버튼을 같이 누르지 않는다 (확장이 두 개 따로 뜸).
- **크롬 확장으로**: `chrome://extensions` → 개발자 모드 → 압축해제된 확장 프로그램 로드 → `extension/` 선택 → 아이콘 클릭.

## 파일과 담당
| 파일 | 내용 | 담당 |
|---|---|---|
| `extension/files.js` | 주입할 파일 목록 (새 파일을 만들면 여기에 추가) | 강준우 |
| `extension/background.js` | 아이콘 클릭 → 주입 / 켜기·끄기 | 강준우 |
| `extension/core.js` | 공통 기반: 패널, 오버레이, 클릭 차단, 모드 등록, 화면 읽기 | 강준우 |
| `extension/tips.js` | 팁 데이터 (형식은 파일 맨 위 주석) | 최지범 |
| `extension/modes/tip.js` | 자유 팁 (#6) | 최지범 |
| `extension/modes/tutorial.js` | 튜토리얼 (#7). 지금은 뼈대 (수강편람 이동 → 팁 2개 → 끝) | 최지범 |
| `extension/modes/practice.js` | 실전 재현 (#8·#9). 지금은 Walking Skeleton (가짜 버튼 → 성공 모달) | 박태현 |
| `extension/docs/selectors.md` | 선택자 대조표 (#4) | 강준우 |

## 모드 만드는 법
```js
SG.register('tutorial', {
  label: '튜토리얼',        // 패널 버튼 글자
  async start() { ... },    // 패널에서 눌렀을 때
  stop() { ... },           // Esc·다른 모드·끄기 때 (화면에 바꾼 것 되돌리기)
  allow(el) { ... },        // (선택) true를 돌려준 요소는 클릭 허용. 없으면 페이지 클릭은 전부 막힘
  blocked(el) { ... },      // (선택) 막힌 클릭이 일어났을 때
});
```
- 확장이 켜져 있는 동안 페이지 클릭은 기본적으로 **전부 막힌다**. 모드가 꺼진 대기 상태에서는 메뉴 이동·조회·입력칸만 허용된다.
- 확장이 만든 요소(`SG.el(...)`로 만든 것)는 막히지 않는다.

## core가 주는 함수 (`SG.`)
| 함수 | 용도 |
|---|---|
| `screen()` | 지금 화면 이름 ('희망수업' 등) |
| `rows()`, `cell(행, '열 이름')`, `headers()` | 과목 표 읽기 (숨김 칸 자동 처리) |
| `findButton(범위, '신청')`, `buttons(범위)`, `label(el)` | 보이는 버튼 찾기 |
| `goMenu('희망수업')`, `waitFor(조건함수)` | 화면 이동과 대기 |
| `matchTip(el)`, `tipEl(tip)` | 요소 → 팁, 팁 → 요소 |
| `highlight(el)`, `bubble(el, {title, text, buttons})`, `modal({title, text, buttons})`, `clear()` | 오버레이. `bubble`·`modal`은 누른 버튼 글자를 Promise로 돌려줌 |
| `el(tag, props, ...children)` | 확장용 요소 만들기 (클릭 차단에서 빠짐) |
