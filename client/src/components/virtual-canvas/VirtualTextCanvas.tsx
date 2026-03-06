import { useEffect, useRef, useState } from 'react';

type VirtualTextCanvasProps = {
  text: string;
  className?: string;
  textClassName?: string;
  minScale?: number;
  horizontalPaddingPx?: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export default function VirtualTextCanvas({
  text,
  className,
  textClassName,
  minScale = 0.2,
  horizontalPaddingPx = 24,
}: VirtualTextCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLPreElement | null>(null);
  const [scale, setScale] = useState(1);
  const [scaledHeight, setScaledHeight] = useState<number | null>(null);

  useEffect(() => {
    const recalc = () => {
      const container = containerRef.current;
      const content = measureRef.current;
      if (!container || !content) return;

      const availableWidth = Math.max(1, container.clientWidth - horizontalPaddingPx);
      const naturalWidth = Math.max(1, content.scrollWidth);
      const naturalHeight = Math.max(1, content.scrollHeight);
      const nextScale = clamp(availableWidth / naturalWidth, minScale, 1);

      setScale(nextScale);
      setScaledHeight(Math.ceil(naturalHeight * nextScale));
    };

    recalc();

    const observer = new ResizeObserver(() => recalc());
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [text, minScale, horizontalPaddingPx]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full overflow-x-hidden overflow-y-auto ${className ?? ''}`}
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

