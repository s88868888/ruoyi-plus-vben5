import type { BasePageQuery, BasePageResult } from '#/api/model/baseModel';

import { requestClient } from '#/api/request';

/**
 * 项目知识
 */
export interface BizProjectKnowledge {
  id?: number;
  deptId?: number;
  knowledgeName?: string;
  description?: string;
  projectType?: string;
  dataPermissionType?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  remark?: string;
  createTime?: string;
  createByName?: string;
  updateTime?: string;
}

/**
 * 项目知识查询参数
 */
export interface BizProjectKnowledgeQuery extends BasePageQuery {
  deptId?: number;
  knowledgeName?: string;
  projectType?: string;
  description?: string;
}

/**
 * 查询项目知识分页列表
 */
export async function knowledgeList(params: BizProjectKnowledgeQuery) {
  return requestClient.get<BasePageResult<BizProjectKnowledge>>('/resource/knowledge/list', {
    params,
  });
}

/**
 * 查询项目知识详情
 */
export async function knowledgeInfo(id: number) {
  return requestClient.get<BizProjectKnowledge>(`/resource/knowledge/${id}`);
}

/**
 * 新增项目知识
 */
export async function knowledgeAdd(data: BizProjectKnowledge) {
  return requestClient.post<BizProjectKnowledge>('/resource/knowledge', data);
}

/**
 * 修改项目知识
 */
export async function knowledgeUpdate(data: BizProjectKnowledge) {
  return requestClient.put('/resource/knowledge', data);
}

/**
 * 删除项目知识
 */
export async function knowledgeRemove(ids: number[]) {
  return requestClient.delete(`/resource/knowledge/${ids.join(',')}`);
}
