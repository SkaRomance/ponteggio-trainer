import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const sliceBetween = (source, startMarker, endMarker) => {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return source.slice(start, end);
};

test('audio uses native browser APIs without adding bundle dependencies', () => {
  const pkg = JSON.parse(read('package.json'));
  const engine = read('src/audio/trainingAudio.ts');

  for (const dependencyName of ['howler', 'tone', 'wavesurfer.js']) {
    assert.equal(pkg.dependencies?.[dependencyName], undefined);
    assert.equal(pkg.devDependencies?.[dependencyName], undefined);
  }

  assert.match(engine, /AudioContext/);
  assert.match(engine, /speechSynthesis/);
  assert.match(engine, /cancelSpeech/);
});

test('audio controller requires gesture unlock and exposes visible controls', () => {
  const source = read('src/components/game/GameAudioController.tsx');

  assert.match(source, /pointerdown/);
  assert.match(source, /keydown/);
  assert.match(source, /aria-pressed=\{audioEnabled\}/);
  assert.match(source, /aria-pressed=\{speechEnabled\}/);
  assert.match(source, /localStorage/);
  assert.match(source, /trainingAudio\.startMusic/);
  assert.match(source, /trainingAudio\.speak/);
});

test('game shell mounts audio runtime and safety quiz modal', () => {
  const source = read('src/App.tsx');

  assert.match(source, /import GameAudioController/);
  assert.match(source, /import SafetyQuizModal/);
  assert.equal((source.match(/<GameAudioController \/>/g) ?? []).length, 4);
  assert.match(source, /<SafetyQuizModal \/>/);
});

test('safety quiz bank has varied two-option questions', () => {
  const source = read('src/data/safetyQuiz.ts');
  const questionIds = [...source.matchAll(/id: '([a-z0-9-]+)'/g)].map((match) => match[1]);
  const topics = new Set([...source.matchAll(/topic: '([a-z0-9-]+)'/g)].map((match) => match[1]));

  assert.ok(questionIds.length >= 20, `Expected at least 20 quiz questions, found ${questionIds.length}`);
  assert.equal(new Set(questionIds).size, questionIds.length, 'Quiz question ids must be unique');
  assert.ok(topics.size >= 12, `Expected broad topic coverage, found ${topics.size} topics`);
  assert.equal((source.match(/options: \[\s*option\('/g) ?? []).length, questionIds.length);
  assert.equal((source.match(/option\('a'/g) ?? []).length, questionIds.length);
  assert.equal((source.match(/option\('b'/g) ?? []).length, questionIds.length);
  assert.equal((source.match(/true, '/g) ?? []).length, questionIds.length);
});

test('quiz store pauses gameplay, audits answers, and does not penalize health on wrong answers', () => {
  const source = read('src/stores/gameStore.ts');
  const answerHandler = sliceBetween(source, 'answerSafetyQuiz: (optionId) => {', '\n\n    currentPhase:');

  assert.match(source, /knowledge_check_presented/);
  assert.match(source, /knowledge_check_answered/);
  assert.match(source, /SAFETY_QUIZ_MAX_BY_MODE/);
  assert.match(source, /isPaused: true/);
  assert.match(answerHandler, /safetyQuizResults/);
  assert.match(answerHandler, /addScore\(scoreDelta\)/);
  assert.equal(answerHandler.includes('addError'), false);
  assert.equal(answerHandler.includes('reduceHealth'), false);
});

test('safety quiz modal is keyboard-accessible and answer-only', () => {
  const source = read('src/components/game/SafetyQuizModal.tsx');

  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /event\.key === '1'/);
  assert.match(source, /event\.key === '2'/);
  assert.match(source, /event\.key === 'Escape'/);
  assert.match(source, /event\.preventDefault\(\)/);
  assert.match(source, /question\.options\.map/);
  assert.equal(source.includes('choice.correct'), false);
  assert.equal(source.includes('choice.rationale'), false);
});

test('runtime bridge and reports expose knowledge check evidence', () => {
  const bridge = read('src/components/game/RuntimeBridge.tsx');
  const report = read('src/utils/sessionReport.ts');

  assert.match(bridge, /activeKnowledgeCheck/);
  assert.match(bridge, /knowledgeChecksAnswered/);
  assert.match(report, /knowledgeChecks/);
  assert.match(report, /state\.safetyQuizResults/);
});
