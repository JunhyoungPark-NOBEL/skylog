import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { navigate } from '@/app/router';
import {
  backupReminderDue,
  getBackupSnoozeUntil,
  getLastBackupAt,
  isSnoozed,
  snoozeBackupReminder,
} from '@/db/exportImport';
import { useLogStore } from '@/state/logStore';
import { Card } from '@/ui/Card';
import { PillButton } from '@/ui/PillButton';

/**
 * 백업 리마인더(task-04 §4): 기록이 1건 이상이고 마지막 백업이 없거나 30일을 넘겼으면 기록 탭 상단에 작은 카드.
 * "나중에"는 7일 동안 숨긴다(settings 'backup.snoozeUntil'). 백업 시각은 실제 시계(Date.now) 기준 —
 * 하늘 뷰의 시간 이동과는 무관한 살림살이라 clockStore를 쓰지 않는다.
 */
export function BackupBanner() {
  const { t } = useTranslation();
  const ready = useLogStore((s) => s.ready);
  const hasRecords = useLogStore((s) => s.recent.length > 0);
  const version = useLogStore((s) => s.version);
  const [state, setState] = useState<{ due: boolean; never: boolean }>({
    due: false,
    never: false,
  });

  useEffect(() => {
    if (!ready || !hasRecords) return;
    let alive = true;
    void Promise.all([getLastBackupAt(), getBackupSnoozeUntil()]).then(([lastAt, until]) => {
      if (!alive) return;
      const now = Date.now();
      setState({
        due: backupReminderDue(now, lastAt) && !isSnoozed(now, until),
        never: lastAt === null,
      });
    });
    return () => {
      alive = false;
    };
  }, [ready, hasRecords, version]);

  if (!ready || !hasRecords || !state.due) return null;

  return (
    <Card className="mb-3" testId="backup-banner">
      <p className="text-body font-semibold">
        {state.never ? t('backup.banner.titleNever') : t('backup.banner.title')}
      </p>
      <p className="mt-1 text-caption text-muted">{t('backup.banner.hint')}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <PillButton
          variant="primary"
          size="sm"
          testId="backup-banner-go"
          onClick={() => navigate('backup')}
        >
          {t('backup.banner.go')}
        </PillButton>
        <PillButton
          variant="ghost"
          size="sm"
          testId="backup-banner-later"
          onClick={() => {
            setState((s) => ({ ...s, due: false }));
            void snoozeBackupReminder();
          }}
        >
          {t('backup.banner.later')}
        </PillButton>
      </div>
    </Card>
  );
}
