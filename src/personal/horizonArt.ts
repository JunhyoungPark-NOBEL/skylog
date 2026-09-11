import { activeDecorationId, type DecorationId, type HorizonBackdrop } from './catalog';

export type HorizonGround = 'meadow' | 'sand' | 'stone' | 'snow';
export type HorizonSize = 'small' | 'medium';
export interface HorizonArtwork {
  slots: readonly (DecorationId | null)[];
  ground: HorizonGround;
  sceneryScale?: HorizonSize;
  backdrop?: HorizonBackdrop;
}

export const HORIZON_VIEWBOX = '0 0 1200 280';
/** 같은 다섯 위치를 프로필과 실제 지평 좌표에서 사용한다. */
export const HORIZON_SLOTS = [108, 144, 180, 216, 252].map((azDeg, i) => ({
  x: 120 + i * 240,
  y: 218,
  azDeg,
}));

export const HORIZON_GROUND_PALETTE: Record<HorizonGround, readonly [string, string, string]> = {
  meadow: ['#8fa88a', '#3d6457', '#b9cba0'],
  sand: ['#d6c0a0', '#998067', '#f0dfb9'],
  stone: ['#9eaaa4', '#546871', '#c7d2c4'],
  snow: ['#e6ece1', '#8aa6af', '#faf3df'],
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
export function decorationSvg(rawId: DecorationId): string {
  const id = activeDecorationId(rawId);
  let art: string;
  switch (id) {
    case 'house':
      art = `<ellipse cy="7" rx="61" ry="10" fill="#213e3d" opacity=".17"/><path d="M-47-62L7-72 50-57V1H-47Z" fill="#ede0c6"/><path d="M7-72L50-57V1H7Z" fill="#c4b898"/><path d="M-60-60L-13-100 8-104 61-57 47-50 8-84-43-49Z" fill="#6f8184"/><path d="M-60-60L-13-100 8-104-40-56Z" fill="#a2b6b4"/><path d="M-19-94L23-58m-31-42L35-59m-52-21L1-58" stroke="#c0ccc0" stroke-width="1.7" opacity=".48"/><path d="M31-81v-23h13v34" fill="#b6997c"/><path d="M28-104h19v7H28z" fill="#d3b697"/><path d="M-40-45h25v25h-25zM20-40h20v21H20z" fill="#658e98"/><path d="M-28-44v23m-11-12h23m14-32V0" stroke="#f4e6c9" stroke-width="3"/><path d="M-9-40H9V1H-9z" fill="#7a8980"/><circle cx="4" cy="-18" r="2" fill="#decda7"/><path d="M-52 1h108l4 7H-56z" fill="#87938a"/><path d="M-43-17h31m30 2h25" stroke="#adb89a" stroke-width="3"/>`;
      break;
    case 'observing-deck':
      art = `<path d="M-61-19L29-35 61-18-30 3Z" fill="#d2b998"/><path d="M-61-19v13l31 22V3zm31 22l91-21v13l-91 21z" fill="#a48b71"/><path d="M-50-18L-18 5m-18-26L-3 2m-18-25L12-2m-18-24L27-6m-19-23L42-10m-18-22L55-14" stroke="#a38b70" stroke-width="1.5"/><path d="M-54-19v-29m17 25v-29m19 29v-27M-56-40l41-9" stroke="#c4b192" stroke-width="4"/><path d="M20-20v-32m-8 32l8-14 9 14" fill="none" stroke="#415963" stroke-width="3"/><g transform="translate(22 -59) rotate(-30)"><rect x="-21" y="-5" width="39" height="10" rx="2" fill="#e2e7d7"/><rect x="15" y="-7" width="5" height="14" rx="1" fill="#819da2"/></g><path d="M-2-33h14v10H-2z" fill="#6b8583"/><path d="M-1-33q6-10 12 0" fill="none" stroke="#c8d2bc" stroke-width="2"/>`;
      break;
    case 'dog':
      art = `<ellipse cx="6" cy="5" rx="33" ry="6" fill="#203b3a" opacity=".19"/><path d="M-15-18q-20-3-23-23-3-8-7-5-2 21 24 36" fill="#cb9d6b"/><path d="M-23-21q8-24 31-22 22 3 21 27L22 1H-12z" fill="#d5b185"/><path d="M-20-22q8-3 13 6v19h-11zM10-20q10 0 12 9v15H9z" fill="#e4cda7"/><path d="M6-48q-7-21 8-29 17-6 29 9 4 15-2 28-17 13-35-8" fill="#e5c69b"/><path d="M10-72q-15 0-14 19 0 13 10 7l8-20M33-74q18-1 17 19-1 12-9 6l-10-18" fill="#9b7654"/><path d="M16-42q10 10 23-4l-3 9-17 4z" fill="#7e9a98"/><ellipse cx="28" cy="-51" rx="11" ry="8" fill="#efdfbd"/><circle cx="20" cy="-60" r="2.4" fill="#354747"/><circle cx="36" cy="-60" r="2.4" fill="#354747"/><path d="M24-54q4-4 9 0-1 6-5 6-4-1-4-6" fill="#354747"/><path d="M28-47v4" stroke="#866d57" stroke-width="1.5"/>`;
      break;
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

/** 5120 단위가 360도이므로 세로도 같은 각도 척도를 사용한다. */
export const HORIZON_ATLAS_DEPTH_DEG = (280 * 360) / 5120;

function pine(x: number, y: number, size: number, color: string): string {
  return `<g transform="translate(${x} ${y}) scale(${size})" fill="${color}"><path d="M-2 0v-43h4V0zM0-83l-20 31h12l-21 28h18L-34-3h68L11-24h18L8-52h12z"/></g>`;
}

/** 원경→산/바다→가까운 언덕→잔디 마당. 자잘한 풀·돌 무늬로 화면을 채우지 않는다. */
function sceneryLayers(backdrop: HorizonBackdrop, ground: HorizonGround, prefix: string): string {
  const [far, near] = HORIZON_GROUND_PALETTE[ground];
  let distant: string;
  if (backdrop === 'sea') {
    distant = `<defs><linearGradient id="${prefix}-water" x2="0" y2="1"><stop stop-color="#b5d7d4"/><stop offset=".28" stop-color="#72b3b6"/><stop offset="1" stop-color="#356f80"/></linearGradient></defs><path d="M0 15Q500 11 1024 15T2048 15T3072 15T4096 15T5120 15V191H0Z" fill="url(#${prefix}-water)"/><path d="M360 27l120-5 40 10H300zM2110 38l80-18 95 18H2070zM4090 29l99-13 122 21H4030z" fill="#7fa0a7"/><path d="M0 79Q580 66 970 80T2020 80T3100 80T4160 80T5120 79M100 112q550-18 1000 1t1020 0t980 0t1000 0" fill="none" stroke="#d1e8dd" opacity=".49" stroke-width="2.5"/><path d="M1350 61h141m154-8h95m392 3h110m243 16h100m463-16h171" stroke="#d8eade" stroke-width="2" opacity=".7"/><path d="M0 184Q780 118 1370 161T2660 146T3990 170T5120 184V280H0Z" fill="#d2bb95"/><path d="M0 177Q780 111 1370 154T2660 139T3990 163T5120 177" fill="none" stroke="#e4e6cd" stroke-width="8" opacity=".85"/><g transform="translate(2710 47)"><path d="M0 31V-16L-27 26z" fill="#f1ecd5"/><path d="M4 2l19 25H4" fill="#c6d9cf"/><path d="M-33 31h62l-8 8h-43z" fill="#4e747c"/></g>`;
  } else if (backdrop === 'snow-peaks') {
    distant = `<path d="M0 114L180 98 370 57 605 86 830 44 1070 82 1240 48 1430 71 1625 26 1850 64 2030 20 2280 53 2460 12 2700 56 2890 30 3150 78 3330 33 3560 61 3770 17 3980 67 4200 34 4430 78 4680 49 4930 93 5120 114V170H0Z" fill="#9fbbc1"/><path d="M0 141L540 103 900 123 1210 75 1460 101 1755 22 2010 115 2230 78 2440 11 2710 104 2950 45 3250 124 3500 65 3770 40 4130 137 4580 96 5120 141V199H0Z" fill="#829eaa"/><path d="M1460 101L1755 22 2010 115 1820 78 1790 91 1735 56 1670 83 1630 74Z M2230 78L2440 11 2710 104 2530 59 2490 80 2432 41 2390 60 2370 48Z M2790 85L2950 45 3140 101 3010 77 2970 84 2942 62 2870 82Z M3600 74L3770 40 3975 114 3825 89 3780 60 3740 84Z" fill="#edf2e7"/><path d="M1755 22L1815 133 2010 115 1820 78 1790 91 1735 56Z M2440 11L2500 146 2710 104 2530 59 2490 80 2432 41Z M3770 40L3820 158 4000 132 3780 60Z" fill="#bbd0d1"/><path d="M0 154Q620 122 1170 160T2360 153T3420 149T4410 151T5120 154V232H0Z" fill="#63848d"/>`;
  } else if (backdrop === 'rocky-peaks') {
    distant = `<path d="M0 114L520 99 980 70 1330 96 1700 32 1880 48 2020 27 2310 89 2570 40 2860 75 3150 37 3430 65 3700 15 3960 67 4380 53 4810 91 5120 114V194H0Z" fill="#acaab0"/><path d="M0 152L820 135 1230 93 1490 127 1700 37 1870 55 2020 27 2180 83 2390 121 2670 57 2840 73 2960 54 3220 132 3460 106 3700 26 3920 85 4200 139 4690 111 5120 152V210H0Z" fill="#978b84"/><path d="M1700 37L1800 130 1900 89 2020 27 1870 55Z M2670 57L2760 133 2840 73 2960 54 2860 154Z M3700 26L3710 151 3830 114 3920 85Z" fill="#c6b6a1"/><path d="M2020 27L1990 171 2180 83Z M2960 54L2900 180 3220 132Z M3700 26L3530 188 3710 151Z" fill="#6d747d"/><path d="M0 171Q780 133 1440 172T2840 169T4150 177T5120 171V230H0Z" fill="#77847b"/>`;
  } else {
    distant = `<path d="M0 89Q310 35 650 70T1260 74T1900 59T2570 64T3170 42T3850 73T4540 58T5120 89V160H0Z" fill="#a6b8b6"/><path d="M0 110Q580 53 1090 100T2010 97Q2360 21 2760 82T3670 99Q4110 41 4550 91L5120 110V199H0Z" fill="#7e9b91"/><path d="M0 157Q650 101 1240 140T2380 143T3490 123T4310 140T5120 157V219H0Z" fill="#5f8271"/><path d="M1220 140Q1700 107 2010 145M3100 130Q3590 99 3880 146" fill="none" stroke="#aec39a" stroke-width="9" opacity=".28"/><g transform="translate(1780 125) scale(.43)"><path d="M-43-57h86V0h-86z" fill="#d5ccaf"/><path d="M-53-54L-2-93 54-54" fill="#8f8279"/><path d="M-26-39h13v17h-13zm40 0h13v17H14z" fill="#7e9fa1"/><path d="M-5-25H8V0H-5z" fill="#9b967e"/></g><path d="M2870 160q-62-35 12-60m-12 60q48-37 84-47" fill="none" stroke="#80967c" stroke-width="2" opacity=".5"/>`;
  }
  const trees =
    backdrop === 'sea'
      ? ''
      : [
          [1150, 169, 0.65],
          [1220, 170, 0.48],
          [1320, 169, 0.38],
          [3370, 170, 0.47],
          [3440, 173, 0.66],
          [3540, 174, 0.52],
          [4250, 175, 0.6],
          [4370, 172, 0.48],
        ]
          .map(([x, y, scale]) =>
            pine(x!, y!, scale!, backdrop === 'snow-peaks' ? '#446d72' : '#496e5f'),
          )
          .join('');
  const landY = backdrop === 'sea' ? 193 : 164;
  const foreground = `<defs><linearGradient id="${prefix}-land" x2="0" y2="1"><stop stop-color="${far}"/><stop offset="1" stop-color="${near}"/></linearGradient></defs><path d="M0 ${landY}Q550 ${landY - 20} 1150 ${landY}T2240 ${landY}T3370 ${landY}T4480 ${landY}T5120 ${landY}V280H0Z" fill="url(#${prefix}-land)"/><path d="M1500 280Q1670 226 1880 ${landY + 11}Q1850 220 1790 280Z" fill="${ground === 'meadow' ? '#c6c29a' : '#e9d6b0'}" opacity=".32"/><path d="M2070 245Q2470 196 2940 242T4100 244" fill="none" stroke="${near}" stroke-width="22" opacity=".18"/>`;
  return `${distant}${trees}${foreground}`;
}

/** 프로필 전용 한 장. 실제 하늘과 같은 물품·지면 팔레트이며 하늘 부분은 투명하다. */
export function horizonPanoramaSvg(
  profile: HorizonArtwork,
  options: { night?: boolean; idPrefix?: string } = {},
): string {
  const prefix = safePrefix(options.idPrefix);
  const size = profile.sceneryScale === 'medium' ? 1.45 : 1.2;
  const objects = HORIZON_SLOTS.map((slot, i) => {
    const id = profile.slots[i];
    return id
      ? `<g transform="translate(${slot.x} ${slot.y}) scale(${size * (activeDecorationId(id) === 'dog' ? 0.6 : 1)})">${decorationSvg(id)}</g>`
      : '';
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${HORIZON_VIEWBOX}" fill="none"><defs>${options.night ? `<filter id="${prefix}-red" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values=".3 .59 .11 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0"/></filter>` : ''}</defs><g${options.night ? ` filter="url(#${prefix}-red)"` : ''}><svg width="1200" height="280" viewBox="1280 0 2560 280" preserveAspectRatio="none">${sceneryLayers(profile.backdrop ?? 'field', profile.ground, prefix)}</svg>${objects}</g></svg>`;
}

/** 360° 무반복 아틀라스. 이 SVG는 로컬 데이터 URL로만 사용한다. */
export function horizonAtlasSvg(
  profile: Pick<HorizonArtwork, 'slots' | 'sceneryScale'> & Partial<HorizonArtwork>,
): string {
  const size = profile.sceneryScale === 'medium' ? 1.8 : 1.45;
  const objects = HORIZON_SLOTS.map((slot, i) => {
    const id = profile.slots[i];
    return id
      ? `<g transform="translate(${(slot.azDeg / 360) * 5120} 218) scale(${size * (activeDecorationId(id) === 'dog' ? 0.6 : 1)})">${decorationSvg(id)}</g>`
      : '';
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="4096" height="256" viewBox="0 0 5120 280" preserveAspectRatio="none" fill="none">${sceneryLayers(profile.backdrop ?? 'field', profile.ground ?? 'meadow', 'scene')}${objects}</svg>`;
}
