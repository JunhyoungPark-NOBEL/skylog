import type { DecorationId } from './catalog';

export type HorizonGround = 'meadow' | 'sand' | 'stone' | 'snow';
export type HorizonSize = 'small' | 'medium';
export interface HorizonArtwork {
  slots: readonly (DecorationId | null)[];
  ground: HorizonGround;
  sceneryScale?: HorizonSize;
}

export const HORIZON_VIEWBOX = '0 0 1200 280';
/** 같은 다섯 위치를 프로필과 실제 지평 좌표에서 사용한다. */
export const HORIZON_SLOTS = [108, 144, 180, 216, 252].map((azDeg, i) => ({
  x: 120 + i * 240,
  y: 196,
  azDeg,
}));

export const HORIZON_GROUND_PALETTE: Record<HorizonGround, readonly [string, string, string]> = {
  meadow: ['#718779', '#344e46', '#a1ad87'],
  sand: ['#b3a18a', '#685d52', '#d4bc96'],
  stone: ['#899496', '#495760', '#aeb9b6'],
  snow: ['#c2d0cf', '#657b83', '#e5e9df'],
};

const INK = '#374b50';
const WOOD = '#b49373';
const WOOD_LIGHT = '#d6b791';
const CREAM = '#e7e4d7';
const METAL = '#92a4a6';
const GLASS = '#567b88';
const shadow = '<ellipse cy="5" rx="49" ry="7" fill="#243c3b" opacity=".19"/>';

function tripod(top = -38, spread = 31): string {
  return `<path d="M0 ${top}L${-spread} 0M0 ${top}L${spread} 0M0 ${top}V2" fill="none" stroke="${METAL}" stroke-width="5"/><path d="M-17-16H17" stroke="${INK}" stroke-width="2"/><path d="M-35 1h9m21 2h10m20-2h9" stroke="${INK}" stroke-width="4"/>`;
}

function tube(length: number, radius: number, color: string, angle = -28): string {
  return `<g transform="translate(0 -58) rotate(${angle})"><rect x="${-length / 2}" y="${-radius}" width="${length}" height="${radius * 2}" rx="4" fill="${color}"/><path d="M${-length / 2 + 6} ${-radius + 4}H${length / 2 - 5}" stroke="${CREAM}" opacity=".5" stroke-width="2"/><path d="M${-length / 2 - 9} -4h9v8h-9z" fill="${INK}"/><rect x="${length / 2 - 3}" y="${-radius - 3}" width="7" height="${radius * 2 + 6}" rx="2" fill="${METAL}"/><ellipse cx="${length / 2 + 4}" cy="0" rx="2" ry="${radius - 2}" fill="${GLASS}"/><path d="M-12 ${-radius}v-7H8" stroke="${INK}" stroke-width="3" fill="none"/><rect x="-2" y="${-radius - 10}" width="15" height="5" rx="2" fill="${METAL}"/></g>`;
}

