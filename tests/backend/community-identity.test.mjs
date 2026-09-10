import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import console from 'node:console';

const db = new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
create schema auth;create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema public,auth to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;`);
for (const migration of [
  '202609080001_community',
  '202609080003_objects',
  '202609080004_usage',
  '202609080005_edit',
])
  await db.exec(await readFile(`supabase/migrations/${migration}.sql`, 'utf8'));
const a = '00000000-0000-4000-8000-000000000001',
  b = '00000000-0000-4000-8000-000000000002';
await db.query('insert into auth.users values($1),($2)', [a, b]);
await db.query(
  "insert into sky_members(id,name) values($1,'Old observer'),($2,'old@example.org')",
  [a, b],
);
await db.exec(await readFile('supabase/migrations/202609100001_community_identity.sql', 'utf8'));
const base = {
  suit: 'sage',
  skin: 'amber',
  hat: 'beanie',
  hair: 'none',
  hairColor: 'ink',
  expression: 'smile',
  outfit: 'classic',
  accessory: 'none',
  background: 'garden',
};
const look = { ...base, hat: 'starcrown', background: 'orion' };
let checks = 0;
let currentActor = '';
const ok = (value) => {
  assert.ok(value);
  checks++;
};
async function rejects(fn, regex) {
  await assert.rejects(fn, regex);
  checks++;
}
async function actor(id) {
  currentActor = id;
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec(id ? 'set role authenticated' : 'set role anon');
}
const save = (name, avatar) =>
  db.query('select sky_update_profile($1,$2::jsonb,$3)', [
    name,
    JSON.stringify(avatar),
    currentActor || a,
  ]);
await actor('');
ok(
  (await db.query('select avatar from sky_members where id=$1', [a])).rows[0].avatar.background ===
    'garden',
);
await rejects(() => save('Anonymous', look), /permission denied/);
await actor(a);
await save('별을 걷는 사람', look);
ok(
  (await db.query('select name,avatar from sky_members where id=$1', [a])).rows[0].name ===
    '별을 걷는 사람',
);
ok(
  (await db.query('select avatar from sky_members where id=$1', [a])).rows[0].avatar.hat ===
    'starcrown',
);
for (const invalid of [
  { ...look, hat: 'https://example.org/a.svg' },
  { ...look, html: '<svg onload=alert(1)>' },
  { ...look, background: null },
  [],
  null,
])
  await rejects(() => save('Bad look', invalid), /INVALID_PROFILE/);
const missing = { ...look };
delete missing.skin;
await rejects(() => save('Missing key', missing), /INVALID_PROFILE/);
for (const name of ['a@example.org', '<svg>', 'line\nbreak', 'reverse\u202e', 'x'.repeat(25), ''])
  await rejects(() => save(name, look), /INVALID_PROFILE/);
await rejects(
  () =>
    db.query('update sky_members set avatar=$1 where id=$2', [
      JSON.stringify({ ...look, owner: b }),
      a,
    ]),
  /sky_members_avatar/,
);
await rejects(
  () => db.query('update sky_members set suspended=true where id=$1', [a]),
  /permission denied/,
);
await rejects(
  () => db.query('update sky_members set accepted_at=now() where id=$1', [a]),
  /permission denied/,
);
await rejects(
  () => db.query('update sky_members set id=$1 where id=$2', [b, a]),
  /permission denied/,
);
await actor(b);
await rejects(
  () =>
    db.query('select sky_update_profile($1,$2::jsonb,$3)', [
      'Stale account',
      JSON.stringify(look),
      a,
    ]),
  /ACCOUNT_CHANGED/,
);
ok(
  (await db.query("update sky_members set name='Hijacked' where id=$1 returning id", [a])).rows
    .length === 0,
);
await save('다른 관측자', { ...base, hat: 'meteorcap', background: 'saturn' });
await db.query("select sky_action('block',$1::jsonb)", [JSON.stringify({ id: a })]);
ok((await db.query('select id from sky_members where id=$1', [a])).rows.length === 0);
await actor(a);
ok((await db.query('select id from sky_members where id=$1', [b])).rows.length === 0);
await db.exec('reset role');
await db.query('update sky_members set suspended=true where id=$1', [a]);
await actor(a);
await rejects(() => save('Suspended', look), /ACCOUNT_UNAVAILABLE/);
ok(
  (await db.query("update sky_members set name='Bypass' where id=$1 returning id", [a])).rows
    .length === 0,
);
await db.exec('reset role');
await db.query('delete from auth.users where id=$1', [a]);
ok((await db.query('select id from sky_members where id=$1', [a])).rows.length === 0);
await db.close();
console.log(`Community identity PostgreSQL/RLS: ${checks} checks passed`);
