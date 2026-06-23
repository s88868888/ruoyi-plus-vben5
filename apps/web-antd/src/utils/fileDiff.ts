import Diff from "jsdiff-esm";

export interface DiffResult {
  similarity: number;
  added: number;
  removed: number;
  // 退化场景：一侧有实质文字、另一侧几乎为空（典型为扫描件未 OCR/识别失败）。
  // 此时逐字 diff 毫无意义，UI 应给出提示而非把有文字的一侧整片标红。
  degenerate?: boolean;
  // 几乎无文字的一侧：'A' = 左(打印件)，'B' = 右(扫描件)
  emptySide?: "A" | "B" | null;
}

interface CharRef {
  span: HTMLElement;
  charIndex: number; // span 内字符下标，用于 finer-grained 高亮（保留供未来扩展）
}

interface TextLine {
  text: string;
  refs: CharRef[];
  spans: HTMLElement[];
  page: number;
  yMid: number;
  xLeft: number;
  xRight: number;
}

// 视觉相似但 Unicode 不同的字符——同一个意图归一化到同一个 canonical 字符
// 不归一化会导致 LCS 把它们当不同字符，进而连累周围相同的中文也被误标
const NORMALIZE_MAP: Record<string, string> = {
  // 空复选框
  "☐": "□", "⬜": "□", "◻": "□", "▢": "□", "⃞": "□", "❑": "□", "❒": "□",
  // 选中复选框 → 统一为「勾」+「框」？这里直接归一化成勾，避免不同复选框字符相互不匹配
  "☑": "✓", "☒": "✓",
  // 勾号变体
  "✔": "✓", "✅": "✓", "🗸": "✓", "🗹": "✓",
  // 叉号变体
  "✘": "✗", "✕": "✗", "❌": "✗", "❎": "✗", "🗴": "✗",
  // 各种空白
  "　": " ", " ": " ", " ": " ", " ": " ", " ": " ", " ": " ",
  // 中文引号 → 直引号
  "“": '"', "”": '"', "‘": "'", "’": "'",
  "「": '"', "」": '"', "『": '"', "』": '"',
};

// 标准化字符：去掉零宽空格、全角空白等不影响阅读的字符；视觉相似字符统一
function normalizeChar(c: string): string {
  if (c === "​" || c === "‌" || c === "‍" || c === "﻿") return "";
  return NORMALIZE_MAP[c] ?? c;
}

// 是否参与 diff 比对的字符：忽略所有空白
function isMeaningful(c: string): boolean {
  return !!c && !/\s/.test(c);
}

function lcsLength(a: string, b: string): number {
  if (!a || !b) return 0;
  const m = b.length;
  let prev = new Uint16Array(m + 1);
  let curr = new Uint16Array(m + 1);
  for (let i = 1; i <= a.length; i++) {
    const ca = a[i - 1];
    for (let j = 1; j <= m; j++) {
      curr[j] = ca === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], curr[j - 1]);
    }
    [prev, curr] = [curr, prev];
    curr.fill(0);
  }
  return prev[m];
}

function textSimilarity(a: string, b: string): number {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const l = lcsLength(a, b);
  return (2 * l) / (a.length + b.length);
}

// pdfjs 的 textLayer 有时会把页脚页码排在正文前面。
// 这类页码如果参与 diff，会被误配到另一侧扫描件的顶部编号/批注，造成连线跨页偏移。
function isPageFooterNumberSpan(span: HTMLElement, raw: string): boolean {
  const text = raw.replace(/\s+/g, "");
  if (!text) return false;
  const wrap = span.closest<HTMLElement>(".pdf-page-wrap");
  const pageNumber = wrap?.dataset.pageNumber || "";
  if (!pageNumber) return false;
  if (text !== pageNumber && text !== `第${pageNumber}页`) return false;

  const pageEl = wrap.querySelector<HTMLElement>(".page") || wrap;
  const pageRect = pageEl.getBoundingClientRect();
  const rect = span.getBoundingClientRect();
  if (!pageRect.width || !pageRect.height || !rect.width || !rect.height) return false;

  const xMid = (rect.left + rect.width / 2 - pageRect.left) / pageRect.width;
  const yMid = (rect.top + rect.height / 2 - pageRect.top) / pageRect.height;
  const widthRatio = rect.width / pageRect.width;
  return xMid > 0.35 && xMid < 0.65 && yMid > 0.9 && widthRatio < 0.15;
}

