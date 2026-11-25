// 사용자 테스트 실험 페이지 (#42, 담당: 강준우) — lab.html
// 참가자가 구글폼 설문 1페이지를 쓴 뒤 번호를 넣고 시작하면 단계(STEPS)를 차례로 진행한다. 설문이 있는 단계 뒤에는 설문 화면에서 기다린다. 단계마다 목업을 새로 열고(index.html?log=P1&seg=단계&sg=모드),
// 그 단계의 확장 모드는 목업의 ?sg로 바로 켠다. [다음 단계]를 누르면 지금 구간을 끝내고 다음 단계를 연다.
// 기록은 목업 안 log.js가 localStorage('sg-log:P1')에 남기고, 이 페이지는 같은 출처라 목업의 SGLOG를 바로 읽는다. 외부 요청은 하지 않는다.
// 진행 중인 단계는 'sg-lab:P1'에 둬서 이 페이지를 새로고침해도 그 단계부터 다시 연다
(() => {
  const { summary, csv } = SGLOG_SUMMARY;
  // seg: 기록의 구간 이름, sg: 목업을 열 때 켤 확장 모드 (null이면 꺼진 채), text: 위쪽 바 안내,
  // survey: 이 단계가 끝난 뒤 쓸 구글폼 페이지 (없으면 바로 다음 단계). 설문 1페이지는 시작 전에 쓴다.
  // task: 오른쪽 아래 미션 카드 (사전·확인 과제. 과목만 다르고 구성·난이도는 같다). 정답은 여기 두지 않는다 → docs/user-test-tasks.md
  // 단계 이름·설문은 구글폼 "AI+X Team 형인"에 맞춘다. 단계를 바꾸려면 여기만 고친다 (구간 이름은 log-summary.js SEGMENTS와 같게)
  const STEPS = [
    { seg: '사전 과제', sg: null, text: '확장 없이, 오른쪽 아래 미션을 해 주세요.', task: {
      title: '사전 과제 (제한 5분)', limit: 300,
      lead: '소프트웨어학부 1학년 새내기라고 생각하고 아래를 해 주세요.',
      items: [
        '「대학글쓰기」를 찾아서 신청해 주세요.',
        '「영화로읽는심리학」의 정원은 몇 명이고, 이 과목을 희망수업에 담은 사람은 몇 명인가요?',
        '「경영학원론」을 내가 신청할 수 있는 과목인지 확인해서 말로 알려 주세요. (신청 버튼은 누르지 마세요)',
        '지금 신청된 과목과 총 학점을 확인해 주세요.',
      ] } },
    { seg: '튜토리얼', sg: 'tutorial', text: '튜토리얼을 따라가 보세요. 그만두고 싶으면 [그만하기]를 눌러도 돼요.' },
    { seg: '확인 과제', sg: null, text: '확장 없이, 오른쪽 아래 미션을 해 주세요.', task: {
      title: '확인 과제 (제한 5분)', limit: 300,
      lead: '소프트웨어학부 1학년 새내기라고 생각하고 아래를 해 주세요.',
      items: [
        '「AI와사고」를 찾아서 신청해 주세요.',
        '「미술과치유」의 정원은 몇 명이고, 이 과목을 희망수업에 담은 사람은 몇 명인가요?',
        '「프로그래밍기초」 1반을 내가 신청할 수 있는 과목인지 확인해서 말로 알려 주세요. (신청 버튼은 누르지 마세요)',
        '지금 신청된 과목과 총 학점을 확인해 주세요.',
      ] },
      survey: { page: 2, title: '튜토리얼 체험 후 질문', q: '8~9번' } },
    { seg: '실전 재현', sg: 'practice', text: '첫 번째는 진행자와 함께 눌러 보는 연습이에요. 그다음 3번을 해 보세요. [결과 보기]를 본 뒤 [다시 하기]로 이어 가요.',
      rounds: 4, warmup: 1, // 1회차는 사용법 설명을 겸한 연습, 2~4회차가 설문 3페이지가 묻는 3회
      survey: { page: 3, title: '실전 재현 체험 후 질문', q: '10~11번' } },
    { seg: '자유 팁 과제', sg: 'tip', text: '궁금한 곳을 눌러 설명을 보면서, 진행자가 말하는 과제를 해 주세요.',
      survey: { page: 4, title: '자유 팁 체험 후 전체 질문', q: '12~16번' } },
  ];
  const surveyName = v => `설문 ${v.page}페이지 「${v.title}」(${v.q})`;

  const $ = id => document.getElementById(id);
  const frame = $('frame');
  const logKey = p => 'sg-log:' + p, labKey = p => 'sg-lab:' + p;
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };
  const inner = () => { try { return frame.contentWindow?.SGLOG; } catch { return null; } }; // 목업 안 기록
  let P = null, step = -1, url = '', surveying = false;
  // 지금 기록: 목업이 열려 있으면 그 안의 것(저장 전 것까지), 아니면 저장된 것
  const events = () => inner()?.events ?? read(logKey(P), []);

  const show = view => {
    $('start').hidden = view !== 'start';
    $('bar').hidden = frame.hidden = view !== 'run';
    $('survey').hidden = view !== 'survey';
    $('task').hidden = view !== 'run' || !STEPS[step]?.task;
    $('done').hidden = view !== 'done';
  };

  // ---------- 내보내기 ----------
  const pad = n => String(n).padStart(2, '0');
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const fileName = (p, ext) => `log-${p.replace(/[^\w가-힣-]/g, '_')}-${today()}.${ext}`;
  const download = (name, text, type) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const exportJson = p => download(fileName(p, 'json'), JSON.stringify({ participant: p, exported: new Date().toISOString(), events: read(logKey(p), []) }, null, 1), 'application/json');
  const exportCsv = p => download(fileName(p, 'csv'), '﻿' + csv(summary(read(logKey(p), []))), 'text/csv'); // BOM: 엑셀에서 한글이 깨지지 않게
  const clear = p => {
    if (!confirm(`${p}의 기록을 지울까요? 되돌릴 수 없어요. 먼저 내보냈는지 확인해 주세요.`)) return false;
    try { localStorage.removeItem(logKey(p)); localStorage.removeItem(labKey(p)); } catch {}
    return true;
  };

  // ---------- 시작 ----------
  // 흐름: 설문 1페이지 → 단계들 (설문이 있는 단계 뒤에는 그 설문 페이지)
  const li = text => Object.assign(document.createElement('li'), { textContent: text });
  $('plan').append(li('설문 1페이지 (사전 질문) — 시작 전에'), ...STEPS.flatMap(s => [
    li(`${s.seg}${s.sg ? '' : ' (확장 꺼짐)'}${s.rounds ? ` ${s.rounds}회${s.warmup ? ` (${s.warmup}회는 연습)` : ''}` : ''}`),
    ...(s.survey ? [li(surveyName(s.survey))] : []),
  ]));
  const pid = () => $('pid').value.trim();
  // 같은 번호의 기록이 이미 있으면 이어서 하기·내보내기·지우기를 보여 준다
  const checkOld = () => {
    const p = pid(), n = p ? read(logKey(p), []).length : 0, { step: at, survey } = p ? read(labKey(p), {}) : {};
    $('old').hidden = !n;
    $('go').hidden = !!n;
    if (n) $('old-text').textContent = `${p}의 기록 ${n}개가 이미 있어요` + (at === undefined ? '.' : at >= STEPS.length ? ' (실험 끝).'
      : survey ? ` (설문 ${STEPS[at].survey.page}페이지 작성 중).` : ` (${STEPS[at].seg} 진행 중).`);
  };
  const toStart = () => { P = null; history.replaceState(null, '', location.pathname); show('start'); checkOld(); $('pid').focus(); };
  $('pid').addEventListener('input', checkOld);
  $('pid').addEventListener('keydown', e => { if (e.key === 'Enter' && !$('go').hidden) $('go').click(); });
  $('go').addEventListener('click', () => { if (pid()) begin(pid(), 0); else $('pid').focus(); });
  $('resume').addEventListener('click', () => { const { step: at = 0, survey } = read(labKey(pid()), {}); begin(pid(), at, survey); });
  $('old-json').addEventListener('click', () => exportJson(pid()));
  $('old-clear').addEventListener('click', () => { if (clear(pid())) begin(pid(), 0); });

  const begin = (p, at, survey = false) => {
    P = p;
    history.replaceState(null, '', `?p=${encodeURIComponent(p)}`);
    // 목업은 첫 방문이면 안내를 띄우고, 닫으면 확장을 켠다 → 사전 과제가 확장이 켜진 채 시작되지 않게 본 것으로 둔다
    try { localStorage.setItem('mock-notice-seen', '1'); } catch {}
    if (survey && STEPS[at]?.survey) { step = at; toSurvey(); } else open(at);
  };

  // ---------- 진행 ----------
  const open = i => {
    step = i;
    surveying = false;
    write(labKey(P), { step });
    if (i >= STEPS.length) return finish();
    const s = STEPS[i];
    const q = new URLSearchParams({ log: P, seg: s.seg });
    if (s.sg) q.set('sg', s.sg);
    url = 'index.html?' + q;
    frame.src = url;
    show('run');
    renderBar();
  };
  const renderBar = () => {
    const s = STEPS[step], last = step === STEPS.length - 1;
    $('who').textContent = P;
    $('steps').replaceChildren(...STEPS.map((x, i) => Object.assign(document.createElement('li'), { textContent: `${i + 1} ${x.seg}`, className: i === step ? 'now' : i < step ? 'past' : '' })));
    $('say-text').textContent = $('say-text').title = s.text; // 좁은 창에서 잘리면 마우스를 올려 전체를 본다
    // 미션 카드: 단계를 열 때마다 펼친 상태로. [이 단계 다시]는 목업만 다시 열어서 카드는 그대로다
    if (s.task) {
      $('task-title').textContent = s.task.title;
      $('task-lead').textContent = s.task.lead;
      $('task-items').replaceChildren(...s.task.items.map(t => Object.assign(document.createElement('li'), { textContent: t })));
      fold(false);
    }
    $('next').textContent = s.survey ? `다음: 설문 ${s.survey.page}페이지 →` : last ? '실험 끝내기' : `다음: ${STEPS[step + 1].seg} →`;
    renderLive();
  };
  // 이 단계에서 지금까지 한 것 (진행자가 언제 넘어갈지 보려고)
  const here = () => events().filter(e => e.seg === STEPS[step].seg);
  const resultsOf = list => list.filter(e => e.type === 'practice.result').length; // 실전 재현 [결과 보기] 횟수
  const fold = folded => {
    $('task').classList.toggle('folded', folded);
    $('task-fold').textContent = folded ? '펼치기' : '접기';
    $('task-fold').setAttribute('aria-expanded', String(!folded));
  };
  $('task-fold').addEventListener('click', () => fold(!$('task').classList.contains('folded')));
  const mmss = sec => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  const renderLive = () => {
    if (step < 0 || step >= STEPS.length || surveying) return;
    const s = STEPS[step], list = here();
    let text = `이 단계 기록 ${list.length}개`, ok = false, over = false;
    // 과제 단계: 이 구간의 seg.start부터 경과 시간. 제한을 넘으면 색만 바꾼다 (막지 않는다)
    if (s.task) {
      const start = events().filter(e => e.type === 'seg.start' && e.name === s.seg).at(-1);
      const sec = start ? Math.max(0, Math.floor((Date.now() - start.t) / 1000)) : 0;
      over = sec > s.task.limit;
      text = `경과 ${mmss(sec)} / ${mmss(s.task.limit)}` + (over ? ' · 시간 지남' : '');
    }
    if (s.rounds) {
      const started = list.filter(e => e.type === 'mode.start' && e.mode === 'practice').length;
      const results = resultsOf(list);
      const n = Math.min(started, s.rounds), warm = s.warmup || 0;
      ok = results >= s.rounds;
      text = `${n} / ${s.rounds}회차` + (n && n <= warm ? ' (연습)' : n ? ` (실전 ${n - warm} / ${s.rounds - warm})` : '')
        + ` · 결과 확인 ${results}회` + (ok ? ' · 다 했어요' : '');
    }
    const steps = list.filter(e => e.type === 'tutorial.step');
    if (s.sg === 'tutorial' && steps.length) {
      const last = steps.at(-1);
      ok = last.done;
      text = last.done ? '튜토리얼 완주' : `튜토리얼 ${last.n} / ${last.total}단계`;
    }
    $('live').textContent = text;
    $('live').classList.toggle('ok', ok);
    $('live').classList.toggle('over', over);
  };
  setInterval(renderLive, 1000);

  $('next').addEventListener('click', () => {
    const s = STEPS[step], to = STEPS[step + 1];
    const results = s.rounds ? resultsOf(here()) : 0;
    const warn = s.rounds && results < s.rounds
      ? `아직 결과 확인 ${results} / ${s.rounds}회예요${s.warmup ? ` (연습 ${s.warmup}회 포함)` : ''}.`
        + (s.survey ? ` 설문 ${s.survey.page}페이지는 ${s.warmup ? '연습 뒤 ' : ''}${s.rounds - (s.warmup || 0)}회를 기준으로 물어요.` : '') + ' 그래도 넘어갈까요?\n\n' : '';
    const where = s.survey ? `설문 ${s.survey.page}페이지로 넘어갈까요?` : to ? `「${to.seg}」 단계로 넘어갈까요?` : '실험을 마칠까요?';
    if (!confirm(`${warn}「${s.seg}」 단계를 끝내고 ${where}`)) return;
    inner()?.segment(null);
    if (s.survey) toSurvey(); else open(step + 1);
  });
  // 설문 쓰는 동안: 구간은 이미 끝났고 목업도 닫아서, 이 시간은 어느 구간에도 들어가지 않는다. 새로고침해도 여기로 돌아온다
  const toSurvey = () => {
    surveying = true;
    write(labKey(P), { step, survey: true });
    frame.src = 'about:blank';
    const v = STEPS[step].survey, to = STEPS[step + 1];
    $('survey-title').textContent = `${P} · 설문 ${v.page}페이지`;
    $('survey-text').textContent = `${surveyName(v)}을 작성해 주세요. 다 쓰면 [다음] 버튼까지만 누르고 기다려 주세요.`;
    $('survey-next').textContent = `설문 다 썼어요 → ${to ? `${to.seg} 시작` : '실험 끝'}`;
    show('survey');
  };
  $('survey-next').addEventListener('click', () => open(step + 1));
  // 같은 단계를 처음 화면부터 다시 (구간은 이어지고 기록도 남는다). 주소의 #!화면은 빼고 연다
  $('redo').addEventListener('click', () => {
    if (confirm('이 단계를 처음 화면부터 다시 할까요? 지금까지 기록은 남아요.')) frame.contentWindow.location.replace(url);
  });
  // 진행 중에 실수로 창을 닫지 않게
  addEventListener('beforeunload', e => { if (!$('bar').hidden || !$('survey').hidden) e.preventDefault(); });

  // ---------- 끝 ----------
  const finish = () => {
    inner()?.segment(null);
    frame.removeAttribute('src');
    frame.src = 'about:blank';
    $('done-title').textContent = `${P} 실험 끝`;
    const rows = summary(read(logKey(P), []));
    $('table').replaceChildren(...rows.map((r, i) => {
      const tr = document.createElement('tr');
      tr.append(...r.map(v => Object.assign(document.createElement(i ? 'td' : 'th'), { textContent: v })));
      return tr;
    }));
    show('done');
  };
  $('json').addEventListener('click', () => exportJson(P));
  $('csv').addEventListener('click', () => exportCsv(P));
  $('clear').addEventListener('click', () => { if (clear(P)) toStart(); });
  $('again').addEventListener('click', () => { $('pid').value = ''; toStart(); });

  // 이 페이지를 새로고침하면(?p=P1) 진행 중이던 단계부터 다시 연다
  const p0 = new URLSearchParams(location.search).get('p');
  const { step: at0, survey: survey0 } = p0 ? read(labKey(p0), {}) : {};
  if (p0 && at0 !== undefined) begin(p0, at0, survey0);
  else { $('pid').value = p0 || ''; toStart(); }
})();