/** 직접 그린 장식. viewBox -64 -112 128 128, 발끝 y=0. 사용자 문자열을 삽입하지 않는다. */
export function decorationSvg(id: DecorationId): string {
  let art: string;
  switch (id) {
    case 'bench':
      art = `<path d="M-37-48v47m74-47V0" stroke="${INK}" stroke-width="5"/><rect x="-46" y="-54" width="92" height="12" rx="3" fill="${WOOD_LIGHT}"/><rect x="-46" y="-38" width="92" height="11" rx="3" fill="${WOOD}"/><path d="M-47-20h94l-5 10h-84z" fill="${WOOD_LIGHT}"/><path d="M-42-22h84M-32-7H32" stroke="${INK}" stroke-width="2"/><path d="M-40-2h-9m89 0h9" stroke="${INK}" stroke-width="4"/><path d="M-34-49h19m28 15h18m-52 18H8" stroke="#9b7d62" stroke-width="1.5"/>`;
      break;
    case 'picnic-table':
      art = `<path d="M-18-52L-39 0M18-52L39 0" stroke="${WOOD}" stroke-width="8"/><path d="M-29-9h58" stroke="${INK}" stroke-width="3"/><path d="M-45-59h90l8 13H-53z" fill="${WOOD_LIGHT}"/><path d="M-50-31h34v10h-39zm66 0h34l5 10H16z" fill="${WOOD}"/><path d="M-42-53h84m-80 4h76" stroke="#a78969" stroke-width="2"/><path d="M-14-62v-10h13v10" fill="${CREAM}"/><path d="M-1-70q10 0 7 6H0" fill="none" stroke="${CREAM}" stroke-width="3"/><path d="M15-59l-2-12h9l-2 12" fill="${GLASS}"/>`;
      break;
    case 'pavilion':
      art = `<path d="M-43-60V0M43-60V0" stroke="${WOOD}" stroke-width="7"/><path d="M-45-17h90M-44-15v13m88-13v13" stroke="${WOOD_LIGHT}" stroke-width="5"/><path d="M-53-62Q-32-74 0-103Q32-74 53-62L61-57Q27-58 0-67Q-27-58-61-57z" fill="#687f83"/><path d="M-49-64Q0-74 49-64M-32-75L-40-62M-14-91L-18-66M14-91L18-66M32-75L40-62" fill="none" stroke="#9caaaa" stroke-width="2"/><path d="M-47-57h94M-48 1h96" stroke="${INK}" stroke-width="4"/><path d="M-41-53l12 14m70-14L29-39" stroke="${WOOD_LIGHT}" stroke-width="4"/>`;
      break;
    case 'telescope':
      art = `${tripod()}<path d="M0-37v-18m-4 10h17" stroke="${INK}" stroke-width="7"/>${tube(66, 10, CREAM)}`;
      break;
    case 'refractor-long':
      art = `${tripod(-42)}<path d="M0-43l-8-13M-8-54l19 10 10 13" stroke="${INK}" stroke-width="6"/><circle cx="22" cy="-29" r="7" fill="${METAL}"/>${tube(100, 8, '#bccdc7', -35)}`;
      break;
    case 'reflector':
      art = `${tripod(-38)}<path d="M0-40v-13" stroke="${INK}" stroke-width="8"/>${tube(75, 17, '#758d98', -38)}<path d="M22-89l5-9 8 5-5 9" fill="${INK}"/><path d="M-21-39l-7 11" stroke="${METAL}" stroke-width="4"/>`;
      break;
    case 'dobsonian':
      art = `<ellipse cy="0" rx="33" ry="6" fill="${INK}"/><path d="M-24-40v37h48v-37h-9v16h-30v-16z" fill="${WOOD}"/><g transform="translate(-2 -52) rotate(21)"><rect x="-17" y="-50" width="34" height="83" rx="5" fill="${CREAM}"/><rect x="-20" y="-52" width="40" height="7" rx="2" fill="${INK}"/><path d="M-14-40v61" stroke="#c7cbbf" stroke-width="3"/><rect x="17" y="-40" width="10" height="9" rx="2" fill="${INK}"/><path d="M5-48v-8h14" stroke="${METAL}" stroke-width="3"/></g><circle cx="0" cy="-35" r="11" fill="${WOOD_LIGHT}"/><circle cx="0" cy="-35" r="4" fill="${INK}"/>`;
      break;
    case 'sct':
      art = `${tripod(-29)}<path d="M0-30v-13M-19-65v23h38v-23" fill="none" stroke="${INK}" stroke-width="7"/>${tube(47, 23, '#bf9575', -25)}<circle cx="-14" cy="-47" r="5" fill="${METAL}"/>`;
      break;
    case 'binocular-mount':
      art = `${tripod(-47)}<path d="M0-48v-28M0-69l26-9M0-75l26-9" stroke="${WOOD_LIGHT}" stroke-width="4"/><path d="M-17-69H1" stroke="${INK}" stroke-width="5"/><rect x="-27" y="-78" width="11" height="20" rx="3" fill="${INK}"/><g transform="translate(28 -86) rotate(-20)"><path d="M-19 0h38" stroke="${METAL}" stroke-width="4"/><rect x="-21" y="-14" width="17" height="29" rx="5" fill="#6f8880"/><rect x="4" y="-14" width="17" height="29" rx="5" fill="#6f8880"/><path d="M-21-12h17m8 0h17" stroke="${INK}" stroke-width="5"/><circle cx="0" cy="0" r="5" fill="${INK}"/></g>`;
      break;
    case 'radio-dish':
      art = `<path d="M0-50L-24 0M0-50L24 0M-17-10h34" fill="none" stroke="${METAL}" stroke-width="7"/><g transform="translate(0 -61) rotate(-28)"><path d="M-46-29Q-44 35 42 29Q-2 19-46-29z" fill="#a8b9b8"/><path d="M-46-29Q-5 6 42 29" fill="none" stroke="${CREAM}" stroke-width="4"/><path d="M-39-23L15-43 36 23M15-43L-8 0" fill="none" stroke="${INK}" stroke-width="2.5"/><rect x="10" y="-50" width="10" height="11" rx="2" fill="${METAL}"/><path d="M-29-12Q-29 15 24 24M-13-1Q-18 17 8 23" stroke="#839b9c" stroke-width="2" fill="none"/></g>`;
      break;
    case 'observatory-dome':
      art = `<path d="M-47-44h94V0h-94z" fill="#a6b3b0"/><path d="M-48-44a48 48 0 0 1 96 0z" fill="${CREAM}"/><path d="M-7-91q-17 22-12 47H5q-4-28 8-43" fill="${INK}"/><path d="M-12-90q-17 25-12 45M18-86Q2-63 11-45" fill="none" stroke="#a0b3b5" stroke-width="3"/><path d="M-51-44h102M-49-3h98" stroke="${METAL}" stroke-width="5"/><path d="M20 0v-30h18V0" fill="#5a7174"/><rect x="-34" y="-28" width="17" height="11" rx="2" fill="${GLASS}"/><path d="M-25-28v11m-9-6h17" stroke="${CREAM}" stroke-width="1.5"/>`;
      break;
    case 'flowers':
    case 'sunflowers':
      art = [-23, 0, 23]
        .map(
          (x, i) =>
            `<g transform="translate(${x} ${i === 1 ? -12 : 0})"><path d="M0 0v-37M0-12q-20-3-13-12 15 2 13 12M0-24q17-11 18-2-10 7-18 2" fill="#78947d" stroke="#526e5c" stroke-width="2"/>${[0, 60, 120, 180, 240, 300].map((a) => `<ellipse cy="-44" rx="5" ry="9" transform="rotate(${a} 0 -35)" fill="${id === 'flowers' ? '#d4b8c2' : '#d9be72'}"/>`).join('')}<circle cy="-35" r="6" fill="${id === 'flowers' ? '#cfb97d' : '#806b4b'}"/></g>`,
        )
        .join('');
      break;
    case 'fern':
      art = `<path d="M0 2q-7-26 3-70" fill="none" stroke="#54755d" stroke-width="3"/>${[-55, -43, -30, -17].map((y, i) => `<path d="M0 ${y}q${-20 - i * 3}-21 ${-23 - i * 2}-11Q-23 ${y + 6} 0 ${y + 7}q30 0 ${26 + i * 2}-20Q9 ${y - 13} 0 ${y}" fill="${i % 2 ? '#829c7e' : '#627f67'}"/>`).join('')}<path d="M-15 2q-18-9-17-27m47 27q20-11 16-28" stroke="#6f8a6d" stroke-width="3" fill="none"/>`;
      break;
    case 'stones':
      art = `<path d="M-51-5l9-15 21-4 18 16-7 13h-31z" fill="#899999"/><path d="M-22-11l12-22 21-5 21 23-8 16H-8z" fill="#b0bcb6"/><path d="M16 0l8-16 21-3 12 15-9 8H25z" fill="#7b8e8e"/><path d="M-10-32l10 17 26 1M-43-20l8 10 17-2" stroke="#d0d4c4" fill="none" stroke-width="2" opacity=".55"/>`;
      break;
    case 'sketchbook':
      art = `<path d="M-42-2l9-45 67 9 9 41z" fill="#826d58"/><path d="M-37-5l8-36 58 8 7 29z" fill="${CREAM}"/><path d="M-29-39l-8 33" stroke="${INK}" stroke-width="3"/><circle cx="2" cy="-20" r="10" fill="none" stroke="#a0ada8" stroke-width="1.5"/><path d="M-8-19l8-7 9 8m-16 2h2m10-7h2" stroke="#7e9292" fill="none"/><path d="M20-5l27-38" stroke="${WOOD_LIGHT}" stroke-width="5"/><path d="M20-5l-3 6 6-3" fill="${INK}"/>`;
      break;
    case 'books':
      art = `<rect x="-35" y="-18" width="73" height="16" rx="3" fill="#789298"/><path d="M-26-14h61v8h-61z" fill="${CREAM}"/><rect x="-40" y="-36" width="71" height="16" rx="3" fill="#b79575"/><path d="M-37-32h59v8h-59z" fill="${CREAM}"/><path d="M-33-43l3-23 29 5 29-5 5 23-34 4z" fill="${CREAM}"/><path d="M-1-60v20m6-15l17-4m-44 3l14 3" stroke="#aab1a6" fill="none" stroke-width="2"/>`;
      break;
    case 'signpost':
      art = `<path d="M-3-84h6V2H-3z" fill="${WOOD}"/><path d="M-34-80h56l13 11-13 11h-56z" fill="${WOOD_LIGHT}"/><path d="M32-50h-52l-12 10 12 10h52z" fill="${WOOD}"/><path d="M-21-69H13m-24 30h28" stroke="#7c745f" stroke-width="2"/><path d="M-20-43l-4 3 4 3" fill="none" stroke="${CREAM}" stroke-width="2"/>`;
      break;
    case 'lantern':
      art = `<path d="M-10-60q0-21 20 0" fill="none" stroke="${METAL}" stroke-width="3"/><path d="M-16-59h32l5 9h-42zM-21-6h42v8h-42z" fill="${INK}"/><path d="M-16-50h32l3 43h-38z" fill="#bf9e75"/><path d="M-13-48h26v37h-26z" fill="#d2b788"/><path d="M0-50v41M-18-51v43m36-43v43" stroke="${INK}" stroke-width="3"/><ellipse cy="-8" rx="19" ry="3" fill="${METAL}"/>`;
      break;
    case 'moon':
      art = `<path d="M0-30V0m-19 0h38" stroke="${METAL}" stroke-width="4"/><path d="M12-92a34 34 0 1 0 17 58 34 34 0 0 1-17-58z" fill="#d7c9a4"/><path d="M-18-76a23 23 0 0 0-7 32" fill="none" stroke="#eee2bb" stroke-width="3"/><circle cx="-18" cy="-56" r="3" fill="#b6ad90"/>`;
      break;
    case 'crystal':
      art = `<path d="M-28 0l4-40 18-29 23 25 8 44z" fill="#999ab9"/><path d="M-6-69L-2 0h18L17-44z" fill="#c6c3d7"/><path d="M-24-40L-2 0-6-69m23 25L-2 0" fill="none" stroke="#7c869e" stroke-width="2"/><path d="M-43 1l2-21 9-12 9 16-1 17" fill="#b1b7ca"/><path d="M23 0l6-21 11-10 6 32" fill="#7e90a2"/>`;
      break;
    default:
      return '';
  }
  return `<g stroke-linecap="round" stroke-linejoin="round">${shadow}${art}</g>`;
}

