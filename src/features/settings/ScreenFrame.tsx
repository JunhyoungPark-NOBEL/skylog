import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { IconBack } from '@/ui/icons';

interface ScreenFrameProps {
  title: string;
  onBack(): void;
  children: ReactNode;
  testId?: string;
}

/** 전체 화면 보조 화면(설정·정보·디버그)의 공통 틀: 뒤로 버튼 + 제목 + 스크롤 본문 */
export function ScreenFrame({ title, onBack, children, testId }: ScreenFrameProps) {
  const { t } = useTranslation();
  return (
    <div className="flex h-full flex-col bg-bg text-fg" data-testid={testId}>
      <header className="safe-top flex shrink-0 items-center border-b border-border bg-surface pr-3">
        <button
          type="button"
          aria-label={t('common.back')}
          onClick={onBack}
          className="flex h-12 w-12 items-center justify-center"
          data-testid="back"
        >
          <IconBack size={22} />
        </button>
        <h1 className="text-base font-semibold">{title}</h1>
      </header>
      <div className="safe-bottom min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
