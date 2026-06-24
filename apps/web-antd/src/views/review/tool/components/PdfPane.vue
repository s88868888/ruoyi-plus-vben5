<template>
  <!-- 单侧 PDF 自渲染面板（pdfjs-dist + PDFPageView，替代 iframe viewer.html）。
       canvas + textLayer 都是本文档普通 DOM，与连线浮层共享坐标系，连线端点零跨边界换算。 -->
  <div ref="containerRef" class="pdf-pane">
    <div v-if="loading" class="pdf-pane-tip">
      <LoadingOutlined spin />
      <span>{{ loadingText || '加载中…' }}</span>
    </div>
    <div v-else-if="error" class="pdf-pane-tip err">
      <ExclamationCircleOutlined />
      <span>{{ error }}</span>
    </div>
    <div ref="viewerRef" class="pdf-pane-viewer" :class="{ hidden: loading || error }"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount, nextTick } from 'vue';
import { LoadingOutlined, ExclamationCircleOutlined } from '@ant-design/icons-vue';
import { pdfjsLib, loadViewer } from '#/utils/pdfjsSetup';

const props = defineProps({
  // PDF 原始字节（ArrayBuffer / Uint8Array）。父组件 fetch 成 blob 后 arrayBuffer() 传入
  data: { type: [ArrayBuffer, Uint8Array], default: null },
  side: { type: String, default: 'A' }, // 'A' | 'B'，调试标识
  loadingText: { type: String, default: '' },
  // 'width' 自适应时占容器宽度的比例（默认 0.7；内容审查单栏用 0.75）
  fitFactor: { type: Number, default: 0.7 },
  // >0 时给页面渲染宽度封顶(px)：宽屏下不铺满、居中留白（'width' 自适应模式生效）
  maxPageWidth: { type: Number, default: 0 },
  // 初始缩放：'width' 自适应容器宽度，或具体数值（如 1 = 100%）
  initialScale: { type: [String, Number], default: 'width' },
});
const emit = defineEmits(['rendered', 'error']);

const containerRef = ref<any>(null); // 滚动容器（暴露给同步滚动）
const viewerRef = ref<any>(null); // 页面挂载点
const loading = ref(false);
const error = ref('');

let pdfDoc: any = null; // 当前 pdf document（暴露给 diff/差异清单）
let eventBus: any = null;
let PageViewCtor: any = null; // PDFPageView 构造器（动态加载后填充）
let pageViews: any[] = []; // { id, view, wrapEl }，按页码顺序
let renderToken = 0; // 防止快速切换文件时旧渲染回写

// 当前缩放：'width' 自适应容器宽度，或具体数值
const scaleMode = ref<any>(props.initialScale);
let currentScale = 1;

// ===== 加载 + 渲染 =====

// 独立 worker：项目里可能存在旧版 pdfjs 污染全局 globalThis.pdfjsWorker，
// 导致默认走 fake worker 时版本不匹配。这里手动建同版本 worker 实例显式传给 getDocument。
let pdfWorker: any = null;
function ensureWorker() {
  if (pdfWorker) return pdfWorker;
  try {
    const src = pdfjsLib.GlobalWorkerOptions.workerSrc;
    const raw = new Worker(src);
    pdfWorker = new pdfjsLib.PDFWorker({ port: raw });
    console.log(`[PdfPane ${props.side}] 独立 worker 已建 ${src}`);
  } catch (e) {
    console.warn(`[PdfPane ${props.side}] 建独立 worker 失败，回退全局`, e);
    pdfWorker = null;
  }
  return pdfWorker;
}

function toUint8(data: any) {
  if (!data) return null;
  if (data instanceof Uint8Array) return data;
  return new Uint8Array(data);
}