function safePrefix(value = 'horizon'): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '') || 'horizon';
}

/** 프로필 전용 한 장. 실제 하늘과 같은 물품·지면 팔레트이며 하늘 부분은 투명하다. */
export function horizonPanoramaSvg(
  profile: HorizonArtwork,
  options: { night?: boolean; idPrefix?: string } = {},
): string {
  const prefix = safePrefix(options.idPrefix);
  const [far, near, detail] = HORIZON_GROUND_PALETTE[profile.ground];
  const size = profile.sceneryScale === 'medium' ? 4 / 3 : 1;
  const texture = Array.from({ length: 40 }, (_, i) => {
    const x = (i * 173 + 34) % 1200;
    const y = 96 + ((i * 47) % 170);
    return profile.ground === 'meadow'
      ? `<path d="M${x} ${y}l-4-8m4 8l5-6" stroke="${detail}" stroke-width="2" opacity=".23"/>`
      : `<ellipse cx="${x}" cy="${y}" rx="${profile.ground === 'stone' ? 8 : 15}" ry="2" fill="${detail}" opacity=".2"/>`;
  }).join('');
  const objects = HORIZON_SLOTS.map((slot, i) => {
    const id = profile.slots[i];
    return id
      ? `<g transform="translate(${slot.x} ${slot.y}) scale(${size})">${decorationSvg(id)}</g>`
      : '';
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${HORIZON_VIEWBOX}" fill="none"><defs><linearGradient id="${prefix}-ground" x2="0" y2="1"><stop stop-color="${far}"/><stop offset="1" stop-color="${near}"/></linearGradient>${options.night ? `<filter id="${prefix}-red" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values=".3 .59 .11 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0"/></filter>` : ''}</defs><g${options.night ? ` filter="url(#${prefix}-red)"` : ''}><path d="M0 74Q130 63 280 74T600 74T900 74T1200 74V280H0Z" fill="url(#${prefix}-ground)"/><path d="M0 121Q200 103 390 133T850 120T1200 133" stroke="${detail}" opacity=".08" stroke-width="22"/>${texture}${objects}</g></svg>`;
}

/** 360° 무반복 아틀라스. 이 SVG는 로컬 데이터 URL로만 사용한다. */
export function horizonAtlasSvg(profile: Pick<HorizonArtwork, 'slots' | 'sceneryScale'>): string {
  const size = profile.sceneryScale === 'medium' ? 4 / 3 : 1;
  const objects = HORIZON_SLOTS.map((slot, i) => {
    const id = profile.slots[i];
    return id
      ? `<g transform="translate(${(slot.azDeg / 360) * 5120} 112) scale(${size} 1)">${decorationSvg(id)}</g>`
      : '';
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="4096" height="128" viewBox="0 0 5120 128" preserveAspectRatio="none" fill="none">${objects}</svg>`;
}
