export interface EcoAsset {
  id: string;
  fileName: string;
  mediaType: 'video' | 'audio' | 'image';
  duration: number;
  originalFileName?: string;
  src?: string;
  width?: number;
  height?: number;
  fileSize?: number;
  size?: number;
  createdAt?: number;
  stableUrl?: string;
  uploadStatus?: 'local' | 'uploading' | 'stable' | 'error';
  metadata?: Record<string, unknown>;
}

export interface EcoSegment {
  id: string;
  assetId: string;
  startTime: number;
  endTime: number;
  projectStartTime: number;
  volume?: number;
  opacity?: number;
  speed?: number;
  effects?: Array<{ type: string; params: Record<string, unknown> }>;
}

export interface EcoProject {
  id: string;
  name: string;
  assets: Record<string, EcoAsset>;
  timeline: EcoSegment[];
  createdAt: number;
  updatedAt: number;
  version?: string;
  duration?: number;
}
