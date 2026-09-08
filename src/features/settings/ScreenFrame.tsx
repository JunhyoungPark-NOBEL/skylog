import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { IconBack } from '@/ui/icons';
import { ScrollArea } from '@/ui/ScrollArea';

interface ScreenFrameProps {
  title: string;
  onBack(): void;
  children: ReactNode;
  testId?: string;
  scrollKey?: string;
}

/**
 * 전체 화면 보조 화면(설정·정보·디버그)의 공통 틀: 뒤로 버튼 + 제목 + 스크롤 본문.
 * 헤더는 불투명 외곽선 대신 헤어라인(box-shadow)으로 본문과 나눈다.
 */
export function ScreenFrame({ title, onBack, children, testId, scrollKey }: ScreenFrameProps) {
  const { t } = useTranslation();
  return (
    <div className="flex h-full flex-col bg-bg text-fg" data-testid={testId}>
      <header className="safe-top hairline-b flex shrink-0 items-center gap-1 bg-bg py-1 pl-1.5 pr-4">
        <button
          type="button"
          aria-label={t('common.back')}
          onClick={onBack}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill text-fg/80 transition-colors duration-150 active:bg-surface-2"
          data-testid="back"
        >
          <IconBack size={22} />
        </button>
        <h1 className="min-w-0 truncate text-title">{title}</h1>
      </header>
      <ScrollArea key={scrollKey} className="safe-bottom pb-8">
        {children}
      </ScrollArea>
    </div>
  );
}
