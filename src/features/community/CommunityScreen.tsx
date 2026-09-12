import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { hashQuery, navigate, useHash } from '@/app/router';
import { loadCatalog, displayName, type Catalog } from '@/catalog/catalog';
import { isObjectId } from '@/catalog/objectId';
import { ScreenFrame } from '@/features/settings/ScreenFrame';
import { PillButton } from '@/ui/PillButton';
import {
  communityAction,
  communityClient,
  communityConfigured,
  communityError,
  edgeAction,
  useCommunityUser,
} from '@/community/client';
import type { CommunityPost } from '@/community/types';
import { readCommunityIdentities, type CommunityIdentity } from '@/community/identity';
import { AuthorIdentity } from '@/features/personal/AuthorIdentity';
import { prepareCommunityImage } from '@/community/image';
import { clearSketchDraft, useSketchDraft, type SketchDraft } from '@/community/sketchDraft';
import { loadSearchIndex, search as searchObjects } from '@/catalog/searchIndex';
import { CommentsPanel } from './CommentsPanel';

function openCommunity(id?: string, object?: string) {
  window.location.hash =
    '#/community' + (id ? '?post=' + id : object ? '?object=' + encodeURIComponent(object) : '');
}
function Photo({
  post,
  alt,
  large = false,
}: {
  post: CommunityPost;
  alt: string;
  large?: boolean;
}) {
  const [src, setSrc] = useState('');
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let alive = true;
    void edgeAction('image', { id: post.id })
      .then((r) => r.json())
      .then((r: { signedUrl: string }) => {
        if (alive) {
          setSrc(r.signedUrl);
          setFailed(false);
        }
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [post.id, retry]);
  return (
    <div className={'overflow-hidden rounded-2xl bg-surface-2 ' + (large ? '' : 'aspect-square')}>
      {src && !failed ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className={large ? 'max-h-[60vh] w-full object-contain' : 'h-full w-full object-cover'}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex min-h-32 items-center justify-center p-4 text-muted">
          {failed ? (
            large ? (
              <button
                aria-label={alt}
                className="min-h-11 px-4"
                onClick={() => setRetry((n) => n + 1)}
              >
                ↻
              </button>
            ) : (
              <span aria-hidden>↻</span>
            )
          ) : (
            <span aria-hidden>✧</span>
          )}
        </div>
      )}
    </div>
  );
}

