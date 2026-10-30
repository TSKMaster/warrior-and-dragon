import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Novel, matches } from '../engine.js';
const story = JSON.parse(await readFile(new URL('../story/pilot.json', import.meta.url), 'utf8'));

test('all legal paths finish with consistent allies and every dialogue is reachable', () => {
  const endings = { END_DAIN: 0, END_XADEN: 0 }, lines = new Set(), options = new Set();
  function visit(novel, depth = 0) {
    assert.ok(depth < 150, 'No cycles');
    while (novel.line) { lines.add(novel.node); novel.advance(); }
    if (novel.ended) {
      endings[novel.node]++;
      assert.equal(novel.variables.final_ally, novel.node === 'END_DAIN' ? 'dain' : 'xaden');
      assert.equal(novel.variables.evidence, novel.variables.injured);
      return;
    }
    assert.ok(novel.options.length > 0, 'No dead ends');
    const special = novel.options.some(option => option['ID выбора'] === 'CH005_1');
    if (novel.node === 'CH005') assert.equal(special, novel.variables.prudence >= 2);
    for (const option of novel.options) {
      options.add(option['ID выбора']);
      const branch = Novel.restore(story, novel.save());
      branch.choose(option['ID выбора']); visit(branch, depth + 1);
    }
  }
  visit(new Novel(story));
  assert.deepEqual(endings, { END_DAIN: 97, END_XADEN: 97 });
  assert.equal(lines.size, story.dialogues.length);
  assert.equal(options.size, story.choices.length);
});

test('save restores the exact displayed line, stats, history and next choices', () => {
  const novel = new Novel(story);
  while (novel.line) novel.advance();
  novel.choose('CH001_2'); novel.advance();
  const restored = Novel.restore(story, novel.save());
  assert.equal(restored.node, novel.node);
  assert.deepEqual(restored.variables, novel.variables);
  assert.deepEqual(restored.history, novel.history);
  assert.deepEqual(restored.options, novel.options);
});

test('unavailable choices and malformed saves are rejected without applying effects', () => {
  const novel = new Novel(story), before = novel.save();
  assert.throws(() => novel.choose('CH005_1'));
  assert.equal(novel.save(), before);
  for (const saved of ['invalid', '{}', '{"version":"wrong","actions":[]}', '{"version":"1.0","actions":["CH005_1"]}']) assert.throws(() => Novel.restore(story, saved));
  assert.throws(() => matches('globalThis.alert(1)', novel.variables));
});
