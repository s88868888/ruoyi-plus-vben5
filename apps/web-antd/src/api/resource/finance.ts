import type { BasePageQuery, BasePageResult } from '#/api/model/baseModel';

import { requestClient } from '#/api/request';

/**
 * 财务信息
 */
export interface BizFinanceInfo {
  id?: number;
  deptId?: number;
  financeName?: string;
  infoType?: string;
  financeDate?: string;
  dataPermissionType?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  remark?: string;
  createTime?: string;
  createByName?: string;
  updateTime?: string;
}

/**
 * 财务信息查询参数
 */
export interface BizFinanceInfoQuery extends BasePageQuery {
  deptId?: number;
  financeName?: string;
  infoType?: string;
  params?: {
    beginFinanceDate?: string;
    endFinanceDate?: string;
  };
}

/**
 * 查询财务信息分页列表
 */
export async function financeList(params: BizFinanceInfoQuery) {
  return requestClient.get<BasePageResult<BizFinanceInfo>>('/resource/finance/list', {
    params,
  });
}

/**
 * 查询财务信息详情
 */
export async function financeInfo(id: number) {
  return requestClient.get<BizFinanceInfo>(`/resource/finance/${id}`);
}

/**
 * 新增财务信息
 */
export async function financeAdd(data: BizFinanceInfo) {
  return requestClient.post<BizFinanceInfo>('/resource/finance', data);
}

/**
 * 修改财务信息
 */
export async function financeUpdate(data: BizFinanceInfo) {
  return requestClient.put('/resource/finance', data);
}

/**
 * 删除财务信息
 */
export async function financeRemove(ids: number[]) {
  return requestClient.delete(`/resource/finance/${ids.join(',')}`);
}
