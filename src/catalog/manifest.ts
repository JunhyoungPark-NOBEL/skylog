/**
 * 데이터 팩 매니페스트 (`public/data/manifest.v1.json`). 스크립트(T0b)가 생성한다.
 * 포맷을 바꾸면 버전을 올리고 DECISIONS에 기록한다.
 */
export interface PackEntry {
  file: string;
  version: number;
  bytes: number;
  records?: number;
  sha256?: string;
}

export interface SourceEntry {
  name: string;
  url: string;
  file: string;
  bytes: number;
  sha256: string;
  license: string;
  fetchedAt: string;
}

export interface DataManifest {
  schema: 'skylog-data-manifest';
  version: 1;
  generatedAt: string;
  packs: Record<string, PackEntry>;
  sources: SourceEntry[];
  summary?: {
    starsBright: number;
    starsDeep: number;
    namedStars: number;
    constellations: number;
    dso: number;
    messier: number;
    caldwell: number;
  };
}

export function dataUrl(file: string): string {
  return `${import.meta.env.BASE_URL}data/${file}`;
}

/** 매니페스트를 읽는다. 없으면(404) null. */
export async function loadManifest(): Promise<DataManifest | null> {
  const res = await fetch(dataUrl('manifest.v1.json'), { cache: 'no-cache' });
  if (!res.ok) return null;
  const ct = res.headers.get('content-type') ?? '';
  // SPA fallback으로 index.html이 오는 경우를 걸러낸다.
  if (!ct.includes('json')) return null;
  return (await res.json()) as DataManifest;
}
