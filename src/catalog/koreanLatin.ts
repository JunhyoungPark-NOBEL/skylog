/**
 * 질의 확장(검색): 한국어로 음역한 그리스 문자·라틴 별자리 이름 → 인덱스가 가진 라틴 별칭.
 * "알파 리라" → "alphalyr", "베타 오리온" → "betaori", "리라" → "lyra". 인덱스에는 넣지 않고 질의 쪽에서만 바꾼다(D-019).
 */
import { normalizeAlias } from '@/catalog/normalize';

const GREEK_KO: Record<string, string> = {
  알파: 'alpha',
  베타: 'beta',
  감마: 'gamma',
  델타: 'delta',
  엡실론: 'epsilon',
  입실론: 'epsilon',
  제타: 'zeta',
  에타: 'eta',
  세타: 'theta',
  테타: 'theta',
  이오타: 'iota',
  요타: 'iota',
  카파: 'kappa',
  람다: 'lambda',
  뮤: 'mu',
  뉴: 'nu',
  크시: 'xi',
  오미크론: 'omicron',
  파이: 'pi',
  로: 'rho',
  시그마: 'sigma',
  타우: 'tau',
  웁실론: 'upsilon',
  피: 'phi',
  카이: 'chi',
  프시: 'psi',
  오메가: 'omega',
};

/** 라틴 별자리 이름의 한국어 음역 → IAU 약어(소문자) + 라틴 이름 */
const LATIN_KO: Record<string, [string, string]> = {
  안드로메다: ['and', 'andromeda'],
  안틀리아: ['ant', 'antlia'],
  아푸스: ['aps', 'apus'],
  아쿠아리우스: ['aqr', 'aquarius'],
  아퀼라: ['aql', 'aquila'],
  아라: ['ara', 'ara'],
  아리에스: ['ari', 'aries'],
  아우리가: ['aur', 'auriga'],
  보오테스: ['boo', 'bootes'],
  부테스: ['boo', 'bootes'],
  카일룸: ['cae', 'caelum'],
  카멜로파르달리스: ['cam', 'camelopardalis'],
  칸케르: ['cnc', 'cancer'],
  캔서: ['cnc', 'cancer'],
  카네스베나티키: ['cvn', 'canesvenatici'],
  카니스마요르: ['cma', 'canismajor'],
  카니스마이오르: ['cma', 'canismajor'],
  카니스미노르: ['cmi', 'canisminor'],
  카프리코르누스: ['cap', 'capricornus'],
  카리나: ['car', 'carina'],
  카시오페이아: ['cas', 'cassiopeia'],
  켄타우루스: ['cen', 'centaurus'],
  케페우스: ['cep', 'cepheus'],
  세페우스: ['cep', 'cepheus'],
  케투스: ['cet', 'cetus'],
  카멜레온: ['cha', 'chamaeleon'],
  키르키누스: ['cir', 'circinus'],
  콜룸바: ['col', 'columba'],
  코마베레니케스: ['com', 'comaberenices'],
  코로나아우스트랄리스: ['cra', 'coronaaustralis'],
  코로나보레알리스: ['crb', 'coronaborealis'],
  코르부스: ['crv', 'corvus'],
  크라테르: ['crt', 'crater'],
  크룩스: ['cru', 'crux'],
  키그누스: ['cyg', 'cygnus'],
  시그누스: ['cyg', 'cygnus'],
  델피누스: ['del', 'delphinus'],
  도라도: ['dor', 'dorado'],
  드라코: ['dra', 'draco'],
  에쿨레우스: ['equ', 'equuleus'],
  에리다누스: ['eri', 'eridanus'],
  포르낙스: ['for', 'fornax'],
  제미니: ['gem', 'gemini'],
  그루스: ['gru', 'grus'],
  헤르쿨레스: ['her', 'hercules'],
  허큘리스: ['her', 'hercules'],
  호롤로기움: ['hor', 'horologium'],
  히드라: ['hya', 'hydra'],
  히드루스: ['hyi', 'hydrus'],
  인두스: ['ind', 'indus'],
  라케르타: ['lac', 'lacerta'],
  레오: ['leo', 'leo'],
  레오미노르: ['lmi', 'leominor'],
  레푸스: ['lep', 'lepus'],
  리브라: ['lib', 'libra'],
  루푸스: ['lup', 'lupus'],
  링크스: ['lyn', 'lynx'],
  리라: ['lyr', 'lyra'],
  멘사: ['men', 'mensa'],
  미크로스코피움: ['mic', 'microscopium'],
  모노케로스: ['mon', 'monoceros'],
  무스카: ['mus', 'musca'],
  노르마: ['nor', 'norma'],
  옥탄스: ['oct', 'octans'],
  오피우쿠스: ['oph', 'ophiuchus'],
  오리온: ['ori', 'orion'],
  파보: ['pav', 'pavo'],
  페가수스: ['peg', 'pegasus'],
  페르세우스: ['per', 'perseus'],
  포이닉스: ['phe', 'phoenix'],
  피닉스: ['phe', 'phoenix'],
  픽토르: ['pic', 'pictor'],
  피스케스: ['psc', 'pisces'],
  피스키스아우스트리누스: ['psa', 'piscisaustrinus'],
  푸피스: ['pup', 'puppis'],
  픽시스: ['pyx', 'pyxis'],
  레티쿨룸: ['ret', 'reticulum'],
  사기타: ['sge', 'sagitta'],
  사지타리우스: ['sgr', 'sagittarius'],
  사기타리우스: ['sgr', 'sagittarius'],
  스코르피우스: ['sco', 'scorpius'],
  스쿨프토르: ['scl', 'sculptor'],
  스쿠툼: ['sct', 'scutum'],
  세르펜스: ['ser', 'serpens'],
  섹스탄스: ['sex', 'sextans'],
  타우루스: ['tau', 'taurus'],
  텔레스코피움: ['tel', 'telescopium'],
  트리앙굴룸: ['tri', 'triangulum'],
  트리앙굴룸아우스트랄레: ['tra', 'triangulumaustrale'],
  투카나: ['tuc', 'tucana'],
  우르사마요르: ['uma', 'ursamajor'],
  우르사마이오르: ['uma', 'ursamajor'],
  우르사미노르: ['umi', 'ursaminor'],
  벨라: ['vel', 'vela'],
  비르고: ['vir', 'virgo'],
  볼란스: ['vol', 'volans'],
  불페쿨라: ['vul', 'vulpecula'],
};

/** 정규화된 한글 질의 → 시도해 볼 라틴 별칭 질의들(없으면 빈 배열) */
export function expandKoreanQuery(normalizedQuery: string): string[] {
  const q = normalizedQuery;
  if (!/[가-힣]/.test(q)) return [];
  const out: string[] = [];
  const con = LATIN_KO[q];
  if (con) out.push(con[1], con[0]);
  // 그리스 문자 접두 + 별자리
  for (const [ko, latin] of Object.entries(GREEK_KO)) {
    if (q.startsWith(ko) && q.length > ko.length) {
      const rest = q.slice(ko.length);
      const c = LATIN_KO[rest];
      if (c) out.push(normalizeAlias(`${latin}${c[0]}`));
      else if (/^[a-z]+$/.test(rest)) out.push(`${latin}${rest}`);
      break;
    }
  }
  return out;
}
