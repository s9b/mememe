export interface Template {
  id: string;
  name: string;
  keywords: string[];
  placeholderTextPositions: string[];
  exampleCaptionHints: string[];
  allowedForAds: boolean;
  imgUrl: string;
  url?: string;
  width?: number;
  height?: number;
  box_count?: number;
}