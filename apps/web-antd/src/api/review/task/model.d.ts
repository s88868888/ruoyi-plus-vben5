import type { BaseEntity } from '#/api/common';

export interface ReviewTask extends BaseEntity {
  id: number | string;
  taskName: string;
  taskType: string;
  sourceId?: number;
  sourceType?: string;
  status: string;
  passStatus?: string;
  score?: number;
  version?: number;
  parentTaskId?: number;
  aiModel?: string;
  reviewDuration?: number;
  formSnapshot?: string;
  aiSummary?: string;
  totalRules?: number;
  passCount?: number;
  errorCount?: number;
  warningCount?: number;
  infoCount?: number;
  misjudgedCount?: number;
  reviewerId?: number;
  reviewComment?: string;
  remark?: string;
  standardNames?: string;
  files?: ReviewTaskFile[];
}

export interface ReviewTaskFile extends BaseEntity {
  id: number | string;
  taskId: number;
  fileName: string;
  fileType?: string;
  filePath?: string;
  fileSize?: number;
  parseStatus?: string;
  extractedText?: string;
  sortOrder?: number;
}

export interface ReviewResultItem extends BaseEntity {
  id: number | string;
  taskId: number;
  fieldName?: string;
  fieldLabel?: string;
  formValue?: string;
  extractedValue?: string;
  matchStatus?: string;
  confidence?: number;
  severity?: string;
  ruleId?: number;
  location?: string;
  description?: string;
  suggestion?: string;
  aiRemark?: string;
  misjudged?: string;
  misjudgmentReason?: string;
  paragraphId?: number;
  sortOrder?: number;
}

export interface CreateTaskParams {
  taskName: string;
  taskType: string;
  sourceId?: number;
  sourceType?: string;
  standardIds: number[];
  formSnapshot?: string;
  remark?: string;
}