// 从一组 textLayer 容器节点收集所有可用字符，建立 char→span 映射
// 注意：信任 pdfjs 渲染时 DOM 的 span 顺序——两侧 PDF 用同一份 pdfjs 解析，
// 顺序规则一致；外部排序（按 top/left）反而因为容差判断在两侧样本不同，
// 会让本应一致的字符序列错位，造成 LCS 误判。
function collectChars(nodes: HTMLElement[]): { text: string; refs: CharRef[]; spans: HTMLElement[] } {
  const refs: CharRef[] = [];
  const spans: HTMLElement[] = [];
  let text = "";
  nodes.forEach((page) => {
    // pdfjs 偶尔会把 span 嵌套在 div 里（表格/复杂布局），用全量 querySelectorAll
    const pageSpans = Array.from(page.querySelectorAll<HTMLElement>("span"));
    pageSpans.forEach((span) => {
      spans.push(span);
      // 跳过包含子 span 的容器（只读叶子 span 文字，避免重复计算）
      const raw = span.childElementCount > 0 ? "" : span.textContent || "";
      if (isPageFooterNumberSpan(span, raw)) return;
      for (let i = 0; i < raw.length; i++) {
        const c = normalizeChar(raw[i]);
        if (!c) continue;
        if (!isMeaningful(c)) continue;
        text += c;
        refs.push({ span, charIndex: i });
      }
    });
  });
  return { text, refs, spans };
}

function collectTextLines(nodes: HTMLElement[]): { lines: TextLine[]; spans: HTMLElement[] } {
  const lines: TextLine[] = [];
  const spans: HTMLElement[] = [];
  nodes.forEach((page) => {
    const pageWrap = page.closest<HTMLElement>(".pdf-page-wrap");
    const pageNo = Number(pageWrap?.dataset.pageNumber || "0") || 0;
    const pageEl = pageWrap?.querySelector<HTMLElement>(".page") || page.closest<HTMLElement>(".page") || page;
    const pageRect = pageEl.getBoundingClientRect();
    if (!pageRect.width || !pageRect.height) return;
    const rows: Array<{ y: number; spans: HTMLElement[]; refs: CharRef[]; text: string; xLeft: number; xRight: number }> = [];
    const pageSpans = Array.from(page.querySelectorAll<HTMLElement>("span"));
    pageSpans.forEach((span) => {
      spans.push(span);
      const raw = span.childElementCount > 0 ? "" : span.textContent || "";
      if (!raw || isPageFooterNumberSpan(span, raw)) return;
      const rect = span.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const chars: CharRef[] = [];
      let text = "";
      for (let i = 0; i < raw.length; i++) {
        const c = normalizeChar(raw[i]);
        if (!c || !isMeaningful(c)) continue;
        text += c;
        chars.push({ span, charIndex: i });
      }
      if (!text) return;
      const yMid = (rect.top + rect.height / 2 - pageRect.top) / pageRect.height;
      const xLeft = (rect.left - pageRect.left) / pageRect.width;
      const xRight = (rect.right - pageRect.left) / pageRect.width;
      const threshold = Math.max(0.006, (rect.height / pageRect.height) * 0.75);
      let row = rows.find((r) => Math.abs(r.y - yMid) <= threshold);
      if (!row) {
        row = { y: yMid, spans: [], refs: [], text: "", xLeft: Infinity, xRight: -Infinity };
        rows.push(row);
      }
      row.spans.push(span);
      row.refs.push(...chars);
      row.text += text;
      row.xLeft = Math.min(row.xLeft, xLeft);
      row.xRight = Math.max(row.xRight, xRight);
    });
    rows
      .filter((r) => r.text.length > 0)
      .sort((a, b) => a.y - b.y || a.xLeft - b.xLeft)
      .forEach((r) => {
        lines.push({
          text: r.text,
          refs: r.refs,
          spans: r.spans,
          page: pageNo,
          yMid: r.y,
          xLeft: Number.isFinite(r.xLeft) ? r.xLeft : 0,
          xRight: Number.isFinite(r.xRight) ? r.xRight : 1,
        });
      });
  });
  lines.sort((a, b) => a.page - b.page || a.yMid - b.yMid || a.xLeft - b.xLeft);
  return { lines, spans };
}

// 清掉历史标记，避免重复调用时旧 class 残留
function clearMarks(spans: HTMLElement[]) {
  spans.forEach((s) => {
    s.classList.remove("fd-add", "fd-del");
  });
}

