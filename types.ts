export interface VectorImage {
  id: string;
  data: string; // Base64
  mimeType: string;
  prompt: string;
}

export interface ImageMetadata {
  titles: string[];
  keywords: string[];
}

export interface AgentState {
  status: 'idle' | 'generating' | 'review' | 'upscaling' | 'complete' | 'error';
  logs: string[];
  candidates: VectorImage[];
  selectedImage: VectorImage | null;
  upscaledBlob: Blob | null;
  metadata: ImageMetadata | null;
  error?: string;
}
