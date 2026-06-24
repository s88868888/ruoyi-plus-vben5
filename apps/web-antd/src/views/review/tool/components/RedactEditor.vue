<template>
  <!-- 脱敏编辑器：把被审查文档「拍平成图 + 像素涂黑」导出，不可逆。
       为什么不复用 exportAnnotatedPdf：那套是在原页【叠加】黑块（浮层），电子版文字仍在内容流、
       扫描件 searchable PDF 的隐藏 OCR 文字层仍可提取 → 可逆。本组件每页用 pdfjs 重渲到 canvas，
       在敏感区直接 fillRect 黑（销毁像素），再 embedJpg 拼成【无任何文字层】的纯图 PDF →
       既无可提取文字、敏感像素也物理消失，对方拿到的是一张开了天窗的图，无法逆向。
       坐标体系：黑条框用归一化 {x0,y0,x1,y1}∈[0,1]（相对页面），与显示/导出缩放无关，父子同源。 -->
  <Modal
    :open="open"
    :footer="null"
    :closable="false"
    :mask-closable="false"
    :destroy-on-close="true"
    :get-container="false"
    :width="'100vw'"
    wrap-class-name="redact-modal redact-modal-fullscreen"
    :style="{ top: 0, maxWidth: '100vw', paddingBottom: 0 }"
    :body-style="{ padding: '0', height: '100vh' }"
    @update:open="(v) => $emit('update:open', v)"
  >
    <div class="redact-wrap">
      <div class="redact-toolbar">
        <span class="rt-title">
          <EyeInvisibleOutlined />
          <span class="rt-name" :title="fileName">脱敏编辑：{{ fileName }}</span>
          <Tag color="processing">{{ boxes.length }} 处遮盖</Tag>
          <Tag v-if="autoCount" color="warning">自动 {{ autoCount }}</Tag>
        </span>
        <span class="rt-actions">
          <Button size="small" :disabled="loading || exporting" @click="resetAuto">
            <ReloadOutlined />重置
          </Button>
          <Button size="small" :loading="saving" :disabled="loading || exporting" @click="saveManualBoxes">
            <SaveOutlined />保存
          </Button>
          <Button size="small" :disabled="loading || exporting || !boxes.length" @click="clearAll">
            <DeleteOutlined />清空
          </Button>
          <Button
            type="primary"
            size="small"
            :loading="exporting"
            :disabled="loading"
            @click="doExport"
          >
            <DownloadOutlined />打印
          </Button>
          <Button size="small" :disabled="exporting" @click="$emit('update:open', false)">取消</Button>
        </span>
      </div>

      <div ref="stageRef" class="redact-stage">
        <div v-if="loading" class="redact-tip">
          <LoadingOutlined spin /><span>加载文档…</span>
        </div>
        <div v-else-if="!pages.length" class="redact-tip">
          <ExclamationCircleOutlined /><span>{{ loadError || '无文档内容' }}</span>
        </div>
        <template v-else>
          <div
            v-for="pg in pages"
            :key="pg.num"
            class="redact-page"
            :data-page="pg.num"
            :style="{ width: pg.cssW + 'px', height: pg.cssH + 'px' }"
            @mousedown="onPageMouseDown($event, pg.num)"
          >
            <img :src="pg.imgUrl" class="redact-img" draggable="false" alt="" />
            <div
              v-for="b in boxesOfPage(pg.num)"
              :key="b.id"
              class="redact-box"
              :class="{ sel: b.id === selId, 'src-auto': b.source === 'auto' }"
              :style="boxStyle(b, pg)"
              @mousedown.stop="onBoxMouseDown($event, b)"
            >
              <span class="rb-del" title="删除此遮盖" @mousedown.stop="removeBox(b.id)" @click.stop>×</span>
              <template v-if="b.id === selId">
                <i
                  v-for="h in HANDLES"
                  :key="h"
                  class="rb-h"
                  :class="'h-' + h"
                  @mousedown.stop="onHandleDown($event, b, h)"
                ></i>
              </template>
            </div>
          </div>
          <div class="redact-foot">
            共 {{ pages.length }} 页 · 导出为纯图片 PDF（无文字层，黑条区域像素已销毁，不可逆）
          </div>
        </template>
      </div>
    </div>
  </Modal>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { Button, Modal, Tag, message } from 'ant-design-vue'
