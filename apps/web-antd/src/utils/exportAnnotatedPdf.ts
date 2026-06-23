// 导出带差异批注的 PDF（B 回传件），Word 批注打印效果：
//
// 布局：把每页页面宽度向右扩出一条「批注栏」，原页内容一个像素都不动 —— 只在新扩出的右侧空白里
// 画批注气泡 + 引线 + 正文锚点高亮。因为原页不重绘：
//   · 打印件（电子 PDF）的真文字原样保留，导出后仍可选可搜；
//   · 扫描件（图片 PDF）的位图原样不失真。
// 同一套代码两类文件通吃。所有标注都是「页面内容」（非注释层）→ 任何阅读器打开、任何打印设置都照常显示。
//
// 中文：嵌入中文字体（子集化），气泡文字是真文本。
// 坐标：差异 yTop/yBottom 是「距页顶的归一化比例」；PDF 左下为原点，故 pdfY = 页底 + 页高 ×(1 - yRatio)。

import { PDFDocument, rgb } from "pdf-lib";
import * as fontkitNS from "@pdf-lib/fontkit";
// CJS/ESM 互操作：实例可能在命名空间本身或其 .default 上，取有 create 方法的那个
const fontkit: any = (fontkitNS as any)?.create ? fontkitNS : (fontkitNS as any)?.default || fontkitNS;

export interface ExportDiffItem {
  type: string; // add | del | modify
  leftText: string;
  rightText: string;
  changes?: { type: string; leftText: string; rightText: string }[];
  leftPos?: { page: number } | null;
  rightPos: { page: number; yTop: number; yBottom: number } | null;
  note?: string; // 用户在差异清单里编辑后的批注内容（导出气泡正文）
  _seq?: number; // 导出时分配的编号，与界面清单 #序号 对齐
}

const FONT_URL = ((import.meta as any).env?.BASE_URL || "/") + "fonts/cn.ttf";
let _fontCache: ArrayBuffer | null = null;
async function loadFontBytes(): Promise<ArrayBuffer> {
  if (_fontCache) return _fontCache;
  const resp = await fetch(FONT_URL);
  if (!resp.ok) throw new Error(`中文字体加载失败(${resp.status})，请确认 public/fonts/cn.ttf 存在`);
  _fontCache = await resp.arrayBuffer();
  return _fontCache;
}

function typeColor(t: string) {
  if (t === "add") return rgb(0.4, 0.66, 0.22);
  if (t === "del") return rgb(0.9, 0.3, 0.3);
  return rgb(0.85, 0.6, 0.15);
}

function clip(s: string, max = 80): string {
  const t = (s || "").replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max) + "…" : t;
}

// 取气泡正文：优先用户编辑后的批注；为空则按差异自动生成摘要兜底。
function noteText(item: ExportDiffItem, typeLabel: (t: string) => string): string {
  const n = (item.note || "").trim();
  if (n) return n;
  const b = (item.changes && item.changes[0]) || { type: item.type, leftText: item.leftText, rightText: item.rightText };
  const more = item.changes && item.changes.length > 1 ? `等${item.changes.length}处` : "";
  if (item.type === "add") return `【${typeLabel("add")}】${clip(b.rightText)}${more}`;
  if (item.type === "del") return `【${typeLabel("del")}】${clip(b.leftText)}${more}`;
  return `【${typeLabel("modify")}】${clip(b.leftText)} → ${clip(b.rightText)}${more}`;
}

// 按宽度逐字断行（中文适用）
function wrapText(font: any, text: string, size: number, maxWidth: number): string[] {
  const out: string[] = [];
  for (const para of String(text).split(/\r?\n/)) {
    let cur = "";
    for (const ch of para) {
      const test = cur + ch;
      if (cur && font.widthOfTextAtSize(test, size) > maxWidth) {
        out.push(cur);
        cur = ch;
      } else {
        cur = test;
      }
    }
    out.push(cur); // 保留空行
  }
  return out.length ? out : [""];
}

