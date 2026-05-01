import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const sliceFunction = (source, exportName) => {
  const marker = `export const ${exportName}`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `Missing export: ${exportName}`);
  const nextExport = source.indexOf('\nexport const ', start + marker.length);
  return source.slice(start, nextExport === -1 ? source.length : nextExport);
};

test('admin pagination keeps safe defaults and clamps invalid limits', () => {
  const source = read('api/_lib/db.ts');

  assert.match(source, /const DEFAULT_PAGE_LIMIT = 25;/);
  assert.match(source, /const MAX_PAGE_LIMIT = 100;/);
  assert.match(source, /parsed <= 0\) return fallback;/);
  assert.match(source, /parsed <= 0\) return 90;/);
});

test('admin sessions use keyset cursor, not offset pagination', () => {
  const source = read('api/_lib/db.ts');
  const sessionsPage = sliceFunction(source, 'listAdminSessionsPage');

  assert.match(source, /sessions\.created_at::text AS created_at_cursor/);
  assert.match(sessionsPage, /createAdminSessionsCursorScope\(appliedFilters\)/);
  assert.match(sessionsPage, /cursor\?\.scope === cursorScope/);
  assert.match(sessionsPage, /createdAt: lastVisibleCreatedAt/);
  assert.match(sessionsPage, /id: lastVisibleSession\.id/);
  assert.match(sessionsPage, /scope: cursorScope/);
  assert.match(sessionsPage, /sessions\.created_at < .*::timestamptz/s);
  assert.match(sessionsPage, /sessions\.id < /);
  assert.match(sessionsPage, /LIMIT \$\{appliedFilters\.limit \+ 1\}/);
  assert.equal(sessionsPage.includes('OFFSET'), false, 'Session pagination must stay keyset-based.');
});

test('admin tenant offset cursor is bound to filters', () => {
  const source = read('api/_lib/db.ts');
  const tenantsPage = sliceFunction(source, 'listAdminTenantsPage');

  assert.match(source, /const createAdminTenantsCursorScope = /);
  assert.match(source, /decoded\?\.scope !== expectedScope/);
  assert.match(tenantsPage, /createAdminTenantsCursorScope\(appliedFilters\)/);
  assert.match(tenantsPage, /decodeOffsetCursor\(appliedFilters\.cursor, cursorScope\)/);
  assert.match(tenantsPage, /offset: offset \+ appliedFilters\.limit, scope: cursorScope/);
});

test('admin routes expose additive pageInfo and appliedFilters contracts', () => {
  const sessionsRoute = read('api/admin/training-sessions.ts');
  const tenantsRoute = read('api/admin/tenants.ts');

  for (const routeSource of [sessionsRoute, tenantsRoute]) {
    assert.match(routeSource, /pageInfo: page\.pageInfo/);
    assert.match(routeSource, /appliedFilters: page\.appliedFilters/);
    assert.match(routeSource, /resultCount: page\.(sessions|tenants)\.length/);
  }
});

test('frontend store appends pages with dedupe and guards stale responses', () => {
  const source = read('src/stores/gameStore.ts');

  assert.match(source, /const mergeSessionsById = /);
  assert.match(source, /const mergeTenantsById = /);
  assert.match(source, /let persistedSessionsLoadSequence = 0;/);
  assert.match(source, /let adminTenantsLoadSequence = 0;/);
  assert.match(source, /persistedSessionsPageInfo: payload\.pageInfo \?\? null/);
  assert.match(source, /adminTenantsPageInfo: payload\.pageInfo \?\? null/);
});
