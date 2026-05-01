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

test('inspection modal does not reveal damage state before learner decision', () => {
  const source = read('src/components/game/ComponentInspection.tsx');
  const preDecision = sliceBetween(source, '{!showResult && (', '{showResult && (');

  const forbiddenSignals = [
    'component.isDamaged',
    'component.damageType',
    'component.damageDescription',
    'damageLabel',
    'integrity',
    'inspection.correct',
    'inspection.wrong',
    'inspection.whyDamaged',
    'inspection.shouldReject',
    'inspection.shouldAccept',
    'inspection.loaded',
  ];

  for (const signal of forbiddenSignals) {
    assert.equal(
      preDecision.includes(signal),
      false,
      `Pre-decision inspection UI leaks outcome signal: ${signal}`,
    );
  }
});

test('warehouse scene exposes only interaction/progress labels before inspection', () => {
  const source = read('src/scenes/WarehouseScene.tsx');
  const textLabels = [...source.matchAll(/<Text[\s\S]*?>([\s\S]*?)<\/Text>/g)]
    .map((match) => match[1].replace(/\s+/g, ' ').trim().toLowerCase());

  const forbiddenLabelFragments = [
    'danneggi',
    'rotto',
    'scarta',
    'utilizzabile',
    'buono',
    'integro',
    'non sicuro',
  ];

  for (const label of textLabels) {
    if (label.includes('verificato')) continue;
    for (const fragment of forbiddenLabelFragments) {
      assert.equal(
        label.includes(fragment),
        false,
        `Warehouse Text label leaks classification before decision: ${label}`,
      );
    }
  }
});

test('inspection explanations stay behind showResult gate', () => {
  const source = read('src/components/game/ComponentInspection.tsx');
  const resultSection = sliceBetween(source, '{showResult && (', '{!showResult && (');

  for (const expected of ['inspection.whyDamaged', 'inspection.shouldReject', 'inspection.shouldAccept']) {
    assert.equal(
      resultSection.includes(expected),
      true,
      `Expected post-decision explanation missing from result section: ${expected}`,
    );
  }
});

test('warehouse preview does not encode damage before modal inspection', () => {
  const source = read('src/scenes/WarehouseScene.tsx');

  assert.equal(source.includes('WarehouseDamageMarks'), false);
  assert.equal(source.includes('component.isDamaged'), false);
  assert.equal(source.includes('component.damageType'), false);
});

test('inspection stock keeps minimum usable parts without predictable indexes', () => {
  const source = read('src/stores/inspectionStore.ts');

  assert.match(source, /const createProtectedAssemblyStock = /);
  assert.match(source, /protectedAssemblyStock\.has\(id\)/);
  assert.equal(source.includes('index < minUsableForAssembly'), false);
});

test('wrong inspection decisions are locked after feedback', () => {
  const source = read('src/stores/inspectionStore.ts');
  const handler = sliceBetween(source, "const handleInspectionComplete = (decision: 'usable' | 'damaged', correct: boolean) => {", '  return {');

  assert.match(handler, /newInspectedItems\.add\(inspection\.id\)/);
  assert.equal(handler.includes('if (correct && inspection)'), false);
  assert.match(handler, /componente resta chiuso/i);
});

test('modal 3d view avoids generic damaged-state styling', () => {
  const source = read('src/components/game/Component3DView.tsx');

  assert.equal(source.includes('component.isDamaged'), false);
  assert.match(source, /damageType=\{component\.damageType\}/);
});
