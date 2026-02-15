/** Detection confidence level */
export type DetectionConfidence = 'high' | 'medium' | 'low';

/** Method used to detect LLM request */
export type DetectionMethod =
  | 'accept-header'
  | 'user-agent'
  | 'custom-header'
  | 'ip-range'
  | 'custom'
  | 'none';

/** Result of LLM request detection */
export interface DetectionResult {
  isLLM: boolean;
  confidence: DetectionConfidence;
  method: DetectionMethod;
  agent?: string;
}

/** Simplified request representation for detection */
export interface IncomingRequest {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
}

/** Known AI agent definition */
export interface AIAgent {
  name: string;
  pattern: RegExp;
  org: string;
}

/** Metadata extracted from a page */
export interface PageMetadata {
  title?: string;
  description?: string;
  url?: string;
  language?: string;
  siteName?: string;
}

/** Result of content extraction */
export interface ExtractionResult {
  content: string;
  metadata: PageMetadata;
}

/** Content-Usage header preferences (IETF AIPREF) */
export interface ContentUsagePreferences {
  aiInput?: 'y' | 'n';
  trainAi?: 'y' | 'n';
  search?: 'y' | 'n';
}

/** Headers to set on the response */
export interface ResponseHeaders {
  'Content-Type': string;
  'Vary': string;
  'X-Content-Source': string;
  'X-Original-Content-Type': string;
  'Content-Usage'?: string;
  'X-Markdown-Tokens'?: string;
}

/** Detection configuration */
export interface DetectConfig {
  acceptHeader?: boolean;
  userAgent?: boolean;
  customHeader?: string;
  ipRanges?: boolean;
  custom?: (req: IncomingRequest) => boolean;
}

/** Extraction configuration */
export interface ExtractConfig {
  annotations?: boolean;
  fallback?: 'readability' | 'body';
  maxLength?: number;
}

/** Headers configuration */
export interface HeadersConfig {
  contentUsage?: ContentUsagePreferences;
  tokenCount?: boolean;
}

/** Full middleware configuration */
export interface McpBridgeConfig {
  detect?: DetectConfig;
  extract?: ExtractConfig;
  headers?: HeadersConfig;
  exclude?: string[];
  include?: string[];
  transform?: (markdown: string, metadata: PageMetadata) => string;
}