function clearMarkOverlays(nodes: HTMLElement[]) {
  const roots = new Set<HTMLElement>();
  nodes.forEach((node) => {
    const wrap = node.closest<HTMLElement>(".pdf-page-wrap");
    if (wrap) roots.add(wrap);
  });
  roots.forEach((root) => {
    root.querySelectorAll<HTMLElement>(".fd-mark-rect").forEach((el) => el.remove());
  });
}

function createMarkRects(bySpan: Map<HTMLElement, number[]>, className: string): HTMLElement[] {
  const out: HTMLElement[] = [];
  bySpan.forEach((indexes, span) => {
    const textNode = Array.from(span.childNodes).find((n) => n.nodeType === 3) as Text | undefined;
    const pageEl = span.closest<HTMLElement>(".page") || span.closest<HTMLElement>(".pdf-page-wrap");
    if (!textNode || !pageEl || !indexes.length) return;

    const sorted = Array.from(new Set(indexes)).sort((a, b) => a - b);
    let start = sorted[0];
    let prev = sorted[0];
    const flush = (from: number, to: number) => {
      if (from < 0 || to < from || from >= textNode.length) return;
      const range = document.createRange();
      range.setStart(textNode, Math.max(0, from));
      range.setEnd(textNode, Math.min(textNode.length, to + 1));
      const pageRect = pageEl.getBoundingClientRect();
      Array.from(range.getClientRects()).forEach((rect) => {
        if (rect.width <= 0 || rect.height <= 0) return;
        const insetY = rect.height * 0.22;
        const el = document.createElement("i");
        el.className = `fd-mark-rect ${className}`;
        el.style.left = `${(rect.left - pageRect.left).toFixed(2)}px`;
        el.style.top = `${(rect.top - pageRect.top + insetY).toFixed(2)}px`;
        el.style.width = `${Math.max(1, rect.width).toFixed(2)}px`;
        el.style.height = `${Math.max(2, rect.height - insetY * 2).toFixed(2)}px`;
        pageEl.appendChild(el);
        out.push(el);
      });
      range.detach();
    };

    for (let i = 1; i < sorted.length; i++) {
      const cur = sorted[i];
      if (cur === prev + 1) {
        prev = cur;
        continue;
      }
      flush(start, prev);
      start = cur;
      prev = cur;
    }
    flush(start, prev);
  });
  return out;
}

// 给指定字符区间 [start, end) 对应的所有 span 加 class
function markRange(refs: CharRef[], start: number, end: number, className: string): HTMLElement[] {
  const touched = new Set<HTMLElement>();
  const bySpan = new Map<HTMLElement, number[]>();
  for (let i = start; i < end && i < refs.length; i++) {
    const ref = refs[i];
    if (!touched.has(ref.span)) {
      touched.add(ref.span);
      ref.span.classList.add(className);
    }
    if (!bySpan.has(ref.span)) bySpan.set(ref.span, []);
    bySpan.get(ref.span)!.push(ref.charIndex);
  }
  return createMarkRects(bySpan, className);
}

export interface DiffSource {
  selector: string | HTMLElement[];
  type: string;
}

function resolveNodes(selector: string | HTMLElement[]): HTMLElement[] {
  if (typeof selector === "string") {
    return Array.from(document.querySelectorAll<HTMLElement>(selector));
  }
  return selector || [];
}

