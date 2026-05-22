import type { BaseEntity } from '#/api/common';

export interface ReviewModelConfig extends BaseEntity {
  id: number | string;
  name: string;
  code: string;
  /** 用途：chat=对话/审核，ocr=文字识别 */
  purpose?: 'chat' | 'ocr' | string;
  provider: 'ollama' | 'dashscope' | 'paddleocr' | 'qwen-vl-ocr' | string;
  modelName: string;
  baseUrl?: string;
  apiKey?: string;
  numCtx?: number;
  numPredict?: number;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  timeoutMs?: number;
  kvCacheType?: string;
  extraOptions?: string;
  enabled?: string;
  remark?: string;
}
