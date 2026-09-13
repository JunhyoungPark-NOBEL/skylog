/**
 * 센서 매니저: Provider → (편각) → 필터 → (나침반 동기화 / 별 정렬 δ) → 카메라.
 * - Provider는 우선순위대로 시도하고 1.5초 안에 유효 샘플이 없으면 다음으로 넘어간다.
 * - 수동 드래그 후에는 버튼으로만 복귀한다. 탭과 핀치는 추적을 멈추지 않는다.
 * - 상태는 sensorStore(≤10Hz), 카메라는 CameraController.setOrientationQuaternion.
 */
import { wrap180 } from '@/astro/coords';
import type { CameraController } from '@/render/CameraController';
import { declinationDeg } from '@/sensors/declination';
import {
  applyOffset,
  compassSyncCandidate,
  YawSync,
  type CompassAxis,
} from '@/sensors/orientation/calibration';
import { OrientationFilter, RateMeter } from '@/sensors/orientation/filter';
import { applyYawOffset, quaternionToAltAz } from '@/sensors/orientation/math';
import {
  availableProviders,
  SimulatorProvider,
  type SimValues,
} from '@/sensors/orientation/providers';
import type {
  HeadingSource,
  OrientationProvider,
  OrientationSample,
} from '@/sensors/orientation/types';
import { Vector3 } from 'three';
import { useLocationStore } from '@/state/locationStore';
import { useSensorStore, type CalibrationInfo } from '@/state/sensorStore';
import { useViewStore } from '@/state/viewStore';
import { needsOrientationPermission } from '@/sensors/permissions';

const NO_DATA_TIMEOUT_MS = 1500;

/** GPS라는 같은 이름을 쓰더라도 좌표가 가까운 보정만 재사용한다. 기존 좌표 없는 기록은 제외한다. */
export function calibrationMatchesSite(
  calibration: Pick<CalibrationInfo, 'lat' | 'lon'>,
  site: { lat: number; lon: number },
): boolean {
  const { lat, lon } = calibration;
  return (
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    Math.abs(lat - site.lat) <= 0.01 &&
    Math.abs(wrap180(lon - site.lon)) <= 0.01
  );
}

export class SensorManager {
  private camera: CameraController | null = null;
  private provider: OrientationProvider | null = null;
  private candidates: OrientationProvider[] = [];
  private filter = new OrientationFilter();
  private rate = new RateMeter();
  private yawSync = new YawSync();
  private lastStorePatch = 0;
  private noDataTimer = 0;
  private lastQ: ReturnType<OrientationFilter['push']> | null = null;
  private lastSampleRaw: OrientationSample | null = null;
  private declination = 0;
  private declinationKey = '';
  private badAccuracySince: number | null = null;
  private sampleWatchdog = 0;
  private lastWallSample = 0;

  attachCamera(c: CameraController | null): void {
    this.camera = c;
  }

  get running(): boolean {
    return this.provider !== null;
  }

  /** AR 시작. 권한은 호출자가 먼저 받는다. 시뮬레이터가 켜져 있으면 시뮬레이터. */
  start(): void {
    this.stop();
    const st = useSensorStore.getState();
    this.filter = new OrientationFilter();
    this.yawSync.reset();
    this.rate.reset();
    this.candidates = st.simulator
      ? [new SimulatorProvider(() => this.simValues())]
      : availableProviders(st.trackingMode === 'gyro');
    this.badAccuracySince = null;
    if (this.candidates.length === 0) {
      st.patch({
        arActive: false,
        provider: null,
        headingSource: 'none',
        permission: 'unsupported',
        startup: 'unavailable',
      });
      return;
    }
    st.patch({
      arActive: true,
      startup: 'starting',
      deltaAzDeg: 0,
      pitchOffsetDeg: 0,
      calibration: null,
      manualPauseUntil: 0,
      anomaly: false,
    });
    useViewStore.getState().setMode('sensor');
    this.sampleWatchdog = window.setInterval(() => {
      if (this.lastWallSample > 0 && Date.now() - this.lastWallSample > NO_DATA_TIMEOUT_MS) {
        this.stop();
        useSensorStore.getState().patch({ startup: 'unavailable' });
      }
    }, 500);
    this.tryNextProvider();
  }

  stop(): void {
    this.provider?.stop();
    this.provider = null;
    window.clearTimeout(this.noDataTimer);
    window.clearInterval(this.sampleWatchdog);
    this.lastQ = null;
    this.lastSampleRaw = null;
    this.lastWallSample = 0;
    this.camera?.setSensorQuaternion(null);
    useSensorStore.getState().patch({
      arActive: false,
      startup: 'idle',
      headingSource: 'none',
      eventHz: null,
      calibration: null,
      manualPauseUntil: 0,
      anomaly: false,
    });
    useViewStore.getState().setMode('manual');
  }

  private simValues(): SimValues {
    const s = useSensorStore.getState().sim;
    return {
      ...s,
      absolute:
        useSensorStore.getState().trackingMode === 'gyro'
          ? false
          : ((s as SimValues).absolute ?? false),
    };
  }

