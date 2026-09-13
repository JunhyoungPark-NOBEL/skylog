/** 받침 ㄹ은 ‘으로’ 대신 ‘로’. 라틴 표기는 어색한 조사 대신 ‘방향’을 쓴다. */
export function navigationLabel(name: string, lang: 'ko' | 'en'): string {
  if (lang === 'en') return `Toward ${name}`;
  const last = name.trim().at(-1)?.charCodeAt(0) ?? 0;
  if (last < 0xac00 || last > 0xd7a3) return `${name} 방향`;
  const final = (last - 0xac00) % 28;
  return `${name}${final === 0 || final === 8 ? '로' : '으로'}`;
}
