import { useEffect, useMemo, useRef, useState } from 'react';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist/build/pdf.min.mjs';
import type { PDFDocumentProxy, PDFPageProxy, PageViewport } from 'pdfjs-dist/build/pdf.min.mjs';

GlobalWorkerOptions.workerSrc =
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.530/build/pdf.worker.min.mjs';

export type PdfPageMetrics = {
  pageNumber: number;
  width: number;
  height: number;
};

type RenderPageOverlay = (pageNumber: number, metrics: PdfPageMetrics) => React.ReactNode;

type PdfEditViewerProps = {
  src: string;
  className?: string;
  locked?: boolean;
  virtualWidth?: number;
  scale?: number;
  pageGap?: number;
  scrollRef?: React.MutableRefObject<HTMLDivElement | null>;
  onMetrics?: (metrics: PdfPageMetrics[]) => void;
  renderPageOverlay?: RenderPageOverlay;
  onError?: (error: Error) => void;
};

type RenderedPage = {
  pageNumber: number;
  page: PDFPageProxy;
  viewport: PageViewport;
  width: number;
  height: number;
};

export const PdfEditViewer = ({
  src,
  className,
  locked = false,
  virtualWidth = 1000,
  scale = 1,
  pageGap = 24,
  scrollRef,
  onMetrics,
  renderPageOverlay,
  onError
}: PdfEditViewerProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const canvasRefs = useRef<HTMLCanvasElement[]>([]);
  const renderTasksRef = useRef<Array<{ cancel: () => void; promise?: Promise<unknown> }>>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(src);
        const data = await response.arrayBuffer();
        const pdfDoc = await getDocument({ data }).promise;
        if (cancelled) return;
        setDoc(pdfDoc);
        setLoadError(null);
      } catch (error) {
        console.error('[PdfEditViewer] Error cargando PDF', error);
        if (cancelled) return;
        const message = error instanceof Error ? error.message : 'No se pudo cargar el PDF.';
        setLoadError(message);
        onError?.(error as Error);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [src]);

  useEffect(() => {
    if (!doc) return;
    let cancelled = false;

    const renderPages = async () => {
      const effectiveWidth = virtualWidth * scale;
      const rendered: RenderedPage[] = [];
      for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
        const page = await doc.getPage(pageNumber);
        if (cancelled) return;
        const baseViewport = page.getViewport({ scale: 1 });
        const pageScale = effectiveWidth / baseViewport.width;
        const viewport = page.getViewport({ scale: pageScale });
        rendered.push({
          pageNumber,
          page,
          viewport,
          width: viewport.width,
          height: viewport.height
        });
      }

      if (cancelled) return;
      setPages(rendered);
      onMetrics?.(
        rendered.map((item) => ({
          pageNumber: item.pageNumber,
          width: virtualWidth,
          height: item.height
        }))
      );
    };

    renderPages();
    return () => {
      cancelled = true;
    };
  }, [doc, virtualWidth, scale, onMetrics]);

  useEffect(() => {
    if (pages.length === 0) return;
    renderTasksRef.current.forEach((task) => task?.cancel?.());
    renderTasksRef.current = [];

    let cancelled = false;
    const renderAll = async () => {
      for (let index = 0; index < pages.length; index += 1) {
        const page = pages[index];
        const canvas = canvasRefs.current[index];
        if (!canvas) continue;
        const context = canvas.getContext('2d');
        if (!context) continue;
        canvas.width = Math.floor(page.width);
        canvas.height = Math.floor(page.height);
        const task = page.page.render({ canvasContext: context, viewport: page.viewport });
        renderTasksRef.current[index] = task;
        try {
          await task.promise;
        } catch {
          if (!cancelled) {
            // ignore render cancellation/errors on rerender
          }
        }
      }
    };
    renderAll();
    return () => {
      cancelled = true;
      renderTasksRef.current.forEach((task) => task?.cancel?.());
      renderTasksRef.current = [];
    };
  }, [pages]);

  const pageNodes = useMemo(
    () =>
      pages.map((page, index) => (
        <div
          key={page.pageNumber}
          className="relative mx-auto"
          style={{ width: page.width, height: page.height, marginBottom: pageGap }}
        >
          <canvas
            ref={(node) => {
              if (node) canvasRefs.current[index] = node;
            }}
            className="block bg-white shadow-sm"
          />
          {renderPageOverlay && (
            <div className="absolute inset-0">{renderPageOverlay(page.pageNumber, { pageNumber: page.pageNumber, width: page.width, height: page.height })}</div>
          )}
        </div>
      )),
    [pages, renderPageOverlay, pageGap]
  );

  if (loadError) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-white text-sm text-gray-600 ${className || ''}`}>
        No se pudo cargar el PDF en modo edición.
      </div>
    );
  }

  if (!doc || pages.length === 0) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-white text-sm text-gray-500 ${className || ''}`}>
        Cargando documento...
      </div>
    );
  }

  const handleContainerRef = (node: HTMLDivElement | null) => {
    containerRef.current = node;
    if (scrollRef) {
      scrollRef.current = node;
    }
  };

  return (
    <div
      ref={handleContainerRef}
      className={`w-full h-full bg-white overflow-x-hidden ${locked ? 'overflow-hidden' : 'overflow-y-auto'} ${className || ''}`}
    >
      <div className="relative py-4 w-full flex justify-center">
        <div className="relative" style={{ width: virtualWidth * scale }}>
          {pages.map((page, index) => (
            <div
              key={page.pageNumber}
              className="relative mx-auto"
              style={{ width: page.width, height: page.height, marginBottom: pageGap }}
            >
              <canvas
                ref={(node) => {
                  if (node) canvasRefs.current[index] = node;
                }}
                className="block bg-white shadow-sm"
              />
              {renderPageOverlay && (
                <div className="absolute inset-0">
                  {renderPageOverlay(page.pageNumber, { pageNumber: page.pageNumber, width: page.width, height: page.height })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
