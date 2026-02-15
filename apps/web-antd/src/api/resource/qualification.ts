import type { BasePageQuery, BasePageResult } from '#/api/model/baseModel';

import { requestClient } from '#/api/request';

/**
 * 企业资质
 */
export interface BizQualification {
  id?: number;
  deptId?: number;
  certNumber?: string;
  certName?: string;
  certCategory?: string;
  certStatus?: string;
  issuingAuthority?: string;
  validStartDate?: string;
  validEndDate?: string;
  certImages?: string;
  dataPermissionType?: string;
  remark?: string;
  createTime?: string;
  createByName?: string;
  updateTime?: string;
}

/**
 * 企业资质查询参数
 */
export interface BizQualificationQuery extends BasePageQuery {
  deptId?: number;
  certNumber?: string;
  certName?: string;
  certCategory?: string;
  certStatus?: string;
  params?: {
    beginValidStartDate?: string;
    endValidStartDate?: string;
    beginValidEndDate?: string;
    endValidEndDate?: string;
  };
}

/**
 * 查询企业资质分页列表
 */
export async function qualificationList(params: BizQualificationQuery) {
  return requestClient.get<BasePageResult<BizQualification>>('/resource/qualification/list', {
    params,
  });
}

/**
 * 查询企业资质详情
 */
export async function qualificationInfo(id: number) {
  return requestClient.get<BizQualification>(`/resource/qualification/${id}`);
}

/**
 * 新增企业资质
 */
export async function qualificationAdd(data: BizQualification) {
  return requestClient.post<BizQualification>('/resource/qualification', data);
}

/**
 * 修改企业资质
 */
export async function qualificationUpdate(data: BizQualification) {
  return requestClient.put('/resource/qualification', data);
}

/**
 * 删除企业资质
 */
export async function qualificationRemove(ids: number[]) {
  return requestClient.delete(`/resource/qualification/${ids.join(',')}`);
}
