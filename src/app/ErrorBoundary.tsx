import { Component, type ErrorInfo, type ReactNode } from 'react';
import { i18next } from '@/app/i18n';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/** 최상위 에러 경계. 렌더 에러가 나도 검은 화면 대신 재시작 버튼을 보여준다. */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[skylog] render error', error, info.componentStack);
  }

  override render(): ReactNode {
    if (!this.state.error) return this.props.children;
    const t = (k: string, fallback: string) => (i18next.isInitialized ? i18next.t(k) : fallback);
    return (
      <div
        role="alert"
        className="flex h-full flex-col items-center justify-center bg-bg p-6 text-fg"
      >
        <div className="squircle w-full max-w-sm rounded-xl bg-surface p-5 shadow-card">
          <h1 className="text-headline">{t('error.title', '문제가 생겼어요')}</h1>
          <pre className="mt-3 max-h-48 max-w-full overflow-auto rounded-md bg-surface-2/70 px-3.5 py-3 text-caption break-words whitespace-pre-wrap text-muted">
            {this.state.error.message}
          </pre>
          <button
            type="button"
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-pill bg-accent px-5 text-body font-semibold text-accent-fg transition-[transform,opacity] duration-150 ease-standard active:scale-[0.97]"
            onClick={() => window.location.reload()}
          >
            {t('error.reload', '새로고침')}
          </button>
        </div>
      </div>
    );
  }
}
