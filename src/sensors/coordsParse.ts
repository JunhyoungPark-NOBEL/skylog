/**
 * 위도/경도 붙여넣기 파서 (task-02 §3.1): "36.37, 127.36", "36.37 127.36", "36°22′N 127°22′E",
 * "36 22 12 N, 127 21 36 E", "N36.37 E127.36", "36.37N,127.36E", "E127.36 N36.37" 등. 실패 시 null.
 * 방법: 반구 문자(N/S/E/W/북남동서)를 등장 순서대로 뽑고, 숫자를 두 그룹(1·2·3개씩)으로 나눈다.
 */
export interface LatLon {
  lat: number;
  lon: number;
}

const HEMI_RE = /[NSEW남북동서]/gi;

function isLatHemi(h: string): boolean {
  return /[NS남북]/i.test(h);
}
function hemiSign(h: string): number {
  return /[SW남서]/i.test(h) ? -1 : 1;
}

function dms(nums: number[]): number {
  const [d = 0, m = 0, s = 0] = nums;
  const sign = d < 0 || Object.is(d, -0) ? -1 : 1;
  return sign * (Math.abs(d) + Math.abs(m) / 60 + Math.abs(s) / 3600);
}

export function parseLatLon(input: string): LatLon | null {
  const text = input.trim();
  if (!text) return null;
  const hemis = (text.match(HEMI_RE) ?? []).map((h) => h.toUpperCase());
  const stripped = text.replace(HEMI_RE, ' ');

  // 숫자 그룹: 쉼표/세미콜론이 있으면 거기서, 없으면 개수로
  let groups: number[][];
  const sep = stripped.split(/\s*[,;]\s*/);
  const toNums = (s: string) => (s.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  if (sep.length === 2) groups = [toNums(sep[0]!), toNums(sep[1]!)];
  else {
    const all = toNums(stripped);
    if (all.length === 2 || all.length === 4 || all.length === 6) {
      const half = all.length / 2;
      groups = [all.slice(0, half), all.slice(half)];
    } else return null;
  }
  if (groups.some((g) => g.length < 1 || g.length > 3)) return null;

  let lat = dms(groups[0]!);
  let lon = dms(groups[1]!);
  if (hemis.length === 2) {
    const [h1, h2] = hemis as [string, string];
    if (!isLatHemi(h1) && isLatHemi(h2)) [lat, lon] = [lon, lat]; // "E… N…" 순서
    const latH = isLatHemi(h1) ? h1 : h2;
    const lonH = isLatHemi(h1) ? h2 : h1;
    lat = Math.abs(lat) * hemiSign(latH);
    lon = Math.abs(lon) * hemiSign(lonH);
  } else if (hemis.length !== 0) return null;

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat: round5(lat), lon: round5(lon) };
}

function round5(v: number): number {
  return Math.round(v * 1e5) / 1e5;
}

export function formatLatLon(lat: number, lon: number): string {
  return `${Math.abs(lat).toFixed(4)}°${lat >= 0 ? 'N' : 'S'} ${Math.abs(lon).toFixed(4)}°${lon >= 0 ? 'E' : 'W'}`;
}
