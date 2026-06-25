import { requestClient } from '#/api/request';
import type { PageQuery, PageResult } from '#/api/common';
import type { ReviewTask, ReviewResultItem, CreateTaskParams } from './model';

// 分页查询审核任务
export function reviewTaskList(params?: PageQuery) {
  return requestClient.get<PageResult<ReviewTask>>('/review/task/list', { params });
}

// 获取任务详情（含文件列表、标准名称、审核结果）
export function reviewTaskInfo(id: number | string) {
  return requestClient.get<ReviewTask>(`/review/task/${id}`);
}

// 创建审核任务
export function reviewTaskAdd(data: CreateTaskParams) {
  return requestClient.post<number>('/review/task', data);
}

// 删除审核任务
export function reviewTaskRemove(ids: (number | string)[]) {
  return requestClient.deleteWithMsg<void>(`/review/task/${ids.join(',')}`);
}

// 触发AI审核
export function reviewTaskExecute(id: number | string) {
  return requestClient.postWithMsg<void>(`/review/task/${id}/execute`);
}

// 标记误判
export function reviewTaskMarkMisjudgment(taskId: number | string, resultItemId: number | string, reason: string) {
  return requestClient.putWithMsg<void>(`/review/task/${taskId}/misjudgment/${resultItemId}`, { reason });
}

// 查询任务的审核结果明细列表
export function reviewResultItemList(taskId: number | string) {
  return requestClient.get<ReviewResultItem[]>(`/review/task/${taskId}/results`);
}

// 导出选中任务为「工程包」zip（附件原件 + 结果/关注/规则快照/脱敏框）
export function reviewTaskExport(taskIds: (number | string)[]) {
  return requestClient.post<Blob>('/review/task/export', taskIds, {
    isTransformResponse: false,
    responseType: 'blob',
    timeout: 300_000,
  });
}

// 导入工程包 zip，在当前库重新落库为全新任务，返回新建的 taskId 列表
export function reviewTaskImport(file: File) {
  const form = new FormData();
  form.append('file', file);
  return requestClient.post<(number | string)[]>('/review/task/import', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 300_000,
  });
}
