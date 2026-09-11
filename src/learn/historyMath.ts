import katex from 'katex';

/** 아래첨자의 식별 문자는 사용자가 요청한 직립체로 통일한다. */
export function uprightSubscripts(source: string): string {
  let result = '';
  for (let i = 0; i < source.length; i++) {
    const char = source[i]!;
    if (char === '\\') {
      result += char + (source[++i] ?? '');
      continue;
    }
    if (char !== '_') {
      result += char;
      continue;
    }
    let cursor = i + 1;
    while (/\s/.test(source[cursor] ?? '') && cursor < source.length) cursor++;
    let sub: string;
    if (source[cursor] === '{') {
      let depth = 1;
      const start = ++cursor;
      for (; cursor < source.length && depth; cursor++) {
        if (source[cursor] === '\\') {
          cursor++;
          continue;
        }
        if (source[cursor] === '{') depth++;
        if (source[cursor] === '}') depth--;
      }
      if (depth) throw new Error('Unclosed math subscript');
      sub = source.slice(start, cursor - 1);
    } else if (source[cursor] === '\\') {
      const command = /^\\[a-zA-Z]+/.exec(source.slice(cursor));
      if (!command) throw new Error('Invalid math subscript');
      sub = command[0];
      cursor += sub.length;
    } else {
      sub = source[cursor] ?? '';
      cursor++;
    }
    if (!sub) throw new Error('Empty math subscript');
    result += `_{\\mathrm{${uprightSubscripts(sub)}}}`;
    i = cursor - 1;
  }
  return result;
}

export function splitHistoryMath(text: string): { math: boolean; value: string }[] {
  const parts: { math: boolean; value: string }[] = [];
  const pattern = /\\\(([\s\S]*?)\\\)/g;
  let start = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index! > start) parts.push({ math: false, value: text.slice(start, match.index) });
    parts.push({ math: true, value: match[1]! });
    start = match.index! + match[0].length;
  }
  if (start < text.length) parts.push({ math: false, value: text.slice(start) });
  return parts;
}

export function renderHistoryMath(formula: string): string {
  return katex.renderToString(uprightSubscripts(formula), {
    output: 'htmlAndMathml',
    throwOnError: true,
    strict: 'error',
    trust: false,
    maxExpand: 100,
    maxSize: 10,
  });
}
