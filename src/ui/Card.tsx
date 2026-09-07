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

/** 둥근 카드(D-020): 표면 한 층 위, 부드러운 그림자, 20px 모서리. 야간 모드는 토큰이 붉게 바뀐다. */
export function Card({ children, className = '', testId, title, aside, onClick }: CardProps) {
  const Tag = onClick ? 'button' : 'section';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`block w-full rounded-lg border border-border/60 bg-surface p-4 text-left shadow-card ${onClick ? 'active:scale-[0.99] transition-transform' : ''} ${className}`}
      data-testid={testId}
    >
      {(title || aside) && (
        <div className="mb-2 flex items-baseline justify-between gap-3">
          {title && <h2 className="text-[17px] font-semibold tracking-tight">{title}</h2>}
          {aside && <span className="shrink-0 text-xs text-muted">{aside}</span>}
        </div>
      )}
      {children}
    </Tag>
  );
}

/** 카드 안의 소제목 */
export function CardSection({ title, children, className = '' }: { title?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={`mt-3 ${className}`}>
      {title && <h3 className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted">{title}</h3>}
      {children}
    </div>
  );
}
