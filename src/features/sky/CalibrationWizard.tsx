import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { angularSeparation, altAzToScene } from '@/astro/coords';
import { displayName } from '@/catalog/catalog';
import type { ObjectId } from '@/catalog/objectId';
import { getSkyScene } from '@/features/sky/skyApi';
import { feedbackOk } from '@/sensors/feedback';
import { useDragScroll } from '@/ui/useDragScroll';
import {
  pickAlignmentCandidates,
  solveYawOffset,
  type AlignmentCandidate,
} from '@/sensors/orientation/calibration';
import { sensorManager } from '@/sensors/orientation/manager';
import { useLocationStore } from '@/state/locationStore';
import { useSensorStore } from '@/state/sensorStore';
import { useSettingsStore } from '@/state/settingsStore';

type Step = 1 | 2 | 3;

const BTN_SECONDARY =
  'inline-flex min-h-11 items-center justify-center rounded-pill bg-surface-3 px-4 text-body-sm font-medium text-fg transition-transform duration-150 ease-standard active:scale-[0.97]';
const BTN_PRIMARY =
  'inline-flex min-h-11 flex-1 items-center justify-center rounded-pill bg-accent px-5 text-body font-semibold text-accent-fg transition-transform duration-150 ease-standard active:scale-[0.97]';

/**
 * 1-별 정렬 마법사 (task-02 §3.5, §5): ① 대상 고르기 ② 십자에 맞추기(실시간 오차, 드래그 미세 조정) ③ 확인.
 * δ = 대상 실제 방위 − 센서(오프셋 미적용) 방위. 고도 차이는 피치 오프셋.
 * 패널은 탭 pill 위(bottom-sky)에 떠 있는 불투명 카드 — 뒤의 하늘은 드래그로 미세 조정할 수 있어야 한다.
 */
