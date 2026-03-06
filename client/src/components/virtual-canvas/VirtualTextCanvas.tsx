import { memo, useEffect, useRef, useState } from 'react';

type VirtualTextCanvasProps = {
  text: string;
  className?: string;
  textClassName?: string;
  minScale?: number;
  horizontalPaddingPx?: number;
  observeResize?: boolean;
  forceVerticalScrollbar?: boolean;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function VirtualTextCanvas({
  text,
  className,
  textClassName,
  minScale = 0.2,
  horizontalPaddingPx = 24,
  observeResize = true,
  forceVerticalScrollbar = false,
}: VirtualTextCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLPreElement | null>(null);
  const [scale, setScale] = useState(1);
  const [scaledHeight, setScaledHeight] = useState<number | null>(null);
  const lastScaleRef = useRef(1);
  const lastHeightRef = useRef<number | null>(null);

  useEffect(() => {
    const recalc = () => {
      const container = containerRef.current;
      const content = measureRef.current;
      if (!container || !content) return;

      const availableWidth = Math.max(1, container.clientWidth - horizontalPaddingPx);
      const naturalWidth = Math.max(1, content.scrollWidth);
      const naturalHeight = Math.max(1, content.scrollHeight);
      const rawScale = clamp(availableWidth / naturalWidth, minScale, 1);
      const nextScale = Math.round(rawScale * 1000) / 1000;
      const nextHeight = Math.ceil(naturalHeight * nextScale);

      if (Math.abs(lastScaleRef.current - nextScale) > 0.001) {
        lastScaleRef.current = nextScale;
        setScale(nextScale);
      }
      if (lastHeightRef.current !== nextHeight) {
        lastHeightRef.current = nextHeight;
        setScaledHeight(nextHeight);
      }
    };

    recalc();

    if (!observeResize) {
      return;
    }

    const observer = new ResizeObserver(() => recalc());
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [text, minScale, horizontalPaddingPx, observeResize]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full overflow-x-hidden ${forceVerticalScrollbar ? 'overflow-y-scroll' : 'overflow-y-auto'} ${className ?? ''}`}
    >
      <div className="p-4">
        <div className="relative" style={{ height: scaledHeight ?? undefined }}>
          <pre
            ref={measureRef}
            className={`m-0 w-max max-w-none whitespace-pre origin-top-left text-xs text-gray-700 ${textClassName ?? ''}`}
            style={{ transform: `scale(${scale})` }}
          >
            {text}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default memo(VirtualTextCanvas);
