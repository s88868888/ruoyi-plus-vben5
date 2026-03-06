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
  status?: string;
  generationProgress?: number;
  selectedCompanies?: string;
  generationConfig?: string;
  totalDocuments?: number;
  completedDocuments?: number;
  failedDocuments?: number;
  taskId?: string;
  publishDate?: string;
  deadline?: string;
  startTime?: string;
  endTime?: string;
  errorMessage?: string;
  remark?: string;
  createTime?: string;
  updateTime?: string;
  /** 竞争对手分析结果（Markdown） */
  competitorAnalysisResult?: string;
  /** 分析状态：none-未分析，analyzing-分析中，completed-已完成，failed-失败 */
  competitorAnalysisStatus?: string;
  /** 竞争力评分（0-100） */
  competitorScore?: number;
}

/**
 * 投标项目 VO（别名，detail.vue 中使用）
 */
export type BizBidSubmissionVO = BizBidSubmission;

/**
 * 投标项目查询参数
 */
export interface BizBidSubmissionQuery extends BasePageQuery {
  bidProjectId?: number | string;
  projectName?: string;
  status?: string;
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
  /** 是否分析竞争对手 */
  analyzeCompetitors?: boolean;
  /** 竞争对手分析自定义提示词 */
  competitorAnalysisPrompt?: string;
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
    analyzeCompetitors: data.analyzeCompetitors,
    competitorAnalysisPrompt: data.competitorAnalysisPrompt,
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
export async function cancelSubmissionGeneration(id: string | number) {
  return requestClient.postWithMsg(`/bid/submission/${id}/cancel`);
}

/**
 * 重新生成
 */
export async function regenerateSubmission(id: number) {
  return requestClient.postWithMsg(`/bid/submission/${id}/regenerate`);
}

/**
 * 重新生成（别名）
 */
export const submissionRegenerate = regenerateSubmission;

/**
 * 取消生成（别名）
 */
export const submissionCancel = cancelSubmissionGeneration;

/**
 * 投标项目进度 VO
 */
export interface BidSubmissionProgressVO {
  submissionId?: number;
  status?: string;
  overallProgress?: number;
  totalDocuments?: number;
  completedDocuments?: number;
  failedDocuments?: number;
  documents?: any[];
  logs?: any[];
}

/**
 * 获取生成进度
 */
export async function getSubmissionProgress(id: number) {
  return requestClient.get<BidSubmissionProgressVO>(`/bid/submission/${id}/progress`);
}

/**
 * 招标文件附件信息
 */
export interface BidProjectAttachment {
  id?: number;
  bidProjectId?: number;
  attachmentName?: string;
  attachmentType?: string;
  filePath?: string;
  fileSize?: number;
  fileFormat?: string;
  parseStatus?: string;
  remark?: string;
  createTime?: string;
}

/**
 * 获取投标项目关联的招标文件附件列表
 */
export async function getSubmissionAttachments(submissionId: string | number) {
  return requestClient.get<BidProjectAttachment[]>(`/bid/submission/${submissionId}/attachments`);
}

/**
 * 手动触发竞争对手分析
 */
export async function analyzeCompetitors(id: number | string, prompt?: string) {
  return requestClient.post(`/bid/submission/${id}/analyzeCompetitors`, { prompt });
}
