import { requestClient } from '#/api/request';

export interface BizSubmissionDocument {
  id: string;
  bidSubmissionId: string;
  documentConfigId: string;
  companyId?: string;
  companyName?: string;
  documentName?: string;
  documentType?: string;
  documentNo?: number;
  version?: number;
  isLatest?: string;
  generationStatus?: string;
  generationProgress?: number;
  filePath?: string;
  fileSize?: number;
  documentContent?: string;
  createTime?: string;
  updateTime?: string;
}

/**
 * 获取投标项目最新版本文档列表
 */
export function getLatestDocumentList(submissionId: string) {
  return requestClient.get<BizSubmissionDocument[]>(`/bid/document/latest/${submissionId}`);
}

/**
 * 获取某配置下所有历史版本
 */
export function getDocumentVersions(documentConfigId: string) {
  return requestClient.get<BizSubmissionDocument[]>(`/bid/document/versions/${documentConfigId}`);
}

/**
 * 保存当前章节为新版本
 */
export function saveDocumentVersion(documentConfigId: string, submissionId: string) {
  return requestClient.postWithMsg<BizSubmissionDocument>(
    `/bid/document/saveVersion/${documentConfigId}`,
    {},
    { params: { submissionId } },
  );
}

/**
 * 导出文档（docx/pdf）
 */
export function exportDocument(documentId: string, format: 'docx' | 'pdf') {
  return requestClient.get<Blob>(`/bid/document/export/${documentId}`, {
    params: { format },
    responseType: 'blob',
    isTransformResponse: false,
    timeout: 60_000,
  });
}
