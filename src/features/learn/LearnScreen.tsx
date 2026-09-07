import { useTranslation } from 'react-i18next';
import { ScrollArea } from '@/ui/ScrollArea';
import { IconSettings } from '@/ui/icons';
import { useLearning } from './useLearning';
import { LEARN_SECTIONS, navigateLearn, useLearnNavigation } from './learnNavigation';
import { QuizJourney } from './QuizJourney';
import { CoursesScreen } from './CoursesScreen';
import { StoriesScreen } from './StoriesScreen';
import { AchievementsScreen } from './AchievementsScreen';

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
        <button
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-2"
          aria-label={t('settings.title')}
          onClick={() => {
            window.location.hash = '#/settings?from=learn';
          }}
        >
          <IconSettings />
        </button>
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
        key={nav.section + (nav.pathId ?? '') + (nav.missionId ?? '')}
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
          {!value ? (
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
            <CoursesScreen value={value} pathId={nav.pathId} missionId={nav.missionId} />
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
