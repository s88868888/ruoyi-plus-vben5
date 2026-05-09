import type { BaseEntity } from '#/api/common';

export interface ReviewStandard extends BaseEntity {
  id: number | string;
  name: string;
  type: string;
  version?: string;
  description?: string;
  ruleCount?: number;
  useCount?: number;
  isSystem?: string;
  status?: string;
  remark?: string;
}

export interface ReviewStandardRule extends BaseEntity {
  id: number | string;
  standardId: number;
  content: string;
  category?: string;
  severity?: string;
  checkField?: string;
  checkMethod?: string;
  weight?: number;
  confidence?: number;
  hitCount?: number;
  missCount?: number;
  sortOrder?: number;
  status?: string;
}
