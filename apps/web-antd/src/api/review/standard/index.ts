import { requestClient } from '#/api/request';
import type { PageQuery, PageResult } from '#/api/common';
import type { ReviewStandard, ReviewStandardRule, ReviewStandardFocus } from './model';
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
  return requestClient.postWithMsg<number>('/review/standard', data);
}

// 修改标准
export function reviewStandardUpdate(data: Partial<ReviewStandard>) {
  return requestClient.putWithMsg<void>('/review/standard', data);
}

// 删除标准
export function reviewStandardRemove(ids: (number | string)[]) {
  return requestClient.deleteWithMsg<void>(`/review/standard/${ids.join(',')}`);
}

// 分页查询标准下的规则列表
export function reviewStandardRuleList(standardId: number | string, params?: PageQuery) {
  return requestClient.get<PageResult<ReviewStandardRule>>(`/review/standard/${standardId}/rules`, { params });
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

// ==================== 关注列表 ====================

// 查询标准下的关注要点列表
export function reviewStandardFocusList(standardId: number | string) {
  return requestClient.get<ReviewStandardFocus[]>(`/review/standard/${standardId}/focus`);
}

// 新增关注要点
export function reviewStandardFocusAdd(data: Partial<ReviewStandardFocus>) {
  return requestClient.postWithMsg<void>('/review/standard/focus', data);
}

// 修改关注要点
export function reviewStandardFocusUpdate(data: Partial<ReviewStandardFocus>) {
  return requestClient.putWithMsg<void>('/review/standard/focus', data);
}

// 删除关注要点
export function reviewStandardFocusRemove(ids: (number | string)[]) {
  return requestClient.deleteWithMsg<void>(`/review/standard/focus/${ids.join(',')}`);
}

// 关联知识库
export function reviewStandardLinkKnowledge(standardId: number | string, knowledgeId: number | string) {
  return requestClient.postWithMsg<void>(`/review/standard/${standardId}/knowledge/${knowledgeId}`, {});
}

// 解除关联知识库
export function reviewStandardUnlinkKnowledge(standardId: number | string, knowledgeId: number | string) {
  return requestClient.deleteWithMsg<void>(`/review/standard/${standardId}/knowledge/${knowledgeId}`);
}

// ==================== 规则导出 ====================

// 导出标准下的规则列表（xlsx）
export function exportStandardRules(standardId: number | string) {
  return requestClient.post<Blob>(
    `/review/standard/${standardId}/rules/export`,
    {},
    {
      isTransformResponse: false,
      responseType: 'blob',
    },
  );
}

// ==================== 规则导入 / AI 抽取 ====================

export interface ParsedRule {
  content: string;
  severity: string;
  category?: string;
  checkField?: string;
  checkMethod?: string;
  weight?: number;
  remark?: string;
}

// 下载规则导入模板（xlsx）
export function downloadRuleTemplate() {
  return requestClient.post<Blob>(
    '/review/standard/rule/template',
    {},
    {
      isTransformResponse: false,
      responseType: 'blob',
    },
  );
}

// 调 AI 从已上传 OSS 文件中抽取规则（不落库）
export function parseRuleDocument(ossId: number | string) {
  return requestClient.post<ParsedRule[]>('/review/standard/rule/parse-document', null, {
    params: { ossId },
    timeout: 120_000,
  });
}

// 上传 Excel 模板解析规则（不落库）
export function importRuleTemplatePreview(file: File) {
  const form = new FormData();
  form.append('file', file);
  return requestClient.post<ParsedRule[]>('/review/standard/rule/import-preview', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

// 批量保存规则到指定标准
export function batchAddStandardRules(standardId: number | string, rules: Partial<ReviewStandardRule>[]) {
  return requestClient.postWithMsg<number>(`/review/standard/${standardId}/rules/batch`, rules);
}