export const diffDocument = (
  oldData: DiffSource,
  newData: DiffSource
): DiffResult => {
  const oldNodes = resolveNodes(oldData.selector);
  const newNodes = resolveNodes(newData.selector);

  if (oldNodes.length === 0 || newNodes.length === 0) {
    return { similarity: 1, added: 0, removed: 0 };
  }

  const left = collectChars(oldNodes);
  const right = collectChars(newNodes);

  clearMarkOverlays(oldNodes);
  clearMarkOverlays(newNodes);
  clearMarks(left.spans);
  clearMarks(right.spans);

  if (!left.text && !right.text) {
    return { similarity: 1, added: 0, removed: 0 };
  }

  // 退化保护：一侧有实质文字，另一侧几乎没有。
  // 典型成因：扫描件 OCR 没跑/识别失败/还没加载出文字层，B 侧 textLayer 是空的。
  // 这种情况下逐字 diff 会把有文字的一侧整片标红（“左边全红”），既不准也误导用户。
  // 直接判为退化，不标红、不污染相似度，由 UI 层提示“扫描件暂无文字层”。
  const MIN_TEXT = 10; // 少于这点字符视为“几乎没有文字”
  const leftEmpty = left.text.length < MIN_TEXT;
  const rightEmpty = right.text.length < MIN_TEXT;
  if (leftEmpty !== rightEmpty) {
    return {
      similarity: 0,
      added: 0,
      removed: 0,
      degenerate: true,
      emptySide: leftEmpty ? "A" : "B",
    };
  }

  // diffChars 已经够用；中文场景下 diffWords 反而会因为没有词边界把整段算成一个 token
  const parts = Diff.diffChars(left.text, right.text);

  let leftCursor = 0;
  let rightCursor = 0;
  let added = 0;
  let removed = 0;
  let unchanged = 0;

  parts.forEach((part: any) => {
    const len = part.value.length;
    if (part.added) {
      markRange(right.refs, rightCursor, rightCursor + len, "fd-add");
      rightCursor += len;
      added += len;
    } else if (part.removed) {
      markRange(left.refs, leftCursor, leftCursor + len, "fd-del");
      leftCursor += len;
      removed += len;
    } else {
      leftCursor += len;
      rightCursor += len;
      unchanged += len;
    }
  });

  const total = unchanged + added + removed;
  const similarity = total === 0 ? 1 : unchanged / total;

  return { similarity, added, removed };
};

// 一个变更块：与染色完全同源（同一次 diffChars 的结果）。携带涉及的 span 元素，
// 调用方据此取位置 → 框/连线/导出与染色严丝合缝（颜色在哪，框就在哪）。
export interface DomChangeBlock {
  type: "add" | "del" | "modify";
  leftText: string;
  rightText: string;
  leftSpans: HTMLElement[]; // 被删字符所在的左侧 span（去重，按出现顺序）
  rightSpans: HTMLElement[]; // 新增字符所在的右侧 span
  leftMarks: HTMLElement[]; // 精确字符覆盖层，比 OCR 整行 span 更贴近真实差异位置
  rightMarks: HTMLElement[];
  anchorRightSpan: HTMLElement | null; // 纯删除时：删除处右侧上下文 span（续上行），供在 B 定位
}

export interface DetailedDiffResult extends DiffResult {
  blocks: DomChangeBlock[];
}

function markLineRange(refs: CharRef[], start: number, end: number, className: string): HTMLElement[] {
  const touched = new Set<HTMLElement>();
  const bySpan = new Map<HTMLElement, number[]>();
  for (let i = start; i < end && i < refs.length; i++) {
    const ref = refs[i];
    if (!touched.has(ref.span)) {
      touched.add(ref.span);
      ref.span.classList.add(className);
    }
    if (!bySpan.has(ref.span)) bySpan.set(ref.span, []);
    bySpan.get(ref.span)!.push(ref.charIndex);
  }
  return createMarkRects(bySpan, className);
}

function spansFromLineRange(refs: CharRef[], start: number, end: number): HTMLElement[] {
  const seen = new Set<HTMLElement>();
  const out: HTMLElement[] = [];
  for (let i = start; i < end && i < refs.length; i++) {
    const sp = refs[i].span;
    if (!seen.has(sp)) {
      seen.add(sp);
      out.push(sp);
    }
  }
  return out;
}