import {
  EyeInvisibleOutlined, ReloadOutlined, DeleteOutlined, DownloadOutlined,
  LoadingOutlined, ExclamationCircleOutlined, SaveOutlined
} from '@ant-design/icons-vue'
import { PDFDocument } from 'pdf-lib'
import { pdfjsLib } from '#/utils/pdfjsSetup'

const props = defineProps({
  open: { type: Boolean, default: false },
  // 被审查文档原始字节（ArrayBuffer/Uint8Array），与查看器同一份
  pdfBytes: { type: [ArrayBuffer, Uint8Array], default: null },
  // 自动预填的黑条框：固定使用“文档值”粒度，归一化 {page,x0,y0,x1,y1}
  initBoxes: { type: Array, default: () => [] },
  savedBoxes: { type: Array, default: () => [] },
  saving: { type: Boolean, default: false },
  fileName: { type: String, default: '脱敏件.pdf' }
})
const emit = defineEmits(['update:open', 'save'])

const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
const EXPORT_SCALE = 2.0 // 导出栅格化缩放：~144DPI，与服务端 OCR 渲染同档，清晰且内存可控

const stageRef = ref(null)
const loading = ref(false)
const loadError = ref('')
const exporting = ref(false)
const pages = ref([]) // [{num, cssW, cssH, imgUrl}]
const boxes = ref([]) // [{id, page, x0,y0,x1,y1, source}]
const selId = ref('')

let pdfDocRef = null
let idSeq = 0
let drag = null

const autoCount = computed(() => boxes.value.filter((b) => b.source === 'auto').length)

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }
function toUint8(d) {
  if (!d) return null
  return d instanceof Uint8Array ? d : new Uint8Array(d)
}

// ===== 独立 worker（与 PdfPane 同策略，避免全局被旧版 pdfjs 污染导致版本不匹配）=====
let pdfWorker = null
function ensureWorker() {
  if (pdfWorker) return pdfWorker
  try {
    const src = pdfjsLib.GlobalWorkerOptions.workerSrc
    pdfWorker = new pdfjsLib.PDFWorker({ port: new Worker(src) })
  } catch (e) {
    console.warn('[RedactEditor] 建独立 worker 失败，回退全局', e)
    pdfWorker = null
  }
  return pdfWorker
}

function boxesOfPage(page) {
  return boxes.value.filter((b) => b.page === page)
}
function boxStyle(b, pg) {
  // 用 min/max 兜底「反向拖拽」时的实时显示
  const x0 = Math.min(b.x0, b.x1), y0 = Math.min(b.y0, b.y1)
  const x1 = Math.max(b.x0, b.x1), y1 = Math.max(b.y0, b.y1)
  return {
    left: x0 * pg.cssW + 'px',
    top: y0 * pg.cssH + 'px',
    width: (x1 - x0) * pg.cssW + 'px',
    height: (y1 - y0) * pg.cssH + 'px'
  }
}

// ===== 框选 / 拖动 / 缩放 =====
function clientToNorm(e, rect) {
  return {
    x: clamp((e.clientX - rect.left) / rect.width, 0, 1),
    y: clamp((e.clientY - rect.top) / rect.height, 0, 1)
  }
}
function bindWin() {
  window.addEventListener('mousemove', onWinMove)
  window.addEventListener('mouseup', onWinUp)
}
function unbindWin() {
  window.removeEventListener('mousemove', onWinMove)
  window.removeEventListener('mouseup', onWinUp)
}

