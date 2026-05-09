import type { BaseEntity } from '#/api/common';

export interface ReviewPromptTemplate extends BaseEntity {
  id: number | string;
  name: string;
  type: string;
  systemPrompt: string;
  userPrompt: string;
  outputFormat?: string;
  modelName?: string;
  temperature?: number;
  status?: string;
  remark?: string;
}
