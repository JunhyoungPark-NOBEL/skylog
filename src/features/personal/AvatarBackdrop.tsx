import type { AvatarLook } from '@/personal/avatar';

/** 꾸미기용 독자 일러스트. 실제 관측 지도나 천체 사진으로 사용하지 않는다. */
export function AvatarBackdrop({ background }: { background: AvatarLook['background'] }) {
  if (background === 'garden') return null;
  return (
    <g data-avatar-background={background}>
      <rect
        x="-110"
        y="-80"
        width="220"
        height="160"
        fill={background === 'galaxy' ? '#242240' : '#172d47'}
      />
      <g fill="#e2e4d7" opacity=".75">
        {[
          [-85, -54],
          [-66, 24],
          [-41, -62],
          [42, -59],
          [82, 9],
          [61, 45],
          [-88, 55],
          [14, -51],
          [91, -60],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.4 : 0.8} />
        ))}
      </g>
      {background === 'orion' && (
        <g stroke="#accfe5" strokeWidth=".9" fill="#f0e8c7">
          <path d="M-80-48L-49-41L-59-13L-42 18L-76 25L-69-11ZM-69-11L-64-12L-59-13" fill="none" />
          {[
            [-80, -48],
            [-49, -41],
            [-59, -13],
            [-42, 18],
            [-76, 25],
            [-69, -11],
            [-64, -12],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i === 0 ? 2.5 : 1.8} />
          ))}
          <path d="M51-23L71-46L84-19L65 10Z" fill="none" opacity=".35" />
        </g>
      )}
      {background === 'moonlit' && (
        <g>
          <circle cx="61" cy="-35" r="27" fill="#b3cfdb" opacity=".08" />
          <circle cx="61" cy="-35" r="21" fill="#d6e0d6" />
          <path d="M58-55a21 21 0 0 0 0 40q-17-17 0-40" fill="#8aa4b0" />
          <g fill="#91a7af" opacity=".6">
            <circle cx="65" cy="-43" r="4" />
            <circle cx="71" cy="-29" r="5" />
            <circle cx="59" cy="-25" r="2.5" />
          </g>
          <path d="M-110 55Q-63 28-12 51T110 42V80H-110Z" fill="#355565" />
        </g>
      )}
      {background === 'saturn' && (
        <g transform="translate(62 -30) rotate(-25)">
          <ellipse rx="33" ry="11" fill="none" stroke="#bfa98b" strokeWidth="6" />
          <circle r="19" fill="#d8bf8f" />
          <path d="M-17-7h34M-18 3h36M-14 12h28" stroke="#ab906d" strokeWidth="3" opacity=".6" />
          <path d="M-33 0A33 11 0 0 0 33 0" fill="none" stroke="#e0cfac" strokeWidth="6" />
          <path d="M-33 0A33 11 0 0 0 33 0" fill="none" stroke="#907959" strokeWidth="1" />
        </g>
      )}
      {background === 'galaxy' && (
        <g transform="translate(-58 -28) rotate(-34)">
          <ellipse rx="48" ry="22" fill="#ad96ca" opacity=".12" />
          <ellipse rx="36" ry="14" fill="#97b6cf" opacity=".18" />
          <path
            d="M-37 6Q-11-18 13-9T32 8Q6 21-18 9T-30-7"
            fill="none"
            stroke="#aaa4d8"
            strokeWidth="5"
            opacity=".65"
          />
          <path d="M-26 9Q-8-9 13-5T25 5" fill="none" stroke="#e2cbbb" strokeWidth="3" />
          <ellipse rx="10" ry="5" fill="#e8d8c1" />
        </g>
      )}
    </g>
  );
}