function onPageMouseDown(e, page) {
  if (e.button !== 0 || exporting.value) return
  const rect = e.currentTarget.getBoundingClientRect()
  const p = clientToNorm(e, rect)
  const id = 'r' + (++idSeq)
  boxes.value.push({ id, page, x0: p.x, y0: p.y, x1: p.x, y1: p.y, source: 'manual' })
  const box = boxes.value[boxes.value.length - 1] // 取响应式代理来改坐标
  selId.value = id
  drag = { mode: 'draw', rect, box }
  bindWin()
  e.preventDefault()
}
function onBoxMouseDown(e, b) {
  if (e.button !== 0 || exporting.value) return
  selId.value = b.id
  const pageEl = e.currentTarget.parentElement
  const rect = pageEl.getBoundingClientRect()
  const p = clientToNorm(e, rect)
  drag = {
    mode: 'move', rect, box: b,
    grab: { dx: p.x - b.x0, dy: p.y - b.y0, w: b.x1 - b.x0, h: b.y1 - b.y0 }
  }
  bindWin()
  e.preventDefault()
}
function onHandleDown(e, b, h) {
  if (e.button !== 0 || exporting.value) return
  selId.value = b.id
  const pageEl = e.currentTarget.closest('.redact-page')
  const rect = pageEl.getBoundingClientRect()
  drag = { mode: 'resize', rect, box: b, handle: h }
  bindWin()
  e.preventDefault()
}
function onWinMove(e) {
  if (!drag) return
  const p = clientToNorm(e, drag.rect)
  const b = drag.box
  if (drag.mode === 'draw') {
    b.x1 = p.x; b.y1 = p.y
  } else if (drag.mode === 'move') {
    const nx0 = clamp(p.x - drag.grab.dx, 0, 1 - drag.grab.w)
    const ny0 = clamp(p.y - drag.grab.dy, 0, 1 - drag.grab.h)
    b.x0 = nx0; b.y0 = ny0; b.x1 = nx0 + drag.grab.w; b.y1 = ny0 + drag.grab.h
  } else if (drag.mode === 'resize') {
    const h = drag.handle
    if (h.includes('w')) b.x0 = Math.min(p.x, b.x1 - 0.005)
    if (h.includes('e')) b.x1 = Math.max(p.x, b.x0 + 0.005)
    if (h.includes('n')) b.y0 = Math.min(p.y, b.y1 - 0.005)
    if (h.includes('s')) b.y1 = Math.max(p.y, b.y0 + 0.005)
  }
}
function onWinUp() {
  if (drag && drag.mode === 'draw') {
    const b = drag.box
    const x0 = Math.min(b.x0, b.x1), x1 = Math.max(b.x0, b.x1)
    const y0 = Math.min(b.y0, b.y1), y1 = Math.max(b.y0, b.y1)
    b.x0 = x0; b.x1 = x1; b.y0 = y0; b.y1 = y1
    // 太小视为误触，丢弃
    if (x1 - x0 < 0.008 || y1 - y0 < 0.006) {
      boxes.value = boxes.value.filter((x) => x.id !== b.id)
      selId.value = ''
    }
  }
  drag = null
  unbindWin()
}
function removeBox(id) {
  boxes.value = boxes.value.filter((b) => b.id !== id)
  if (selId.value === id) selId.value = ''
}
function clearAll() {
  boxes.value = []
  selId.value = ''
}
function normalizeBox(b, source = 'manual') {
  const page = Number(b?.page)
  const x0 = clamp(Number(b?.x0), 0, 1)
  const y0 = clamp(Number(b?.y0), 0, 1)
  const x1 = clamp(Number(b?.x1), 0, 1)
  const y1 = clamp(Number(b?.y1), 0, 1)
  if (!Number.isFinite(page) || page < 1) return null
  if (![x0, y0, x1, y1].every(Number.isFinite)) return null
  if (Math.abs(x1 - x0) < 0.002 || Math.abs(y1 - y0) < 0.002) return null
  return {
    id: 'r' + (++idSeq),
    page: Math.floor(page),
    x0: Math.min(x0, x1), y0: Math.min(y0, y1),
    x1: Math.max(x0, x1), y1: Math.max(y0, y1),
    source
  }
}
function autoBoxList() {
  return (props.initBoxes || []).map((b) => normalizeBox(b, 'auto')).filter(Boolean)
}
function savedBoxList() {
  return (props.savedBoxes || []).map((b) => normalizeBox(b, 'saved')).filter(Boolean)
}
function seedBoxes() {
  boxes.value = [...autoBoxList(), ...savedBoxList()]
  selId.value = ''
}
function resetAuto() {
  seedBoxes()
  if (!boxes.value.length) message.info('无自动匹配项，请手动框选')
}
function manualBoxesForSave() {
  return boxes.value
    .filter((b) => b.source !== 'auto')
    .map((b) => ({ page: b.page, x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1 }))
}
function saveManualBoxes() {
  emit('save', manualBoxesForSave())
}

