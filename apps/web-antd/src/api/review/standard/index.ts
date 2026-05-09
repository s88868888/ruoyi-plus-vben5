import { requestClient } from '#/api/request';
import type { PageQuery, PageResult } from '#/api/common';
import type { ReviewStandard, ReviewStandardRule } from './model';
import type { ReviewKnowledge } from '../knowledge/model';

// 分页查询审核标准
export function reviewStandardList(params?: PageQuery) {
  return requestClient.get<PageResult<ReviewStandard>>('/review/standard/list', { params });
}

// 获取标准详情
export function reviewStandardInfo(id: number | string) {
  return requestClient.get<ReviewStandard>(`/review/standard/${id}`);
}

// 新增标准
export function reviewStandardAdd(data: Partial<ReviewStandard>) {
  return requestClient.postWithMsg<void>('/review/standard', data);
}

// 修改标准
export function reviewStandardUpdate(data: Partial<ReviewStandard>) {
  return requestClient.putWithMsg<void>('/review/standard', data);
}

// 删除标准
export function reviewStandardRemove(ids: (number | string)[]) {
  return requestClient.deleteWithMsg<void>(`/review/standard/${ids.join(',')}`);
}

// 查询标准下的规则列表
export function reviewStandardRuleList(standardId: number | string) {
  return requestClient.get<ReviewStandardRule[]>(`/review/standard/${standardId}/rules`);
}

// 新增规则
export function reviewStandardRuleAdd(data: Partial<ReviewStandardRule>) {
  return requestClient.postWithMsg<void>('/review/standard/rule', data);
}

// 修改规则
export function reviewStandardRuleUpdate(data: Partial<ReviewStandardRule>) {
  return requestClient.putWithMsg<void>('/review/standard/rule', data);
}

// 删除规则
export function reviewStandardRuleRemove(ids: (number | string)[]) {
  return requestClient.deleteWithMsg<void>(`/review/standard/rule/${ids.join(',')}`);
}

// 查询标准关联的知识库列表
export function reviewStandardKnowledges(standardId: number | string) {
  return requestClient.get<ReviewKnowledge[]>(`/review/standard/${standardId}/knowledges`);
}

// 关联知识库
export function reviewStandardLinkKnowledge(standardId: number | string, knowledgeId: number | string) {
  return requestClient.postWithMsg<void>(`/review/standard/${standardId}/knowledge/${knowledgeId}`, {});
}

// 解除关联知识库
export function reviewStandardUnlinkKnowledge(standardId: number | string, knowledgeId: number | string) {
  return requestClient.deleteWithMsg<void>(`/review/standard/${standardId}/knowledge/${knowledgeId}`);
}