function buildLineBlocks(leftLine: TextLine, rightLine: TextLine): { blocks: DomChangeBlock[]; added: number; removed: number; unchanged: number } {
  const parts = Diff.diffChars(leftLine.text, rightLine.text);
  let li = 0;
  let ri = 0;
  let added = 0;
  let removed = 0;
  let unchanged = 0;
  const blocks: DomChangeBlock[] = [];
  let pending: {
    delSpans: HTMLElement[];
    addSpans: HTMLElement[];
    delMarks: HTMLElement[];
    addMarks: HTMLElement[];
    delSet: Set<HTMLElement>;
    addSet: Set<HTMLElement>;
    leftText: string;
    rightText: string;
  } | null = null;
  const ensurePending = () => pending || (pending = {
    delSpans: [],
    addSpans: [],
    delMarks: [],
    addMarks: [],
    delSet: new Set(),
    addSet: new Set(),
    leftText: "",
    rightText: "",
  });
  const pushSpans = (target: "del" | "add", spans: HTMLElement[]) => {
    const p = ensurePending();
    const set = target === "del" ? p.delSet : p.addSet;
    const arr = target === "del" ? p.delSpans : p.addSpans;
    spans.forEach((s) => {
      if (!set.has(s)) {
        set.add(s);
        arr.push(s);
      }
    });
  };
  const flush = () => {
    if (!pending) return;
    const { delSpans, addSpans, delMarks, addMarks, leftText, rightText } = pending;
    let type: "add" | "del" | "modify" | null = null;
    if (leftText && rightText) type = "modify";
    else if (leftText) type = "del";
    else if (rightText) type = "add";
    if (type) {
      const anchorRightSpan = type === "del"
        ? (rightLine.refs[ri]?.span ?? rightLine.refs[ri - 1]?.span ?? rightLine.spans[0] ?? null)
        : null;
      blocks.push({
        type,
        leftText,
        rightText,
        leftSpans: delSpans,
        rightSpans: addSpans,
        leftMarks: delMarks,
        rightMarks: addMarks,
        anchorRightSpan,
      });
    }
    pending = null;
  };
  const EQUAL_GAP = 4;
  parts.forEach((part: any) => {
    const len = part.value.length;
    if (part.added) {
      const marks = markLineRange(rightLine.refs, ri, ri + len, "fd-add");
      pushSpans("add", spansFromLineRange(rightLine.refs, ri, ri + len));
      ensurePending().addMarks.push(...marks);
      ensurePending().rightText += part.value;
      ri += len;
      added += len;
    } else if (part.removed) {
      const marks = markLineRange(leftLine.refs, li, li + len, "fd-del");
      pushSpans("del", spansFromLineRange(leftLine.refs, li, li + len));
      ensurePending().delMarks.push(...marks);
      ensurePending().leftText += part.value;
      li += len;
      removed += len;
    } else {
      if (pending && len < EQUAL_GAP) {
        pushSpans("del", spansFromLineRange(leftLine.refs, li, li + len));
        pushSpans("add", spansFromLineRange(rightLine.refs, ri, ri + len));
        pending.leftText += part.value;
        pending.rightText += part.value;
      } else {
        flush();
      }
      li += len;
      ri += len;
      unchanged += len;
    }
  });
  flush();
  return { blocks, added, removed, unchanged };
}

function buildMissingLineBlock(leftLine: TextLine, anchorLine: TextLine | null): DomChangeBlock {
  const marks = markLineRange(leftLine.refs, 0, leftLine.refs.length, "fd-del");
  return {
    type: "del",
    leftText: leftLine.text,
    rightText: "",
    leftSpans: leftLine.spans,
    rightSpans: [],
    leftMarks: marks,
    rightMarks: [],
    anchorRightSpan: anchorLine?.spans?.[0] ?? null,
  };
}

