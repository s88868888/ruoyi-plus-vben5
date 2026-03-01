import { requestClient } from '#/api/request';

/**
 * 标书配置
 */
export interface BizDocumentConfig {
  id?: number;
  bidSubmissionId?: number;
  companyId?: number;
  companyName?: string;
  documentType?: string;
  documentNo?: number;
  status?: string;
  remark?: string;
  createTime?: string;
  updateTime?: string;
}

/**
 * 标书配置BO
 */
export interface BizDocumentConfigBo {
  id?: number;
  bidSubmissionId?: number;
  companyId: number;
  companyName: string;
  documentType: string;
  documentNo: number;
  remark?: string;
}

/**
 * 查询投标项目的配置列表
 */
export async function getDocumentConfigList(submissionId: number) {
  return requestClient.get<BizDocumentConfig[]>(`/bid/document/config/list/${submissionId}`);
}

/**
 * 批量保存配置
 */
export async function batchSaveConfigs(submissionId: number, configs: BizDocumentConfigBo[]) {
  return requestClient.postWithMsg(`/bid/document/config/batchSave/${submissionId}`, configs);
}

/**
 * 添加单个配置
 */
export async function addConfig(config: BizDocumentConfigBo) {
  return requestClient.post<number>('/bid/document/config/add', config);
}

/**
 * 删除配置
 */
export async function deleteConfig(configId: number) {
  return requestClient.deleteWithMsg(`/bid/document/config/${configId}`);
}
