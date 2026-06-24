import { requestClient } from '#/api/request';
import type {
  OcrStatusResult,
  ReviewToolResult,
  ToolCreateTaskParams,
} from './model';

/**
 * 创建并立即执行工具审核任务（附件对比 / 内容审查共用）。
 * 复用引擎 /review/task/createAndExecute：taskType 决定加载哪条提示词模板。
 * @returns 任务ID
 */
export function toolCreateAndExecute(data: ToolCreateTaskParams) {
  return requestClient.post<number>('/review/task/createAndExecute', data);
}

/**
 * 聚合工具审核结果（文件URL/searchable/OCR状态/问题明细/关注列表）。前端轮询此接口。
 */
export function getToolResult(taskId: number | string) {
  return requestClient.get<ReviewToolResult>(`/review/tool/result/${taskId}`);
}

/** 保存附件对比差异清单批注（COMPARE） */
export function saveCompareNote(data: { taskId: number | string; noteData: string }) {
  return requestClient.post<void>('/review/tool/compareNote', data);
}

/** 保存单条问题批注 */
export function saveIssueNote(data: { itemId: number | string; note: string }) {
  return requestClient.post<void>('/review/tool/issueNote', data);
}

/** 保存内容审查脱敏手动框选 */
export function saveRedactData(data: { taskId: number | string; redactData: string }) {
  return requestClient.post<void>('/review/tool/redactData', data);
}

/** 查询附件 OCR 状态（查看器轮询；状态为空的 PDF 会懒触发） */
export function getOcrStatus(ossId: number | string) {
  return requestClient.get<OcrStatusResult>('/review/tool/ocr/status', {
    params: { ossId },
  });
}

/** 手动触发附件 OCR（查看器自愈） */
export function triggerOcr(ossId: number | string) {
  return requestClient.post<void>('/review/tool/ocr/trigger', null, {
    params: { ossId },
  });
}

/** 查询某任务实际使用的规则库（查看器「查看规则」用） */
export function getToolRules(taskId: number | string) {
  return requestClient.get<any[]>(`/review/tool/rules/${taskId}`);
}

/** Word(doc/docx) 转 PDF（上传 Word 后调，换成 PDF 供查看器字符级 diff）。已是 PDF 原样返回 */
export function convertToPdf(ossId: number | string) {
  return requestClient.post<{
    converted: boolean;
    name: string;
    ossId: number | string | null;
    url: string;
  }>('/review/tool/convertToPdf', null, { params: { ossId }, timeout: 120_000 });
}