// ===== 加载 + 渲染（编辑预览）=====
async function loadPages() {
  loading.value = true
  loadError.value = ''
  pages.value = []
  const bytes = toUint8(props.pdfBytes)
  if (!bytes || !bytes.length) { loading.value = false; loadError.value = '无文档内容'; return }
  try {
    const worker = ensureWorker()
    const opts = worker ? { data: bytes.slice(), worker } : { data: bytes.slice() }
    pdfDocRef = await pdfjsLib.getDocument(opts).promise
    const n = pdfDocRef.numPages
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const first = await pdfDocRef.getPage(1)
    const base = first.getViewport({ scale: 1 })
    const avail = (stageRef.value?.clientWidth || 960) - 48
    const dispScale = clamp(Math.min(900, avail) / base.width, 0.3, 2)
    for (let i = 1; i <= n; i++) {
      const page = i === 1 ? first : await pdfDocRef.getPage(i)
      const vp1 = page.getViewport({ scale: 1 })
      const vp = page.getViewport({ scale: dispScale * dpr })
      const canvas = document.createElement('canvas')
      canvas.width = Math.ceil(vp.width)
      canvas.height = Math.ceil(vp.height)
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      await page.render({ canvasContext: ctx, viewport: vp }).promise
      pages.value.push({
        num: i,
        cssW: vp1.width * dispScale,
        cssH: vp1.height * dispScale,
        imgUrl: canvas.toDataURL('image/jpeg', 0.82)
      })
      canvas.width = 0; canvas.height = 0 // 释放
    }
  } catch (e) {
    console.error('[RedactEditor] 加载失败', e)
    loadError.value = '加载失败：' + (e?.message || e)
    message.error(loadError.value)
  } finally {
    loading.value = false
  }
}

