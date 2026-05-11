import { requestClient } from '#/api/request';
import type { PageQuery, PageResult } from '#/api/common';
import type { ReviewKnowledge, ReviewKnowledgeCase, ReviewKnowledgePattern, ReviewKnowledgeMisjudgment } from './model';
import type { ReviewStandard } from '../standard/model';

// 分页查询知识库
export function reviewKnowledgeList(params?: PageQuery) {
  return requestClient.get<PageResult<ReviewKnowledge>>('/review/knowledge/list', { params });
}

// 获取知识库详情
export function reviewKnowledgeInfo(id: number | string) {
  return requestClient.get<ReviewKnowledge>(`/review/knowledge/${id}`);
}

// 新增知识库
export function reviewKnowledgeAdd(data: Partial<ReviewKnowledge>) {
  return requestClient.postWithMsg<void>('/review/knowledge', data);
}

// 修改知识库
export function reviewKnowledgeUpdate(data: Partial<ReviewKnowledge>) {
  return requestClient.putWithMsg<void>('/review/knowledge', data);
}

// 删除知识库
export function reviewKnowledgeRemove(ids: (number | string)[]) {
  return requestClient.deleteWithMsg<void>(`/review/knowledge/${ids.join(',')}`);
}

// 查询知识库关联的标准列表
export function reviewKnowledgeStandards(knowledgeId: number | string) {
  return requestClient.get<ReviewStandard[]>(`/review/knowledge/${knowledgeId}/standards`);
}

// 查询知识库下的案例列表
export function reviewKnowledgeCases(knowledgeId: number | string) {
  return requestClient.get<ReviewKnowledgeCase[]>(`/review/knowledge/${knowledgeId}/cases`);
}

// 查询知识库下的问题模式列表
export function reviewKnowledgePatterns(knowledgeId: number | string) {
  return requestClient.get<ReviewKnowledgePattern[]>(`/review/knowledge/${knowledgeId}/patterns`);
}

// 查询知识库下的误判记录列表
export function reviewKnowledgeMisjudgments(knowledgeId: number | string) {
  return requestClient.get<ReviewKnowledgeMisjudgment[]>(`/review/knowledge/${knowledgeId}/misjudgments`);
}

// 同步知识库到向量库
export function reviewKnowledgeSyncVector(knowledgeId: number | string) {
  return requestClient.postWithMsg<void>(`/review/knowledge/${knowledgeId}/sync-vector`);
}
