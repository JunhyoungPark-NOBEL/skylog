import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Lang } from '@/app/i18n';
import { navigate } from '@/app/router';
import { displayName, type Catalog } from '@/catalog/catalog';
import type { ObjectId } from '@/catalog/objectId';
import { markRead, reportContentIssue } from '@/content/readProgress';
import type { ContentEntry } from '@/content/schema';
import { openObject } from '@/features/object/objectApi';
import { flyToObject } from '@/features/sky/skyApi';
import { showToast } from '@/state/logUiStore';
import { Chip, ChipRow } from '@/ui/Chip';
import { Segmented } from '@/ui/Segmented';
import { StoryImage } from './StoryThumbnail';

type Equip = 'nakedEye' | 'binoculars' | 'telescope';

const SECTION = 'mt-5 first:mt-0';
const H2 = 'mb-2 text-body-sm font-semibold text-muted';
const PARA = 'whitespace-pre-line text-[1em] leading-7 text-fg';
const PRIMARY_BTN =
  'inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-pill bg-accent px-5 text-body font-semibold text-accent-fg transition-[transform,opacity] duration-150 ease-standard active:scale-[0.97]';
const SECONDARY_BTN =
  'inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-pill bg-surface-3 px-4 text-body-sm font-medium text-fg transition-[background-color,color,transform] duration-150 ease-standard active:scale-[0.97]';

/** "제목 — URL" 문자열에서 URL을 뽑는다(없으면 null) */
function splitSource(s: string): { title: string; url: string | null } {
  const m = s.match(/https?:\/\/\S+/);
  if (!m) return { title: s, url: null };
  const url = m[0].replace(/[).,]+$/, '');
  const title = s
    .replace(m[0], '')
    .replace(/\s*[—–-]\s*$/, '')
    .trim();
  return { title: title || url, url };
}

interface StoryViewProps {
  entry: ContentEntry;
  cat: Catalog | null;
  lang: Lang;
  /** 시트 안에서는 큰 제목·큰 버튼을 줄인다 */
  compact?: boolean;
  /** 시트 안에서 열렸을 때 "하늘에서 보기"가 시트를 닫아야 하면 넘긴다 */
  onBeforeShowInSky?(): void;
}

/**
 * 스토리 뷰어(task-06 §3.5, D-024): 한 줄 → 안전(태양) → 핵심 사실 → 이야기 → 우리 전통 → 찾는 법 → 관측 팁 → 재미있는 사실 → 출처 → 메타.
 * 글자 크기 2단계(기본/크게), 읽음 표시(사용자가 다 읽었다고 누르면 progress에 저장), 오류 신고(로컬 메모).
 */
