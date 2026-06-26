/**
 * AI 审核工具（附件对比 / 内容审查）结果模型，形状对齐后端 ReviewToolResultVo。
 */

export interface ToolIssueItem {
  fieldName?: string;
  fieldLabel?: string;
  formValue?: string;
  extractedValue?: string;
  matchStatus?: string;
  /** 严重程度 error/warning/info（引擎原生小写） */
  severity?: string;
  confidence?: number;
  location?: string;
  description?: string;
  suggestion?: string;
  /** 命中规则原文（前端「规则说明」展示） */
  ruleContent?: string;
  /** 命中检查方法 */
  checkMethod?: string;
  /** 用户批注 */
  note?: string;
}

export interface ToolFocusItem {
  keyword?: string;
  category?: string;
  fieldLabel?: string;
  extractedValue?: string;
  location?: string;
  confidence?: number;
}

export interface ToolFocusKeyword {
  keyword?: string;
  category?: string;
}

export interface ReviewToolResult {
  id: string;
  reviewTaskId: number;
  /** COMPARE 双文档对比 / AUDIT 单文档内容审查 */
  reviewtype: string;
  /** PENDING/RUNNING/SUCCESS/FAIL */
  status: string;
  passStatus?: string;
  score?: number;
  errorCount?: number;
  warningCount?: number;
  infoCount?: number;
  totalIssues?: number;
  aiSummary?: string;
  /** 输入A（COMPARE 基准文件） */
  printPdfUrl?: string;
  /** 输入B（COMPARE 对比文件 / AUDIT 被审文档） */
  signFileUrl?: string;
  signFileName?: string;
  printSearchableUrl?: string;
  signSearchableUrl?: string;
  signOssId?: number;
  signOcrStatus?: string;
  errorMsg?: string;
  createtime?: string;
  updatetime?: string;
  /** 附件对比差异清单批注 JSON */
  noteData?: string;
  /** 内容审查脱敏手动框选 JSON */
  redactData?: string;
  issues?: ToolIssueItem[];
  focusItems?: ToolFocusItem[];
  focusCategories?: string[];
  focusKeywords?: ToolFocusKeyword[];
}

/** 工具建任务参数（复用 /review/task/createAndExecute） */
export interface ToolCreateTaskParams {
  taskName: string;
  /** ATTACHMENT_COMPARE（对比）/ CONTENT_AUDIT（审查） */
  taskType: string;
  sourceType?: string;
  standardIds: (number | string)[];
  /** 内容审查的标准值 JSON（对比可空） */
  formSnapshot?: string;
  files: {
    ossId: number | string | null;
    fileName: string;
    fileType: string;
    filePath?: string;
    fileSize?: number;
  }[];
}

export interface OcrStatusResult {
  ocrStatus: string;
  searchableUrl?: string;
}
