export interface TimelineAsset {
  id: string;
  fileName: string;
  mediaType: string;
  duration: number;
  width: number | null;
  height: number | null;
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  assets: Record<string, TimelineAsset>;
  timeline: Array<Record<string, unknown>>;
}

export type Asset = TimelineAsset;
