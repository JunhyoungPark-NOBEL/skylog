import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import console from 'node:console';

const db = new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
create schema auth;create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema public,auth to anon,authenticated,service_role;
grant execute on function auth.uid() to anon,authenticated,service_role;`);
for (const file of [
  '202609080001_community.sql',
  '202609080003_objects.sql',
  '202609080004_usage.sql',
  '202609080005_edit.sql',
  '202609100001_community_identity.sql',
  '202609110001_horizon_profiles.sql',
])
  await db.exec(await readFile('supabase/migrations/' + file, 'utf8'));
const a = '00000000-0000-4000-8000-000000000001',
  b = '00000000-0000-4000-8000-000000000002';
await db.query('insert into auth.users values($1),($2)', [a, b]);
const avatar = {
  suit: 'sage',
  skin: 'amber',
  hat: 'saturnhat',
  hair: 'none',
  hairColor: 'ink',
  expression: 'smile',
  outfit: 'observatorycoat',
  accessory: 'orrery',
  background: 'orion',
};
const horizon = {
  slots: ['pavilion', 'refractor-long', 'sct', 'radio-dish', 'bench'],
  ground: 'snow',
  sceneryScale: 'small',
  sceneryEnabled: true,
};
async function actor(id) {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec(id ? 'set role authenticated' : 'set role anon');
}
async function save(id, scenery = horizon, look = avatar) {
  return db.query('select sky_update_profile_v2($1,$2::jsonb,$3,$4::jsonb)', [
    'Observer',
    JSON.stringify(look),
    id,
    JSON.stringify(scenery),
  ]);
}
let checks = 0;
for (const id of [a, b]) {
  await actor(id);
  await db.query('select sky_action($1,$2::jsonb)', [
    'join',
    JSON.stringify({ name: 'Observer', terms: '2026-09-08' }),
  ]);
}
await actor(a);
await save(a);
checks++;
assert.deepEqual(
  (await db.query('select horizon from sky_members where id=$1', [a])).rows[0].horizon,
  horizon,
);
checks++;
// 이번에 추가한 여덟 선택값을 각각 실제 프로필 RPC로 저장한다.
for (const [category, value] of [
  ['hat', 'crescentberet'],
  ['hat', 'saturnhat'],
  ['hat', 'planetarium'],
  ['outfit', 'observatorycoat'],
  ['outfit', 'constellationponcho'],
  ['accessory', 'cometscarf'],
  ['accessory', 'planisphere'],
  ['accessory', 'orrery'],
]) {
  const selected = { ...avatar, [category]: value };
  await save(a, horizon, selected);
  assert.deepEqual(
    (await db.query('select avatar from sky_members where id=$1', [a])).rows[0].avatar,
    selected,
  );
  checks++;
}
for (const look of [
  { ...avatar, hat: 'https://private/avatar.svg' },
  { ...avatar, outfit: { svg: '<svg onload="alert(1)">' } },
  { ...avatar, accessory: ['orrery'] },
  { ...avatar, background: null },
  { ...avatar, latitude: 37 },
]) {
  await assert.rejects(() => save(a, horizon, look), /INVALID_PROFILE/);
  checks++;
}
for (const malformed of [
  null,
  [],
  {},
  { ...horizon, slots: [] },
  { ...horizon, slots: ['bench', 'bench', null, null, null] },
  { ...horizon, slots: [0, null, null, null, null] },
  { ...horizon, slots: ['https://private', null, null, null, null] },
  { ...horizon, ground: '<svg>' },
  { ...horizon, sceneryEnabled: 'true' },
  { ...horizon, sceneryScale: 20 },
  { ...horizon, lat: 37 },
]) {
  await assert.rejects(() => save(a, malformed), /INVALID_PROFILE/);
  checks++;
}
await assert.rejects(() => save(b), /ACCOUNT_CHANGED/);
checks++;
assert.equal(
  (
    await db.query('update sky_members set horizon=$1::jsonb where id=$2 returning id', [
      JSON.stringify(horizon),
      b,
    ])
  ).rows.length,
  0,
);
checks++;
await assert.rejects(
  () => db.query('update sky_members set suspended=true where id=$1', [a]),
  /permission denied/,
);
checks++;
await actor('');
await assert.rejects(() => save(a), /permission denied/);
checks++;
await actor(a);
await db.query('select sky_update_profile($1,$2::jsonb,$3)', [
  'Legacy client',
  JSON.stringify(avatar),
  a,
]);
assert.deepEqual(
  (await db.query('select horizon from sky_members where id=$1', [a])).rows[0].horizon,
  horizon,
);
checks++;
await db.exec('reset role');
await db.query('update sky_members set suspended=true where id=$1', [a]);
await actor(a);
await assert.rejects(() => save(a), /ACCOUNT_UNAVAILABLE/);
checks++;
console.log(
  JSON.stringify({
    checks,
    result: 'passed',
    scope:
      'local PostgreSQL schema, validation, backward compatibility and RLS; no production writes',
  }),
);
await db.close();
