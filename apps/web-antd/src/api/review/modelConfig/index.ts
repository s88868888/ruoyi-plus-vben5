import { requestClient } from '#/api/request';
import type { ReviewModelConfig } from './model';

// 列表查询，支持按 provider / enabled / purpose 过滤
export function reviewModelConfigList(params?: { provider?: string; enabled?: string; purpose?: string }) {
  return requestClient.get<ReviewModelConfig[]>('/review/modelConfig/list', { params });
}

// 详情
export function reviewModelConfigInfo(id: number | string) {
  return requestClient.get<ReviewModelConfig>(`/review/modelConfig/${id}`);
}

// 新增
export function reviewModelConfigAdd(data: Partial<ReviewModelConfig>) {
  return requestClient.postWithMsg<void>('/review/modelConfig', data);
}

// 修改（后端会自动 evict 缓存，下次审核生效）
export function reviewModelConfigUpdate(data: Partial<ReviewModelConfig>) {
  return requestClient.putWithMsg<void>('/review/modelConfig', data);
}

// 删除
export function reviewModelConfigRemove(ids: (number | string)[]) {
  return requestClient.deleteWithMsg<void>(`/review/modelConfig/${ids.join(',')}`);
}

export interface ReviewModelConfigTestResult {
  ok: boolean;
  durationMs: number;
  testCase: string;
  message: string;
  endpoint: string;
}

// 测试连接（不落库）
export function reviewModelConfigTest(data: Partial<ReviewModelConfig>) {
  return requestClient.post<ReviewModelConfigTestResult>('/review/modelConfig/test', data);
}
