import type { BasePageQuery, BasePageResult } from '#/api/model/baseModel';

import { requestClient } from '#/api/request';

/**
 * 投标项目
 */
export interface BizBidSubmission {
  id?: number;
  bidProjectId?: number;
  projectName?: string;
  bidOrg?: string;
  projectType?: string;
  budgetAmount?: number;
  projectRegion?: string;
  bidMethod?: string;
  projectDesc?: string;
  submissionStatus?: string;
  generationProgress?: number;
  selectedCompanies?: string;
  generationConfig?: string;
  chapterStructureGenerated?: string;
  totalDocuments?: number;
  completedDocuments?: number;
  failedDocuments?: number;
  taskId?: string;
  startTime?: string;
  endTime?: string;
  errorMessage?: string;
  remark?: string;
  createTime?: string;
  updateTime?: string;
}

/**
 * 投标项目查询参数
 */
export interface BizBidSubmissionQuery extends BasePageQuery {
  bidProjectId?: number;
  projectName?: string;
  submissionStatus?: string;
}

/**
 * 生成配置项
 */
export interface GenerationConfig {
  companyId: number;
  companyName?: string;
  commercial?: number;
  technical?: number;
  complete?: number;
}

/**
 * 创建投标项目参数
 */
export interface CreateSubmissionParams {
  bidProjectId: number | string;
  selectedCompanies: number[];
  generationConfig: GenerationConfig[];
  remark?: string;
}

/**
 * 查询投标项目分页列表
 */
export async function submissionList(params: BizBidSubmissionQuery) {
  return requestClient.get<BasePageResult<BizBidSubmission>>('/bid/submission/list', {
    params,
  });
}

/**
 * 导出投标项目
 */
export async function submissionExport(params: any) {
  return requestClient.download('/bid/submission/export', { method: 'POST', data: params }, '投标项目导出');
}

/**
 * 查询投标项目详情
 */
export async function submissionInfo(id: number | string) {
  return requestClient.get<BizBidSubmission>(`/bid/submission/${id}`);
}

/**
 * 从招标项目创建投标项目
 */
export async function createSubmissionFromProject(data: CreateSubmissionParams) {
  return requestClient.post<number>(`/bid/submission/createFrom/${data.bidProjectId}`, {
    bidProjectId: data.bidProjectId,
    selectedCompanies: JSON.stringify(data.selectedCompanies),
    generationConfig: JSON.stringify(data.generationConfig),
    remark: data.remark,
  });
}

/**
 * 删除投标项目
 */
export async function submissionRemove(ids: number[]) {
  return requestClient.deleteWithMsg(`/bid/submission/${ids.join(',')}`);
}

/**
 * 开始生成标书
 */
export async function submissionGenerate(id: number) {
  return requestClient.postWithMsg(`/bid/submission/${id}/generate`);
}

/**
 * 开始生成标书（别名）
 */
export const startSubmissionGeneration = submissionGenerate;

/**
 * 取消生成
 */
export async function cancelSubmissionGeneration(id: number) {
  return requestClient.postWithMsg(`/bid/submission/${id}/cancel`);
}

/**
 * 重新生成
 */
export async function regenerateSubmission(id: number) {
  return requestClient.postWithMsg(`/bid/submission/${id}/regenerate`);
}

/**
 * 获取生成进度
 */
export async function getSubmissionProgress(id: number) {
  return requestClient.get(`/bid/submission/${id}/progress`);
}