  private tryNextProvider(): void {
    const next = this.candidates.shift();
    if (!next) {
      this.stop();
      useSensorStore.getState().patch({
        arActive: false,
        provider: null,
        headingSource: 'none',
        startup: needsOrientationPermission() ? 'permission-required' : 'unavailable',
      });
      useViewStore.getState().setMode('manual');
      return;
    }
    this.provider = next;
    this.filter = new OrientationFilter();
    this.yawSync.reset();
    this.lastSampleRaw = null;
    this.lastWallSample = 0;
    this.lastStorePatch = -Infinity;
    useSensorStore.getState().patch({ calibration: null, deltaAzDeg: 0, pitchOffsetDeg: 0 });
    useSensorStore.getState().patch({ provider: next.name });
    let gotData = false;
    this.noDataTimer = window.setTimeout(() => {
      if (!gotData) {
        next.stop();
        this.tryNextProvider();
      }
    }, NO_DATA_TIMEOUT_MS);
    next.start(
      (s) => {
        if (this.provider !== next) return;
        if (!gotData) {
          gotData = true;
          window.clearTimeout(this.noDataTimer);
          const remembered = useSensorStore.getState().lastCalibration;
          if (
            s.provider !== 'CalibratedTelescope' &&
            s.northReference !== 'relative' &&
            remembered?.northReference === s.northReference &&
            remembered.provider === s.provider &&
            calibrationMatchesSite(remembered, useLocationStore.getState().site)
          ) {
            useSensorStore.getState().patch({
              calibration: remembered,
              deltaAzDeg: remembered.deltaAzDeg,
              pitchOffsetDeg: remembered.pitchOffsetDeg,
            });
          }
        }
        this.onSample(s);
      },
      () => {
        next.stop();
        if (this.provider === next) this.tryNextProvider();
      },
    );
  }

  private updateDeclination(): void {
    const loc = useLocationStore.getState().site;
    const key = `${loc.lat.toFixed(3)},${loc.lon.toFixed(3)}`;
    if (key !== this.declinationKey) {
      this.declinationKey = key;
      this.declination = declinationDeg(loc.lat, loc.lon, loc.elevation, new Date());
      useSensorStore.getState().patch({ declinationDeg: this.declination });
    }
  }

  private onSample(s: OrientationSample): void {
    const interrupted =
      this.lastWallSample > 0 && Date.now() - this.lastWallSample > NO_DATA_TIMEOUT_MS;
    const referenceChanged =
      this.lastSampleRaw && this.lastSampleRaw.northReference !== s.northReference;
    if (interrupted || referenceChanged) {
      this.filter = new OrientationFilter();
      this.yawSync.reset();
      this.lastStorePatch = -Infinity;
      if (s.northReference === 'relative' || referenceChanged)
        useSensorStore.getState().patch({ calibration: null, deltaAzDeg: 0, pitchOffsetDeg: 0 });
    }
    this.lastWallSample = Date.now();
    const current = useSensorStore.getState();
    if (
      current.calibration &&
      !calibrationMatchesSite(current.calibration, useLocationStore.getState().site)
    ) {
      current.patch({ calibration: null, deltaAzDeg: 0, pitchOffsetDeg: 0 });
    }
    const st = useSensorStore.getState();
    this.updateDeclination();
    this.rate.push(s.timestampMs);
    this.lastSampleRaw = s;

    // 1) 자북 → 진북 (절대 소스만, 한 번)
    let q = s.q;
    const magnetic = s.northReference === 'magnetic';
    const absolute = s.northReference !== 'relative';
    if (magnetic && st.applyDeclination) q = applyYawOffset(q, this.declination);

    // 2) 필터 (절대 소스는 yaw 평활 강화)
    if (this.filter.smoothYaw !== magnetic)
      this.filter = new OrientationFilter({ smoothYaw: magnetic });
    // 정지 출력의 계단이 확대 시 여러 픽셀로 커지지 않도록 0.35px 이하로 제한한다.
    this.filter.setViewport(
      this.camera?.getView().fovDeg ?? 60,
      this.camera?.degreesPerPixel() ?? 0.1,
    );
    const qf = this.filter.push(q, s.timestampMs);
    this.lastQ = qf;

    // 3) 상대 소스: 나침반 동기화 (별 정렬 전까지)
    let delta = st.deltaAzDeg;
    let source: HeadingSource = absolute ? 'absolute' : 'relative';
    if (!absolute && st.trackingMode !== 'gyro') {
      const quasiStatic = this.filter.rateDegPerSec < 10;
      const cand = compassSyncCandidate({
        qRel: qf,
        compassHeadingDeg: s.compassHeadingDeg,
        compassAccuracyDeg: s.compassAccuracyDeg,
        betaDeg: s.raw.beta,
        gammaDeg: s.raw.gamma,
        screenAngleDeg: s.screenAngleDeg,
        declinationDeg: st.applyDeclination ? this.declination : 0,
        quasiStatic,
        axis: st.compassAxis as CompassAxis,
      });
      const synced = this.yawSync.update(cand, s.timestampMs);
      if (!st.calibration && synced !== null) {
        delta = synced;
        source = 'compass-sync';
      }
    }
    if (st.calibration) source = 'aligned';

    // 4) 오프셋 적용 → 카메라 (수동 일시 정지 중이면 카메라는 건드리지 않음)
    const qCal = applyOffset(qf, delta, st.pitchOffsetDeg);
    const paused = st.manualPauseUntil > 0;
    if (!paused && this.camera) {
      // 나침반 동기화 전의 임의 상대 yaw로 실제 하늘 방위를 바꾸지 않는다.
      if (source === 'relative') this.camera.setSensorQuaternion(null);
      else this.camera.setSensorQuaternion(qCal, st.keepLevel, s.timestampMs);
    }

    // OS가 지속적으로 낮은 정확도를 보고할 때만 방향 불안정 안내를 띄운다.
    // 회전량만으로 자석 간섭을 단정하지 않으며 경고가 추적을 막지 않는다.
    const now = performance.now();
    const poorAccuracy = magnetic && s.compassAccuracyDeg !== null && s.compassAccuracyDeg > 25;
    this.badAccuracySince = poorAccuracy ? (this.badAccuracySince ?? now) : null;
    const anomaly = this.badAccuracySince !== null && now - this.badAccuracySince >= 1000;
    // 5) 상태(≤10Hz)
    if (now - this.lastStorePatch > 100) {
      this.lastStorePatch = now;
      const aa = quaternionToAltAz(qCal);
      const up = new Vector3(0, 1, 0).applyQuaternion(qCal);
      const right = new Vector3(1, 0, 0).applyQuaternion(qCal);
      const rollDeg = Math.atan2(-right.y, up.y) * (180 / Math.PI);
      st.patch({
        startup: 'active',
        deltaAzDeg: delta,
        headingSource: paused ? 'manual' : source,
        compassAccuracyDeg: s.compassAccuracyDeg,
        anomaly,
        eventHz: this.rate.hz,
        raw: {
          alpha: s.raw.alpha,
          beta: s.raw.beta,
          gamma: s.raw.gamma,
          absolute: s.raw.absolute,
          compassHeading: s.compassHeadingDeg,
          compassAccuracy: s.compassAccuracyDeg,
          screenAngle: s.screenAngleDeg,
        },
        filtered: { azDeg: aa.azDeg, altDeg: aa.altDeg, rollDeg },
        lastSampleMs: now,
      });
    }
  }

