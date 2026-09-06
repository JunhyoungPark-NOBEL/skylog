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
        className="flex h-full flex-col items-center justify-center gap-4 bg-bg p-6 text-fg"
      >
        <h1 className="text-lg font-semibold">{t('error.title', '문제가 생겼어요')}</h1>
        <pre className="max-w-full overflow-auto rounded bg-surface p-3 text-xs text-muted">
          {this.state.error.message}
        </pre>
        <button
          type="button"
          className="min-h-11 rounded-full bg-accent px-5 text-accent-fg"
          onClick={() => window.location.reload()}
        >
          {t('error.reload', '다시 시작')}
        </button>
      </div>
    );
  }
}
