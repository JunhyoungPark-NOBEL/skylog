import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import console from 'node:console';
const db = new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
create schema auth;create table auth.users(id uuid primary key);
grant usage on schema public,auth to anon,authenticated,service_role;`);
await db.exec(await readFile('supabase/migrations/202609100002_entitlements.sql', 'utf8'));
const a = '00000000-0000-4000-8000-000000000001',
  b = '00000000-0000-4000-8000-000000000002';
await db.query('insert into auth.users values($1),($2)', [a, b]);
let count = 0;
const ok = (value) => {
  assert.ok(value);
  count++;
};
const denied = async (fn) => {
  await assert.rejects(fn, /permission denied/);
  count++;
};
for (const role of ['anon', 'authenticated']) {
  await db.exec(`set role ${role}`);
  await denied(() => db.query('select * from sky_play_purchases'));
  await denied(() => db.query('select * from sky_plus_grants'));
  await denied(() => db.query('select sky_plus_status($1)', [a]));
  await denied(() =>
    db.query("select sky_set_plus_grant($1,'fake-admin','email exception',false)", [a]),
  );
  await denied(() =>
    db.query("select sky_save_play_purchase($1,$2,$3,$4,'purchased',true,false)", [
      a,
      'a'.repeat(64),
      'fake-token-00000000000000',
      'a'.repeat(64),
    ]),
  );
  await db.exec('reset role');
}
await db.exec('set role service_role');
const identity = async (id) =>
  (await db.query('select sky_billing_account($1) as id', [id])).rows[0].id;
const accountA = await identity(a),
  accountB = await identity(b);
ok(/^[a-f0-9]{64}$/.test(accountA));
ok(accountA !== accountB);
ok((await identity(a)) === accountA);
const state = async (id) =>
  (await db.query('select sky_plus_status($1) as value', [id])).rows[0].value;
const save = (id, account, status, ack, hash = 'a'.repeat(64)) =>
  db.query('select sky_save_play_purchase($1,$2,$3,$4,$5,$6,false)', [
    id,
    hash,
    'example-play-token-00000000000000',
    account,
    status,
    ack,
  ]);
ok(!(await state(a)).hasPlus);
await save(a, accountA, 'pending', false);
ok(!(await state(a)).hasPlus);
await save(a, accountA, 'purchased', false);
ok(!(await state(a)).hasPlus);
await save(a, accountA, 'purchased', true);
ok((await state(a)).hasPlus);
ok(!(await state(b)).hasPlus);
await save(a, accountA, 'purchased', true);
ok((await db.query('select * from sky_play_purchases')).rows.length === 1);
await assert.rejects(() => save(b, accountB, 'purchased', true), /PURCHASE_ACCOUNT_MISMATCH/);
count++;
await db.query("update sky_play_purchases set verified_at=now()-interval '25 hours'");
ok(!(await state(a)).hasPlus);
await save(a, accountA, 'purchased', true);
ok((await state(a)).hasPlus);
await save(a, accountA, 'cancelled', true);
ok(!(await state(a)).hasPlus);
await save(a, accountA, 'purchased', true);
ok(!(await state(a)).hasPlus);
await db.query(
  "select sky_set_plus_grant($1,'operator-confirmed','Owner permission verified',false)",
  [a],
);
ok((await state(a)).source === 'grant');
ok(!(await state(b)).hasPlus);
await db.query(
  "select sky_set_plus_grant($1,'operator-confirmed','Owner permission withdrawn',true)",
  [a],
);
ok(!(await state(a)).hasPlus);
await db.exec('reset role');
await db.query('delete from auth.users where id=$1', [a]);
await db.exec('set role service_role');
ok((await db.query('select owner from sky_play_purchases')).rows[0].owner === null);
await assert.rejects(() => save(b, accountB, 'purchased', true), /PURCHASE_ACCOUNT_MISMATCH/);
count++;
for (let i = 0; i < 12; i++) await db.query('select sky_billing_allow($1)', [b]);
await assert.rejects(() => db.query('select sky_billing_allow($1)', [b]), /RATE_LIMIT/);
count++;
await db.close();
console.log(
  JSON.stringify({
    suite: 'entitlements-database',
    checks: count,
    failures: 0,
    actualServer: false,
  }),
);