  /** 현재 센서 방향(오프셋 미적용 / 적용) — 보정 마법사용 */
  currentAltAz(): {
    raw: { altDeg: number; azDeg: number | null };
    calibrated: { altDeg: number; azDeg: number | null };
  } | null {
    if (!this.lastQ) return null;
    const st = useSensorStore.getState();
    return {
      raw: quaternionToAltAz(this.lastQ),
      calibrated: quaternionToAltAz(applyOffset(this.lastQ, st.deltaAzDeg, st.pitchOffsetDeg)),
    };
  }

  /** 별 정렬 결과 적용 */
  setCalibration(info: CalibrationInfo | null): void {
    if (info)
      info = {
        ...info,
        provider: this.lastSampleRaw?.provider,
        northReference: this.lastSampleRaw?.northReference,
        lat: useLocationStore.getState().site.lat,
        lon: useLocationStore.getState().site.lon,
      };
    const st = useSensorStore.getState();
    st.patch({
      calibration: info,
      deltaAzDeg: info?.deltaAzDeg ?? 0,
      pitchOffsetDeg: info?.pitchOffsetDeg ?? 0,
    });
    st.setSetting('lastCalibration', info);
    if (!info) this.yawSync.reset();
  }

  /** 수동 미세 조정(드래그): δ ±, 피치 ± */
  nudge(dAzDeg: number, dPitchDeg: number): void {
    const st = useSensorStore.getState();
    const deltaAzDeg = wrap180(st.deltaAzDeg + dAzDeg);
    const pitchOffsetDeg = Math.max(-30, Math.min(30, st.pitchOffsetDeg + dPitchDeg));
    const cal: CalibrationInfo = st.calibration
      ? { ...st.calibration, deltaAzDeg, pitchOffsetDeg }
      : {
          deltaAzDeg,
          pitchOffsetDeg,
          targetId: 'manual',
          targetName: 'manual',
          at: Date.now(),
          residualDeg: 0,
          siteName: useLocationStore.getState().site.name,
        };
    this.setCalibration(cal);
  }

  /** 수동 드래그 후 자동 복귀하지 않는다. 런타임 표시는 기존 필드를 호환해서 쓴다. */
  pauseForManual(): void {
    const st = useSensorStore.getState();
    if (!st.arActive) return;
    st.patch({ manualPauseUntil: 1, headingSource: 'manual' });
    this.camera?.setSensorQuaternion(null);
    useViewStore.getState().setMode('manual');
  }

  resumeNow(): void {
    useSensorStore.getState().patch({ manualPauseUntil: 0 });
    useViewStore.getState().setMode('sensor');
  }

  get lastSample(): OrientationSample | null {
    return this.lastSampleRaw;
  }
}

export const sensorManager = new SensorManager();
