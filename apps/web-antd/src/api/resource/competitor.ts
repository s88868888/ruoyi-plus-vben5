import type { BasePageQuery, BasePageResult } from '#/api/model/baseModel';

import { requestClient } from '#/api/request';

/**
 * 竞争公司
 */
export interface BizCompetitor {
  id?: number;
  deptId?: number;
  companyName?: string;
  companyType?: string;
  businessScope?: string;
  registeredCapital?: string;
  foundedYear?: string;
  province?: string;
  city?: string;
  website?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  strengths?: string;
  weaknesses?: string;
  mainProducts?: string;
  competitorLevel?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  dataPermissionType?: string;
  remark?: string;
  createTime?: string;
  createByName?: string;
}

/**
 * 竞争公司查询参数
 */
export interface BizCompetitorQuery extends BasePageQuery {
  deptId?: number;
  companyName?: string;
  companyType?: string;
  competitorLevel?: string;
  province?: string;
}

/**
 * 查询竞争公司分页列表
 */
export async function competitorList(params: BizCompetitorQuery) {
  return requestClient.get<BasePageResult<BizCompetitor>>('/resource/competitor/list', {
    params,
  });
}

/**
 * 查询竞争公司详情
 */
export async function competitorInfo(id: number) {
  return requestClient.get<BizCompetitor>(`/resource/competitor/${id}`);
}

/**
 * 新增竞争公司
 */
export async function competitorAdd(data: BizCompetitor) {
  return requestClient.post<BizCompetitor>('/resource/competitor', data);
}

/**
 * 修改竞争公司
 */
export async function competitorUpdate(data: BizCompetitor) {
  return requestClient.put('/resource/competitor', data);
}

/**
 * 删除竞争公司
 */
export async function competitorRemove(ids: number[]) {
  return requestClient.delete(`/resource/competitor/${ids.join(',')}`);
}
