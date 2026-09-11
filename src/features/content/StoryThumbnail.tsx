import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { displayName, type Catalog } from '@/catalog/catalog';
import { kindOf, type ObjectId } from '@/catalog/objectId';
import { ObjectPhotoCard, PhotoThumbnail } from '@/features/object/ObjectPhoto';
import { useSettingsStore } from '@/state/settingsStore';
import { getStoryPhoto, getStorySkyChart, type StorySkyChart } from './storyImages';

function SkyChart({
  chart,
  label,
  small = false,
}: {
  chart: StorySkyChart;
  label: string;
  small?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      role={small ? undefined : 'img'}
      aria-label={small ? undefined : label}
      aria-hidden={small || undefined}
      className={small ? 'h-14 w-14 text-fg' : 'mx-auto h-56 max-w-full text-fg'}
      data-testid="story-sky-chart"
    >
      <circle cx="50" cy="50" r="47" fill="var(--bg)" stroke="currentColor" strokeOpacity=".15" />
      <g
        stroke="currentColor"
        strokeOpacity=".94"
        strokeWidth={small ? 2.2 : 1.05}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        data-testid="story-chart-lines"
      >
        {chart.lines.map(([a, b], i) => (
          <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
        ))}
      </g>
      <g fill="currentColor">
        {chart.stars.map((star, i) => (
          <circle
            key={i}
            cx={star.x}
            cy={star.y}
            r={small ? Math.max(0.8, star.radius) : star.radius}
          />
        ))}
      </g>
      {chart.target && (
        <g stroke="var(--accent)" fill="none" strokeWidth="1.1" data-testid="story-chart-target">
          <circle cx={chart.target.x} cy={chart.target.y} r="4.5" />
          <path d="M50 42v-3m0 19v3m-8-11h-3m19 0h3" />
        </g>
      )}
      {!small && (
        <g fill="currentColor" fontSize="4" textAnchor="middle">
          <text x="50" y="7">
            N
          </text>
          <text x="6" y="51.5">
            E
          </text>
        </g>
      )}
    </svg>
  );
}

function UnavailableIcon({ id }: { id: ObjectId }) {
  return (
    <span
      className="flex h-14 w-14 items-center justify-center rounded-lg bg-accent-soft text-title text-accent"
      data-testid="story-image-fallback"
    >
      {kindOf(id) === 'moon' ? '☾' : kindOf(id) === 'sun' ? '☀' : '✦'}
    </span>
  );
}

/** 사진은 지연 로드하고, 좌표 도해도 화면 가까이에 왔을 때만 계산한다. */
export function StoryThumbnail({
  id,
  cat,
  read = false,
}: {
  id: ObjectId;
  cat: Catalog | null;
  read?: boolean;
}) {
  const { t } = useTranslation();
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    if (visible || !ref.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [visible]);
  const photo = getStoryPhoto(id);
  const chart = !photo && visible && cat ? getStorySkyChart(cat, id) : null;
  const fallback = <UnavailableIcon id={id} />;
  return (
    <span
      ref={ref}
      aria-hidden
      className="relative block w-14 shrink-0"
      data-testid="story-thumbnail"
      data-object-id={id}
    >
      {photo ? (
        <PhotoThumbnail photo={photo} fallback={fallback} />
      ) : chart ? (
        <SkyChart chart={chart} label="" small />
      ) : (
        fallback
      )}
      <span className="mt-1 block text-center text-[10px] leading-3 text-muted">
        {t(
          photo
            ? photo.objectId === id
              ? 'storyImages.photo'
              : 'storyImages.sharedPhoto'
            : 'storyImages.chart',
        )}
      </span>
      {read && (
        <span
          className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-caption font-bold text-accent-fg"
          data-testid="story-image-read"
        >
          ✓
        </span>
      )}
    </span>
  );
}

/** 출처와 관측 표현의 설명은 이야기 상세에서 사진/도해 바로 아래에 둔다. */
export function StoryImage({ id, cat }: { id: ObjectId; cat: Catalog | null }) {
  const { t } = useTranslation();
  const lang = useSettingsStore((s) => s.lang);
  const photo = getStoryPhoto(id);
  if (photo)
    return (
      <div data-testid="story-image">
        {photo.objectId !== id && (
          <p className="mt-4 text-body-sm text-muted">{t('storyImages.sharedNotice')}</p>
        )}
        <ObjectPhotoCard id={photo.objectId} />
      </div>
    );
  const chart = cat ? getStorySkyChart(cat, id) : null;
  if (!chart || !cat) return null;
  return (
    <figure className="my-4 rounded-xl bg-surface-2/60 p-3" data-testid="story-image">
      <SkyChart
        chart={chart}
        label={t('storyImages.chartAlt', { name: displayName(cat, id, lang) })}
      />
      <figcaption className="mt-2 space-y-1 text-caption leading-relaxed text-muted">
        <p className="font-medium text-fg">{t('storyImages.chartTitle')}</p>
        <p>
          {t(chart.target ? 'storyImages.targetNotice' : 'storyImages.constellationNotice', {
            field: chart.fieldDeg.toFixed(0),
          })}
        </p>
        <p>{t('storyImages.orientation')}</p>
        <p data-testid="story-chart-credit">
          {t('storyImages.chartCredit')}{' '}
          <a
            className="underline"
            href="https://codeberg.org/astronexus/hyg"
            target="_blank"
            rel="noreferrer"
          >
            HYG / David Nash
          </a>
          {' · '}
          <a
            className="underline"
            href="https://creativecommons.org/licenses/by-sa/4.0/"
            target="_blank"
            rel="noreferrer"
          >
            CC BY-SA 4.0
          </a>
          {' · '}
          <a
            className="underline"
            href="https://github.com/ofrohn/d3-celestial"
            target="_blank"
            rel="noreferrer"
          >
            d3-celestial / Olaf Frohn
          </a>
          {' · '}
          <a
            className="underline"
            href="https://github.com/ofrohn/d3-celestial/blob/master/LICENSE"
            target="_blank"
            rel="noreferrer"
          >
            BSD-3-Clause
          </a>
          {kindOf(id) === 'dso' && (
            <>
              {' · '}
              <a
                className="underline"
                href="https://github.com/mattiaverga/OpenNGC"
                target="_blank"
                rel="noreferrer"
              >
                OpenNGC / Mattia Verga (CC BY-SA 4.0)
              </a>
            </>
          )}
        </p>
      </figcaption>
    </figure>
  );
}
