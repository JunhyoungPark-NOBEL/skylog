import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import console from 'node:console';

const db = new PGlite();
await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
create schema auth;create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema public,auth to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;`);
await db.exec(await readFile('supabase/migrations/202609080001_community.sql', 'utf8'));
await db.exec(await readFile('supabase/migrations/202609080003_objects.sql', 'utf8'));
await db.exec(await readFile('supabase/migrations/202609080004_usage.sql', 'utf8'));
await db.exec(await readFile('supabase/migrations/202609080005_edit.sql', 'utf8'));
const a = '00000000-0000-4000-8000-000000000001',
  b = '00000000-0000-4000-8000-000000000002',
  m = '00000000-0000-4000-8000-000000000003';
await db.query(`insert into auth.users values($1),($2),($3)`, [a, b, m]);
await db.query(`insert into public.sky_moderators values($1)`, [m]);
async function actor(id) {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec(id ? 'set role authenticated' : 'set role anon');
}
async function action(name, payload = {}) {
  return db.query('select public.sky_action($1,$2::jsonb)', [name, JSON.stringify(payload)]);
}
async function rejects(fn, pattern) {
  await assert.rejects(fn, pattern);
}
let checks = 0;
const ok = (x) => {
  assert.ok(x);
  checks++;
};
for (const id of [a, b, m]) {
  await actor(id);
  await action('join', { name: id === m ? 'Moderator' : 'Observer', terms: '2026-09-08' });
}
await actor(a);
await rejects(
  () =>
    db.query(
      'insert into sky_posts(owner,object_id,caption,kind,image_path) values($1,$2,$3,$4,$5)',
      [a, 'moon', 'test', 'capture', 'x'],
    ),
  /permission denied/,
);
checks++;
await rejects(() => db.query('select sky_reserve($1,$2,false)', [a, '{}']), /permission denied/);
checks++;
await rejects(
  () => action('reviewPost', { id: a, status: 'published', text: 'fake admin' }),
  /FORBIDDEN/,
);
checks++;
await db.exec('reset role');
const reserved = await db.query('select sky_reserve($1,$2,false) as id', [
  a,
  JSON.stringify({ object: 'moon', caption: 'Moon photo', equipment: 'Phone', kind: 'capture' }),
]);
const pid = reserved.rows[0].id;
await db.query("update sky_posts set status='pending' where id=$1", [pid]);
await actor(a);
ok((await db.query('select id from sky_posts')).rows.length === 1);
await actor(b);
ok((await db.query('select id from sky_posts')).rows.length === 0);
await actor('');
ok((await db.query('select id from sky_posts')).rows.length === 0);
await actor(m);
await action('reviewPost', {
  id: pid,
  status: 'published',
  text: 'Own photo and no personal details',
});
await actor(b);
ok((await db.query('select id from sky_posts')).rows.length === 1);
await action('comment', { id: pid, text: 'Lovely!' });
await rejects(() => action('comment', { id: pid, text: 'Flood' }), /RATE_LIMIT/);
checks++;
const cid = (await db.query('select id from sky_comments')).rows[0].id;
await actor(a);
ok((await db.query('select id from sky_comments')).rows.length === 0);
await actor(m);
await action('reviewComment', { id: cid, status: 'published', text: 'Respectful comment' });
await actor(a);
ok((await db.query('select id from sky_comments')).rows.length === 1);
await action('block', { id: b });
ok((await db.query('select id from sky_comments')).rows.length === 0);
await actor(b);
ok((await db.query('select id from sky_posts')).rows.length === 0);
await rejects(() => action('comment', { id: pid, text: 'Bypass block' }), /NOT_AVAILABLE/);
checks++;
await actor(a);
await action('unblock', { id: b });
await actor(b);
await action('report', { id: pid, type: 'post', text: 'Please check this' });
await actor(a);
ok((await db.query('select id from sky_reports')).rows.length === 0);
await actor(m);
ok((await db.query('select id from sky_reports')).rows.length === 1);
await action('reviewPost', { id: pid, status: 'hidden', text: 'Reviewing a concern' });
await actor(b);
ok((await db.query('select id from sky_posts')).rows.length === 0);
await actor(a);
await action('appeal', { id: pid, type: 'post', text: 'I took this photo' });
ok((await db.query('select id from sky_audit')).rows.length === 2);
await db.exec('reset role');
await db.query('select sky_reserve($1,$2,true)', [a, JSON.stringify({ size: 100 })]);
await actor(b);
ok((await db.query('select id from sky_backups')).rows.length === 0);
await actor(a);
ok((await db.query('select id from sky_backups')).rows.length === 1);
await rejects(() => db.exec('update sky_backups set ready=true'), /permission denied/);
checks++;
await actor(m);
await action('suspend', { id: b, on: true, text: 'Repeated harassment' });
await actor(b);
await rejects(() => action('react', { id: pid, on: true }), /ACCOUNT_UNAVAILABLE/);
checks++;
await action('join', { name: 'Changed name', terms: '2026-09-08' });
await rejects(() => action('react', { id: pid, on: true }), /ACCOUNT_UNAVAILABLE/);
checks++;
await actor(a);
await db.query('select sky_edit_post($1,$2,$3,$4,false)', [pid, 'Private moon', '', 'capture']);
await actor(m);
ok((await db.query('select id from sky_posts where id=$1', [pid])).rows.length === 0);
await rejects(
  () =>
    action('reviewPost', { id: pid, status: 'published', text: 'Cannot publish private content' }),
  /NOT_AVAILABLE/,
);
checks++;
await db.exec('reset role');
for (let i = 0; i < 9; i++)
  await db.query('select sky_reserve($1,$2,false)', [
    a,
    JSON.stringify({ object: 'moon', caption: 'Capacity test', kind: 'capture' }),
  ]);
await db.query('delete from sky_posts where owner=$1', [a]);
await rejects(
  () =>
    db.query('select sky_reserve($1,$2,false)', [
      a,
      JSON.stringify({ object: 'moon', caption: 'Must be rate limited', kind: 'capture' }),
    ]),
  /RATE_LIMIT/,
);
checks++;
await db.query('delete from auth.users where id=$1', [a]);
ok((await db.query('select id from sky_posts')).rows.length === 0);
ok((await db.query('select id from sky_backups')).rows.length === 0);
await db.close();
console.log(`Community PostgreSQL/RLS: ${checks} checks passed`);
