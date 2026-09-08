// 명시적인 테스트 계정만 만들고 finally에서 삭제한다. 키·비밀번호·토큰은 출력하거나 저장하지 않는다.
/* global fetch, FormData, Blob */
import { createClient } from '@supabase/supabase-js';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';
import console from 'node:console';
import process from 'node:process';
import sharp from 'sharp';
import { Buffer } from 'node:buffer';
const project = 'ijxuwtbcwifttiuwvqrh';
if (process.env.SKYLOG_LIVE_TEST !== 'yes')
  throw new Error('Set SKYLOG_LIVE_TEST=yes to test the configured skylog backend');
const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const keys = JSON.parse(
  execFileSync(
    command,
    [
      '--yes',
      'supabase@2.117.0',
      'projects',
      'api-keys',
      '--project-ref',
      project,
      '--output',
      'json',
    ],
    { encoding: 'utf8', shell: process.platform === 'win32' },
  ),
);
const service = keys.find((k) => k.name === 'service_role').api_key,
  anon = keys.find((k) => k.name === 'anon').api_key;
const url = `https://${project}.supabase.co`;
const admin = createClient(url, service, { auth: { persistSession: false } });
const clients = [];
const ids = [];
let checks = 0;
const ok = (v) => {
  assert.ok(v);
  checks++;
};
async function edge(c, action, body) {
  const session = (await c.auth.getSession()).data.session;
  return fetch(url + '/functions/v1/community?action=' + action, {
    method: 'POST',
    headers: {
      apikey: anon,
      Authorization: 'Bearer ' + (session?.access_token || anon),
      ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body instanceof FormData ? body : JSON.stringify(body),
  });
}
async function action(c, a, p) {
  const r = await c.rpc('sky_action', { action: a, payload: p });
  if (r.error) throw new Error(r.error.message);
}
try {
  for (let i = 0; i < 3; i++) {
    const email = `skylog-ci-${Date.now()}-${i}@example.invalid`,
      password = randomBytes(24).toString('base64url');
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { automated_test: true },
    });
    if (created.error) throw new Error(created.error.message);
    ids.push(created.data.user.id);
    const c = createClient(url, anon, { auth: { persistSession: false } });
    const login = await c.auth.signInWithPassword({ email, password });
    if (login.error) throw new Error(login.error.message);
    clients.push(c);
    await action(c, 'join', { name: '자동 검사 ' + i, terms: '2026-09-08' });
  }
  const [a, b, m] = clients;
  const role = await admin.from('sky_moderators').insert({ id: ids[2] });
  if (role.error) throw new Error(role.error.message);
  const jpg = await sharp({ create: { width: 96, height: 64, channels: 3, background: '#253b50' } })
    .jpeg()
    .withExif({ IFD0: { Artist: 'private-owner' } })
    .toBuffer();
  const form = new FormData();
  form.set('consent', '2026-09-08');
  form.set('image', new Blob([jpg], { type: 'image/jpeg' }), 'test.jpg');
  form.set('object', 'moon');
  form.set('caption', 'Automated verification — removed after test');
  form.set('kind', 'capture');
  const upload = await edge(a, 'upload', form);
  if (!upload.ok) throw new Error('Upload: ' + upload.status + ' ' + (await upload.text()));
  const { id: pid } = await upload.json();
  ok((await b.from('sky_posts').select('id').eq('id', pid)).data.length === 0);
  ok((await edge(b, 'image', { id: pid })).status !== 200);
  const direct = await b.from('sky_posts').update({ status: 'published' }).eq('id', pid);
  ok(!!direct.error);
  await action(m, 'reviewPost', { id: pid, status: 'published', text: 'Automated test image' });
  ok((await b.from('sky_posts').select('id').eq('id', pid)).data.length === 1);
  const image = await edge(b, 'image', { id: pid });
  ok(image.ok);
  const guest = createClient(url, anon, { auth: { persistSession: false } });
  ok((await edge(guest, 'image', { id: pid })).ok);
  const signed = await image.json();
  const bytes = await (await fetch(signed.signedUrl)).arrayBuffer();
  const meta = await sharp(Buffer.from(bytes)).metadata();
  ok(meta.width === 96 && !meta.exif);
  await action(b, 'comment', { id: pid, text: 'Test comment' });
  const comment = (await b.from('sky_comments').select('id').eq('post_id', pid)).data[0];
  ok((await a.from('sky_comments').select('id').eq('post_id', pid)).data.length === 0);
  await action(m, 'reviewComment', { id: comment.id, status: 'published', text: 'Test review' });
  await action(a, 'block', { id: ids[1] });
  ok((await b.from('sky_posts').select('id').eq('id', pid)).data.length === 0);
  ok(!(await edge(b, 'image', { id: pid })).ok);
  await action(a, 'unblock', { id: ids[1] });
  const privateEdit = await a.rpc('sky_edit_post', {
    pid,
    caption_text: 'Private test',
    equipment_text: '',
    image_kind: 'capture',
    submit: false,
  });
  ok(!privateEdit.error);
  ok(!(await edge(m, 'image', { id: pid })).ok);
  const resubmit = await a.rpc('sky_edit_post', {
    pid,
    caption_text: 'Review again',
    equipment_text: '',
    image_kind: 'capture',
    submit: true,
  });
  ok(!resubmit.error);
  const backup = await edge(a, 'backup', {
    app: 'skylog',
    schemaVersion: 1,
    data: { test: 'private' },
    blobs: {},
  });
  ok(backup.ok);
  const bid = (await backup.json()).id;
  ok((await b.from('sky_backups').select('id').eq('id', bid)).data.length === 0);
  ok(!(await edge(b, 'restore', { id: bid })).ok);
  ok((await edge(a, 'restore', { id: bid })).ok);
  ok((await edge(a, 'deleteBackup', { id: bid })).ok);
  ok((await edge(a, 'deletePost', { id: pid })).ok);
  ok((await a.from('sky_posts').select('id').eq('id', pid)).data.length === 0);
  ok((await edge(b, 'deleteAccount', { confirm: 'DELETE' })).ok);
  ok(!(await admin.auth.admin.getUserById(ids[1])).data.user);
  console.log(
    `Live Supabase: ${checks} checks passed (RLS, EXIF stripping, moderation, blocks, backup, account deletion)`,
  );
} finally {
  for (const id of ids) {
    for (const bucket of ['sky-photos', 'sky-backups']) {
      const files = await admin.storage.from(bucket).list(id);
      if (files.data?.length)
        await admin.storage.from(bucket).remove(files.data.map((f) => id + '/' + f.name));
    }
    await admin.auth.admin.deleteUser(id);
  }
}
