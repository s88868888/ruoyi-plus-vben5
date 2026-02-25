import type { BasePageQuery, BasePageResult } from '#/api/model/baseModel';

import { requestClient } from '#/api/request';

/**
 * 招标项目
 */
export interface BizBidProject {
  id?: number;
  deptId?: number;
  projectName?: string;
  bidOrg?: string;
  projectType?: string;
  budgetAmount?: number;
  publishDate?: string;
  deadline?: string;
  matchDegree?: number;
  status?: string;
  projectRegion?: string;
  bidMethod?: string;
  contactPerson?: string;
  contactPhone?: string;
  projectSource?: string;
  sourceUrl?: string;
  projectDesc?: string;
  attachments?: string; // 附件 URL，多个用逗号分隔
  attachmentName?: string; // 附件名称，多个用逗号分隔
  remark?: string;
  aiPrompt?: string; // AI 分析提示词
  aiAnalysisResult?: string; // AI 分析结果
  aiAnalysisStatus?: string; // AI 分析状态
  scoringCriteria?: string; // 评分标准
  scoringCriteriaStatus?: string; // 评分标准提取状态
  createTime?: string;
  updateTime?: string;
}

/**
 * 招标项目查询参数
 */
export interface BizBidProjectQuery extends BasePageQuery {
  projectName?: string;
  bidOrg?: string;
  projectType?: string;
  status?: string;
  bidMethod?: string;
  publishDate?: string;
  deadline?: string;
}

/**
 * 查询招标项目分页列表
 */
export async function bidProjectList(params: BizBidProjectQuery) {
  return requestClient.get<BasePageResult<BizBidProject>>('/bid/project/list', {
    params,
  });
}

/**
 * 查询招标项目详情
 */
export async function bidProjectInfo(id: number | string) {
  return requestClient.get<BizBidProject>(`/bid/project/${id}`);
}

/**
 * 新增招标项目
 */
export async function bidProjectAdd(data: BizBidProject) {
  return requestClient.postWithMsg<BizBidProject>('/bid/project', data);
}

/**
 * 修改招标项目
 */
export async function bidProjectUpdate(data: BizBidProject) {
  return requestClient.putWithMsg('/bid/project', data);
}

/**
 * 删除招标项目
 */
export async function bidProjectRemove(ids: number[]) {
  return requestClient.deleteWithMsg(`/bid/project/${ids.join(',')}`);
}

/**
 * 第一步：保存基本信息（不显示自动提示）
 */
export async function bidProjectSaveStep1(data: BizBidProject) {
  return requestClient.post<BizBidProject>('/bid/project/step1', data);
}

/**
 * 第二步：AI 分析
 */
export interface BidProjectStep2Params {
  projectId: number;
  aiPrompt?: string;
  async?: boolean;
}

export async function bidProjectAnalyzeStep2(data: BidProjectStep2Params) {
  return requestClient.post<string>('/bid/project/step2', data);
}

/**
 * 提取评分标准
 */
export interface ExtractScoringCriteriaParams {
  projectId: number;
  async?: boolean;
}

export async function extractScoringCriteria(params: ExtractScoringCriteriaParams) {
  return requestClient.post<string>('/bid/project/extractScoringCriteria', null, {
    params,
  });
}
