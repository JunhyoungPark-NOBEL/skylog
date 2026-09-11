import { describe, expect, it } from 'vitest';
import { renderHistoryMath, splitHistoryMath, uprightSubscripts } from '@/learn/historyMath';
import { HISTORY_LESSONS } from '@/learn/historyLessons';
import { HISTORY_QUESTS } from '@/learn/historyQuests';
function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings);
  return [];
}
describe('historical problem mathematical typography', () => {
  it('keeps variables mathematical and makes simple, command and nested subscripts upright', () => {
    expect(uprightSubscripts(String.raw`v_r+M_{sun}+R_\odot+X_{a_b}`)).toBe(
      String.raw`v_{\mathrm{r}}+M_{\mathrm{sun}}+R_{\mathrm{\odot}}+X_{\mathrm{a_{\mathrm{b}}}}`,
    );
    expect(renderHistoryMath('v_r')).toContain('mathvariant="normal"');
    expect(renderHistoryMath('v_r')).toContain('mathnormal');
    expect(() => renderHistoryMath('x_{')).toThrow();
  });
  it('does not turn natural language or angle-bracket text into executable math or HTML', () => {
    expect(splitHistoryMath('A star and a planet <script>')).toEqual([
      { math: false, value: 'A star and a planet <script>' },
    ]);
    expect(renderHistoryMath(String.raw`\text{<img>}`)).not.toContain('<img>');
  });
  it('renders every authored formula without fallback', () => {
    const formulas = strings([HISTORY_LESSONS, HISTORY_QUESTS]).flatMap((text) =>
      splitHistoryMath(text).filter((p) => p.math),
    );
    expect(formulas.length).toBeGreaterThan(20);
    for (const { value } of formulas) expect(() => renderHistoryMath(value), value).not.toThrow();
  });
});
