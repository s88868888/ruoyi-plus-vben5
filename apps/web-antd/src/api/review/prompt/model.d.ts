import type { BaseEntity } from '#/api/common';

export interface ReviewPromptTemplate extends BaseEntity {
  id: number | string;
  name: string;
  type: string;
  systemPrompt: string;
  userPrompt: string;
  outputFormat?: string;
  modelName?: string;
  /** 关联 review_model_config.id（purpose=chat） */
  modelConfigId?: number | string;
  /** 关联 review_model_config.id（purpose=ocr）；为空走全局兜底 */
  ocrConfigId?: number | string;
  temperature?: number;
  status?: string;
  remark?: string;
}
