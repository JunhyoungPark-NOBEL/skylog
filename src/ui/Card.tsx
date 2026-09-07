import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  testId?: string;
  /** 제목 행(제목 + 오른쪽 보조 텍스트) */
  title?: ReactNode;
  aside?: ReactNode;
  /** 카드 전체가 탭 가능 */
  onClick?: () => void;
}

/**
 * 카드(D-021): 외곽선 없이 표면 한 층 위 + 상단 1px 하이라이트, 24px 모서리(squircle).
 * 깊이는 그림자가 아니라 표면 층으로 표현한다. 야간 모드는 토큰이 붉게 바뀐다.
 */
export function Card({ children, className = '', testId, title, aside, onClick }: CardProps) {
  const Tag = onClick ? 'button' : 'section';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`squircle block w-full rounded-xl bg-surface p-4 text-left shadow-card ${
        onClick
          ? 'transition-[transform,opacity] duration-150 ease-standard active:scale-[0.98]'
          : ''
      } ${className}`}
      data-testid={testId}
    >
      {(title || aside) && (
        <div className="mb-3 flex items-baseline justify-between gap-3">
          {title && <h2 className="min-w-0 text-title">{title}</h2>}
          {aside && <span className="shrink-0 text-caption text-muted">{aside}</span>}
        </div>
      )}
      {children}
    </Tag>
  );
}

/** 카드 안의 소제목(문장 케이스, uppercase 없음) */
export function CardSection({
  title,
  children,
  className = '',
}: {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mt-3 ${className}`}>
      {title && <h3 className="mb-1.5 text-body-sm font-semibold text-muted">{title}</h3>}
      {children}
    </div>
  );
}