async function loadAndRender() {
  const token = ++renderToken;
  teardown();
  const bytes = toUint8(props.data);
  if (!bytes || !bytes.length) {
    loading.value = false;
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    console.log(`[PdfPane ${props.side}] 开始渲染，字节数=${bytes.length}`);
    // 动态加载 viewer 组件（保证 globalThis.pdfjsLib 已就绪）
    const viewerMod = await loadViewer();
    if (token !== renderToken) return;
    PageViewCtor = viewerMod.PDFPageView;
    const EventBusCtor = viewerMod.EventBus;
    // getDocument 会转移 ArrayBuffer 所有权，传副本避免父组件复用同一份字节时报 detached。
    const worker = ensureWorker();
    const opts = worker ? { data: bytes.slice(), worker } : { data: bytes.slice() };
    const task = pdfjsLib.getDocument(opts);
    const pdf = await task.promise;
    if (token !== renderToken) {
      pdf.destroy();
      return;
    } // 已被新一轮加载取代
    pdfDoc = pdf;
    eventBus = new EventBusCtor();
    await renderAllPages(token);
    if (token !== renderToken) return;
    loading.value = false;
    emit('rendered', pdf, pdf.numPages);
  } catch (e: any) {
    if (token !== renderToken) return;
    console.error(`[PdfPane ${props.side}] 渲染失败`, e);
    error.value = '加载失败：' + (e?.message || e);
    loading.value = false;
    emit('error', e);
  }
}

// 缩放：'width' = 自适应容器宽度的 fitFactor；或具体数值
function computeScale(viewport: any) {
  if (typeof scaleMode.value === 'number') return scaleMode.value;
  const cont = containerRef.value;
  const avail = (cont?.clientWidth || 900) - 32; // 减 padding
  let s = (avail / viewport.width) * props.fitFactor;
  // 封顶舒适宽度：页面渲染宽度不超过 maxPageWidth，宽屏下保持留白居中、不铺满
  if (props.maxPageWidth > 0) s = Math.min(s, props.maxPageWidth / viewport.width);
  return Math.max(0.2, Math.min(s, 3));
}

async function renderAllPages(token: number) {
  const viewer = viewerRef.value;
  if (!viewer || !pdfDoc) return;
  viewer.innerHTML = '';
  pageViews = [];
  const num = pdfDoc.numPages;
  // 先用第 1 页定缩放，保证各页同比例
  const firstPage = await pdfDoc.getPage(1);
  if (token !== renderToken) return;
  const baseViewport = firstPage.getViewport({ scale: 1 });
  currentScale = computeScale(baseViewport);

  for (let i = 1; i <= num; i++) {
    if (token !== renderToken) return;
    const page = i === 1 ? firstPage : await pdfDoc.getPage(i);
    if (token !== renderToken) return;
    const viewport = page.getViewport({ scale: currentScale });
    const wrap = document.createElement('div');
    wrap.className = 'pdf-page-wrap';
    wrap.dataset.pageNumber = String(i);
    viewer.appendChild(wrap);
    const view = new PageViewCtor({
      container: wrap,
      id: i,
      scale: currentScale,
      defaultViewport: viewport,
      eventBus,
      textLayerMode: 1, // 启用文字层（diff 染色 + 选中靠它）
      annotationMode: 0, // 关注释层，减负
    });
    view.setPdfPage(page);
    await view.draw();
    pageViews.push({ id: i, view, wrapEl: wrap });
  }
}

function teardown() {
  pageViews.forEach((p) => {
    try {
      p.view.destroy();
    } catch (e) {}
  });
  pageViews = [];
  if (viewerRef.value) viewerRef.value.innerHTML = '';
  if (pdfDoc) {
    try {
      pdfDoc.destroy();
    } catch (e) {}
    pdfDoc = null;
  }
}

// ===== 暴露给父组件（diff / 连线 / 同步滚动 / 定位）=====

