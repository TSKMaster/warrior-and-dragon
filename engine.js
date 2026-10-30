function literal(raw) {
  if (/^-?\d+$/.test(raw)) return Number(raw);
  if (raw === 'true' || raw === 'false') return raw === 'true';
  if (/^"[\w]+"$/.test(raw)) return raw.slice(1, -1);
  if (/^[a-z_]+$/.test(raw)) return raw;
  throw new Error(`Неизвестное значение: ${raw}`);
}

export function matches(expression, variables) {
  if (expression === 'true') return true;
  const match = expression.match(/^(\w+)\s*(==|>=|<=|>|<|!=)\s*(.+)$/);
  if (!match || !Object.hasOwn(variables, match[1])) throw new Error(`Неизвестное условие: ${expression}`);
  const actual = variables[match[1]], expected = literal(match[3]);
  switch (match[2]) {
    case '==': return actual === expected;
    case '!=': return actual !== expected;
    case '>=': return actual >= expected;
    case '<=': return actual <= expected;
    case '>': return actual > expected;
    case '<': return actual < expected;
  }
}

function apply(expression, variables) {
  if (expression === 'Без изменения') return;
  for (const instruction of expression.split(';')) {
    const match = instruction.trim().match(/^(\w+)\s*(\+=|=)\s*(.+)$/);
    if (!match || !Object.hasOwn(variables, match[1])) throw new Error(`Неизвестное изменение: ${instruction}`);
    const value = literal(match[3]);
    if (match[2] === '+=') {
      if (typeof value !== 'number' || typeof variables[match[1]] !== 'number') throw new Error('Сложение требует числа');
      variables[match[1]] += value;
    } else variables[match[1]] = value;
  }
}

export class Novel {
  constructor(story) {
    this.story = story;
    this.scenes = new Map(story.scenes.map(row => [row.ID, row]));
    this.lines = new Map(story.dialogues.map(row => [row.ID, row]));
    this.variables = Object.fromEntries(story.variables.map(row => [row.Ключ, row.Старт]));
    this.actions = [];
    this.history = [];
    this.node = 'START';
    this.resolve();
  }

  resolve() {
    for (let depth = 0; depth < 100; depth++) {
      if (this.scenes.has(this.node)) {
        this.scene = this.scenes.get(this.node);
        this.node = this.scene['Следующий узел'];
      } else if (this.node === 'START' || this.node.startsWith('RT_')) {
        const edges = this.story.branching.filter(row => row.Откуда === this.node && (this.node === 'START' || matches(row.Условие, this.variables)));
        if (edges.length !== 1) throw new Error(`Неоднозначный переход: ${this.node}`);
        this.node = edges[0].Куда;
      } else {
        if (!this.lines.has(this.node) && !this.options.length && !['END_DAIN', 'END_XADEN'].includes(this.node)) throw new Error(`Узел не найден: ${this.node}`);
        return;
      }
    }
    throw new Error('Зацикленный переход');
  }

  get line() { return this.lines.get(this.node); }
  get ended() { return this.node.startsWith('END_'); }
  get options() { return this.story.choices.filter(row => row['Исходный узел'] === this.node && matches(row.Условие, this.variables)); }

  advance() {
    if (!this.line) return false;
    this.history.push({ speaker: this.line.Говорящий, text: this.line.Текст });
    this.node = this.line['Следующий ID'];
    this.actions.push('next');
    this.resolve();
    return true;
  }

  choose(id) {
    const option = this.options.find(row => row['ID выбора'] === id);
    if (!option) throw new Error('Этот вариант недоступен');
    apply(option['Изменение статов/отношений'], this.variables);
    apply(option.Флаг, this.variables);
    this.history.push({ speaker: 'Ваш выбор', text: option.Вариант });
    this.node = option['Целевой узел'];
    this.actions.push(id);
    this.resolve();
  }

  save() { return JSON.stringify({ version: this.story.version, actions: this.actions }); }

  static restore(story, saved) {
    const data = JSON.parse(saved);
    if (data.version !== story.version || !Array.isArray(data.actions) || data.actions.length > 500) throw new Error('Несовместимое сохранение');
    const novel = new Novel(story);
    for (const action of data.actions) {
      if (action === 'next') { if (!novel.advance()) throw new Error('Повреждённое сохранение'); }
      else novel.choose(action);
    }
    return novel;
  }
}
