import type { BasePageQuery, BasePageResult } from '#/api/model/baseModel';

import { requestClient } from '#/api/request';

/**
 * 业绩案例
 */
export interface BizPerformance {
  id?: number;
  deptId?: number;
  name?: string;
  performanceCategory?: string;
  projectProvince?: string;
  projectCity?: string;
  ownerUnitNature?: string;
  ownerUnitName?: string;
  ownerUnitContact?: string;
  projectStatus?: string;
  signingDate?: string;
  bidDate?: string;
  startDate?: string;
  completionDate?: string;
  contractAmount?: number;
  bidAmount?: number;
  bidUnitPrice?: number;
  projectLocation?: string;
  constructionDept?: string;
  taskUnit?: string;
  projectScale?: string;
  implementationDept?: string;
  projectContent?: string;
  projectAnalysis?: string;
  otherFeatures?: string;
  processType?: string;
  projectManager?: string;
  technicalManager?: string;
  projectDirector?: string;
  bidNoticeAttachment?: string;
  contractAttachment?: string;
  contractImages?: string;
  acceptanceAttachment?: string;
  otherAttachment?: string;
  bidPublicityLink?: string;
  dataPermissionType?: string;
  remark?: string;
  createTime?: string;
  createByName?: string;
}

/**
 * 业绩案例查询参数
 */
export interface BizPerformanceQuery extends BasePageQuery {
  deptId?: number;
  name?: string;
  performanceCategory?: string;
  ownerUnitName?: string;
  projectManager?: string;
  projectLocation?: string;
  processType?: string;
  params?: {
    beginBidDate?: string;
    endBidDate?: string;
    beginSigningDate?: string;
    endSigningDate?: string;
    beginStartDate?: string;
    endStartDate?: string;
    beginCompletionDate?: string;
    endCompletionDate?: string;
    minContractAmount?: number;
    maxContractAmount?: number;
  };
}

/**
 * 查询业绩案例分页列表
 */
export async function performanceList(params: BizPerformanceQuery) {
  return requestClient.get<BasePageResult<BizPerformance>>('/resource/performance/list', {
    params,
  });
}

/**
 * 查询业绩案例详情
 */
export async function performanceInfo(id: number) {
  return requestClient.get<BizPerformance>(`/resource/performance/${id}`);
}

/**
 * 新增业绩案例
 */
export async function performanceAdd(data: BizPerformance) {
  return requestClient.post<BizPerformance>('/resource/performance', data);
}

/**
 * 修改业绩案例
 */
export async function performanceUpdate(data: BizPerformance) {
  return requestClient.put('/resource/performance', data);
}

/**
 * 删除业绩案例
 */
export async function performanceRemove(ids: number[]) {
  return requestClient.delete(`/resource/performance/${ids.join(',')}`);
}
