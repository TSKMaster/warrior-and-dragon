import { Novel } from './engine.js';

const element = id => document.getElementById(id);
const AUTO = 'warrior-dragon:auto:v1', MANUAL = 'warrior-dragon:manual:v1';
let story, novel, noticeTimer;
const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
function notify(message) {
  element('notice').textContent = message;
  element('notice').hidden = false;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { element('notice').hidden = true; }, 4000);
}
function persist(key) {
  try { localStorage.setItem(key, novel.save()); element('save-state').textContent = 'Прогресс сохранён'; return true; }
  catch { element('save-state').textContent = 'Сохранение недоступно в этом браузере'; return false; }
}
function show(view) {
  for (const id of ['home', 'play', 'ending']) element(id).hidden = id !== view;
  element('menu-button').hidden = view === 'home';
  element('footer').hidden = view === 'play';
  element('game').classList.toggle('ending-mode', view === 'ending');
  if (view === 'home') element('game').classList.remove('interior');
}
function render() {
  if (novel.ended) {
    show('ending');
    element('ending-ally').textContent = `Рядом с тобой — ${novel.variables.final_ally === 'dain' ? 'Дейн' : 'Ксейден'}. Продолжение следует.`;
    return;
  }
  show('play');
  const chapter = story.scenes.findIndex(scene => scene.ID === novel.scene.ID) + 1;
  element('game').classList.toggle('interior', chapter >= 5);
  element('chapter-number').textContent = `СЦЕНА ${String(chapter).padStart(2, '0')} / 08`;
  element('chapter-title').textContent = novel.scene.Название;
  element('moment').textContent = chapter >= 6 ? 'НИЖНИЙ ЛАЗАРЕТ' : 'БАСГИАТ';
  element('choices').replaceChildren();
  const line = novel.line;
  const narration = line?.Говорящий === 'Ремарка';
  element('play').classList.toggle('narration', narration);
  element('character').style.visibility = line && !narration ? 'visible' : 'hidden';
  element('speaker').textContent = line ? (narration ? 'История' : line.Говорящий) : 'Как ты поступишь?';
  element('dialogue').textContent = line ? line.Текст : 'Твоё решение останется с тобой.';
  element('character-name').textContent = line?.Говорящий || '';
  element('monogram').textContent = line?.Говорящий.slice(0, 1) || '';
  element('emotion').textContent = line?.Эмоция || '';
  element('next').hidden = !line;
  novel.options.forEach((option, index) => {
    const button = document.createElement('button'); button.className = 'choice';
    const number = document.createElement('span'); number.className = 'number'; number.textContent = `0${index + 1}`;
    const label = document.createElement('span'); label.textContent = option.Вариант;
    button.append(number, label);
    button.addEventListener('click', () => {
      const previous = { ...novel.variables };
      novel.choose(option['ID выбора']); persist(AUTO); render();
      const labels = { courage: 'Смелость', prudence: 'Рассудительность', relationship_dain: 'Отношения с Дейном', relationship_xaden: 'Отношения с Ксейденом' };
      const changes = Object.entries(labels).filter(([key]) => novel.variables[key] > previous[key]).map(([key, label]) => `${label} +${novel.variables[key] - previous[key]}`);
      if (changes.length) notify(changes.join(' · '));
      element('next').focus({ preventScroll: true });
    });
    element('choices').append(button);
  });
}
function start() { novel = new Novel(story); persist(AUTO); render(); }
function restore(key) {
  try {
    const saved = read(key);
    if (!saved) { notify('В этом слоте ещё нет сохранения'); return; }
    const restored = Novel.restore(story, saved);
    novel = restored; persist(AUTO); render();
  } catch { notify('Не удалось загрузить сохранение. Можно начать новую историю.'); }
}
function openModal(title) {
  element('modal-title').textContent = title;
  element('modal-body').className = '';
  element('modal-body').replaceChildren();
  if (!element('modal').open) element('modal').showModal();
  return element('modal-body');
}
function journal() {
  const body = openModal('Журнал истории');
  const entries = [...novel.history];
  if (novel.line) entries.push({ speaker: novel.line.Говорящий, text: novel.line.Текст });
  for (const entry of entries) {
    const section = document.createElement('section'); section.className = 'journal-entry';
    const speaker = document.createElement('b'); speaker.textContent = entry.speaker;
    const text = document.createElement('p'); text.textContent = entry.text;
    section.append(speaker, text); body.append(section);
  }
  element('modal').scrollTop = 0;
}
element('start').addEventListener('click', start);
element('restart').addEventListener('click', start);
element('continue').addEventListener('click', () => restore(AUTO));
element('next').addEventListener('click', () => { if (novel.advance()) { persist(AUTO); render(); } });
element('journal-button').addEventListener('click', journal);
element('ending-journal').addEventListener('click', journal);
element('close-modal').addEventListener('click', () => element('modal').close());
element('save-button').addEventListener('click', () => { if (persist(MANUAL)) notify('Сохранено в ручной слот'); });
element('load-button').addEventListener('click', () => restore(MANUAL));
element('stats-button').addEventListener('click', () => {
  const body = openModal('Твой путь');
  const stats = [['Смелость', novel.variables.courage], ['Рассудительность', novel.variables.prudence], ['Отношения с Дейном', novel.variables.relationship_dain], ['Отношения с Ксейденом', novel.variables.relationship_xaden], ['Улика с Парапета', novel.variables.evidence ? 'Сохранена' : 'Нет'], ['Ранение ладони', novel.variables.injured ? 'Есть' : 'Нет']];
  for (const [label, value] of stats) { const row = document.createElement('div'); row.className = 'stat'; const name = document.createElement('span'); name.textContent = label; const number = document.createElement('b'); number.textContent = value; row.append(name, number); body.append(row); }
});
element('menu-button').addEventListener('click', () => {
  const body = openModal('Воин и Дракон'); body.className = 'modal-actions';
  for (const [label, action] of [['Вернуться к истории', () => {}], ['На главный экран', () => { element('continue').hidden = !read(AUTO); show('home'); }]]) {
    const button = document.createElement('button'); button.textContent = label;
    button.addEventListener('click', () => { element('modal').close(); action(); }); body.append(button);
  }
});
document.addEventListener('keydown', event => {
  if (event.repeat || element('modal').open || element('play').hidden || !novel?.line || !['Space', 'Enter'].includes(event.code)) return;
  if (event.target instanceof HTMLElement && event.target.closest('button, a, input, textarea, select')) return;
  event.preventDefault(); element('next').click();
});
try {
  const response = await fetch(new URL('./story/pilot.json', import.meta.url));
  if (!response.ok) throw new Error('История недоступна');
  story = await response.json();
  new Novel(story);
  element('start').disabled = false; element('start').textContent = 'Начать историю ↗';
  element('continue').hidden = !read(AUTO);
} catch {
  element('start').textContent = 'История не загрузилась';
  element('home').querySelector('.small').textContent = 'Обнови страницу. Для локального запуска используй npm start.';
}
