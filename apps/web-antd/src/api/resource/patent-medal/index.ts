import type { ID, IDS, PageQuery, PageResult } from '#/api/common';

import { requestClient } from '#/api/request';

enum Api {
  root = '/resource/patentMedal',
  list = '/resource/patentMedal/list',
}

/**
 * 专利奖章查询参数
 */
export interface PatentMedalQuery extends PageQuery {
  deptId?: number;
  patentName?: string;
  patentType?: string;
}

/**
 * 专利奖章
 */
export interface BizPatentMedal {
  id?: number;
  deptId?: number;
  patentName?: string;
  patentType?: string;
  patentNumber?: string;
  authorizationDate?: string;
  patentee?: string;
  inventor?: string;
  field?: string;
  patentAbstract?: string;
  patentImage?: string;
  certificateImage?: string;
  remark?: string;
  status?: string;
  createBy?: number;
  createTime?: string;
  createByName?: string;
  updateTime?: string;
}

/**
 * 查询专利奖章分页列表
 */
export function patentMedalList(params?: PatentMedalQuery) {
  return requestClient.get<PageResult<BizPatentMedal>>(Api.list, { params });
}

/**
 * 查询专利奖章详情
 */
export function patentMedalInfo(id: ID) {
  return requestClient.get<BizPatentMedal>(`${Api.root}/${id}`);
}

/**
 * 新增专利奖章
 */
export function patentMedalAdd(data: Partial<BizPatentMedal>) {
  return requestClient.postWithMsg<BizPatentMedal>(Api.root, data);
}

/**
 * 修改专利奖章
 */
export function patentMedalUpdate(data: Partial<BizPatentMedal>) {
  return requestClient.putWithMsg<void>(Api.root, data);
}

/**
 * 删除专利奖章
 */
export function patentMedalRemove(ids: IDS) {
  return requestClient.deleteWithMsg<void>(`${Api.root}/${ids}`);
}
