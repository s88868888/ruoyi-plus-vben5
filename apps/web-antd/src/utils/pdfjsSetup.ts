// pdfjs-dist 统一入口：附件对比"自渲染"方案专用（替代 iframe + viewer.html）。
// 版本 3.11.174（与原 public/pdfjs/web/viewer.html 同版本，行为一致）。
//
// ⚠ UMD 互操作两个坑，这里集中处理好：
// 1) build/pdf 是 UMD，经 esbuild 后核心库可能挂在 namespace 或 default 上 → 做兜底取值。
// 2) web/pdf_viewer 内部用 `globalThis.pdfjsLib` 取核心库；ESM 静态 import 顺序无法保证
//    "先挂 global 再求值 viewer"，故先显式挂 globalThis.pdfjsLib，再用动态 import 延后加载 viewer。

// @ts-ignore 3.11 build/pdf 无完整类型声明
import * as pdfjsNS from "pdfjs-dist/build/pdf";
// viewer 文字层/页面样式（.textLayer span 定位依赖 --scale-factor 等），纯 CSS 不碰 JS 坑
import "pdfjs-dist/web/pdf_viewer.css";

// 兜底：getDocument 在哪个对象上就用哪个
const lib: any = (pdfjsNS as any)?.getDocument ? pdfjsNS : (pdfjsNS as any)?.default || pdfjsNS;

// ⚠ worker 必须与 import 的核心库（3.11.174）同版本，且要能起“真 Worker 线程”。
// 用 public 下的原始 .js 路径（已覆盖为 3.11.174）：new Worker(此 URL) 当 classic 脚本能加载，
// 起真 worker。不可用 vite ?url（pnpm 软链下返回模块 URL，new Worker 失败 → 退回 fake worker，
// fake worker 会读全局被 vue3-pdf-app 污染的 2.4.456，导致 “API/Worker 版本不匹配”。）
const BASE = (import.meta as any).env?.BASE_URL || "/";
lib.GlobalWorkerOptions.workerSrc = `${BASE}pdfjs/build/pdf.worker.min.js`;
console.log("[pdfjsSetup] core version =", lib.version, " workerSrc =", lib.GlobalWorkerOptions.workerSrc);

// pdf_viewer 内部从这里取核心库，必须在动态 import viewer 之前挂好
(globalThis as any).pdfjsLib = lib;

export const pdfjsLib = lib;

// 动态加载 viewer 组件（PDFPageView/EventBus）。延后到调用时求值，保证此刻 globalThis.pdfjsLib 已就绪。
let _viewer: any = null;
export async function loadViewer(): Promise<any> {
  if (_viewer) return _viewer;
  // @ts-ignore
  const m: any = await import("pdfjs-dist/web/pdf_viewer");
  _viewer = m?.PDFPageView ? m : m?.default || m;
  return _viewer;
}
