import type { ComponentPropsWithoutRef } from 'react';
import { useDragScroll } from '@/ui/useDragScroll';

type ScrollAreaProps = ComponentPropsWithoutRef<'div'> & {
  /** 아래쪽 페이드 높이(떠 있는 탭 pill 아래로 콘텐츠가 사라지는 구간). 스크롤러 바깥 오버레이로 그린다 — 스크롤러 자체에 mask를 걸지 않는다(D-022). */
  fadeBottom?: string;
  /** 페이드 색. 기본은 앱 배경 */
  fadeColor?: string;
};

/**
 * 세로 스크롤 영역(D-022): 네이티브 터치 스크롤 + 마우스 드래그 스크롤(관성) + 얇은 스크롤바.
 * 블록 부모에서는 `h-full`, flex 열 부모에서는 `flex-1 min-h-0`으로 남은 높이를 채운다.
 * `className`은 스크롤러에 그대로 붙는다(패딩 등). `fadeBottom`을 주면 `relative` 래퍼로 감싸 오버레이를 얹는다.
 */
export function ScrollArea({
  className = '',
  fadeBottom,
  fadeColor = 'var(--bg)',
  children,
  ...rest
}: ScrollAreaProps) {
  const ref = useDragScroll<HTMLDivElement>();
  const scroller = (
    <div
      ref={ref}
      className={`scroll-area h-full min-h-0 flex-1 overflow-y-auto overscroll-y-contain ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
  if (!fadeBottom) return scroller;
  return (
    <div className="relative h-full min-h-0 flex-1">
      {scroller}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10"
        style={{
          height: fadeBottom,
          background: `linear-gradient(to top, ${fadeColor}, transparent)`,
        }}
      />
    </div>
  );
}
