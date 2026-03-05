import { requestClient } from '#/api/request';

/**
 * 章节信息
 */
export interface BizSubmissionChapter {
  id?: number;
  bidSubmissionId?: number;
  submissionDocumentId?: number;
  parentId?: number;
  chapterNo?: string;
  chapterTitle?: string;
  chapterLevel?: number;
  sortOrder?: number;
  chapterType?: string;
  templateSource?: string;
  templatePlaceholders?: string;
  generationStatus?: string;
  generationProgress?: number;
  chapterContent?: string;
  reasonDescription?: string;
  aiPrompt?: string;
  aiModel?: string;
  aiTokensUsed?: number;
  generationStartTime?: string;
  generationEndTime?: string;
  generationDuration?: number;
  errorMessage?: string;
  remark?: string;
  createTime?: string;
  children?: BizSubmissionChapter[];
}

/**
 * 获取章节树
 */
export async function getChapterTree(params: {
  submissionId?: string;
  documentId?: string;
}) {
  return requestClient.get<BizSubmissionChapter[]>('/bid/submission/chapter/tree', {
    params,
  });
}

/**
 * 获取章节详情
 */
export async function getChapterInfo(id: string) {
  return requestClient.get<BizSubmissionChapter>(`/bid/submission/chapter/${id}`);
}

/**
 * AI 生成章节结构（异步，通过SSE推送进度）
 */
export async function generateChapterStructure(params: {
  submissionId: string;
  documentConfigId: string;
}) {
  return requestClient.post<void>(
    '/bid/submission/chapter/generate-structure',
    null,
    { params }
  );
}

/**
 * 重新生成章节结构（异步，通过SSE推送进度）
 */
export async function regenerateChapterStructure(params: {
  submissionId: string;
  documentConfigId: string;
}) {
  return requestClient.post<void>(
    '/bid/submission/chapter/regenerate-structure',
    null,
    { params }
  );
}

/**
 * 生成章节内容
 */
export async function generateChapter(id: string) {
  return requestClient.postWithMsg(`/bid/submission/chapter/${id}/generate`);
}

/**
 * 重新生成章节内容
 */
export async function regenerateChapter(id: string) {
  return requestClient.postWithMsg(`/bid/submission/chapter/${id}/regenerate`);
}

/**
 * 填充模板章节
 */
export async function fillTemplate(id: string) {
  return requestClient.postWithMsg(`/bid/submission/chapter/${id}/fill`);
}

/**
 * 保存章节内容
 */
export async function saveChapterContent(id: string, content: string) {
  return requestClient.putWithMsg('/bid/submission/chapter', { content }, {
    params: { id },
  });
}

/**
 * 添加章节
 */
export async function addChapter(params: {
  submissionDocumentId: string;
  parentId: string;
  chapterTitle: string;
  chapterType: string;
  reasonDescription?: string;
}) {
  return requestClient.postWithMsg('/bid/submission/chapter', null, { params });
}

/**
 * 删除章节
 */
export async function deleteChapter(id: string) {
  return requestClient.deleteWithMsg(`/bid/submission/chapter/${id}`);
}

/**
 * 清空文档下所有章节
 */
export async function clearChapters(params: {
  submissionId: string;
  documentId: string;
}) {
  return requestClient.deleteWithMsg('/bid/submission/chapter/clear', { params });
}

/**
 * 批量更新章节排序
 */
export async function updateChapterSort(items: { id: number; parentId: number; sortOrder: number; chapterLevel: number; chapterNo: string }[]) {
  return requestClient.put('/bid/submission/chapter/sort', items);
}

/**
 * 修改章节类型（template/generate）
 */
export async function updateChapterType(id: string | number, chapterType: string) {
  return requestClient.putWithMsg(`/bid/submission/chapter/${id}/type`, null, {
    params: { chapterType },
  });
}

/**
 * AI 辅助写作（由 AiEditor 内部直接调用 SSE 接口，此方法供手动调用场景使用）
 */
export async function aiAssist(prompt: string) {
  return requestClient.post<string>('/bid/submission/chapter/ai/assist', { prompt });
}

/**
 * 一键生成所有章节内容
 */
export async function generateAllChapters(params: {
  submissionId: string;
  documentConfigId: string;
}) {
  return requestClient.post<void>('/bid/submission/chapter/generate-all', null, { params });
}

