declare module 'pdfjs-dist/build/pdf' {
  export type PageViewport = {
    width: number;
    height: number;
    scale: number;
  };

  export type RenderTask = {
    promise: Promise<void>;
    cancel: () => void;
  };

  export type PDFPageProxy = {
    getViewport: (params: { scale: number }) => PageViewport;
    render: (params: { canvasContext: CanvasRenderingContext2D; viewport: PageViewport }) => RenderTask;
  };

  export type PDFDocumentProxy = {
    numPages: number;
    getPage: (pageNumber: number) => Promise<PDFPageProxy>;
  };

  export type PDFDocumentLoadingTask = {
    promise: Promise<PDFDocumentProxy>;
  };

  export const GlobalWorkerOptions: { workerSrc: string };
  export function getDocument(src: { data: ArrayBuffer } | string | Uint8Array | Blob): PDFDocumentLoadingTask;
}
