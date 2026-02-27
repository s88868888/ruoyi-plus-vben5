import type { BasePageQuery, BasePageResult } from '#/api/model/baseModel';

import { requestClient } from '#/api/request';

/**
 * AI提示词模板
 */
export interface BizAiPromptTemplate {
  id?: number;
  deptId?: number;
  templateName?: string;
  templateType?: string;
  promptContent?: string;
  isSystem?: string;
  sortOrder?: number;
  status?: string;
  remark?: string;
  createTime?: string;
  createBy?: number;
  updateTime?: string;
}

/**
 * AI提示词模板查询参数
 */
export interface BizAiPromptTemplateQuery extends BasePageQuery {
  templateName?: string;
  templateType?: string;
  status?: string;
  isSystem?: string;
}

/**
 * 查询AI提示词模板分页列表
 */
export async function promptTemplateList(params: BizAiPromptTemplateQuery) {
  return requestClient.get<BasePageResult<BizAiPromptTemplate>>('/bid/promptTemplate/list', {
    params,
  });
}

/**
 * 查询AI提示词模板详情
 */
export async function promptTemplateInfo(id: number | string) {
  return requestClient.get<BizAiPromptTemplate>(`/bid/promptTemplate/${id}`);
}

/**
 * 根据类型查询启用的模板列表
 */
export async function promptTemplateListByType(templateType?: string) {
  return requestClient.get<BizAiPromptTemplate[]>('/bid/promptTemplate/listByType', {
    params: { templateType },
  });
}

/**
 * 新增AI提示词模板
 */
export async function promptTemplateAdd(data: BizAiPromptTemplate) {
  return requestClient.postWithMsg<BizAiPromptTemplate>('/bid/promptTemplate', data);
}

/**
 * 修改AI提示词模板
 */
export async function promptTemplateUpdate(data: BizAiPromptTemplate) {
  return requestClient.putWithMsg('/bid/promptTemplate', data);
}

/**
 * 删除AI提示词模板
 */
export async function promptTemplateRemove(ids: number[]) {
  return requestClient.deleteWithMsg(`/bid/promptTemplate/${ids.join(',')}`);
}