export default function CommunityScreen() {
  const auth = useCommunityUser();
  return <CommunityContent key={auth.user?.id ?? 'guest'} {...auth} />;
}
function CommunityContent({ user, ready }: ReturnType<typeof useCommunityUser>) {
  const { t, i18n } = useTranslation();
  const hash = useHash();
  const query = hashQuery(hash);
  const selected = query.get('post');
  const object = query.get('object') || '';
  const [cat, setCat] = useState<Catalog | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [authors, setAuthors] = useState<Record<string, CommunityIdentity>>({});
  const [joined, setJoined] = useState(false);
  const [reacted, setReacted] = useState(false);
  const [scope, setScope] = useState<'all' | 'mine'>('all');
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  const [limit, setLimit] = useState(24);
  const [text, setText] = useState('');
  const [notice, setNotice] = useState('');
  const draft = useSketchDraft((s) => s.draft);
  const [compose, setCompose] = useState(() => !!useSketchDraft.getState().draft);
  const post = posts.find((p) => p.id === selected);
  useEffect(() => {
    let alive = true;
    void loadCatalog().then((c) => {
      if (alive) setCat(c);
    });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (!communityConfigured || !ready) return;
    let alive = true;
    const refresh = async () => {
      try {
        const c = communityClient();
        let request = c
          .from('sky_posts')
          .select('id,owner,object_id,caption,equipment,kind,status,created_at')
          .order('created_at', { ascending: false })
          .limit(limit);
        if (selected) request = request.eq('id', selected);
        else if (scope === 'mine' && user)
          request = request.eq('owner', user.id).neq('status', 'deleted');
        else request = request.eq('status', 'published');
        if (object) request = request.eq('object_id', object);
        if (category !== 'all' && !selected)
          request = request.like('object_id', category === 'moon' ? 'moon' : category + ':%');
        const [p, me, reaction] = await Promise.all([
          request,
          user
            ? c.from('sky_members').select('id').eq('id', user.id).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
          user && selected
            ? c.from('sky_reactions').select('post_id').eq('post_id', selected).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
        ]);
        if (p.error || me.error || reaction.error) throw new Error('LOAD');
        const members = await readCommunityIdentities(
          (p.data as CommunityPost[]).map((row) => row.owner),
        );
        if (alive) {
          setPosts(p.data as CommunityPost[]);
          setAuthors(members);
          setJoined(!!me.data);
          setReacted(!!reaction.data);
          setError('');
          setLoading(false);
        }
      } catch (e) {
        if (alive) {
          setError(communityError(e));
          setLoading(false);
        }
      }
    };
    void refresh();
    return () => {
      alive = false;
    };
  }, [selected, object, user, ready, tick, scope, category, limit]);
  const name = (id: string) =>
    cat && isObjectId(id) ? displayName(cat, id, i18n.language === 'en' ? 'en' : 'ko') : id;
  const open = (id?: string) => {
    openCommunity(id, object);
    setNotice('');
    setText('');
  };
  async function run(action: string, payload: Record<string, unknown>, edge = false) {
    setBusy(true);
    setError('');
    try {
      if (edge) await edgeAction(action, payload);
      else await communityAction(action, payload);
      setNotice(t(action === 'comment' ? 'social.pendingNotice' : 'social.done'));
      setText('');
      setTick((n) => n + 1);
      if (action === 'deletePost' || action === 'block') open();
    } catch (e) {
      setError(communityError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <ScreenFrame
      title={selected ? t('social.photo') : t('social.title')}
      onBack={() => {
        if (compose) {
          clearSketchDraft();
          setCompose(false);
        } else if (selected) open();
        else navigate('profile');
      }}
      testId="community-screen"
    >
      <div className="mx-auto max-w-2xl space-y-5 p-5">
        {!communityConfigured ? (
          <div className="rounded-3xl bg-surface p-6">
            <h2 className="text-title">{t('social.coming')}</h2>
            <p className="mt-2 text-muted">{t('social.comingBody')}</p>
          </div>
        ) : (
          <>
            {error && (
              <div role="alert" className="rounded-xl bg-danger-soft p-4">
                <p>{t(error)}</p>
                <PillButton onClick={() => setTick((n) => n + 1)}>{t('study.retry')}</PillButton>
              </div>
            )}
            {notice && (
              <p role="status" className="text-accent">
                {notice}
              </p>
            )}
            {compose ? (
              <Composer
                draft={draft}
                canPublish={!!user && joined}
                initialObject={object}
                onDone={() => {
                  setCompose(false);
                  clearSketchDraft();
                  setScope('mine');
                  setTick((n) => n + 1);
                  setNotice(t('social.pendingNotice'));
                }}
              />
            ) : selected ? (
              post ? (
                <>
                  <Photo key={post.id} post={post} alt={post.caption} large />
                  <div>
                    <p className="text-body-sm text-accent">
                      {name(post.object_id)} · {t('social.kinds.' + post.kind)}
                    </p>
                    <h2 className="mt-2 whitespace-pre-wrap text-title">{post.caption}</h2>
                    <div className="mt-3">
                      <AuthorIdentity identity={authors[post.owner]} />
                    </div>
                    <p className="mt-1 text-caption text-muted">
                      {new Date(post.created_at).toLocaleDateString(i18n.language)}
                    </p>
                    {post.equipment && (
                      <p className="mt-2 text-body-sm text-muted">{post.equipment}</p>
                    )}
                    {post.status !== 'published' && (
                      <p className="mt-2 text-accent">{t('social.states.' + post.status)}</p>
                    )}
                  </div>
                  {joined && post.status === 'published' && (
                    <PillButton
                      pressed={reacted}
                      disabled={busy}
                      onClick={() => void run('react', { id: post.id, on: !reacted })}
                    >
                      {reacted ? '♥' : '♡'} {t('social.cheer')}
                    </PillButton>
                  )}
                  <details className="rounded-xl bg-surface p-3">
                    <summary className="min-h-11 cursor-pointer py-2">
                      {t('social.options')}
                    </summary>
                    <div className="space-y-3 pt-2">
                      {post.owner === user?.id ? (
                        <>
                          <EditPost
                            post={post}
                            onDone={() => {
                              setTick((n) => n + 1);
                              setNotice(t('social.done'));
                            }}
                          />
                          <PillButton
                            disabled={busy}
                            variant="danger"
                            onClick={() => {
                              if (window.confirm(t('social.deleteConfirm')))
                                void run('deletePost', { id: post.id }, true);
                            }}
                          >
                            {t('social.delete')}
                          </PillButton>
                          {['rejected', 'hidden'].includes(post.status) && (
                            <>
                              <textarea
                                aria-label={t('social.appealReason')}
                                maxLength={500}
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                className="w-full rounded-xl bg-bg p-3"
                              />
                              <PillButton
                                disabled={busy || !text.trim()}
                                onClick={() =>
                                  void run('appeal', { id: post.id, type: 'post', text })
                                }
                              >
                                {t('social.appeal')}
                              </PillButton>
                            </>
                          )}
                        </>
                      ) : joined ? (
                        <>
                          <textarea
                            aria-label={t('social.reportReason')}
                            maxLength={500}
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            className="w-full rounded-xl bg-bg p-3"
                          />
                          <div className="flex flex-wrap gap-2">
                            <PillButton
                              disabled={busy || !text.trim()}
                              onClick={() =>
                                void run('report', { id: post.id, type: 'post', text })
                              }
                            >
                              {t('social.report')}
                            </PillButton>
                            <PillButton
                              disabled={busy}
                              onClick={() => {
                                if (window.confirm(t('social.blockConfirm')))
                                  void run('block', { id: post.owner });
                              }}
                            >
                              {t('social.block')}
                            </PillButton>
                          </div>
                        </>
                      ) : (
                        <PillButton onClick={() => navigate('account')}>
                          {t('social.signIn')}
                        </PillButton>
                      )}
                    </div>
                  </details>
                  <CommentsPanel
                    postId={post.id}
                    published={post.status === 'published'}
                    userId={user?.id}
                    joined={joined}
                    onBlocked={() => {
                      open();
                      setTick((n) => n + 1);
                    }}
                  />
                </>
              ) : (
                <p role="status">{t(loading ? 'common.loading' : 'social.notAvailable')}</p>
              )
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-headline">
                      {object ? name(object) : t('social.galleryHeading')}
                    </h2>
                    <p className="mt-1 text-body-sm text-muted">{t('social.intro')}</p>
                  </div>
                  <PillButton onClick={() => (joined ? setCompose(true) : navigate('account'))}>
                    {t('social.share')}
                  </PillButton>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <PillButton pressed={scope === 'all'} onClick={() => setScope('all')}>
                    {t('social.everyone')}
                  </PillButton>
                  {user && (
                    <PillButton pressed={scope === 'mine'} onClick={() => setScope('mine')}>
                      {t('social.mine')}
                    </PillButton>
                  )}
                  {!object && (
                    <select
                      aria-label={t('social.category')}
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="min-h-11 rounded-pill bg-surface px-3"
                    >
                      {['all', 'moon', 'planet', 'dso', 'star', 'const'].map((k) => (
                        <option key={k} value={k}>
                          {t('social.categories.' + k)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                {loading ? (
                  <p role="status">{t('common.loading')}</p>
                ) : !posts.length ? (
                  <div className="rounded-3xl bg-surface px-6 py-12 text-center">
                    <span className="text-4xl text-accent" aria-hidden>
                      ✧
                    </span>
                    <h3 className="mt-4 text-title">{t('social.empty')}</h3>
                    <p className="mt-2 text-body-sm text-muted">{t('social.emptyBody')}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {posts.map((p) => (
                      <button key={p.id} className="min-w-0 text-left" onClick={() => open(p.id)}>
                        <Photo post={p} alt={p.caption} />
                        <span className="mt-2 block truncate text-body-sm">
                          {name(p.object_id)}
                        </span>
                        <span className="mt-1 block">
                          <AuthorIdentity identity={authors[p.owner]} compact />
                        </span>
                        {p.status !== 'published' && (
                          <span className="block text-caption text-muted">
                            {t('social.states.' + p.status)}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {posts.length >= limit && (
                  <PillButton onClick={() => setLimit((n) => n + 24)}>
                    {t('common.more')}
                  </PillButton>
                )}
              </>
            )}
          </>
        )}
      </div>
    </ScreenFrame>
  );
}

function EditPost({ post, onDone }: { post: CommunityPost; onDone(): void }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save(values: FormData, submit: boolean) {
    setBusy(true);
    try {
      const r = await communityClient().rpc('sky_edit_post', {
        pid: post.id,
        caption_text: String(values.get('caption') || post.caption),
        equipment_text: String(values.get('equipment') ?? post.equipment),
        image_kind: String(values.get('kind') || post.kind),
        submit,
      });
      if (r.error) throw r.error;
      onDone();
    } catch (e) {
      setError(communityError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="rounded-xl bg-bg p-3">
      <summary className="min-h-11 cursor-pointer py-2">{t('social.editPhoto')}</summary>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void save(new FormData(e.currentTarget), true);
        }}
      >
        {error && <p role="alert">{t(error)}</p>}
        <label className="block text-body-sm">
          {t('social.caption')}
          <textarea
            name="caption"
            required
            maxLength={1000}
            defaultValue={post.caption}
            className="mt-2 min-h-24 w-full rounded-xl bg-surface p-3"
          />
        </label>
        <label className="block text-body-sm">
          {t('social.equipment')}
          <input
            name="equipment"
            maxLength={160}
            defaultValue={post.equipment}
            className="mt-2 min-h-12 w-full rounded-xl bg-surface px-3"
          />
        </label>
        <label className="block text-body-sm">
          {t('social.kind')}
          <select
            name="kind"
            defaultValue={post.kind}
            className="mt-2 min-h-12 w-full rounded-xl bg-surface px-3"
          >
            {['capture', 'processed', 'creative'].map((k) => (
              <option key={k} value={k}>
                {t('social.kinds.' + k)}
              </option>
            ))}
          </select>
        </label>
        <p className="text-caption text-muted">{t('social.editHint')}</p>
        <PillButton type="submit" disabled={busy}>
          {t('social.sendReview')}
        </PillButton>
        <PillButton
          disabled={busy || post.status === 'private'}
          onClick={() => void save(new FormData(), false)}
        >
          {t('social.makePrivate')}
        </PillButton>
      </form>
    </details>
  );
}
function Composer({
  initialObject,
  draft,
  canPublish,
  onDone,
}: {
  initialObject: string;
  draft: SketchDraft | null;
  canPublish: boolean;
  onDone(): void;
}) {
  const { t, i18n } = useTranslation();
  const [object, setObject] = useState(draft?.objectId ?? initialObject);
  const [search, setSearch] = useState('');
  const [hits, setHits] = useState<string[]>([]);
  const [cat, setCat] = useState<Catalog | null>(null);
  const [blob, setBlob] = useState<Blob | null>(draft?.image ?? null);
  const [preview, setPreview] = useState('');
  const [caption, setCaption] = useState('');
  const [equipment, setEquipment] = useState('');
  const [kind, setKind] = useState(draft ? 'creative' : 'capture');
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    void loadCatalog().then((c) => {
      if (alive) setCat(c);
    });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    let alive = true;
    void loadSearchIndex()
      .then(() => searchObjects(search, { limit: 6 }))
      .then((h) => {
        if (alive) setHits(h.map((v) => v.id));
      });
    return () => {
      alive = false;
    };
  }, [search]);
  useEffect(() => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    queueMicrotask(() => setPreview(url));
    return () => URL.revokeObjectURL(url);
  }, [blob]);
  const name = (id: string) =>
    cat && isObjectId(id) ? displayName(cat, id, i18n.language === 'en' ? 'en' : 'ko') : id;
  async function submit() {
    if (!blob || !agree || !object || !canPublish) return;
    setBusy(true);
    setError('');
    try {
      const form = new FormData();
      form.append('consent', '2026-09-08');
      form.append('image', blob, 'photo.jpg');
      form.append('object', object);
      form.append('caption', caption);
      form.append('equipment', equipment);
      form.append('kind', kind);
      await edgeAction('upload', form);
      onDone();
    } catch (e) {
      setError(communityError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div>
        <h2 className="text-title">{t('social.share')}</h2>
        <p className="mt-2 text-body-sm text-muted">
          {t(draft ? 'field.sketchDraft' : 'social.uploadHint')}
        </p>
      </div>
      {error && (
        <p role="alert" className="text-danger">
          {t(error)}
        </p>
      )}
      {preview && (
        <img
          src={preview}
          alt={t('social.preview')}
          className="max-h-72 w-full rounded-2xl object-contain"
        />
      )}
      <label className="block text-body-sm">
        {t('social.choosePhoto')}
        <input
          className="mt-2 min-h-12 w-full rounded-xl bg-surface p-3"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) {
              setBusy(true);
              setBlob(null);
              setPreview('');
              void prepareCommunityImage(f)
                .then(setBlob)
                .catch(() => setError('social.imageError'))
                .finally(() => setBusy(false));
            }
          }}
        />
      </label>
      <label className="block text-body-sm">
        {t('social.object')}
        <input
          className="mt-2 min-h-12 w-full rounded-xl bg-surface px-4"
          value={search}
          placeholder={object ? name(object) : t('social.objectSearch')}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      {search && (
        <div className="rounded-xl bg-surface">
          {hits.map((id) => (
            <button
              type="button"
              className="min-h-11 w-full px-4 text-left"
              key={id}
              onClick={() => {
                setObject(id);
                setSearch('');
              }}
            >
              {name(id)}
            </button>
          ))}
        </div>
      )}
      {object && (
        <p className="text-body-sm text-accent">
          {t('social.selectedObject', { name: name(object) })}
        </p>
      )}
      <label className="block text-body-sm">
        {t('social.caption')}
        <textarea
          required
          maxLength={1000}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="mt-2 min-h-24 w-full rounded-xl bg-surface p-4"
        />
      </label>
      <label className="block text-body-sm">
        {t('social.equipment')}
        <input
          maxLength={160}
          value={equipment}
          onChange={(e) => setEquipment(e.target.value)}
          className="mt-2 min-h-12 w-full rounded-xl bg-surface px-4"
        />
      </label>
      <label className="block text-body-sm">
        {t('social.kind')}
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className="mt-2 min-h-12 w-full rounded-xl bg-surface px-4"
        >
          {['capture', 'processed', 'creative'].map((k) => (
            <option key={k} value={k}>
              {t('social.kinds.' + k)}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-h-11 items-start gap-3 text-body-sm">
        <input
          type="checkbox"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
          className="mt-1 h-5 w-5 shrink-0"
        />
        {t('social.publishConsent')}
      </label>
      <PillButton
        type="submit"
        variant="primary"
        disabled={!canPublish || busy || !blob || !object || !caption.trim() || !agree}
      >
        {t(busy ? 'common.loading' : 'social.sendReview')}
      </PillButton>
      {!canPublish && (
        <PillButton onClick={() => navigate('account')} testId="sketch-share-account">
          {t('field.sketchAccount')}
        </PillButton>
      )}
    </form>
  );
}
