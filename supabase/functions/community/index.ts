// JWT 검증은 함수 안에서 getUser로 수행한다. 서비스 키는 서버 환경에만 존재한다.
import { createClient } from 'npm:@supabase/supabase-js@2.116.0';
import jpeg from 'npm:jpeg-js@0.4.4';

const url = Deno.env.get('SUPABASE_URL')!;
const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
function must<T>(result: { data: T; error: unknown }): T {
  if (result.error) throw new Error('REQUEST_FAILED');
  return result.data;
}
async function limitedBody(request: Request, max: number): Promise<Uint8Array> {
  if (Number(request.headers.get('content-length') || 0) > max) throw new Error('TOO_LARGE');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('EMPTY');
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > max) {
      await reader.cancel();
      throw new Error('TOO_LARGE');
    }
    chunks.push(value);
  }
  const out = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}
Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (request.method !== 'POST') return json({ error: 'METHOD' }, 405);
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer /i, '') ?? '';
    const userClient = createClient(url, anon, {
      global: {
        headers: { Authorization: `Bearer ${token.split('.').length === 3 ? token : anon}` },
      },
      auth: { persistSession: false },
    });
    const action = new URL(request.url).searchParams.get('action');
    // 사진을 볼 때마다 RLS로 확인한다. 서명 URL은 60초 뒤 만료된다.
    if (action === 'image') {
      const p: unknown = JSON.parse(new TextDecoder().decode(await limitedBody(request, 1024)));
      const id = p && typeof p === 'object' && 'id' in p ? p.id : '';
      if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/.test(id))
        return json({ error: 'INVALID_ID' }, 400);
      const post = must(
        await userClient.from('sky_posts').select('image_path,status').eq('id', id).single(),
      );
      if (!post || ['deleted', 'uploading'].includes(post.status))
        return json({ error: 'NOT_AVAILABLE' }, 404);
      return json(
        must(await admin.storage.from('sky-photos').createSignedUrl(post.image_path, 60)),
      );
    }
    const auth = await admin.auth.getUser(token);
    const user = auth.data.user;
    if (auth.error || !user) return json({ error: 'AUTH_REQUIRED' }, 401);
    if (action === 'upload') {
      const bytes = await limitedBody(request, 3145728);
      const form = await new Response(bytes, {
        headers: { 'Content-Type': request.headers.get('content-type') || '' },
      }).formData();
      if (form.get('consent') !== '2026-09-08') return json({ error: 'CONSENT_REQUIRED' }, 400);
      const file = form.get('image');
      if (!(file instanceof File) || file.type !== 'image/jpeg' || file.size > 2200000)
        return json({ error: 'INVALID_IMAGE' }, 400);
      const raw = new Uint8Array(await file.arrayBuffer());
      if (raw[0] !== 255 || raw[1] !== 216) return json({ error: 'INVALID_IMAGE' }, 400);
      const decoded = jpeg.decode(raw, {
        useTArray: true,
        maxResolutionInMP: 4,
        maxMemoryUsageInMB: 96,
        tolerantDecoding: false,
      });
      // 픽셀만 다시 인코딩하고 EXIF와 주석 메타데이터는 복사하지 않는다.
      const clean = jpeg.encode(
        { data: decoded.data, width: decoded.width, height: decoded.height },
        86,
      ).data;
      const payload = {
        object: String(form.get('object') || ''),
        caption: String(form.get('caption') || ''),
        equipment: String(form.get('equipment') || ''),
        kind: String(form.get('kind') || ''),
      };
      const id = must(
        await admin.rpc('sky_reserve', { actor: user.id, payload, backup: false }),
      ) as string;
      const path = `${user.id}/${id}.jpg`;
      try {
        must(
          await admin.storage
            .from('sky-photos')
            .upload(path, clean, { contentType: 'image/jpeg', upsert: false, cacheControl: '0' }),
        );
        must(
          await admin
            .from('sky_posts')
            .update({ status: 'pending' })
            .eq('id', id)
            .eq('owner', user.id)
            .select('id')
            .single(),
        );
      } catch (e) {
        await admin.storage.from('sky-photos').remove([path]);
        await admin.from('sky_posts').delete().eq('id', id);
        throw e;
      }
      return json({ id });
    }
    if (action === 'backup') {
      const bytes = await limitedBody(request, 20971520);
      const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
      if (
        !parsed ||
        typeof parsed !== 'object' ||
        !('data' in parsed) ||
        !('app' in parsed) ||
        parsed.app !== 'skylog'
      )
        return json({ error: 'INVALID_BACKUP' }, 400);
      const id = must(
        await admin.rpc('sky_reserve', {
          actor: user.id,
          payload: { size: bytes.length },
          backup: true,
        }),
      ) as string;
      const path = `${user.id}/${id}.json`;
      try {
        must(
          await admin.storage
            .from('sky-backups')
            .upload(path, bytes, { contentType: 'application/json' }),
        );
        must(
          await admin
            .from('sky_backups')
            .update({ ready: true })
            .eq('id', id)
            .eq('owner', user.id)
            .select('id')
            .single(),
        );
      } catch (e) {
        await admin.storage.from('sky-backups').remove([path]);
        await admin.from('sky_backups').delete().eq('id', id);
        throw e;
      }
      return json({ id });
    }
    const p = JSON.parse(new TextDecoder().decode(await limitedBody(request, 1024))) as Record<
      string,
      unknown
    >;
    if (action === 'restore' || action === 'deleteBackup') {
      const row = must(
        await admin
          .from('sky_backups')
          .select('path')
          .eq('id', String(p.id))
          .eq('owner', user.id)
          .eq('ready', true)
          .single(),
      );
      if (action === 'restore') {
        const blob = must(await admin.storage.from('sky-backups').download(row.path));
        return new Response(blob, {
          headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        });
      }
      must(await admin.storage.from('sky-backups').remove([row.path]));
      must(await admin.from('sky_backups').delete().eq('id', String(p.id)).eq('owner', user.id));
      return json({ ok: true });
    }
    if (action === 'deletePost') {
      const row = must(
        await admin
          .from('sky_posts')
          .select('image_path')
          .eq('id', String(p.id))
          .eq('owner', user.id)
          .single(),
      );
      must(
        await admin
          .from('sky_posts')
          .update({ status: 'deleted' })
          .eq('id', String(p.id))
          .eq('owner', user.id),
      );
      must(await admin.storage.from('sky-photos').remove([row.image_path]));
      must(await admin.from('sky_posts').delete().eq('id', String(p.id)).eq('owner', user.id));
      return json({ ok: true });
    }
    if (action === 'deleteAccount' && p.confirm === 'DELETE') {
      if (!user.last_sign_in_at || Date.now() - Date.parse(user.last_sign_in_at) > 15 * 60 * 1000)
        return json({ error: 'REAUTH_REQUIRED' }, 403);
      // 계정 행을 지우기 전에 개인 파일부터 삭제한다. 실패하면 재시도한다.
      for (const bucket of ['sky-photos', 'sky-backups']) {
        while (true) {
          const files = must(await admin.storage.from(bucket).list(user.id, { limit: 100 }));
          if (!files.length) break;
          must(await admin.storage.from(bucket).remove(files.map((f) => `${user.id}/${f.name}`)));
        }
      }
      must(await admin.auth.admin.deleteUser(user.id));
      return json({ ok: true });
    }
    return json({ error: 'INVALID_ACTION' }, 400);
  } catch (error) {
    // 본문·토큰·비공개 백업은 로그에 남기지 않는다.
    const code =
      error instanceof Error && ['TOO_LARGE', 'EMPTY', 'AUTH_REQUIRED'].includes(error.message)
        ? error.message
        : 'REQUEST_FAILED';
    return json({ error: code }, 400);
  }
});