export function CalibrationWizard({ onClose }: { onClose(): void }) {
  const { t } = useTranslation();
  const lang = useSettingsStore((s) => s.lang);
  const [step, setStep] = useState<Step>(1);
  const [targetId, setTargetId] = useState<ObjectId | null>(null);
  const [errorDeg, setErrorDeg] = useState<number | null>(null);
  const [result, setResult] = useState<{ deltaAzDeg: number; pitchOffsetDeg: number } | null>(null);
  const scene = getSkyScene();
  const listRef = useDragScroll<HTMLDivElement>();

  const candidates = useMemo<AlignmentCandidate[]>(() => {
    if (!scene?.catalog) return [];
    const list: AlignmentCandidate[] = [];
    for (const b of scene.bodies.placements) {
      const id = (b.key === 'sun' || b.key === 'moon' ? b.key : `planet:${b.key}`) as ObjectId;
      list.push({
        id,
        name: displayName(scene.catalog, id, lang),
        altDeg: b.state.altDeg,
        azDeg: b.state.azDeg,
        mag: b.state.magnitude,
        kind: b.key === 'sun' ? 'sun' : b.key === 'moon' ? 'moon' : 'planet',
      });
    }
    for (const s of scene.catalog.stars) {
      if (s.mag > 2.0 && s.hip !== 11767) continue;
      const aa = scene.objectAltAz(s.id);
      if (!aa) continue;
      list.push({
        id: s.id,
        name: displayName(scene.catalog, s.id, lang),
        altDeg: aa.altDeg,
        azDeg: aa.azDeg,
        mag: s.mag,
        kind: 'star',
      });
    }
    return pickAlignmentCandidates(list);
  }, [scene, lang]);

  // ② 실시간 오차: 카메라 중심(보정 적용된 센서 방향) vs 대상
  useEffect(() => {
    const sc = getSkyScene();
    if (step !== 2 || !targetId || !sc) return;
    const tick = () => {
      const cur = sensorManager.currentAltAz();
      const tgt = sc.objectAltAz(targetId);
      if (!cur || !tgt || cur.calibrated.azDeg === null) {
        setErrorDeg(null);
        return;
      }
      setErrorDeg(
        angularSeparation(
          altAzToScene(cur.calibrated.altDeg, cur.calibrated.azDeg),
          altAzToScene(tgt.altDeg, tgt.azDeg),
        ),
      );
    };
    const id = window.setInterval(tick, 150);
    // 드래그 = 미세 조정(0.5° 단위 반올림은 표시에서)
    sc.controller.dragHandler = (dAz, dAlt) => sensorManager.nudge(-dAz, dAlt);
    return () => {
      window.clearInterval(id);
      sc.controller.dragHandler = null;
    };
  }, [step, targetId]);

  const confirm = () => {
    if (!targetId || !scene) return;
    const cur = sensorManager.currentAltAz();
    const tgt = scene.objectAltAz(targetId);
    if (!cur || !tgt || cur.raw.azDeg === null) return;
    const sol = solveYawOffset([
      {
        sensorAzDeg: cur.raw.azDeg,
        sensorAltDeg: cur.raw.altDeg,
        targetAzDeg: tgt.azDeg,
        targetAltDeg: tgt.altDeg,
        targetId,
      },
    ]);
    if (!sol) return;
    const name = scene.catalog ? displayName(scene.catalog, targetId, lang) : targetId;
    sensorManager.setCalibration({
      deltaAzDeg: sol.deltaAzDeg,
      pitchOffsetDeg: sol.pitchOffsetDeg,
      targetId,
      targetName: name,
      at: Date.now(),
      residualDeg: sol.residualDeg,
      siteName: useLocationStore.getState().site.name,
    });
    setResult({ deltaAzDeg: sol.deltaAzDeg, pitchOffsetDeg: sol.pitchOffsetDeg });
    feedbackOk({ sound: useSensorStore.getState().sound });
    setStep(3);
  };

  const targetName = targetId && scene?.catalog ? displayName(scene.catalog, targetId, lang) : '';

  return (
    <div
      className="pointer-events-none absolute inset-0 z-30"
      data-testid="calib-wizard"
      role="dialog"
      aria-label={t('sensor.wizard.title')}
    >
      {step === 2 && (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          aria-hidden="true"
        >
          <div className="calib-crosshair" />
        </div>
      )}
      <div className="pointer-events-auto absolute inset-x-3 bottom-sky mx-auto max-w-md rounded-2xl bg-surface p-4 text-body-sm text-fg shadow-float squircle">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="flex-1 text-body-lg font-semibold">
            {t('sensor.wizard.title')} · {step}/3
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-9 items-center justify-center rounded-pill px-3 text-body-sm font-medium text-accent transition-colors duration-150 active:bg-accent-soft"
            data-testid="calib-later"
          >
            {t('sensor.wizard.later')}
          </button>
        </div>

        {step === 1 && (
          <>
            <p className="mb-2 text-caption text-muted">{t('sensor.wizard.step1')}</p>
            <div
              ref={listRef}
              className="flex max-h-[40vh] flex-wrap gap-2 overflow-y-auto"
              data-testid="calib-candidates"
            >
              {candidates.length === 0 && (
                <span className="text-muted">{t('sensor.wizard.noCandidates')}</span>
              )}
              {candidates.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setTargetId(c.id as ObjectId);
                    setStep(2);
                  }}
                  className="inline-flex min-h-10 items-center rounded-pill bg-surface-3 px-3.5 text-body-sm font-medium text-fg transition-transform duration-150 ease-standard active:scale-[0.97]"
                  data-testid={`calib-candidate-${c.id}`}
                >
                  {c.name}{' '}
                  <span className="text-muted tabular-nums">
                    · {c.altDeg.toFixed(0)}° {c.azDeg.toFixed(0)}°
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <p className="mb-1 text-body">
              <strong>{targetName}</strong> — {t('sensor.wizard.step2')}
            </p>
            <p className="mb-2 text-caption text-muted tabular-nums" data-testid="calib-error">
              {t('sensor.wizard.currentError')}:{' '}
              {errorDeg === null ? '—' : `${errorDeg.toFixed(1)}°`}
            </p>
            <p className="mb-3 text-caption text-muted">{t('sensor.wizard.dragHint')}</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(1)} className={BTN_SECONDARY}>
                {t('common.back')}
              </button>
              <button
                type="button"
                onClick={confirm}
                className={BTN_PRIMARY}
                data-testid="calib-confirm"
              >
                {t('sensor.wizard.aligned')}
              </button>
            </div>
          </>
        )}

        {step === 3 && result && (
          <>
            <p className="mb-1 text-body">{t('sensor.wizard.done', { target: targetName })}</p>
            <p className="mb-3 text-caption text-muted tabular-nums" data-testid="calib-result">
              δ {result.deltaAzDeg >= 0 ? '+' : ''}
              {result.deltaAzDeg.toFixed(1)}° · pitch {result.pitchOffsetDeg >= 0 ? '+' : ''}
              {result.pitchOffsetDeg.toFixed(1)}°
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(1)} className={BTN_SECONDARY}>
                {t('sensor.wizard.again')}
              </button>
              <button
                type="button"
                onClick={onClose}
                className={BTN_PRIMARY}
                data-testid="calib-finish"
              >
                {t('sensor.wizard.finish')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
