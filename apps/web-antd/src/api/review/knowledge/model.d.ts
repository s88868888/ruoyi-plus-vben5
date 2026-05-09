import type { BaseEntity } from '#/api/common';

export interface ReviewKnowledge extends BaseEntity {
  id: number | string;
  name: string;
  type: string;
  description?: string;
  docCount?: number;
  caseCount?: number;
  patternCount?: number;
  accuracy?: number;
  status?: string;
  vectorCollection?: string;
  remark?: string;
}

export interface ReviewKnowledgeCase extends BaseEntity {
  id: number | string;
  knowledgeId: number;
  title: string;
  caseType?: string;
  scenario?: string;
  formData?: string;
  reviewConclusion?: string;
  keyPoint?: string;
}

export interface ReviewKnowledgePattern extends BaseEntity {
  id: number | string;
  knowledgeId: number;
  patternName: string;
  description?: string;
  frequency?: number;
  accuracy?: number;
  solution?: string;
}

export interface ReviewKnowledgeMisjudgment extends BaseEntity {
  id: number | string;
  knowledgeId: number;
  taskId?: number;
  ruleId?: number;
  fieldName?: string;
  aiJudgment?: string;
  correctJudgment?: string;
  reason?: string;
  isLearned?: string;
}
