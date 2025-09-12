/// <reference types="next" />
/// <reference types="next/types/global" />
/// <reference types="next/image-types/global" />
/// <reference types="jest" />
/// <reference types="@testing-library/jest-dom" />

// Extend the global namespace for fetch mock in tests
declare namespace NodeJS {
  interface Global {
    fetch: jest.Mock;
  }
  interface ProcessEnv {
    OPENAI_API_KEY: string;
    IMGFLIP_USER: string;
    IMGFLIP_PASS: string;
    CLOUDINARY_CLOUD_NAME: string;
    CLOUDINARY_API_KEY: string;
    CLOUDINARY_API_SECRET: string;
    NEXT_PUBLIC_APP_URL: string;
  }
}

// Template interface for meme templates
export interface Template {
  id: string;
  name: string;
  url: string;
  width: number;
  height: number;
  box_count: number;
}

// Response from Imgflip API
export interface ImgflipResponse {
  success: boolean;
  data: {
    url?: string;
    page_url?: string;
    memes?: Template[];
  };
  error_message?: string;
}

// Cloudinary upload result
export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  version: number;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  type: string;
  created_at: string;
  bytes: number;
  url: string;
}

export interface ResponseData {
  url: string;
  optimizedUrl?: string;
}

export interface ErrorResponse {
  error: string;
}