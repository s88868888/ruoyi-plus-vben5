import { requestClient } from '#/api/request';
import type { ReviewPromptTemplate } from './model';

// 查询模板列表
export function reviewPromptList(type?: string) {
  return requestClient.get<ReviewPromptTemplate[]>('/review/prompt/list', { params: { type } });
}

// 获取模板详情
export function reviewPromptInfo(id: number | string) {
  return requestClient.get<ReviewPromptTemplate>(`/review/prompt/${id}`);
}

// 新增模板
export function reviewPromptAdd(data: Partial<ReviewPromptTemplate>) {
  return requestClient.postWithMsg<void>('/review/prompt', data);
}

// 修改模板
export function reviewPromptUpdate(data: Partial<ReviewPromptTemplate>) {
  return requestClient.putWithMsg<void>('/review/prompt', data);
}

// 删除模板
export function reviewPromptRemove(ids: (number | string)[]) {
  return requestClient.deleteWithMsg<void>(`/review/prompt/${ids.join(',')}`);
}