function getPdf() {
  return pdfDoc;
}
function getContainer() {
  return containerRef.value;
}
// 某页的 .page 元素（PDFPageView 渲染出的 .page 在 wrap 内）
function getPageEl(pageNumber: number) {
  const p = pageViews.find((x) => x.id === pageNumber);
  return p ? p.wrapEl.querySelector('.page') || p.wrapEl : null;
}
// 所有 textLayer 节点（供 diffDocument 收集 span 染色）
function getTextLayerNodes() {
  if (!viewerRef.value) return [];
  return Array.from(viewerRef.value.querySelectorAll('.textLayer'));
}
// 滚到某页内位置并居中。兼容区域坐标 {yTop,yBottom}（取中点）与旧 {yRatio}
function scrollToPos(pos: any) {
  if (!pos) return;
  const cont = containerRef.value;
  const wrap = pageViews.find((x) => x.id === pos.page)?.wrapEl;
  if (!cont || !wrap) return;
  const ratio = pos.yTop != null ? (pos.yTop + pos.yBottom) / 2 : pos.yRatio || 0;
  const target = wrap.offsetTop + wrap.offsetHeight * ratio - cont.clientHeight / 2;
  cont.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
}
// 设置缩放并重渲（'width' 或数值）
async function setScale(s: any) {
  scaleMode.value = s;
  if (pdfDoc) await renderAllPages(renderToken);
}
function getScale() {
  return currentScale;
}
function getNumPages() {
  return pdfDoc ? pdfDoc.numPages : 0;
}
// 滚到第 n 页顶部
function scrollToPage(n: number) {
  const cont = containerRef.value;
  const wrap = pageViews.find((x) => x.id === n)?.wrapEl;
  if (!cont || !wrap) return;
  cont.scrollTo({ top: Math.max(0, wrap.offsetTop - 8), behavior: 'smooth' });
}
// 当前页：视口上部所在的页码
function getCurrentPage() {
  const cont = containerRef.value;
  if (!cont) return 1;
  const probe = cont.scrollTop + cont.clientHeight * 0.3;
  let cur = 1;
  for (const pv of pageViews) {
    if (pv.wrapEl.offsetTop <= probe) cur = pv.id;
    else break;
  }
  return cur;
}

watch(
  () => props.data,
  () => {
    nextTick(loadAndRender);
  },
  { immediate: true },
);
onBeforeUnmount(() => {
  renderToken++;
  teardown();
  if (pdfWorker) {
    try {
      pdfWorker.destroy();
    } catch (e) {}
    pdfWorker = null;
  }
});

defineExpose({
  getPdf,
  getContainer,
  getPageEl,
  getTextLayerNodes,
  scrollToPos,
  setScale,
  getScale,
  getNumPages,
  scrollToPage,
  getCurrentPage,
});
</script>

<style scoped>
.pdf-pane {
  flex: 1;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  background: #525659;
}
.pdf-pane-viewer {
  padding: 16px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.pdf-pane-viewer.hidden {
  display: none;
}
.pdf-pane-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 100%;
  color: #e6e8eb;
  font-size: 14px;
}
.pdf-pane-tip.err {
  color: #f7b2b2;
}
</style>

<!-- 非 scoped：PDFPageView 渲染的 .page/.canvasWrapper 是运行时插入的，scoped 选择器命不中 -->
<style>
.pdf-page-wrap {
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  background: #fff;
}
.pdf-page-wrap .page {
  margin: 0 auto;
  border: none;
  position: relative;
}

/* 文字层：透明文字覆盖在 canvas 上（canvas 显示真实文字），仅用于选中 + 差异染色。 */
.pdf-pane .textLayer {
  opacity: 1;
}
.pdf-pane .textLayer span {
  color: transparent;
}
.pdf-pane .textLayer .fd-del,
.pdf-pane .textLayer span.fd-del {
  background-color: transparent;
  box-shadow: none;
}
.pdf-pane .textLayer .fd-add,
.pdf-pane .textLayer span.fd-add {
  background-color: transparent;
  box-shadow: none;
}

.pdf-page-wrap .fd-mark-rect {
  position: absolute;
  display: block;
  pointer-events: none;
  z-index: 3;
  border-radius: 2px;
}
.pdf-page-wrap .fd-mark-rect.fd-del {
  background-color: rgba(245, 108, 108, 0.5);
}
.pdf-page-wrap .fd-mark-rect.fd-add {
  background-color: rgba(103, 194, 58, 0.5);
}
</style>
