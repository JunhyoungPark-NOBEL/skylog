import { useTranslation } from 'react-i18next';
import { HOP_COURSES, hopCourseProgress } from '@/learn/hopCourses';
import type { LearningState } from '@/learn/runtime';
import { useSettingsStore } from '@/state/settingsStore';
import { openObservationForm } from '@/state/logUiStore';
import { openTelescope } from '@/features/telescope/navigation';
import { displayName } from '@/catalog/catalog';
import { navigateLearn } from './learnNavigation';

export function HopCourses({
  value,
  courseId,
}: {
  value: LearningState;
  courseId?: string | null;
}) {
  const { t } = useTranslation();
  const lang = useSettingsStore((s) => s.lang);
  const course = HOP_COURSES.find((c) => c.id === courseId);
  if (course) {
    const progress = hopCourseProgress(course, value.snap);
    return (
      <section className="space-y-4" data-testid="hop-course-detail">
        <button
          className="min-h-11 text-accent"
          onClick={() => navigateLearn('courses', { theme: 'telescope', group: 'starhop' })}
        >
          ← {t('hopCourses.all')}
        </button>
        <p className="text-caption text-accent">{t('hopCourses.level', { n: course.level })}</p>
        <h2 className="text-headline">{course.title[lang]}</h2>
        <p className="text-body leading-7">{course.description[lang]}</p>
        <button
          className="min-h-12 w-full rounded-pill bg-accent px-4 font-semibold text-accent-fg"
          onClick={() => openTelescope(course.target, 'hop', course.id)}
        >
          {t(progress.followed ? 'hopCourses.again' : 'hopCourses.start')}
        </button>
        <ol className="rounded-3xl bg-surface p-5">
          {course.points.map((id, i) => (
            <li key={id} className="flex min-h-12 items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-accent">
                {i + 1}
              </span>
              {displayName(value.cat, id, lang)}
            </li>
          ))}
        </ol>
        <p className="text-body-sm leading-6 text-muted">{course.tip[lang]}</p>
        <p className="text-body-sm leading-6 text-muted">{t('hopCourses.realOnly')}</p>
        <div
          className="space-y-3 rounded-3xl border border-hairline p-4"
          data-testid="hop-course-progress"
        >
          <p>
            {progress.followed ? '✓' : '1.'} {t('hopCourses.follow')}
          </p>
          <p>
            {progress.recorded ? '✓' : '2.'} {t('hopCourses.record')}
          </p>
          <button
            disabled={!progress.followed}
            className="min-h-12 w-full rounded-pill bg-surface-2 px-4 text-accent disabled:opacity-40"
            onClick={() => openObservationForm({ objectId: course.target })}
          >
            {t('hopCourses.write')}
          </button>
        </div>
        <a
          className="inline-flex min-h-11 items-center text-caption text-muted underline"
          href={course.source}
          target="_blank"
          rel="noreferrer"
        >
          {t('hopCourses.source')} ↗
        </a>
      </section>
    );
  }
  return (
    <section data-testid="hop-courses">
      <h2 className="text-title">{t('hopCourses.title')}</h2>
      <p className="mb-3 mt-1 text-body-sm text-muted">{t('hopCourses.intro')}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {HOP_COURSES.map((c) => (
          <button
            key={c.id}
            data-testid={'course-' + c.id}
            onClick={() =>
              navigateLearn('courses', { theme: 'telescope', group: 'starhop', hopCourse: c.id })
            }
            className="space-y-2 rounded-3xl border border-hairline bg-surface p-5 text-left"
          >
            <div className="flex justify-between text-caption text-muted">
              <span>
                {t('hopCourses.level', { n: c.level })} · {c.target.slice(4)}
              </span>
              <span>{hopCourseProgress(c, value.snap).count}/2</span>
            </div>
            <h3 className="text-title">{c.title[lang]}</h3>
            <p className="text-body-sm text-accent">{t('hopCourses.explore')} →</p>
          </button>
        ))}
      </div>
    </section>
  );
}