export const diffDocumentAnchored = (
  oldData: DiffSource,
  newData: DiffSource
): DetailedDiffResult => {
  const oldNodes = resolveNodes(oldData.selector);
  const newNodes = resolveNodes(newData.selector);
  if (oldNodes.length === 0 || newNodes.length === 0) {
    return { similarity: 1, added: 0, removed: 0, blocks: [] };
  }
  const left = collectTextLines(oldNodes);
  const right = collectTextLines(newNodes);
  clearMarkOverlays(oldNodes);
  clearMarkOverlays(newNodes);
  clearMarks(left.spans);
  clearMarks(right.spans);
  const leftText = left.lines.map((l) => l.text).join("");
  const rightText = right.lines.map((l) => l.text).join("");
  if (!leftText && !rightText) return { similarity: 1, added: 0, removed: 0, blocks: [] };
  if ((leftText.length < 10) !== (rightText.length < 10)) {
    return { similarity: 0, added: 0, removed: 0, degenerate: true, emptySide: leftText.length < 10 ? "A" : "B", blocks: [] };
  }

  const blocks: DomChangeBlock[] = [];
  let added = 0;
  let removed = 0;
  let unchanged = 0;
  const usedRight = new Set<number>();
  let searchFrom = 0;
  left.lines.forEach((leftLine) => {
    if (leftLine.text.length < 3) return;
    let bestIdx = -1;
    let bestScore = 0;
    const windowEnd = Math.min(right.lines.length, searchFrom + 18);
    for (let i = searchFrom; i < windowEnd; i++) {
      if (usedRight.has(i)) continue;
      const rightLine = right.lines[i];
      if (!rightLine || rightLine.text.length < 2) continue;
      const lenRatio = Math.min(leftLine.text.length, rightLine.text.length) / Math.max(leftLine.text.length, rightLine.text.length);
      if (lenRatio < 0.35) continue;
      const sim = textSimilarity(leftLine.text, rightLine.text);
      const orderPenalty = i < searchFrom ? 0.08 : 0;
      const score = sim - orderPenalty;
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    if (bestIdx < 0 || bestScore < 0.52) {
      blocks.push(buildMissingLineBlock(leftLine, right.lines[searchFrom] ?? right.lines[searchFrom - 1] ?? null));
      removed += leftLine.text.length;
      return;
    }
    usedRight.add(bestIdx);
    searchFrom = Math.max(searchFrom, bestIdx);
    const lineDiff = buildLineBlocks(leftLine, right.lines[bestIdx]);
    blocks.push(...lineDiff.blocks);
    added += lineDiff.added;
    removed += lineDiff.removed;
    unchanged += lineDiff.unchanged;
  });

  const total = unchanged + added + removed;
  return { similarity: total === 0 ? 1 : unchanged / total, added, removed, blocks };
};

/**
 * 染色 + 结构化变更块，单一事实源。
 * 与 diffDocument 完全相同的 collectChars + diffChars，额外把每个变更块涉及的 span 收集出来。
 * 这样「差异清单 / 区域框 / 连线 / 导出」全部基于和染色同一次 diff、同一批 span 定位，
 * 杜绝原来「getTextContent 再 diff 一次」与染色结果不一致导致的整体偏移。
 */
export const diffDocumentDetailed = (
  oldData: DiffSource,
  newData: DiffSource
): DetailedDiffResult => {
  const oldNodes = resolveNodes(oldData.selector);
  const newNodes = resolveNodes(newData.selector);
  if (oldNodes.length === 0 || newNodes.length === 0) {
    return { similarity: 1, added: 0, removed: 0, blocks: [] };
  }
  const left = collectChars(oldNodes);
  const right = collectChars(newNodes);
  clearMarkOverlays(oldNodes);
  clearMarkOverlays(newNodes);
  clearMarks(left.spans);
  clearMarks(right.spans);
  if (!left.text && !right.text) {
    return { similarity: 1, added: 0, removed: 0, blocks: [] };
  }
  const MIN_TEXT = 10;
  const leftEmpty = left.text.length < MIN_TEXT;
  const rightEmpty = right.text.length < MIN_TEXT;
  if (leftEmpty !== rightEmpty) {
    return { similarity: 0, added: 0, removed: 0, degenerate: true, emptySide: leftEmpty ? "A" : "B", blocks: [] };
  }

  const parts = Diff.diffChars(left.text, right.text);
  let leftCursor = 0;
  let rightCursor = 0;
  let added = 0;
  let removed = 0;
  let unchanged = 0;
  const blocks: DomChangeBlock[] = [];
  const EQUAL_GAP = 4; // 与 buildLineDiff 同口径：短于此的 equal 视为修改内部噪声，不切块

  // 收集 [start,end) 字符对应的去重 span（保持出现顺序）
  const spansOfRange = (refs: CharRef[], start: number, end: number): HTMLElement[] => {
    const seen = new Set<HTMLElement>();
    const out: HTMLElement[] = [];
    for (let i = start; i < end && i < refs.length; i++) {
      const sp = refs[i].span;
      if (!seen.has(sp)) { seen.add(sp); out.push(sp); }
    }
    return out;
  };

  let pending:
    | {
        delSpans: HTMLElement[];
        addSpans: HTMLElement[];
        delMarks: HTMLElement[];
        addMarks: HTMLElement[];
        delSet: Set<HTMLElement>;
        addSet: Set<HTMLElement>;
        leftText: string;
        rightText: string;
      }
    | null = null;
  const ensurePending = () => {
    if (!pending) {
      pending = {
        delSpans: [],
        addSpans: [],
        delMarks: [],
        addMarks: [],
        delSet: new Set(),
        addSet: new Set(),
        leftText: "",
        rightText: "",
      };
    }
    return pending;
  };
  const pushSpans = (target: "del" | "add", spans: HTMLElement[]) => {
    const p = ensurePending();
    const set = target === "del" ? p.delSet : p.addSet;
    const arr = target === "del" ? p.delSpans : p.addSpans;
    spans.forEach((s) => { if (!set.has(s)) { set.add(s); arr.push(s); } });
  };
  const flush = () => {
    if (!pending) return;
    const { delSpans, addSpans, delMarks, addMarks, leftText: lt, rightText: rt } = pending;
    let type: "add" | "del" | "modify" | null = null;
    if (lt && rt) type = "modify";
    else if (lt) type = "del";
    else if (rt) type = "add";
    if (type) {
      // 纯删除：右侧无新增，取删除点右侧上下文 span（续上行）作锚点
      const anchorRightSpan = type === "del"
        ? (right.refs[rightCursor]?.span ?? right.refs[rightCursor - 1]?.span ?? null)
        : null;
      blocks.push({
        type,
        leftText: lt,
        rightText: rt,
        leftSpans: delSpans,
        rightSpans: addSpans,
        leftMarks: delMarks,
        rightMarks: addMarks,
        anchorRightSpan,
      });
    }
    pending = null;
  };

  parts.forEach((part: any) => {
    const len = part.value.length;
    if (part.added) {
      const marks = markRange(right.refs, rightCursor, rightCursor + len, "fd-add");
      pushSpans("add", spansOfRange(right.refs, rightCursor, rightCursor + len));
      ensurePending().addMarks.push(...marks);
      ensurePending().rightText += part.value;
      rightCursor += len;
      added += len;
    } else if (part.removed) {
      const marks = markRange(left.refs, leftCursor, leftCursor + len, "fd-del");
      pushSpans("del", spansOfRange(left.refs, leftCursor, leftCursor + len));
      ensurePending().delMarks.push(...marks);
      ensurePending().leftText += part.value;
      leftCursor += len;
      removed += len;
    } else {
      // equal：短 equal 并入当前块（字符进文本、span 进框，保证连续）；长 equal 才闭合块
      if (pending && len < EQUAL_GAP) {
        pushSpans("del", spansOfRange(left.refs, leftCursor, leftCursor + len));
        pushSpans("add", spansOfRange(right.refs, rightCursor, rightCursor + len));
        pending.leftText += part.value;
        pending.rightText += part.value;
      } else {
        flush();
      }
      leftCursor += len;
      rightCursor += len;
      unchanged += len;
    }
  });
  flush();

  const total = unchanged + added + removed;
  return { similarity: total === 0 ? 1 : unchanged / total, added, removed, blocks };
};

/**
 * 仅基于两段纯文本计算总相似度（不操作任何 DOM）。
 * 用于通过 pdfjs API 拿到全文整体相似度，不受懒加载 textLayer 影响。
 */
export const diffPlainText = (oldText: string, newText: string): DiffResult => {
  // 归一化：去空白 + 统一视觉相似字符，避免变体导致误判
  const normalize = (s: string) => {
    let out = "";
    for (let i = 0; i < s.length; i++) {
      const c = normalizeChar(s[i]);
      if (c && isMeaningful(c)) out += c;
    }
    return out;
  };
  const oldNorm = normalize(oldText || "");
  const newNorm = normalize(newText || "");
  if (!oldNorm && !newNorm) return { similarity: 1, added: 0, removed: 0 };
  // 退化保护：与 diffDocument 一致，一侧几乎无文字时不做逐字 diff，
  // 避免把有文字的一侧整片算成“删除/新增”，相似度也不归零误导用户。
  const MIN_TEXT = 10;
  const leftEmpty = oldNorm.length < MIN_TEXT;
  const rightEmpty = newNorm.length < MIN_TEXT;
  if (leftEmpty !== rightEmpty) {
    return {
      similarity: 0,
      added: 0,
      removed: 0,
      degenerate: true,
      emptySide: leftEmpty ? "A" : "B",
    };
  }
  const parts = Diff.diffChars(oldNorm, newNorm);
  let added = 0;
  let removed = 0;
  let unchanged = 0;
  parts.forEach((p: any) => {
    if (p.added) added += p.value.length;
    else if (p.removed) removed += p.value.length;
    else unchanged += p.value.length;
  });
  const total = unchanged + added + removed;
  return {
    similarity: total === 0 ? 1 : unchanged / total,
    added,
    removed,
  };
};

// 差异清单条目：字符级 diff 聚合后映射回行，type + 左右涉及行号 + 文本
export interface LineDiffItem {
  type: "add" | "del" | "modify";
  leftLineIdxs: number[];
  rightLineIdxs: number[];
  leftText: string;
  rightText: string;
  // 纯删除项专用：删除在右侧(B)没有对应行，这里记录删除「发生处」的 B 上下文行号
  // （删除前最后一行 / 删除后第一行），供清单把删除批注锚到 B 的对应缝隙，而非判为"无对应位置"。
  rightAnchorIdx?: number;
}

interface LineInput {
  text: string;
  [key: string]: any;
}

// 把行数组展开成"归一化字符序列"，每字符记住来源行号（去空白/统一变体，与染色同口径）
function charsWithLine(lines: LineInput[]): { ch: string; line: number }[] {
  const out: { ch: string; line: number }[] = [];
  lines.forEach((ln, li) => {
    const raw = ln.text || "";
    for (let i = 0; i < raw.length; i++) {
      const c = normalizeChar(raw[i]);
      if (!c || !isMeaningful(c)) continue;
      out.push({ ch: c, line: li });
    }
  });
  return out;
}

/**
 * 行级差异清单（字符级事实源）。
 * 用 diffChars 在拼接全文上做字符 diff，再把每段 added/removed 字符映射回所属行，
 * 以 equal 段为边界聚成"变更块"。断行不同但正文相同的行 → 整段 equal → 不产生条目，
 * 从根上消除"仅断行不同"的假修改；真实增删改照常保留。与 diffDocument 染色同口径。
 */
export function buildLineDiff(
  leftLines: LineInput[],
  rightLines: LineInput[]
): LineDiffItem[] {
  const L = charsWithLine(leftLines);
  const R = charsWithLine(rightLines);
  const leftText = L.map((c) => c.ch).join("");
  const rightText = R.map((c) => c.ch).join("");
  if (!leftText && !rightText) return [];
  const parts = Diff.diffChars(leftText, rightText);

  const items: LineDiffItem[] = [];
  let li = 0;
  let ri = 0;
  let pending: { del: Set<number>; add: Set<number> } | null = null;
  // 闭合变更块所需的最短连续相同字符数：短于此的 equal 视为修改内部噪声，不切块。
  // 4 个字符足以区分"回到共同正文"与"修改中夹了个共同标点/单字"。
  const EQUAL_GAP = 4;

  const flush = () => {
    if (!pending) return;
    const delLines = Array.from(pending.del).sort((a, b) => a - b);
    const addLines = Array.from(pending.add).sort((a, b) => a - b);
    const leftTxt = delLines.map((i) => leftLines[i]?.text || "").join("");
    const rightTxt = addLines.map((i) => rightLines[i]?.text || "").join("");
    if (delLines.length && addLines.length) {
      items.push({ type: "modify", leftLineIdxs: delLines, rightLineIdxs: addLines, leftText: leftTxt, rightText: rightTxt });
    } else if (delLines.length) {
      // 纯删除：B 没有这些行。此刻 ri 指向删除点之后的 B 字符 → R[ri] 是删除后「续上」的第一行，
      // R[ri-1] 是删除前最后一行。锚到 R[ri]（续上行，行号 ≥ 前一行 → 不会偏上）；末尾删除回退 R[ri-1]。
      const rightAnchorIdx = R[ri]?.line ?? R[ri - 1]?.line ?? -1;
      items.push({ type: "del", leftLineIdxs: delLines, rightLineIdxs: [], leftText: leftTxt, rightText: "", rightAnchorIdx });
    } else if (addLines.length) {
      items.push({ type: "add", leftLineIdxs: [], rightLineIdxs: addLines, leftText: "", rightText: rightTxt });
    }
    pending = null;
  };

  parts.forEach((part: any) => {
    const len = part.value.length;
    if (part.added) {
      if (!pending) pending = { del: new Set(), add: new Set() };
      for (let k = 0; k < len; k++) { if (R[ri]) pending.add.add(R[ri].line); ri++; }
    } else if (part.removed) {
      if (!pending) pending = { del: new Set(), add: new Set() };
      for (let k = 0; k < len; k++) { if (L[li]) pending.del.add(L[li].line); li++; }
    } else {
      // equal 段：只有"长" equal 才真正闭合变更块。中文 diffChars 常在一处修改中间
      // 夹杂共同单字（标点/高频字），见短 equal 就 flush 会把一处修改碎成多块（del 暴增）。
      // 短于阈值的 equal 视作修改内部噪声并入 pending（其行号也并进来，保证坐标连续）。
      if (pending && len < EQUAL_GAP) {
        for (let k = 0; k < len; k++) {
          if (L[li + k]) pending.del.add(L[li + k].line);
          if (R[ri + k]) pending.add.add(R[ri + k].line);
        }
      } else {
        flush();
      }
      li += len;
      ri += len;
    }
  });
  flush();
  return items;
}