// ===== 导出：每页高清重渲 → 涂黑 → embedJpg 拼无文字层 PDF =====
function dataUrlToBytes(url) {
  const b64 = atob(url.split(',')[1])
  const arr = new Uint8Array(b64.length)
  for (let i = 0; i < b64.length; i++) arr[i] = b64.charCodeAt(i)
  return arr
}
function downloadBlob(bytes, name) {
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
async function doExport() {
  if (exporting.value || !pdfDocRef) return
  if (!boxes.value.length) { message.warning('未框选任何遮盖区域'); return }
  exporting.value = true
  try {
    const out = await PDFDocument.create()
    const n = pdfDocRef.numPages
    for (let i = 1; i <= n; i++) {
      const page = await pdfDocRef.getPage(i)
      const vp1 = page.getViewport({ scale: 1 })
      const vp = page.getViewport({ scale: EXPORT_SCALE })
      const canvas = document.createElement('canvas')
      canvas.width = Math.ceil(vp.width)
      canvas.height = Math.ceil(vp.height)
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      await page.render({ canvasContext: ctx, viewport: vp }).promise
      // 销毁像素：在敏感区实心涂黑（画在位图上，导出后无法移除/还原）
      ctx.fillStyle = '#000'
      boxes.value.filter((b) => b.page === i).forEach((b) => {
        const x0 = Math.min(b.x0, b.x1), y0 = Math.min(b.y0, b.y1)
        const x1 = Math.max(b.x0, b.x1), y1 = Math.max(b.y0, b.y1)
        ctx.fillRect(
          Math.floor(x0 * canvas.width),
          Math.floor(y0 * canvas.height),
          Math.ceil((x1 - x0) * canvas.width),
          Math.ceil((y1 - y0) * canvas.height)
        )
      })
      const jpg = dataUrlToBytes(canvas.toDataURL('image/jpeg', 0.92))
      const img = await out.embedJpg(jpg)
      const pg = out.addPage([vp1.width, vp1.height])
      pg.drawImage(img, { x: 0, y: 0, width: vp1.width, height: vp1.height })
      canvas.width = 0; canvas.height = 0
    }
    const bytes = await out.save()
    downloadBlob(bytes, props.fileName)
    message.success(`脱敏件（${n} 页 · ${boxes.value.length} 处遮盖 · 已拍平为图片，不可逆）`)
    emit('update:open', false)
  } catch (e) {
    console.error('[RedactEditor] 导出失败', e)
    message.error('脱敏导出失败：' + (e?.message || e))
  } finally {
    exporting.value = false
  }
}

function teardown() {
  unbindWin()
  drag = null
  pages.value = []
  boxes.value = []
  selId.value = ''
  if (pdfDocRef) { try { pdfDocRef.destroy() } catch (e) {} pdfDocRef = null }
}

watch(() => props.open, (v) => {
  if (v) {
    seedBoxes()
    loadPages()
  } else {
    teardown()
  }
})

onBeforeUnmount(() => {
  emit('update:open', false)
  teardown()
  if (pdfWorker) { try { pdfWorker.destroy() } catch (e) {} pdfWorker = null }
})
</script>

<style scoped>
.redact-wrap {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f6f8;
}
.redact-toolbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: linear-gradient(180deg, #fafbfc, #f0f2f5);
  border-bottom: 1px solid #ebeef5;
}
.rt-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: #303133;
  min-width: 0;
}
.rt-name {
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rt-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.redact-stage {
  flex: 1;
  min-height: 0;
  overflow: auto;
  background: #525659;
  padding: 20px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.redact-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #e6e8eb;
  margin-top: 40px;
}
.redact-page {
  position: relative;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  cursor: crosshair;
  user-select: none;
}
.redact-img {
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.redact-box {
  position: absolute;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.5);
  cursor: move;
  box-sizing: border-box;
}
.redact-box.src-auto {
  border-color: #faad14;
}
.redact-box.sel {
  border: 1.5px solid #409eff;
  background: rgba(0, 0, 0, 0.72);
}
.rb-del {
  position: absolute;
  top: -10px;
  right: -10px;
  width: 18px;
  height: 18px;
  line-height: 16px;
  text-align: center;
  border-radius: 50%;
  background: #f56c6c;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  z-index: 2;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
}
.rb-h {
  position: absolute;
  width: 9px;
  height: 9px;
  background: #fff;
  border: 1.5px solid #409eff;
  border-radius: 2px;
  z-index: 2;
}
.h-nw { top: -5px; left: -5px; cursor: nwse-resize; }
.h-n  { top: -5px; left: 50%; margin-left: -5px; cursor: ns-resize; }
.h-ne { top: -5px; right: -5px; cursor: nesw-resize; }
.h-e  { top: 50%; right: -5px; margin-top: -5px; cursor: ew-resize; }
.h-se { bottom: -5px; right: -5px; cursor: nwse-resize; }
.h-s  { bottom: -5px; left: 50%; margin-left: -5px; cursor: ns-resize; }
.h-sw { bottom: -5px; left: -5px; cursor: nesw-resize; }
.h-w  { top: 50%; left: -5px; margin-top: -5px; cursor: ew-resize; }
.redact-foot {
  color: #b8bdc4;
  font-size: 12px;
  padding: 4px 0 12px;
}
:global(.redact-modal-fullscreen .ant-modal) {
  top: 0;
  max-width: 100vw;
  padding-bottom: 0;
  margin: 0;
}
:global(.redact-modal-fullscreen .ant-modal-content) {
  width: 100vw;
  height: 100vh;
  border-radius: 0;
  overflow: hidden;
}
:global(.redact-modal-fullscreen .ant-modal-body) {
  height: 100vh;
}
</style>