export function StoryView({
  entry,
  cat,
  lang,
  compact = false,
  onBeforeShowInSky,
}: StoryViewProps) {
  const { t } = useTranslation();
  const [big, setBig] = useState(false);
  const [equip, setEquip] = useState<Equip>(() =>
    entry.observing.nakedEye ? 'nakedEye' : entry.observing.binoculars ? 'binoculars' : 'telescope',
  );
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState('');

  const showInSky = (id: ObjectId) => {
    onBeforeShowInSky?.();
    flyToObject(id);
    navigate('sky');
    openObject(id, 'half');
  };
  const nameOf = (id: ObjectId) => (cat ? displayName(cat, id, lang) : id);
  const equipOptions = (['nakedEye', 'binoculars', 'telescope'] as const)
    .filter((k) => entry.observing[k])
    .map((k) => ({ value: k, label: t(`content.equip.${k}`) }));
  const needsReview = entry.meta.needsReview ?? [];
  const reviewBadge = entry.meta.confidence !== 'high' || needsReview.length > 0;

  return (
    <article
      className={`${big ? 'text-[1.15rem]' : 'text-base'} pb-6`}
      data-testid="story-view"
      data-object-id={entry.id}
    >
      <header className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          {!compact && (
            <h1 className="text-headline">{lang === 'en' ? entry.title.en : entry.title.ko}</h1>
          )}
          <p className={`${compact ? '' : 'mt-1'} text-body-lg font-medium text-fg`}>
            {lang === 'en' ? (entry.oneLiner.en ?? entry.oneLiner.ko) : entry.oneLiner.ko}
          </p>
          <p className="mt-0.5 text-caption text-muted">
            {entry.title.en}
            {entry.title.alt?.length ? ` · ${entry.title.alt.join(', ')}` : ''}
          </p>
        </div>
        <button
          type="button"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill text-body-lg text-fg/80 active:bg-surface-2"
          aria-pressed={big}
          aria-label={t('content.fontSize')}
          onClick={() => setBig((b) => !b)}
          data-testid="story-font"
        >
          Aa
        </button>
      </header>

      {entry.safety && (
        <section
          className={`${SECTION} rounded-lg bg-danger-soft px-4 py-3`}
          data-testid="story-safety"
        >
          <h2 className="mb-1 text-body-sm font-semibold text-danger">{t('content.safety')}</h2>
          <p className={PARA}>{entry.safety}</p>
        </section>
      )}

      <StoryImage id={entry.id} cat={cat} />

      <section className={SECTION}>
        <p className={PARA}>
          {lang === 'en' ? (entry.summary.en ?? entry.summary.ko) : entry.summary.ko}
        </p>
      </section>

      {entry.facts.length > 0 && (
        <section className={SECTION} data-testid="story-facts">
          <h2 className={H2}>{t('content.facts')}</h2>
          <dl className="overflow-hidden rounded-lg bg-surface-2/70 squircle [&>div+div]:hairline-t">
            {entry.facts.map((f, i) => (
              <div key={i} className="flex items-baseline gap-3 px-3.5 py-2.5">
                <dt className="w-24 shrink-0 text-body-sm text-muted">{f.label}</dt>
                <dd className="min-w-0 flex-1 text-body text-fg">
                  {f.value}
                  {f.review && (
                    <span className="ml-1.5 rounded-pill bg-surface-3 px-2 py-0.5 text-label text-muted">
                      {t('content.reviewing')}
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section className={SECTION} data-testid="story-story">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h2 className={H2}>{t('content.story')}</h2>
          <span className="text-label text-muted">{entry.story.cultures.join(' · ')}</span>
        </div>
        <p className={PARA}>{entry.story.ko}</p>
      </section>

      {entry.koreanTradition && (
        <section className={SECTION} data-testid="story-tradition">
          <h2 className={H2}>
            {t('content.tradition')}
            {entry.koreanTradition.name ? ` · ${entry.koreanTradition.name}` : ''}
            {entry.koreanTradition.asterism ? ` (${entry.koreanTradition.asterism})` : ''}
          </h2>
          <p className={PARA}>{entry.koreanTradition.note}</p>
        </section>
      )}

      <section className={SECTION} data-testid="story-howto">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h2 className={H2}>{t('content.howToFind')}</h2>
          {entry.howToFind.season && (
            <span className="text-label text-muted">
              {t(`content.season.${entry.howToFind.season}`)}
            </span>
          )}
        </div>
        <p className={PARA}>{entry.howToFind.ko}</p>
        {entry.howToFind.hopFrom?.length ? (
          <ChipRow label={t('content.hopFrom')} className="mt-2">
            {entry.howToFind.hopFrom.map((id) => (
              <Chip
                key={id}
                onClick={() => {
                  onBeforeShowInSky?.();
                  openObject(id, 'half');
                }}
                testId={`story-hop-${id}`}
              >
                {nameOf(id)}
              </Chip>
            ))}
          </ChipRow>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className={compact ? SECONDARY_BTN : PRIMARY_BTN}
            onClick={() => showInSky(entry.id)}
            data-testid="story-show-in-sky"
          >
            {t('object.action.showInSky')}
          </button>
        </div>
      </section>

      <section className={SECTION} data-testid="story-observing">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h2 className={H2}>{t('content.observing')}</h2>
          <span className="text-label text-muted" aria-label={t('content.difficulty')}>
            {'★'.repeat(entry.observing.difficulty)}
            <span className="text-muted/40">{'★'.repeat(5 - entry.observing.difficulty)}</span>
          </span>
        </div>
        {equipOptions.length > 1 && (
          <Segmented<Equip>
            label={t('content.equipLabel')}
            value={equip}
            options={equipOptions}
            onChange={setEquip}
          />
        )}
        <p className={`${PARA} mt-2`}>{entry.observing[equip]}</p>
        {entry.observing.bestMonths?.length ? (
          <p className="mt-2 text-caption text-muted">
            {t('content.bestMonths')}:{' '}
            {entry.observing.bestMonths.map((m) => t('object.month', { m })).join(' · ')}
          </p>
        ) : null}
      </section>

      {entry.funFacts?.length ? (
        <section className={SECTION} data-testid="story-funfacts">
          <h2 className={H2}>{t('content.funFacts')}</h2>
          <ul className="flex flex-col gap-2">
            {entry.funFacts.map((f, i) => (
              <li key={i} className="flex gap-2 text-body text-fg">
                <span aria-hidden="true" className="text-accent">
                  ✦
                </span>
                <span className="min-w-0 flex-1">{f}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className={SECTION} data-testid="story-sources">
        <h2 className={H2}>{t('content.sources')}</h2>
        <ul className="flex flex-col gap-1.5 text-body-sm">
          {entry.sources.map((s, i) => {
            const { title, url } = splitSource(s);
            return (
              <li key={i} className="min-w-0 break-words">
                {url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent underline-offset-2 hover:underline"
                  >
                    {title}
                  </a>
                ) : (
                  <span className="text-muted">{title}</span>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <button
        className={PRIMARY_BTN + ' mt-6'}
        data-testid="story-mark-read"
        onClick={() =>
          void markRead(entry.id)
            .then(() => showToast(t('study.readSaved')))
            .catch(() => showToast(t('study.saveError')))
        }
      >
        {t('study.markRead')}
      </button>

      <section className={`${SECTION} text-caption text-muted`} data-testid="story-meta">
        <div className="flex flex-wrap items-center gap-2">
          {reviewBadge && (
            <span
              className="rounded-pill bg-surface-3 px-2 py-0.5 text-label text-muted"
              data-testid="story-review-badge"
            >
              {t('content.reviewing')}
              {needsReview.length ? ` ${needsReview.length}` : ''}
            </span>
          )}
          <span>
            {t('content.meta', {
              by:
                entry.meta.generatedBy === 'gpt-5-pro'
                  ? 'GPT'
                  : entry.meta.generatedBy === 'claude'
                    ? 'Claude'
                    : t('content.human'),
              at: entry.meta.generatedAt,
            })}
            {entry.meta.reviewedAt
              ? ` · ${t('content.reviewedAt', { at: entry.meta.reviewedAt })}`
              : ''}
            {` · v${entry.version}`}
          </span>
        </div>
        {needsReview.length > 0 && (
          <details className="mt-2">
            <summary className="cursor-pointer text-caption text-muted">
              {t('content.reviewNotes')}
            </summary>
            <ul className="mt-1 flex list-disc flex-col gap-1 pl-4">
              {needsReview.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </details>
        )}
        <div className="mt-3">
          {!reportOpen ? (
            <button
              type="button"
              className={SECONDARY_BTN}
              onClick={() => setReportOpen(true)}
              data-testid="story-report"
            >
              {t('content.report')}
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <textarea
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                rows={3}
                placeholder={t('content.reportHint')}
                className="w-full rounded-md bg-surface-2 px-3 py-2 text-body text-fg outline-none focus-visible:shadow-[0_0_0_2px_var(--accent-glow)]"
                data-testid="story-report-text"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  className={PRIMARY_BTN}
                  disabled={!reportText.trim()}
                  onClick={() => {
                    void reportContentIssue(entry.id, reportText.trim()).then(() => {
                      showToast(t('content.reportSaved'));
                      setReportOpen(false);
                      setReportText('');
                    });
                  }}
                  data-testid="story-report-save"
                >
                  {t('content.reportSave')}
                </button>
                <button
                  type="button"
                  className={SECONDARY_BTN}
                  onClick={() => setReportOpen(false)}
                >
                  {t('common.close')}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </article>
  );
}
