// 툴바 아이콘 팝업: 현재 탭에 확장 파일을 넣고(처음 한 번) 모드 버튼을 보여 준다.
// 누르면 그 모드를 시작하고 팝업을 닫는다. 실행 중인 모드는 파랗게, 다시 누르면 끝낸다.
// activeTab이라 사이트 주소 등록 없이 아이콘을 누른 탭에만 주입된다. chrome.*은 이 파일에서만 쓴다
const list = document.getElementById('modes');
const msg = document.getElementById('msg');

(async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const target = { tabId: tab.id };
  const run = async (func, args = []) => (await chrome.scripting.executeScript({ target, func, args }))[0].result;
  try {
    if (!await run(() => !!window.SG)) await chrome.scripting.executeScript({ target, files: SG_FILES });
    const { modes, mode } = await run(() => ({ modes: SG.modes, mode: SG.mode }));
    list.replaceChildren(...modes.map(({ name, label }) => {
      const b = document.createElement('button');
      b.textContent = name === mode ? `${label} 끝내기` : label;
      if (name === mode) b.className = 'on';
      // 모드 시작은 기다리지 않는다 (튜토리얼은 화면 이동을 기다려서 오래 걸림). 팝업이 닫혀도 페이지 쪽은 계속 돈다
      b.onclick = async () => {
        await run(name === mode ? () => { SG.stop(); } : n => { SG.start(n); }, [name]);
        window.close();
      };
      return b;
    }));
  } catch (e) {
    console.warn('주입 실패:', e);
    msg.textContent = '이 페이지에서는 쓸 수 없어요.\n수강신청 화면이나 연습 사이트에서 눌러 주세요.';
  }
})();
