/**
 * 기록 기능 컴포넌트 사이의 계약(task-04). 폼·스케치·통계가 서로의 구현이 아니라 이 타입만 본다.
 */
import type { Lang } from '@/app/i18n';
import type { Catalog } from '@/catalog/catalog';
import type { ObjectId } from '@/catalog/objectId';
import type { Observation } from '@/db/types';
import type { FormRequest } from '@/state/logUiStore';

export interface SketchResult {
  /** PNG */
  blob: Blob;
  width: number;
  height: number;
  /** 작은 PNG(목록 썸네일, 긴 변 ≤ 160px) */
  thumbnail: Blob;
}

export interface SketchCanvasProps {
  /** 이어 그리기: 기존 스케치 PNG */
  initial?: Blob | null;
  /** 배경에 연하게 겹칠 대상(있으면 실제 별 배치 오버레이 옵션을 보여 준다) */
  objectId?: ObjectId;
  title?: string;
  onSave(result: SketchResult): void;
  onCancel(): void;
}

export interface ObservationFormProps {
  request: FormRequest;
  /** 저장 없이 닫음 */
  onClose(): void;
  /** 저장됨(새 기록/편집 모두) */
  onSaved(observation: Observation): void;
}

export interface StatsCardProps {
  /** 삭제 제외 전체 기록(최근순) */
  observations: Observation[];
  cat: Catalog | null;
  lang: Lang;
}