function downloadBlob(bytes: Uint8Array, fileName: string) {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// 批注栏宽度
const GUTTER_MIN = 210;
const GUTTER_RATIO = 0.34;

/**
 * 生成 Word 式边栏批注 PDF 并下载。
 * @returns 实际在正文标注（画了气泡）的差异条数。rightPos 为空的项无法在正文定位，进末尾汇总页。
 */
export async function exportAnnotatedPdf(
  pdfBytes: ArrayBuffer | Uint8Array,
  diffs: ExportDiffItem[],
  typeLabel: (t: string) => string,
  fileName = "差异批注.pdf"
): Promise<number> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  pdfDoc.registerFontkit(fontkit);
  const fontBytes = await loadFontBytes();
  // ⚠ 不用 subset。fontkit 对这套中文字体做子集化时，某些字符集会损坏子集的字形映射与字宽表，
  // 导致整篇（连硬编码的"【修改】"）错位、错宽、重叠 —— 表现为打印件批注乱码、扫描件却正常
  // （两者用到的字符集不同，只有打印件那套触发了 bug）。嵌完整字体最稳，代价是导出文件偏大。
  const font = await pdfDoc.embedFont(fontBytes, { subset: false });
  const pages = pdfDoc.getPages();

  // 编号与界面清单 #序号 对齐（清单顺序 = 传入顺序）
  diffs.forEach((d, i) => { d._seq = i + 1; });

  // 锚定项按页分组；无 rightPos 的进汇总页
  const byPage = new Map<number, ExportDiffItem[]>();
  const unanchored: ExportDiffItem[] = [];
  diffs.forEach((d) => {
    const pg = d.rightPos?.page;
    if (pg && pg >= 1 && pg <= pages.length) {
      const arr = byPage.get(pg) || [];
      arr.push(d);
      byPage.set(pg, arr);
    } else {
      unanchored.push(d);
    }
  });

  // 统一批注栏宽度（按最宽页算，保证各页同宽、打印整齐）
  let baseW = 0;
  pages.forEach((p) => { baseW = Math.max(baseW, p.getSize().width); });
  const GUTTER = Math.max(GUTTER_MIN, baseW * GUTTER_RATIO);

  // 气泡排版参数
  const noteSize = 9;
  const headSize = 8.5;
  const lineH = noteSize * 1.42;
  const headH = headSize * 1.7;
  const gPad = 9;
  const accent = 4;
  const vGap = 8;
  const maxLines = 9;

  let drawn = 0;

  pages.forEach((page, pi) => {
    // 用「可见框」(CropBox 优先，回退 MediaBox) 的几何，避免被原 CropBox 裁掉看不见批注栏
    const box: any = (page as any).getCropBox ? (page as any).getCropBox() : page.getMediaBox();
    const ox = box.x, oy = box.y, w0 = box.width, h0 = box.height;
    // 向右扩出批注栏；MediaBox 与 CropBox 同步扩，否则有些阅读器按 CropBox 裁掉新区域
    page.setMediaBox(ox, oy, w0 + GUTTER, h0);
    try { (page as any).setCropBox(ox, oy, w0 + GUTTER, h0); } catch (e) {}

    const dividerX = ox + w0;
    // 文档与批注栏分隔线（浅灰竖线，Word 观感）
    page.drawLine({ start: { x: dividerX, y: oy }, end: { x: dividerX, y: oy + h0 }, thickness: 0.7, color: rgb(0.8, 0.82, 0.85) });

    const items = (byPage.get(pi + 1) || []).slice();
    if (!items.length) return;
    // 按锚点纵向位置自上而下排（yTop 越小越靠上）
    items.sort((a, b) => (a.rightPos!.yTop ?? 0) - (b.rightPos!.yTop ?? 0));

    const balloonX = dividerX + 8;
    const balloonW = GUTTER - 16;
    const innerW = balloonW - gPad * 2 - accent;

    let prevBottomDown = 0; // 上一个气泡底边的「距页顶」距离，用于堆叠避让

    items.forEach((item) => {
      const rp = item.rightPos!;
      const col = typeColor(item.type);
      // 距页顶的距离（向下为正）
      const yTopDown = h0 * (rp.yTop ?? 0);
      const yBotDown = h0 * (rp.yBottom ?? rp.yTop ?? 0);
      const anchorMidDown = (yTopDown + yBotDown) / 2;

      // 气泡正文换行 → 决定高度
      const lines = wrapText(font, noteText(item, typeLabel), noteSize, innerW);
      const shown = lines.slice(0, maxLines);
      if (lines.length > maxLines && shown.length) shown[shown.length - 1] = clip(shown[shown.length - 1], shown[shown.length - 1].length) + "…";
      const balloonH = gPad + headH + shown.length * lineH + gPad - 4;

      // 期望让气泡纵向中心贴住锚点；与上一个重叠则向下推；最后夹在页内
      let topDown = anchorMidDown - balloonH / 2;
      if (topDown < prevBottomDown + vGap) topDown = prevBottomDown + vGap;
      if (topDown < 4) topDown = 4;
      if (topDown + balloonH > h0 - 4) topDown = Math.max(4, h0 - 4 - balloonH);
      prevBottomDown = topDown + balloonH;

      // 转 PDF 坐标（y 向上）
      const balloonTopY = oy + h0 - topDown;
      const balloonBotY = balloonTopY - balloonH;

      // 正文锚点高亮（半透明色带，页面内容 → 必打印、不挡底）
      const hlPad = Math.max(4, h0 * 0.006);
      const anchorTopY = oy + h0 - Math.max(0, yTopDown - hlPad);
      const anchorBotY = oy + h0 - Math.min(h0, yBotDown + hlPad);
      const docLeft = ox + w0 * 0.05;
      const docRight = ox + w0 * 0.97;
      page.drawRectangle({
        x: docLeft,
        y: Math.min(anchorTopY, anchorBotY),
        width: docRight - docLeft,
        height: Math.max(2, Math.abs(anchorTopY - anchorBotY)),
        color: col,
        opacity: 0.2,
      });

      // 引线：正文锚点 →(横)→ 分隔线 →(斜)→ 气泡左上；锚点端点画小圆点
      const anchorMidY = oy + h0 - anchorMidDown;
      page.drawLine({ start: { x: docRight, y: anchorMidY }, end: { x: dividerX, y: anchorMidY }, thickness: 0.8, color: col, opacity: 0.65 });
      page.drawLine({ start: { x: dividerX, y: anchorMidY }, end: { x: balloonX, y: balloonTopY - 8 }, thickness: 0.8, color: col, opacity: 0.65 });
      page.drawCircle({ x: docRight, y: anchorMidY, size: 1.8, color: col });

      // 气泡：白底 + 浅边 + 左侧类型色竖条
      page.drawRectangle({ x: balloonX, y: balloonBotY, width: balloonW, height: balloonH, color: rgb(0.99, 0.99, 0.99), borderColor: rgb(0.85, 0.87, 0.9), borderWidth: 0.8 });
      page.drawRectangle({ x: balloonX, y: balloonBotY, width: accent, height: balloonH, color: col });

      // 气泡文字：头部（#编号 类型 页码）+ 批注正文
      const tx = balloonX + accent + gPad;
      let ty = balloonTopY - gPad - headSize;
      page.drawText(`#${item._seq} 【${typeLabel(item.type)}】 第${rp.page}页`, { x: tx, y: ty, size: headSize, font, color: col });
      ty -= headH;
      shown.forEach((ln) => {
        page.drawText(ln, { x: tx, y: ty, size: noteSize, font, color: rgb(0.18, 0.18, 0.2) });
        ty -= lineH;
      });

      drawn++;
    });
  });

  // 无法在正文定位的差异（rightPos 为空，典型为纯删除项）→ 末尾汇总页，避免静默丢失
  if (unanchored.length) {
    const W = 595.28, H = 841.89, M = 48;
    const maxW = W - 2 * M;
    let page = pdfDoc.addPage([W, H]);
    let y = H - M;
    const ensure = (need = 16) => { if (y - need < M) { page = pdfDoc.addPage([W, H]); y = H - M; } };
    page.drawText(`以下 ${unanchored.length} 处差异在回传件中无对应位置（未在正文标注）`, { x: M, y: y - 16, size: 14, font, color: rgb(0.1, 0.1, 0.1) });
    y -= 34;
    unanchored.forEach((item) => {
      ensure(16);
      page.drawText(`#${item._seq} 【${typeLabel(item.type)}】`, { x: M, y: y - 11, size: 10.5, font, color: typeColor(item.type) });
      y -= 16;
      wrapText(font, noteText(item, typeLabel), 9.5, maxW - 14).forEach((ln) => {
        ensure(13);
        page.drawText(ln, { x: M + 14, y: y - 9.5, size: 9.5, font, color: rgb(0.2, 0.2, 0.22) });
        y -= 13;
      });
      y -= 8;
    });
  }

  const out = await pdfDoc.save();
  downloadBlob(out, fileName);
  return drawn;
}
