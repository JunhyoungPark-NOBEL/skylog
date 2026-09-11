import type { AchievementGroup } from '@/learn/achievementGroups';

/** 테마의 글자색으로 그리는 작은 도장. 야간에도 컬러 이모지의 흰 빛을 남기지 않는다. */
export function AchievementMark({ group }: { group: AchievementGroup }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className="h-8 w-8"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {group === 'discovery' && (
        <>
          <path d="m7 22 5-14 12 7-8 10-9-3Z" />
          <circle cx="12" cy="8" r="2" fill="currentColor" />
          <circle cx="24" cy="15" r="1.8" fill="currentColor" />
          <circle cx="16" cy="25" r="1.8" fill="currentColor" />
          <circle cx="7" cy="22" r="1.8" fill="currentColor" />
        </>
      )}
      {group === 'deepSky' && (
        <>
          <ellipse cx="16" cy="16" rx="13" ry="6" transform="rotate(-30 16 16)" />
          <ellipse cx="16" cy="16" rx="7" ry="3" transform="rotate(-30 16 16)" />
          <circle cx="16" cy="16" r="1.6" fill="currentColor" />
          <path d="M24 5v4m-2-2h4M7 24v4m-2-2h4" />
        </>
      )}
      {group === 'journal' && (
        <>
          <path d="M7 6h15v21H7a3 3 0 0 1 0-6h15M7 6a3 3 0 0 0-3 3v15" />
          <path d="m10 11 2-1 1 3 4 1-3 2v3l-3-2-3 1 1-4-2-2 3-1Z" />
          <path d="M25 7v14m-1 2 1 3 1-3" />
        </>
      )}
      {group === 'learning' && (
        <>
          <path d="M5 8q5-3 11 1 6-4 11-1v18q-5-3-11 0-6-3-11 0V8Zm11 1v17" />
          <path d="m11 3 .7 2.2L14 6l-2.3.7L11 9l-.7-2.3L8 6l2.3-.8L11 3Z" />
          <path d="M20 13h4m-4 4h4M8 14h4m-4 4h4" />
        </>
      )}
      {group === 'fieldwork' && (
        <>
          <path d="m6 12 16-7 4 8-16 7-4-8Zm3-1 4 8m10-13 3-1 4 8-3 1M17 17v11m0-9-6 9m6-9 6 9" />
          <circle cx="5" cy="6" r="1" fill="currentColor" />
        </>
      )}
    </svg>
  );
}
