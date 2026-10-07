// 아이콘 클릭: 처음이면 파일 주입, 그다음부터는 켜기/끄기 (activeTab이라 사이트 주소 등록 불필요)
importScripts('files.js');

chrome.action.onClicked.addListener(async tab => {
  const target = { tabId: tab.id };
  try {
    const [{ result: loaded }] = await chrome.scripting.executeScript({ target, func: () => !!window.SG });
    if (!loaded) await chrome.scripting.executeScript({ target, files: SG_FILES });
    await chrome.scripting.executeScript({ target, func: () => SG.toggle() });
  } catch (e) {
    console.warn('주입 실패:', e);
  }
});
