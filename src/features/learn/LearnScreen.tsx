import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollArea } from '@/ui/ScrollArea';
import { IconSettings } from '@/ui/icons';
import { useLearning } from './useLearning';
import { LEARN_SECTIONS, navigateLearn, useLearnNavigation } from './learnNavigation';
import { QuizJourney } from './QuizJourney';
import { CoursesScreen } from './CoursesScreen';
import { StoriesScreen } from './StoriesScreen';
import { AchievementsScreen } from './AchievementsScreen';
const HistoryQuestsScreen = lazy(() => import('./HistoryQuestsScreen'));

export function LearnScreen() {
  const { t } = useTranslation();
  const { value, error, retry } = useLearning();
  const nav = useLearnNavigation();
  return (
    <div className="flex h-full flex-col pt-[env(safe-area-inset-top)]" data-testid="learn-screen">
      <header className="mx-auto flex w-full max-w-3xl shrink-0 items-center justify-between px-5 py-4">
        <div>
          <h1 className="text-headline">{t('journey.title')}</h1>
          <p className="mt-1 text-body-sm text-muted">{t('journey.intro')}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent"
            aria-label={t('personal.title')}
            onClick={() => {
              window.location.hash = '#/profile';
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width="24"
              height="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              aria-hidden
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 22v-3a8 8 0 0 1 16 0v3" />
              <path d="M7 8h10" />
            </svg>
          </button>
          <button
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-2"
            aria-label={t('settings.title')}
            onClick={() => {
              window.location.hash = '#/settings?from=learn';
            }}
          >
            <IconSettings />
          </button>
        </div>
      </header>
      <div className="mx-auto w-full max-w-3xl shrink-0 px-4 pb-3">
        <div
          role="tablist"
          aria-label={t('journey.navigation')}
          className="grid grid-cols-4 gap-1 rounded-2xl bg-surface-2 p-1"
        >
          {LEARN_SECTIONS.map((section, i) => (
            <button
              key={section}
              role="tab"
              id={'learn-tab-' + section}
              aria-selected={nav.section === section}
              aria-controls={'learn-panel-' + section}
              tabIndex={nav.section === section ? 0 : -1}
              data-testid={'learn-tab-' + section}
              onKeyDown={(event) => {
                if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
                event.preventDefault();
                const next =
                  event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? 3
                      : (i + (event.key === 'ArrowRight' ? 1 : 3)) % 4;
                navigateLearn(LEARN_SECTIONS[next]!);
                document.getElementById('learn-tab-' + LEARN_SECTIONS[next])?.focus();
              }}
              onClick={() => navigateLearn(section)}
              className={
                'min-h-11 rounded-xl px-1 text-body-sm font-semibold transition-colors ' +
                (nav.section === section ? 'bg-surface text-accent shadow-card' : 'text-muted')
              }
            >
              {t('journey.sections.' + section)}
            </button>
          ))}
        </div>
      </div>
      <ScrollArea
        key={
          nav.section +
          (nav.courseTheme ?? '') +
          (nav.courseGroup ?? '') +
          (nav.pathId ?? '') +
          (nav.missionId ?? '') +
          (nav.hopCourseId ?? '') +
          nav.track +
          (nav.questId ?? '')
        }
        className="pb-tab"
        fadeBottom="20px"
        data-testid="learn-scroll"
      >
        <section
          role="tabpanel"
          id={'learn-panel-' + nav.section}
          aria-labelledby={'learn-tab-' + nav.section}
          tabIndex={0}
          className="mx-auto w-full max-w-3xl px-4 pb-6 pt-2 outline-none"
        >
          {nav.section === 'quiz' && (
            <div className="mb-5 grid grid-cols-3 gap-2" aria-label={t('observingCourse.choose')}>
              {['sky', 'observing', 'physics'].map((key) => (
                <button
                  key={key}
                  data-testid={'quiz-track-' + key}
                  aria-pressed={nav.track === key}
                  onClick={() => navigateLearn('quiz', { track: key })}
                  className={
                    'min-h-14 rounded-2xl border px-2 text-body-sm font-semibold ' +
                    (nav.track === key
                      ? 'border-accent bg-accent-soft text-accent'
                      : 'border-hairline bg-surface')
                  }
                >
                  {t(key === 'physics' ? 'history.track' : 'observingCourse.' + key)}
                </button>
              ))}
            </div>
          )}
          {nav.section === 'quiz' && nav.track === 'physics' ? (
            <Suspense fallback={<p role="status">{t('common.loading')}</p>}>
              <HistoryQuestsScreen questId={nav.questId} />
            </Suspense>
          ) : !value ? (
            <div className="p-5">
              <p role="status">{t(error ? 'study.loadError' : 'common.loading')}</p>
              {error && (
                <button
                  className="mt-4 min-h-11 rounded-pill bg-accent px-5 text-accent-fg"
                  onClick={retry}
                >
                  {t('study.retry')}
                </button>
              )}
            </div>
          ) : nav.section === 'quiz' ? (
            <QuizJourney value={value} chapter={nav.chapter} track={nav.track} />
          ) : nav.section === 'courses' ? (
            <CoursesScreen
              value={value}
              pathId={nav.pathId}
              missionId={nav.missionId}
              hopCourseId={nav.hopCourseId}
              theme={nav.courseTheme}
              group={nav.courseGroup}
            />
          ) : nav.section === 'stories' ? (
            <StoriesScreen value={value} />
          ) : (
            <AchievementsScreen value={value} />
          )}
        </section>
      </ScrollArea>
    </div>
  );
}
