import { useTranslation } from 'react-i18next';
import { emitSkill } from '@/learn/runtime';
import { showToast } from '@/state/logUiStore';
import { useLearnUiStore } from '@/state/learnUiStore';
import { useSettingsStore } from '@/state/settingsStore';
import { useEffect } from 'react';
import { ObservationForm } from '@/features/log/ObservationForm';
import { useLogUiStore } from '@/state/logUiStore';

/**
 * 기록 폼 호스트(task-04): App에 한 번 마운트. `openObservationForm()`으로 열리고 저장/닫기 뒤 사라진다.
 * 상세 시트(z-30) 위에 떠야 하므로 z-40. 폼 안쪽 스크롤은 폼이 책임진다.
 */
export function ObservationFormHost() {
  const { t } = useTranslation();
  const form = useLogUiStore((s) => s.form);
  const closeForm = useLogUiStore((s) => s.closeForm);
  useEffect(() => {
    if (!form) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeForm();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [form, closeForm]);
  if (!form) return null;
  return (
    <div className="fixed inset-0 z-40 bg-bg text-fg" data-testid="observation-form-host">
      <ObservationForm
        key={`${form.objectId}:${form.observationId ?? 'new'}`}
        request={form}
        onClose={closeForm}
        onSaved={(obs) => {
          closeForm();
          form.onSaved?.(obs.id);
          if (obs.sketchBlobId)
            void emitSkill('sketch', { objectId: obs.objectId, observationId: obs.id });
          if (obs.outcome === 'seen' && useSettingsStore.getState().postLogQuiz)
            showToast(
              t('log.form.saved'),
              {
                label: t('study.postQuiz'),
                onClick: () =>
                  useLearnUiStore.getState().openQuiz({ objectId: obs.objectId, limit: 3 }),
              },
              12000,
            );
        }}
      />
    </div>
  );
}
