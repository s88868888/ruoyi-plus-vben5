<template>
  <div
    class="file-diff-viewer"
    :class="{
      'ai-panel-visible': aiReview && aiPanelOpen,
      'diff-panel-visible': diffPanelOpen
    }"
    :style="{ cursor: msgLoading ? 'progress' : 'default' }"
  >
    <div class="similarity-bar">
      <span class="bar-left">
        <Checkbox
          v-model:checked="blockHighlight"
          class="ocr-debug-toggle"
          title="点击差异时，左右两侧画高亮框并用虚线连接"
        >差异连线</Checkbox>
        <Checkbox
          v-model:checked="syncLocked"
          class="ocr-debug-toggle"
          title="开启时左右两侧同步滚动；关闭可各自独立滚动"
        >同步滚动</Checkbox>
        <Checkbox
          v-model:checked="ignoreFormatDiff"
          class="ocr-debug-toggle"
          title="忽略换行和排版，只按连续文字内容对比"
        >忽略格式</Checkbox>
      </span>
      <span class="label">
        <span class="side-block">
          <Tag color="default" class="side-tag old-tag">原文件</Tag>
          <span class="side-name">{{ sourceALabel }}</span>
        </span>
        <span class="vs">vs</span>
        <span class="side-block">
          <Tag color="default" class="side-tag new-tag">目标文件</Tag>
          <span class="side-name">{{ sourceBLabel }}</span>
        </span>
      </span>
      <span class="sim-text">
        <!-- 缩放（两侧联动）。仅双 PDF 时显示 -->
        <span v-if="oldType === 'pdf' && newType === 'pdf'" class="pdf-toolbar">
          <button class="tb-btn" @click="zoom(-1)" title="缩小">−</button>
          <span class="tb-zoom" @click="fitWidth" title="点击适应宽度">{{ zoomPercent }}%</span>
          <button class="tb-btn" @click="zoom(1)" title="放大">＋</button>
        </span>
        <Button
          type="link"
          size="small"
          class="diff-panel-toggle"
          @click="diffPanelOpen = !diffPanelOpen"
        >
          <ProfileOutlined />
          <span>{{ diffPanelOpen ? '收起清单' : '差异清单' }}</span>
        </Button>
        <Button
          v-if="oldType === 'pdf' && newType === 'pdf'"
          type="link"
          size="small"
          class="diff-panel-toggle"
          :loading="exporting"
          :disabled="!ocrDiffList.length"
          title="导出右侧回传件，差异作为高亮批注嵌入"
          @click="onExportAnnotated"
        >
          <PrinterOutlined />
          <span>打印</span>
        </Button>
        <LoadingOutlined v-if="msgLoading" spin />
        <Button
          type="link"
          class="close-btn"
          @click="$emit('close')"
          title="关闭"
        >
          <CloseOutlined />
        </Button>
      </span>
    </div>
    <!-- 扫描件 OCR 状态条:OCR 进行中提示用户等待,完成后自动切换到 searchable PDF -->
    <div v-if="ocrBannerType !== 'none'" class="ocr-banner" :class="ocrBannerType">
      <LoadingOutlined v-if="ocrBannerType === 'progress'" spin />
      <WarningFilled v-else-if="ocrBannerType === 'fail'" />
      <span v-if="ocrBannerType === 'progress'">
        扫描件智能识别中,完成后自动加载差异高亮({{ ocrElapsedSec }}s)…
      </span>
      <span v-else-if="ocrBannerType === 'fail'">
        OCR 失败,当前仅展示原扫描图,无法做字符级 diff。可联系管理员手动重试。
      </span>
    </div>
    <!-- 退化提示:一侧抽不到文字(典型为扫描件未 OCR),不再整片标红,给出明确原因 -->
    <div v-if="degenerateSide && ocrBannerType === 'none'" class="ocr-banner degenerate">
      <WarningFilled />
      <span v-if="degenerateSide === 'B'">
        {{ sourceBLabel }}暂未识别出文字层,无法逐字比对(常见于扫描件未完成 OCR)。已自动尝试重新识别,请稍候或刷新；若持续如此请联系管理员。
      </span>
      <span v-else>
        {{ sourceALabel }}暂未读取到文字层,无法逐字比对。请确认该文件为可选中文字的 PDF。
      </span>
    </div>
    <div ref="comparisonRef" class="comparison-list">
      <!-- 缩放重渲遮罩：盖住全量重渲闪烁，完成后撤掉并恢复染色/连线 -->
      <div v-if="zooming" class="zoom-mask">
        <LoadingOutlined spin />
        <span>缩放渲染中…</span>
      </div>
      <!-- AI 审核侧栏 -->
      <aside
        v-if="aiReview && aiPanelOpen"
        class="ai-panel"
      >
        <div class="ai-panel-header">
          <ThunderboltOutlined class="ai-icon" />
          <span class="ai-title">AI 审核结果</span>
          <Tag :color="aiStatusType">{{ aiStatusText }}</Tag>
        </div>

        <div class="ai-overview">
          <div class="ai-overview-item">
            <div class="oi-num">{{ aiReview.score == null ? '-' : aiReview.score }}</div>
            <div class="oi-label">评分</div>
          </div>
          <div class="ai-overview-item">
            <div class="oi-num danger">{{ aiReview.errorCount || 0 }}</div>
            <div class="oi-label">错误</div>
          </div>
          <div class="ai-overview-item">
            <div class="oi-num warning">{{ aiReview.warningCount || 0 }}</div>
            <div class="oi-label">警告</div>
          </div>
          <div class="ai-overview-item">
            <div class="oi-num info">{{ aiReview.infoCount || 0 }}</div>
            <div class="oi-label">提示</div>
          </div>
        </div>

        <div v-if="aiReview.aiSummary" class="ai-summary">
          <div class="ai-section-title">AI 摘要</div>
          <div class="ai-summary-content">{{ aiReview.aiSummary }}</div>
        </div>

        <div class="ai-issues">
          <div class="ai-section-header">
            <span class="ai-section-title">问题明细（{{ filteredIssues.length }} / {{ (aiReview.issues || []).length }}）</span>
            <div class="ai-filter">
              <button
                v-for="opt in severityFilterOptions"
                :key="opt.key"
                class="ai-filter-btn"
                :class="{ active: severityFilter === opt.key, [`sev-${opt.key}`]: true }"
                @click="severityFilter = opt.key"
              >
                <span class="dot"></span>{{ opt.label }}
                <span class="ai-filter-count">{{ countBySeverity(opt.key) }}</span>
              </button>
            </div>
          </div>
          <div v-if="filteredIssues.length === 0" class="ai-empty">
            <Empty description="无匹配问题" :image-style="{ height: '60px' }" />
          </div>
          <ul v-else class="ai-issue-list">
            <li
              v-for="(issue, idx) in filteredIssues"
              :key="idx"
              class="ai-issue-item"
              :class="`sev-${(issue.severity || 'info').toLowerCase()}`"
            >
              <div class="ai-issue-head">
                <span class="ai-sev-chip" :class="`sev-${(issue.severity || 'info').toLowerCase()}`">
                  {{ severityLabel(issue.severity) }}
                </span>
                <span class="ai-issue-field" :title="issue.fieldLabel || issue.fieldName">
                  {{ issue.fieldLabel || issue.fieldName || '未命名字段' }}
                </span>
                <span
                  v-if="issue.matchStatus"
                  class="ai-match-chip"
                  :class="`match-${(issue.matchStatus || '').toLowerCase()}`"
                >
                  <span class="match-icon">{{ matchIcon(issue.matchStatus) }}</span>
                  {{ matchLabel(issue.matchStatus) }}
                </span>
              </div>

              <div v-if="issue.description" class="ai-issue-desc">{{ issue.description }}</div>

              <div v-if="issue.formValue || issue.extractedValue" class="ai-issue-values">
                <div v-if="issue.formValue" class="value-row form-row">
                  <span class="value-tag">表单</span>
                  <span class="value-text">{{ issue.formValue }}</span>
                </div>
                <div v-if="issue.extractedValue" class="value-row extract-row">
                  <span class="value-tag">附件</span>
                  <span class="value-text">{{ issue.extractedValue }}</span>
                </div>
              </div>

              <div v-if="issue.suggestion" class="ai-issue-sugg">
                <InfoCircleFilled class="sugg-icon" />
                <span>{{ issue.suggestion }}</span>
              </div>

              <div v-if="issue.location" class="ai-issue-loc">
                <AimOutlined />{{ issue.location }}
              </div>
            </li>
          </ul>
        </div>
      </aside>

      <!-- 左侧（A） -->
      <div v-if="sourceAUrl" ref="oldBoxRef" class="old-box pane" @click="onPaneClick('A', $event)">
        <template v-if="oldType === 'pdf'">
          <div v-if="oldError" class="fetch-error">
            <WarningFilled />
            <span>{{ oldError }}</span>
          </div>
          <!-- 自渲染 PdfPane（pdfjs-dist），与连线浮层共享坐标系 -->
          <PdfPane
            v-else
            ref="pdfPaneARef"
            :data="oldPdfData"
            side="A"
            :loading-text="`加载 ${sourceALabel} 中...`"
            @rendered="onPaneRenderedA"
            @error="onPaneErrorA"
          />
        </template>
        <div v-else-if="oldType === 'docx'" class="docx-box-wrap">
          <div v-if="oldError" class="fetch-error">
            <WarningFilled />
            <span>{{ oldError }}</span>
          </div>
          <div class="docx-box" v-show="!oldError">
            <vue-office-docx
              :src="sourceAUrl"
              class="old-docx"
              @rendered="renderedOld"
              @error="onOldDocxError"
            />
          </div>
        </div>
        <div v-else-if="oldType === 'image'" class="image-box-wrap">
          <img :src="sourceAUrl" class="preview-image" @load="readyList[0] = true" />
        </div>
        <div v-else class="fetch-error">不支持的文件类型</div>
      </div>
      <!-- 中间固定分割条：留白通道 + 承载差异图标。作为 flex item 始终居于左右 pane 之间，
           不随 AI 审核/差异清单抽屉开关而漂移。仅文字层双 PDF 模式显示。 -->
      <div
        v-if="compareMode === 'text' && oldType === 'pdf' && newType === 'pdf'"
        ref="gutterRef"
        class="diff-gutter"
      >
        <button
          v-for="b in connBadges"
          :key="b.idx"
          class="conn-badge"
          :class="['dt-' + b.type, { active: b.idx === currentDiffIdx }]"
          :style="{ top: b.y + 'px' }"
          :title="diffTypeLabel(b.type)"
          @click.stop="gotoDiff(b.idx, { openPanel: true, focusList: true })"
        >
          <EditOutlined v-if="b.type === 'modify'" />
          <span v-else>{{ connIcon(b.type) }}</span>
        </button>
      </div>
      <!-- 右侧（B） -->
      <div v-if="sourceBUrl" ref="newBoxRef" class="new-box pane" @click="onPaneClick('B', $event)">
        <template v-if="newType === 'pdf'">
          <div v-if="newError" class="fetch-error">
            <WarningFilled />
            <span>{{ newError }}</span>
          </div>
          <!-- 自渲染 PdfPane（pdfjs-dist），与连线浮层共享坐标系 -->
          <PdfPane
            v-else
            ref="pdfPaneBRef"
            :data="newPdfData"
            side="B"
            :loading-text="`加载 ${sourceBLabel} 中...`"
            @rendered="onPaneRenderedB"
            @error="onPaneErrorB"
          />
        </template>
        <div v-else-if="newType === 'docx'" class="docx-box-wrap">
          <div v-if="newError" class="fetch-error">
            <WarningFilled />
            <span>{{ newError }}</span>
          </div>
          <div class="docx-box" v-show="!newError">
            <vue-office-docx
              :src="sourceBUrl"
              class="new-docx"
              @rendered="renderedNew"
              @error="onNewDocxError"
            />
          </div>
        </div>
        <div v-else-if="newType === 'image'" class="image-box-wrap">
          <img :src="sourceBUrl" class="preview-image" @load="readyList[1] = true" />
        </div>
        <div v-else class="fetch-error">不支持的文件类型</div>
      </div>

      <!-- 差异清单侧栏：两种模式通用，置于最右。默认隐藏，点击逐处定位 -->
      <aside
        v-if="diffPanelOpen"
        class="diff-panel diff-panel-right"
      >
        <div class="diff-panel-header">
          <span class="diff-title">差异清单</span>
          <span class="diff-count"><b class="diff-count-num">{{ ocrDiffList.length }}</b> 处</span>
          <div class="diff-nav">
            <button class="diff-nav-btn" :disabled="!ocrDiffList.length" @click="gotoPrevDiff" title="上一处">↑</button>
            <button class="diff-nav-btn" :disabled="!ocrDiffList.length" @click="gotoNextDiff" title="下一处">↓</button>
          </div>
        </div>
        <div v-if="ocrDiffList.length" class="diff-filter">
          <button
            v-for="opt in diffTypeFilterOptions"
            :key="opt.key"
            class="diff-filter-btn"
            :class="{ active: diffTypeFilter === opt.key, [`dt-${opt.key}`]: true }"
            @click="diffTypeFilter = opt.key"
          >
            <span class="dot"></span>{{ opt.label }}
            <span class="diff-filter-count">{{ countByDiffType(opt.key) }}</span>
          </button>
        </div>
        <div v-if="!ocrDiffList.length" class="diff-empty">
          <Empty description="暂无差异" :image-style="{ height: '50px' }" />
        </div>
        <div v-else-if="!filteredDiffList.length" class="diff-empty">
          <Empty description="无匹配差异" :image-style="{ height: '50px' }" />
        </div>
        <ul v-else ref="diffListRef" class="diff-list">
          <Tooltip
            v-for="{ item, idx } in filteredDiffList"
            :key="idx"
            placement="left"
            :mouse-enter-delay="0.2"
            overlay-class-name="diff-tooltip"
          >
            <template #title>
              <div class="diff-tip">
                <div v-if="item.leftText" class="diff-tip-row">
                  <span class="diff-tip-tag del">原</span>
                  <span class="diff-tip-text">{{ item.leftText }}</span>
                </div>
                <div v-if="item.rightText" class="diff-tip-row">
                  <span class="diff-tip-tag add">新</span>
                  <span class="diff-tip-text">{{ item.rightText }}</span>
                </div>
              </div>
            </template>
            <li
              class="diff-item"
              :data-diff-idx="idx"
              :class="[`dt-${item.type}`, { active: idx === currentDiffIdx }]"
              @click="gotoDiff(idx)"
            >
              <div class="diff-item-head">
                <span class="diff-badge" :class="`dt-${item.type}`">{{ diffTypeLabel(item.type) }}</span>
                <span class="diff-seq">#{{ idx + 1 }}</span>
                <!-- 编辑批注 + 删除 统一放在右上角（仅图标） -->
                <span class="diff-actions" @click.stop>
                  <span
                    class="diff-edit-btn"
                    :class="{ active: editingNoteIdx === idx, 'is-saving': savingIdx === idx }"
                    :title="savingIdx === idx ? '保存中' : (editingNoteIdx === idx ? '正在编辑，失去焦点保存' : '编辑批注')"
                    @click="startEditNote(idx)"
                  >
                    <LoadingOutlined v-if="savingIdx === idx" spin />
                    <EditOutlined v-else />
                  </span>
                  <span class="diff-del-btn" title="删除此条（不导出）" @click="removeDiff(idx)"><DeleteOutlined /></span>
                </span>
              </div>
              <div
                class="diff-texts"
                :class="{ expanded: expandedDiffIdxSet.has(idx) }"
              >
                <div v-if="item.leftText" class="diff-text-row left">
                  <span class="dt-tag">原</span>
                  <span class="diff-text-content">{{ item.leftText }}</span>
                </div>
                <div v-if="item.rightText || item.type === 'del'" class="diff-text-row right">
                  <span class="dt-tag">新</span>
                  <span class="diff-text-content">{{ item.rightText }}</span>
                </div>
                <button
                  v-if="hasLongDiffText(item)"
                  type="button"
                  class="diff-expand-btn"
                  :title="expandedDiffIdxSet.has(idx) ? '收起差异内容' : '展开差异内容'"
                  @click.stop="toggleDiffText(idx)"
                >
                  <UpOutlined v-if="expandedDiffIdxSet.has(idx)" />
                  <DownOutlined v-else />
                </button>
              </div>
              <!-- 可编辑批注：默认填好摘要，用户改写后即为导出批注内容。@click.stop 不触发定位 -->
              <div class="diff-note" @click.stop>
                <Input.TextArea
                  v-model:value="item.note"
                  :ref="(el) => setNoteInputRef(idx, el)"
                  :auto-size="{ minRows: 1, maxRows: 3 }"
                  size="small"
                  :readonly="editingNoteIdx !== idx"
                  :class="{ 'is-editing': editingNoteIdx === idx }"
                  placeholder="批注内容（导出时写入 PDF）"
                  @blur="finishEditNote(idx)"
                />
              </div>
            </li>
          </Tooltip>
        </ul>
      </aside>

      <!-- 连线浮层：覆盖整个对比区。点击差异（清单条目 / 中间图标 / 左侧文档差异行）后，
           左右两侧各画高亮框并用虚线连接。坐标全部相对 .comparison-list（同文档，零跨边界换算）。
           pointer-events:none 不挡 PDF 操作。仅文字层双 PDF 模式且当前项有效时渲染。 -->
      <div
        v-if="compareMode === 'text' && oldType === 'pdf' && newType === 'pdf' && activeConn"
        class="conn-overlay"
      >
        <svg class="conn-svg" :width="overlayW" :height="overlayH">
          <rect
            v-if="activeConn.left"
            :x="activeConn.left.x" :y="activeConn.left.y"
            :width="activeConn.left.w" :height="activeConn.left.h"
            class="conn-rect" :class="'dt-' + activeConn.type" rx="3"
            @click.stop="gotoDiff(currentDiffIdx, { openPanel: true, focusList: true })"
          />
          <rect
            v-if="activeConn.right"
            :x="activeConn.right.x" :y="activeConn.right.y"
            :width="activeConn.right.w" :height="activeConn.right.h"
            class="conn-rect" :class="'dt-' + activeConn.type" rx="3"
            @click.stop="gotoDiff(currentDiffIdx, { openPanel: true, focusList: true })"
          />
          <path
            v-if="activeConn.left && activeConn.right"
            :d="activeConn.path"
            class="conn-line" :class="'dt-' + activeConn.type"
            @click.stop="gotoDiff(currentDiffIdx, { openPanel: true, focusList: true })"
          />
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup>
import VueOfficeDocx from '@vue-office/docx/lib/v3/vue-office-docx.mjs'
import '@vue-office/docx/lib/v3/index.css'
import { ref, shallowRef, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { Button, Checkbox, Empty, Tag, Tooltip, message } from 'ant-design-vue'
import {
  LoadingOutlined, WarningFilled, ThunderboltOutlined, CloseOutlined,
  InfoCircleFilled, AimOutlined, EditOutlined, DeleteOutlined,
  ProfileOutlined, PrinterOutlined, DownOutlined, UpOutlined
} from '@ant-design/icons-vue'
import { diffDocumentAnchored, diffDocumentDetailed } from '#/utils/fileDiff'
import { exportAnnotatedPdf } from '#/utils/exportAnnotatedPdf'
import { saveCompareNote, getOcrStatus, triggerOcr } from '#/api/review/tool'
import PdfPane from './PdfPane.vue'

defineEmits(['close'])

const props = defineProps({
  sourceAUrl: { type: String, default: '' },
  sourceBUrl: { type: String, default: '' },
  // 扫描件 OCR 后产出的 searchable PDF URL,有则优先加载它(pdfjs textLayer 能拿到真文字)
  // 没有时回退到 sourceAUrl/sourceBUrl(打印版本身就有文字层,无需 searchable)
  sourceASearchableUrl: { type: String, default: '' },
  sourceBSearchableUrl: { type: String, default: '' },
  // 用于轮询 B 侧扫描件 OCR 进度。FileDiffViewer 在 ocrStatus 非 SUCCESS/SKIP/NONE 时
  // 启动 10s 一次的 GET /demo/ocr/status?ossId=xxx, 拿到 searchableUrl 后自动重载 B 侧。
  sourceBOssId: { type: [Number, String], default: null },
  sourceBOcrStatus: { type: String, default: '' },
  sourceALabel: { type: String, default: '文件A' },
  sourceBLabel: { type: String, default: '文件B' },
  aiReview: { type: Object, default: null }
})

// 实际加载用的 URL:优先 searchable(扫描件) → 回退原 URL(打印版无需 searchable)
// liveBSearchableUrl: 轮询过程中拿到的 searchable URL,优先级高于 props.sourceBSearchableUrl
const liveBSearchableUrl = ref('')
const liveBOcrStatus = ref('')
const effectiveAUrl = computed(() => props.sourceASearchableUrl || props.sourceAUrl)
const effectiveBUrl = computed(
  () => liveBSearchableUrl.value || props.sourceBSearchableUrl || props.sourceBUrl
)

// OCR 状态条:三种展示形态
//  - 'progress': 正在 OCR(PENDING/RUNNING),显示倒计时与进度
//  - 'fail':    OCR 失败,提示用户当前是原图、无字符级 diff
//  - 'none':    打印件/无需 OCR,不展示状态条
const currentBOcrStatus = computed(() => liveBOcrStatus.value || props.sourceBOcrStatus || '')
const ocrBannerType = computed(() => {
  const s = currentBOcrStatus.value
  if (s === 'PENDING' || s === 'RUNNING') return 'progress'
  if (s === 'FAIL') return 'fail'
  return 'none'
})
const ocrElapsedSec = ref(0)
let ocrPollTimer = null
let ocrElapsedTimer = null

async function fetchOcrStatusOnce() {
  if (!props.sourceBOssId) return
  try {
    const data = await getOcrStatus(props.sourceBOssId) || {}
    if (data.ocrStatus) liveBOcrStatus.value = data.ocrStatus
    if (data.ocrStatus === 'SUCCESS' && data.searchableUrl) {
      liveBSearchableUrl.value = data.searchableUrl
      stopOcrPolling()
      // 触发 watch reload,B 侧自动切到 searchable PDF 重新做 diff
    } else if (data.ocrStatus === 'FAIL' || data.ocrStatus === 'SKIP' || data.ocrStatus === 'NONE') {
      stopOcrPolling()
    }
  } catch (e) {
    console.warn('[FileDiff] OCR 状态查询失败', e)
  }
}

function startOcrPolling() {
  stopOcrPolling()
  if (!props.sourceBOssId) return
  const s = currentBOcrStatus.value
  // 已 SUCCESS / 已 FAIL / NONE / SKIP 不需要轮询
  if (s === 'SUCCESS' || s === 'FAIL' || s === 'SKIP' || s === 'NONE') return
  ocrElapsedSec.value = 0
  ocrElapsedTimer = setInterval(() => { ocrElapsedSec.value += 1 }, 1000)
  ocrPollTimer = setInterval(fetchOcrStatusOnce, 10000)
  // 立即先拉一次,避免等 10s 才看到状态
  fetchOcrStatusOnce()
}

function stopOcrPolling() {
  if (ocrPollTimer) { clearInterval(ocrPollTimer); ocrPollTimer = null }
  if (ocrElapsedTimer) { clearInterval(ocrElapsedTimer); ocrElapsedTimer = null }
}

// 自愈：B 侧扫描件抽不到文字（diff 判退化）时，多半是历史数据没跑过 OCR，
// 或之前被误判 SKIP。补发一次 OCR 触发，再启动轮询等 searchable PDF 回来自动重载。
async function maybeSelfHealOcr() {
  if (ocrSelfHealTried) return
  if (!props.sourceBOssId) return
  // 已经有 searchable 还退化，说明不是“没OCR”的问题，补发也没用，跳过避免空转
  if (liveBSearchableUrl.value || props.sourceBSearchableUrl) return
  const s = currentBOcrStatus.value
  if (s === 'PENDING' || s === 'RUNNING') {
    // 正在跑，交给已有轮询即可
    startOcrPolling()
    return
  }
  ocrSelfHealTried = true
  try {
    console.log('[FileDiff] B 侧无文字层，自愈触发 OCR ossId=', props.sourceBOssId)
    await triggerOcr(props.sourceBOssId)
    // 触发后置为 RUNNING 语义，启动轮询；拿到 searchableUrl 后 watch 会自动 reload
    liveBOcrStatus.value = 'RUNNING'
    startOcrPolling()
  } catch (e) {
    console.warn('[FileDiff] OCR 自愈触发失败', e)
  }
}

const aiPanelOpen = ref(false)

const aiStatusText = computed(() => {
  const s = props.aiReview?.status
  return { PENDING: '排队中', RUNNING: '审核中', SUCCESS: '成功', FAIL: '失败' }[s] || s || '-'
})
const aiStatusType = computed(() => {
  const s = props.aiReview?.status
  return { SUCCESS: 'success', FAIL: 'error', RUNNING: 'processing' }[s] || 'default'
})

function severityTagType(s) {
  const k = (s || '').toString().toLowerCase()
  return { error: 'danger', warning: 'warning', info: 'info' }[k] || 'info'
}
function severityLabel(s) {
  const k = (s || '').toString().toLowerCase()
  return { error: '错误', warning: '警告', info: '提示' }[k] || (s || '提示')
}
function matchTagType(s) {
  const k = (s || '').toString().toLowerCase()
  return {
    matched: 'success',
    mismatched: 'danger',
    uncertain: 'warning',
    not_found: 'info'
  }[k] || 'info'
}
function matchLabel(s) {
  const k = (s || '').toString().toLowerCase()
  return {
    matched: '一致',
    mismatched: '不一致',
    uncertain: '存疑',
    not_found: '未找到'
  }[k] || (s || '-')
}
function matchIcon(s) {
  const k = (s || '').toString().toLowerCase()
  return {
    matched: '✓',
    mismatched: '✗',
    uncertain: '?',
    not_found: '∅'
  }[k] || '·'
}

const severityFilter = ref('all')
const severityFilterOptions = [
  { key: 'all', label: '全部' },
  { key: 'error', label: '错误' },
  { key: 'warning', label: '警告' },
  { key: 'info', label: '提示' }
]

function countBySeverity(key) {
  const list = props.aiReview?.issues || []
  if (key === 'all') return list.length
  return list.filter((i) => (i.severity || '').toLowerCase() === key).length
}

const filteredIssues = computed(() => {
  const list = props.aiReview?.issues || []
  if (severityFilter.value === 'all') return list
  return list.filter((i) => (i.severity || '').toLowerCase() === severityFilter.value)
})

function detectType(url) {
  if (!url) return 'unknown'
  const clean = url.split('?')[0].toLowerCase()
  if (clean.endsWith('.pdf')) return 'pdf'
  if (clean.endsWith('.docx')) return 'docx'
  if (/\.(jpe?g|png|gif|bmp|webp)$/.test(clean)) return 'image'
  return 'unknown'
}

const oldType = computed(() => detectType(props.sourceAUrl))
const newType = computed(() => detectType(props.sourceBUrl))

const oldBoxRef = ref(null)
const newBoxRef = ref(null)
// 文字层模式自渲染面板（替代 iframe）。pdf 字节传给 PdfPane，组件内部 getDocument 渲染
const pdfPaneARef = ref(null)
const pdfPaneBRef = ref(null)
const oldPdfData = shallowRef(null) // ArrayBuffer，shallowRef 避免大字节数组深度响应式化
const newPdfData = shallowRef(null)
// 连线层：comparisonRef 坐标基准；activeConn 当前选中差异的左右框+虚线；connBadges 中间图标
const comparisonRef = ref(null)
const diffListRef = ref(null)
const activeConn = ref(null)
const connBadges = ref([])
const overlayW = ref(0)
const overlayH = ref(0)
// 同步滚动锁定：开=两侧联动滚动；关=各滚各的。用户可在顶部栏切换
const syncLocked = ref(true)
// 缩放（两侧联动）：当前 scale 数值，0=未就绪
const zoomScale = ref(0)
// 缩放重渲中：显示等待遮罩，盖住重渲闪烁
const zooming = ref(false)
// 导出带批注 PDF 进行中
const exporting = ref(false)

const oldError = ref('')
const newError = ref('')

const msgLoading = ref(true)
const readyList = ref([false, false])
// 退化态：'A'/'B' 表示该侧几乎无文字（典型为扫描件未 OCR）；null 表示正常
const degenerateSide = ref(null)

// ==================== 对比模式 ====================
// 文字层比对：pdfjs textLayer + 字符 LCS。恒为 'text'（OCR 定位模式已移除）。
const compareMode = ref('text')
// 文字层模式：点击差异清单时是否画整行块高亮（蓝色定位强调，消除右侧扫描件逐字漂移的视觉噪声）
const blockHighlight = ref(true)
const ignoreFormatDiff = ref(false)
// 差异清单：每条 {type, leftText, rightText, leftPos, rightPos}
// 点击某条 → 两侧滚到对应位置并连线
const ocrDiffList = ref([])
const currentDiffIdx = ref(-1)
const diffPanelOpen = ref(false)
const expandedDiffIdxSet = ref(new Set())
const editingNoteIdx = ref(-1)
const noteInputRefs = new Map()

// 差异清单标签过滤（按差异类型：新增/删除/修改）。保留原始索引，
// 避免破坏 gotoDiff/saveDiff/removeDiff/文档内连线等按 ocrDiffList 下标定位的逻辑
const diffTypeFilter = ref('all')
const diffTypeFilterOptions = [
  { key: 'all', label: '全部' },
  { key: 'add', label: '新增' },
  { key: 'del', label: '删除' },
  { key: 'modify', label: '修改' }
]
function countByDiffType(key) {
  const list = ocrDiffList.value || []
  if (key === 'all') return list.length
  return list.filter((i) => i.type === key).length
}
// [{ item, idx }]：idx 为在 ocrDiffList 中的原始下标
const filteredDiffList = computed(() => {
  const list = ocrDiffList.value || []
  const paired = list.map((item, idx) => ({ item, idx }))
  if (diffTypeFilter.value === 'all') return paired
  return paired.filter((p) => p.item.type === diffTypeFilter.value)
})
// 自愈：避免对同一附件重复补发 OCR
let ocrSelfHealTried = false

let oldSelector = '.old-docx .docx-wrapper > .docx > article'
let newSelector = '.new-docx .docx-wrapper > .docx > article'

async function fetchPdfBlob(url) {
  // 加时间戳避免浏览器缓存——同名 OSS 文件被覆盖后 URL 不变但内容变了，
  // 必须主动绕开缓存才能拿到最新文件
  const cacheBuster = url.includes('?') ? `&_t=${Date.now()}` : `?_t=${Date.now()}`
  const resp = await fetch(url + cacheBuster, {
    credentials: 'omit',
    cache: 'no-store'
  })
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}`)
  }
  return await resp.blob()
}

function revokeBlobUrls() {
  // 自渲染：清空 PDF 字节，PdfPane watch data 变化会重新渲染
  oldPdfData.value = null
  newPdfData.value = null
}

async function loadOneSide(side, url, type) {
  if (type !== 'pdf' || !url) return
  if (side === 'A') {
    oldError.value = ''
  } else {
    newError.value = ''
  }
  try {
    console.log(`[FileDiff] ${side} 开始 fetch PDF`)
    const blob = await fetchPdfBlob(url)
    const buf = await blob.arrayBuffer()
    console.log(`[FileDiff] ${side} PDF blob ready, size=${blob.size}`)
    // 自渲染：把字节交给 PdfPane（其内部 getDocument 渲染）
    if (side === 'A') {
      oldPdfData.value = buf
    } else {
      newPdfData.value = buf
    }
  } catch (e) {
    console.error(`[FileDiff] ${side} PDF fetch 失败`, e)
    const msg = e.message || '加载失败'
    if (side === 'A') oldError.value = msg
    else newError.value = msg
  }
}

async function loadBothPdfs() {
  revokeBlobUrls()
  // 两份 PDF 并行 fetch。用 effectiveXxxUrl:扫描件优先用 searchable PDF(带不可见文字层),
  // 打印版直接用原 URL(本身有文字层)
  await Promise.all([
    loadOneSide('A', effectiveAUrl.value, oldType.value),
    loadOneSide('B', effectiveBUrl.value, newType.value)
  ])
}

// ==================== 同步滚动 ====================
// 用一侧滚动按比例驱动另一侧，避免互相触发用 isSyncing 锁
let isSyncing = false
let autoFocusLockedUntil = 0
let autoFollowPaused = false
let autoFollowReleaseTimer = null
let gotoDiffSeq = 0
let lastScrollSide = 'A' // 最后滚动的那侧，关同步时图标跟随该侧
let oldScrollHandler = null
let newScrollHandler = null
// PdfPane 两侧滚动容器（普通 div），记引用以便解绑
let ocrOldContainer = null
let ocrNewContainer = null

function scheduleAutoFollowRelease(delay = 900) {
  if (autoFollowReleaseTimer) clearTimeout(autoFollowReleaseTimer)
  autoFocusLockedUntil = Date.now() + delay
  autoFollowReleaseTimer = setTimeout(() => {
    autoFollowReleaseTimer = null
    autoFollowPaused = false
    autoFocusLockedUntil = 0
  }, delay)
}

function pauseAutoFollowForProgrammaticScroll() {
  autoFollowPaused = true
  scheduleAutoFollowRelease(3000)
}

function markUserScrollIntent() {
  autoFollowPaused = false
  autoFocusLockedUntil = 0
  if (autoFollowReleaseTimer) {
    clearTimeout(autoFollowReleaseTimer)
    autoFollowReleaseTimer = null
  }
}

function bindUserScrollIntent(el) {
  el.addEventListener('wheel', markUserScrollIntent, { passive: true })
  el.addEventListener('touchstart', markUserScrollIntent, { passive: true })
  el.addEventListener('pointerdown', markUserScrollIntent)
}

function unbindUserScrollIntent(el) {
  el.removeEventListener('wheel', markUserScrollIntent)
  el.removeEventListener('touchstart', markUserScrollIntent)
  el.removeEventListener('pointerdown', markUserScrollIntent)
}

function syncScrollFromTo(fromEl, toEl) {
  if (!fromEl || !toEl) return
  const fromRange = fromEl.scrollHeight - fromEl.clientHeight
  const toRange = toEl.scrollHeight - toEl.clientHeight
  if (fromRange <= 0 || toRange <= 0) return
  const ratio = fromEl.scrollTop / fromRange
  toEl.scrollTop = ratio * toRange
}

function bindSyncScroll() {
  unbindSyncScroll()
  // 文字层模式两侧改为 PdfPane（普通滚动 div），不再是 iframe viewerContainer
  const oldContainer = pdfPaneARef.value?.getContainer?.()
  const newContainer = pdfPaneBRef.value?.getContainer?.()
  if (!oldContainer || !newContainer) {
    console.warn('[FileDiff] 同步滚动绑定失败：PdfPane 容器未就绪')
    return
  }

  oldScrollHandler = () => {
    lastScrollSide = 'A'
    if (autoFollowPaused) scheduleAutoFollowRelease()
    // 同步锁定开启时联动对侧（isSyncing 防回弹）；关闭则各滚各的。连线始终跟随
    if (syncLocked.value && !isSyncing && !autoFollowPaused) {
      isSyncing = true
      syncScrollFromTo(oldContainer, newContainer)
      requestAnimationFrame(() => { isSyncing = false })
    }
    scheduleConn()
  }
  newScrollHandler = () => {
    lastScrollSide = 'B'
    if (autoFollowPaused) scheduleAutoFollowRelease()
    if (syncLocked.value && !isSyncing && !autoFollowPaused) {
      isSyncing = true
      syncScrollFromTo(newContainer, oldContainer)
      requestAnimationFrame(() => { isSyncing = false })
    }
    scheduleConn()
  }

  oldContainer.addEventListener('scroll', oldScrollHandler, { passive: true })
  newContainer.addEventListener('scroll', newScrollHandler, { passive: true })
  bindUserScrollIntent(oldContainer)
  bindUserScrollIntent(newContainer)
  // PdfPane 容器是普通 div，记录引用供 unbindSyncScroll 解绑
  ocrOldContainer = oldContainer
  ocrNewContainer = newContainer
  console.log('[FileDiff] 同步滚动已绑定')
}

function unbindSyncScroll() {
  try {
    // 两侧是 PdfPane 普通 div，用记录的引用解绑
    if (ocrOldContainer && oldScrollHandler) {
      ocrOldContainer.removeEventListener('scroll', oldScrollHandler)
      unbindUserScrollIntent(ocrOldContainer)
      ocrOldContainer = null
    }
    if (ocrNewContainer && newScrollHandler) {
      ocrNewContainer.removeEventListener('scroll', newScrollHandler)
      unbindUserScrollIntent(ocrNewContainer)
      ocrNewContainer = null
    }
  } catch (e) {
    // 容器可能已经销毁
  }
  oldScrollHandler = null
  newScrollHandler = null
}

// 两侧 PdfPane 都加载完后再绑同步滚动
function trySetupSyncScroll() {
  if (readyList.value[0] && readyList.value[1] && oldType.value === 'pdf' && newType.value === 'pdf') {
    // 等容器内部布局稳定一下再绑
    setTimeout(bindSyncScroll, 300)
  }
}

// PdfPane 渲染完成：全量渲染，textLayer 节点一次性就绪（不像 iframe 懒渲染只有视口几页）。
// 直接拿全部 .textLayer 节点供 diffDocument 染色，标记该侧就绪。
function onPaneRenderedA() {
  console.log('[FileDiff] A PdfPane rendered')
  oldSelector = pdfPaneARef.value?.getTextLayerNodes?.() || []
  // 以 A 侧为准初始化缩放显示
  zoomScale.value = pdfPaneARef.value?.getScale?.() || 0
  readyList.value[0] = true
}
function onPaneRenderedB() {
  console.log('[FileDiff] B PdfPane rendered')
  newSelector = pdfPaneBRef.value?.getTextLayerNodes?.() || []
  readyList.value[1] = true
}
function onPaneErrorA(e) {
  console.error('[FileDiff] A PdfPane 渲染失败', e)
  oldError.value = '加载 PDF 失败'
}
function onPaneErrorB(e) {
  console.error('[FileDiff] B PdfPane 渲染失败', e)
  newError.value = '加载 PDF 失败'
}

function renderedOld() {
  console.log('[FileDiff] A docx rendered')
  readyList.value[0] = true
}
function renderedNew() {
  console.log('[FileDiff] B docx rendered')
  readyList.value[1] = true
}
function onOldDocxError(e) {
  console.error('[FileDiff] A docx 渲染失败', e)
  oldError.value = '加载 docx 失败'
}
function onNewDocxError(e) {
  console.error('[FileDiff] B docx 渲染失败', e)
  newError.value = '加载 docx 失败'
}

// 点击差异清单某条 → 两侧用 PdfPane 滚到页内位置，滚动稳定后画连线（左右高亮框 + 虚线）。
// 左右各自独立滚，临时关同步滚动避免互相拉扯。
function scrollDiffListToIdx(idx) {
  if (idx == null || idx < 0) return
  nextTick(() => {
    const list = diffListRef.value
    const el = list?.querySelector?.(`[data-diff-idx="${idx}"]`)
    if (!list || !el) return
    const listRect = list.getBoundingClientRect()
    const itemRect = el.getBoundingClientRect()
    const target = list.scrollTop + itemRect.top - listRect.top - list.clientHeight * 0.35
    list.scrollTo({ top: Math.max(0, target), behavior: 'smooth' })
  })
}

function focusDiffListIdx(idx, { openPanel = false, scrollList = true } = {}) {
  if (idx == null || idx < 0 || idx >= ocrDiffList.value.length) return
  const changed = currentDiffIdx.value !== idx
  if (changed) currentDiffIdx.value = idx
  if (openPanel && !diffPanelOpen.value) diffPanelOpen.value = true
  if (scrollList && (changed || openPanel) && (diffPanelOpen.value || openPanel)) {
    scrollDiffListToIdx(idx)
  }
}

function gotoDiff(idx, opts = {}) {
  const item = ocrDiffList.value[idx]
  if (!item) return
  const seq = ++gotoDiffSeq
  pauseAutoFollowForProgrammaticScroll()
  focusDiffListIdx(idx, { openPanel: !!opts.openPanel })
  if (opts.focusList) scrollDiffListToIdx(idx)
  isSyncing = true // 关同步滚动，两侧各滚各的
  pdfPaneARef.value?.scrollToPos?.(item.leftPos)
  pdfPaneBRef.value?.scrollToPos?.(item.rightPos)
  // 滚动动画结束后恢复同步，并绘制/刷新连线
  setTimeout(() => {
    if (seq !== gotoDiffSeq) return
    isSyncing = false
    currentDiffIdx.value = idx
    autoFocusLockedUntil = autoFollowPaused ? Date.now() + 1200 : 0
    scheduleConn()
    // 诊断：连线为何不画。检查 activeConn 与左右 rect
    const l = diffRect(pdfPaneARef, item.leftPos)
    const r = diffRect(pdfPaneBRef, item.rightPos)
    console.log('[FileDiff][连线诊断] idx=', idx, 'blockHighlight=', blockHighlight.value,
      'leftPos=', JSON.stringify(item.leftPos), 'rightPos=', JSON.stringify(item.rightPos),
      '→ leftRect=', l ? 'ok' : '∅', 'rightRect=', r ? 'ok' : '∅', 'activeConn=', !!activeConn.value)
  }, 700)
}

function gotoPrevDiff() {
  // 在当前过滤结果内循环跳转（idx 为 ocrDiffList 原始下标）
  const idxs = filteredDiffList.value.map((p) => p.idx)
  if (!idxs.length) return
  const pos = idxs.indexOf(currentDiffIdx.value)
  const next = pos < 0 ? idxs.length - 1 : (pos - 1 + idxs.length) % idxs.length
  gotoDiff(idxs[next])
}
function gotoNextDiff() {
  const idxs = filteredDiffList.value.map((p) => p.idx)
  if (!idxs.length) return
  const pos = idxs.indexOf(currentDiffIdx.value)
  const next = pos < 0 ? 0 : (pos + 1) % idxs.length
  gotoDiff(idxs[next])
}

function diffTypeLabel(t) {
  return { add: '新增', del: '删除', modify: '修改' }[t] || t
}

function hasLongDiffText(item) {
  const text = `${item.leftText || ''} ${item.rightText || ''}`.replace(/\s+/g, ' ').trim()
  return text.length > 42
}

function normalizeNotePrefix(note) {
  return (note || '').replace(/^【(?:修改|新增|删除)】/, '【批注】')
}

function toggleDiffText(idx) {
  const next = new Set(expandedDiffIdxSet.value)
  if (next.has(idx)) next.delete(idx)
  else next.add(idx)
  expandedDiffIdxSet.value = next
}

function setNoteInputRef(idx, el) {
  if (el) noteInputRefs.set(idx, el)
  else noteInputRefs.delete(idx)
}

function focusNoteInput(idx) {
  nextTick(() => {
    const input = noteInputRefs.get(idx)
    const textarea = input?.textarea || input?.$el?.querySelector?.('textarea')
    textarea?.focus?.()
  })
}

function startEditNote(idx) {
  if (savingIdx.value >= 0) return
  editingNoteIdx.value = idx
  focusNoteInput(idx)
}

async function finishEditNote(idx) {
  if (editingNoteIdx.value !== idx) return
  editingNoteIdx.value = -1
  await saveDiff(idx)
}

// 批注默认文案：统一使用【批注】前缀。用户改写后即为导出批注内容。
function defaultNote(item) {
  const b = (item.changes && item.changes[0]) || { leftText: item.leftText, rightText: item.rightText }
  const more = item.changes && item.changes.length > 1 ? `等${item.changes.length}处` : ''
  const clip = (s, n = 60) => {
    const t = (s || '').replace(/\s+/g, ' ').trim()
    return t.length > n ? t.slice(0, n) + '…' : t
  }
  if (item.type === 'add') return `【批注】${clip(b.rightText)}${more}`
  if (item.type === 'del') return `【批注】${clip(b.leftText)}${more}`
  return `【批注】${clip(b.leftText)} → ${clip(b.rightText)}${more}`
}

// 差异签名：类型|原文|新文 的稳定键。差异清单是前端实时算的，无后端ID，
// 用签名把批注存到后端 note_data 映射里；重开重算出同一条差异时按签名取回批注。
function diffSignature(item) {
  const norm = (s) => (s || '').replace(/\s+/g, ' ').trim()
  return `${item.type}|${norm(item.leftText)}|${norm(item.rightText)}`
}

function currentNoteMap() {
  const map = {}
  ocrDiffList.value.forEach((item) => {
    const sig = diffSignature(item)
    if (sig && item.note != null && item.note !== '') map[sig] = item.note
  })
  return map
}

// 后端取回的「签名→批注」映射（从 aiReview.noteData 解析）。构建清单时按签名回填。
const compareNoteMap = computed(() => {
  const raw = props.aiReview?.noteData
  if (!raw) return {}
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch (e) {
    console.warn('[FileDiff] 解析 noteData 失败', e)
    return {}
  }
})

// noteData 可能在清单已构建之后才到（PDF 渲染触发建清单与父级取数存在时序竞争）。
// 映射变化时把已保存批注重新回填到当前清单，保证重开能看到保存过的内容。
watch(compareNoteMap, (map) => {
  if (!map || !ocrDiffList.value.length) return
  ocrDiffList.value.forEach((item) => {
    const saved = map[diffSignature(item)]
    if (saved != null && saved !== '') item.note = normalizeNotePrefix(saved)
  })
}, { deep: true })

// 保存单条批注：按签名写回后端 note_data。每条独立 loading
const savingIdx = ref(-1)
async function saveDiff(idx, { silent = false } = {}) {
  const item = ocrDiffList.value[idx]
  if (!item) return
  const taskId = props.aiReview?.id
  if (!taskId) { message.warning('缺少审核任务ID，无法保存批注'); return }
  if (savingIdx.value >= 0) return
  savingIdx.value = idx
  try {
    item.note = normalizeNotePrefix(item.note)
    // 汇总当前清单所有签名→批注，整体写回 note_data（引擎按签名存整块）
    const noteMap = {}
    ocrDiffList.value.forEach((it) => {
      const sig = diffSignature(it)
      if (sig && it.note) noteMap[sig] = it.note
    })
    await saveCompareNote({
      taskId: String(taskId),
      noteData: JSON.stringify(noteMap)
    })
    if (!silent) message.success('批注已保存')
  } catch (e) {
    console.error('[FileDiff] 保存批注失败', e)
    message.error('保存失败：' + (e?.message || e))
  } finally {
    savingIdx.value = -1
  }
}

// 删除一条差异（去掉误判）：不进导出。维护当前选中索引与连线。
function removeDiff(idx) {
  ocrDiffList.value.splice(idx, 1)
  const nextExpanded = new Set()
  expandedDiffIdxSet.value.forEach((i) => {
    if (i < idx) nextExpanded.add(i)
    else if (i > idx) nextExpanded.add(i - 1)
  })
  expandedDiffIdxSet.value = nextExpanded
  if (editingNoteIdx.value === idx) editingNoteIdx.value = -1
  else if (editingNoteIdx.value > idx) editingNoteIdx.value -= 1
  if (currentDiffIdx.value === idx) {
    currentDiffIdx.value = -1
    activeConn.value = null
  } else if (currentDiffIdx.value > idx) {
    currentDiffIdx.value -= 1
  }
  scheduleConn() // 重算中间图标条与连线
}

// ==================== 连线层（文字层模式）====================
// 点击差异后，左右两侧各画高亮框 + 一条虚线连接。坐标全部相对 .comparison-list，
// 因左右 PdfPane 与浮层同属一个文档，getBoundingClientRect 直接相减即可，零跨边界换算。

function connIcon(t) {
  return { add: '+', del: '−', modify: '∼' }[t] || '•'
}

// 求某条差异在某侧 PdfPane 中、换算到 .comparison-list 坐标系的矩形框 {x,y,w,h,cy}。
// 框 = 该差异区域 yTop→yBottom 覆盖的整片（横向贴页宽，略收窄；上下扩半行包住文字）。
// 返回 null 表示页未渲染或滚出视口。pos 兼容 {page,yTop,yBottom} 或旧 {page,yRatio}。
function diffRect(paneRef, pos) {
  if (!pos) return null
  try {
    const pane = paneRef?.value
    const base = comparisonRef.value
    const cont = pane?.getContainer?.()
    const pageEl = pane?.getPageEl?.(pos.page)
    if (!pane || !base || !cont || !pageEl) return null
    const pageRect = pageEl.getBoundingClientRect() // 视口坐标（已含滚动）
    const rTop = pos.yTop != null ? pos.yTop : (pos.yRatio || 0)
    const rBottom = pos.yBottom != null ? pos.yBottom : (pos.yRatio || 0)
    const yTop = pageRect.top + pageRect.height * rTop
    const yBottom = pageRect.top + pageRect.height * rBottom
    const yMid = (yTop + yBottom) / 2
    // 区域中点滚出该侧容器可视区就不画
    const contRect = cont.getBoundingClientRect()
    if (yMid < contRect.top || yMid > contRect.bottom) return null
    const baseRect = base.getBoundingClientRect()
    const lineH = Math.max(10, Math.min(18, pageRect.height * 0.014)) // 单行高估计，框贴近视觉高亮条
    const vPad = Math.max(4, lineH * 0.35)
    const pagePad = pageRect.width * 0.05
    const minW = Math.min(pageRect.width * 0.22, 180)
    const hasX = Number.isFinite(pos.xLeft) && Number.isFinite(pos.xRight) && pos.xRight > pos.xLeft
    const isApprox = !!pos.approx
    let x = pageRect.left + pagePad
    let w = pageRect.width - pagePad * 2
    if (isApprox) {
      const anchorX = Number.isFinite(pos.xLeft) ? pageRect.left + pageRect.width * pos.xLeft : pageRect.left + pageRect.width / 2
      const markerW = Math.max(10, Math.min(18, pageRect.width * 0.018))
      x = Math.max(pageRect.left + pagePad, Math.min(pageRect.right - pagePad - markerW, anchorX - markerW / 2))
      w = markerW
    } else if (hasX) {
      const xPad = Math.max(8, pageRect.width * 0.012)
      const rawLeft = pageRect.left + pageRect.width * pos.xLeft
      const rawRight = pageRect.left + pageRect.width * pos.xRight
      x = Math.max(pageRect.left + pagePad, rawLeft - xPad)
      w = Math.min(pageRect.right - pagePad, rawRight + xPad) - x
      if (w < minW) {
        const center = (rawLeft + rawRight) / 2
        x = Math.max(pageRect.left + pagePad, center - minW / 2)
        w = Math.min(pageRect.right - pagePad, x + minW) - x
      }
    }
    return {
      x: x - baseRect.left,
      y: yTop - baseRect.top - vPad,
      w,
      h: Math.max(8, yBottom - yTop) + vPad * 2,
      cy: yMid - baseRect.top
    }
  } catch (e) {
    return null
  }
}

// 重算当前选中差异的左右框 + 连接虚线
function computeActiveConn() {
  const base = comparisonRef.value
  const idx = currentDiffIdx.value
  // 关闭「差异连线」开关时不显示（否则滚动 scheduleConn 会把它又算回来）
  if (!base || compareMode.value !== 'text' || idx < 0 || !blockHighlight.value) { activeConn.value = null; return }
  const item = ocrDiffList.value[idx]
  if (!item) { activeConn.value = null; return }
  overlayW.value = base.clientWidth
  overlayH.value = base.clientHeight
  const left = diffRect(pdfPaneARef, item.leftPos)
  const right = diffRect(pdfPaneBRef, item.rightPos)
  if (!left && !right) { activeConn.value = null; return }
  let path = ''
  if (left && right) {
    const x0 = left.x + left.w, y0 = left.cy
    const x1 = right.x, y1 = right.cy
    const mx = (x0 + x1) / 2
    path = `M ${x0} ${y0} C ${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1}`
  }
  activeConn.value = { type: item.type, left, right, path }
}

// 重算中间图标条：图标跟随"最后滚动的那侧"（关同步滚动时滑哪侧图标就贴哪侧，不残留）
function computeBadges() {
  const base = comparisonRef.value
  if (!base || compareMode.value !== 'text' || !ocrDiffList.value.length || !blockHighlight.value) { connBadges.value = []; return }
  const out = []
  ocrDiffList.value.forEach((item, idx) => {
    const rL = diffRect(pdfPaneARef, item.leftPos)
    const rR = diffRect(pdfPaneBRef, item.rightPos)
    // 优先用最后滚动那侧（两侧都可见时），关同步滑动时图标随当前操作侧走
    const r = lastScrollSide === 'B' ? (rR || rL) : (rL || rR)
    if (r) out.push({ idx, type: item.type, y: r.cy })
  })
  connBadges.value = out
}

function syncCurrentDiffFromScroll() {
  if (isSyncing) return
  if (autoFollowPaused) return
  if (Date.now() < autoFocusLockedUntil) return
  if (compareMode.value !== 'text' || !ocrDiffList.value.length) return
  const paneRef = lastScrollSide === 'B' ? pdfPaneBRef : pdfPaneARef
  const posKey = lastScrollSide === 'B' ? 'rightPos' : 'leftPos'
  const cont = paneRef.value?.getContainer?.()
  const base = comparisonRef.value
  if (!cont || !base) return
  const contRect = cont.getBoundingClientRect()
  const probeY = contRect.top + contRect.height * 0.45 - base.getBoundingClientRect().top
  let bestIdx = -1
  let bestDist = Infinity
  ocrDiffList.value.forEach((item, idx) => {
    let r = diffRect(paneRef, item[posKey])
    if (!r) r = diffRect(lastScrollSide === 'B' ? pdfPaneARef : pdfPaneBRef, lastScrollSide === 'B' ? item.leftPos : item.rightPos)
    if (!r) return
    const d = Math.abs(r.cy - probeY)
    if (d < bestDist) { bestDist = d; bestIdx = idx }
  })
  if (bestIdx >= 0 && bestDist < contRect.height * 0.45) {
    focusDiffListIdx(bestIdx, { scrollList: bestIdx !== currentDiffIdx.value })
  }
}

// 点击某侧 PDF 文档：按点击 Y 找最近的差异行，阈值内则定位并连线。
// 让用户直接点文档上看到的差异处，不必去差异清单/中间图标。
function onPaneClick(side, e) {
  if (compareMode.value !== 'text' || !ocrDiffList.value.length) return
  const base = comparisonRef.value
  if (!base) return
  const clickY = e.clientY - base.getBoundingClientRect().top
  const paneRef = side === 'A' ? pdfPaneARef : pdfPaneBRef
  const posKey = side === 'A' ? 'leftPos' : 'rightPos'
  let best = -1
  let bestDist = Infinity
  ocrDiffList.value.forEach((item, idx) => {
    const r = diffRect(paneRef, item[posKey])
    if (!r) return
    const d = Math.abs(r.cy - clickY)
    if (d < bestDist) { bestDist = d; best = idx }
  })
  // 仅当点击位置足够贴近某差异行（约一行高度内）才触发，避免点空白处乱连
  if (best >= 0 && bestDist < 28) gotoDiff(best)
}

// rAF 节流的连线 + 图标重算（滚动/缩放/resize/点击调用）
let connRaf = 0
function scheduleConn() {
  if (connRaf) return
  connRaf = requestAnimationFrame(() => {
    connRaf = 0
    syncCurrentDiffFromScroll()
    computeActiveConn()
    computeBadges()
  })
}

// ==================== 缩放（两侧联动）====================
const zoomPercent = computed(() => (zoomScale.value ? Math.round(zoomScale.value * 100) : 100))

// 缩放/重渲后：textLayer 全换成新节点，必须重新收集 selector + 重跑 diff 染色 + 重算连线，
// 否则染色和连线作用在已销毁的旧节点上而全部失效。
function reapplyAfterRerender({ preserveState = true } = {}) {
  const activeIdx = currentDiffIdx.value
  const activeFilter = diffTypeFilter.value
  oldSelector = pdfPaneARef.value?.getTextLayerNodes?.() || []
  newSelector = pdfPaneBRef.value?.getTextLayerNodes?.() || []
  // 新 textLayer 会换节点；重新估算并重建清单，避免旧 yTop/yBottom 在缩放/面板开合后继续带偏。
  calibrateAlign()
  buildTextDiffList()
  if (preserveState) {
    diffTypeFilter.value = activeFilter
    if (activeIdx >= 0 && activeIdx < ocrDiffList.value.length) currentDiffIdx.value = activeIdx
  }
  scheduleConn()
}

// 缩放：两侧联动设同一 scale。+/− 按 1.15 倍率，点百分比回到自适应宽度
let layoutRefitTimer = null
let layoutRefitPending = false
async function refitAfterLayoutChange() {
  if (zooming.value) {
    layoutRefitPending = true
    return
  }
  if (oldType.value !== 'pdf' || newType.value !== 'pdf') return
  if (!pdfPaneARef.value?.setScale || !pdfPaneBRef.value?.setScale) return
  layoutRefitPending = false
  const activeIdx = currentDiffIdx.value
  const activeFilter = diffTypeFilter.value
  zooming.value = true
  try {
    await nextTick()
    await Promise.all([
      pdfPaneARef.value.setScale('width'),
      pdfPaneBRef.value.setScale('width')
    ])
    zoomScale.value = pdfPaneARef.value?.getScale?.() || 0
    reapplyAfterRerender()
    scheduleConn()
    setTimeout(() => {
      reapplyAfterRerender()
      diffTypeFilter.value = activeFilter
      if (activeIdx >= 0 && activeIdx < ocrDiffList.value.length) currentDiffIdx.value = activeIdx
      scheduleConn()
    }, 180)
  } finally {
    zooming.value = false
    if (layoutRefitPending) {
      layoutRefitPending = false
      setTimeout(refitAfterLayoutChange, 0)
    }
  }
}

async function zoom(dir) {
  if (zooming.value) return
  const cur = zoomScale.value || pdfPaneARef.value?.getScale?.() || 1
  const next = Math.min(3, Math.max(0.3, cur * (dir > 0 ? 1.15 : 1 / 1.15)))
  zooming.value = true
  try {
    await Promise.all([
      pdfPaneARef.value?.setScale?.(next),
      pdfPaneBRef.value?.setScale?.(next)
    ])
    zoomScale.value = pdfPaneARef.value?.getScale?.() || next
    reapplyAfterRerender()
  } finally {
    zooming.value = false
  }
}
async function fitWidth() {
  if (zooming.value) return
  zooming.value = true
  try {
    await Promise.all([
      pdfPaneARef.value?.setScale?.('width'),
      pdfPaneBRef.value?.setScale?.('width')
    ])
    zoomScale.value = pdfPaneARef.value?.getScale?.() || 0
    reapplyAfterRerender()
  } finally {
    zooming.value = false
  }
}

// ==================== 导出带差异批注的右侧（B）PDF ====================
// 把 B 原始字节 + 差异清单交给 pdf-lib，逐条加高亮+弹出注释，下载。
async function onExportAnnotated() {
  if (exporting.value) return
  if (!newPdfData.value) { message.warning('右侧 PDF 尚未就绪'); return }
  if (!ocrDiffList.value.length) { message.warning('暂无差异可标注'); return }
  exporting.value = true
  try {
    // 传副本，避免影响 PdfPane 正在使用的字节
    const bytes = newPdfData.value.slice(0)
    const n = await exportAnnotatedPdf(
      bytes,
      ocrDiffList.value,
      diffTypeLabel,
      `${props.sourceBLabel || '回传件'}_差异批注.pdf`
    )
    const skipped = ocrDiffList.value.length - n
    message.success(`已导出 ${n} 处批注${skipped > 0 ? `（${skipped} 处在回传件中无对应位置，已列入末尾汇总页）` : ''}`)
  } catch (e) {
    console.error('[FileDiff] 导出批注失败', e)
    message.error('导出失败：' + (e?.message || e))
  } finally {
    exporting.value = false
  }
}

// 仅刷新 DOM 高亮（滚动 rediff 走这里）
function runDiff() {
  try {
    // 染色路径：与差异清单同一函数（diffDocumentDetailed），保证颜色与框/清单同源。
    // 这里只取染色副作用（标 fd-add/fd-del）与退化判定，blocks 由 buildTextDiffList 单独构建。
    const res = diffDocumentForCurrentMode(
      { selector: oldSelector, type: oldType.value },
      { selector: newSelector, type: newType.value }
    )
    applyDegenerate(res)
    return res
  } catch (e) {
    console.error('[FileDiff] diff 染色失败', e)
    return null
  }
}

function shouldUseAnchoredDiff() {
  return !ignoreFormatDiff.value && oldType.value === 'pdf' && newType.value === 'pdf' && !!(liveBSearchableUrl.value || props.sourceBSearchableUrl)
}

function diffDocumentForCurrentMode(oldData, newData) {
  return shouldUseAnchoredDiff()
    ? diffDocumentAnchored(oldData, newData)
    : diffDocumentDetailed(oldData, newData)
}

// 根据 diff 结果维护“退化提示”状态：B 侧无文字层时不再整片标红，改为友好提示 + 自愈
function applyDegenerate(res) {
  if (res && res.degenerate) {
    degenerateSide.value = res.emptySide || null
    // B 侧(扫描件)空：很可能 OCR 没跑/没识别出来，尝试自愈补一次 OCR
    if (res.emptySide === 'B') maybeSelfHealOcr()
  } else if (res) {
    degenerateSide.value = null
  }
}

function compareFun() {
  const supportDiff =
    (oldType.value === 'pdf' || oldType.value === 'docx') &&
    (newType.value === 'pdf' || newType.value === 'docx')
  if (!supportDiff) {
    msgLoading.value = false
    return
  }
  setTimeout(() => {
    runDiff()
    msgLoading.value = false
  }, 300)
}

// ============ 扫描件墨迹对齐（自动校准）============
// 搜索版 PDF 的 OCR 文字层常与扫描墨迹不重合（平移 / 轻微缩放）。读 canvas 像素，用
// 「墨迹行分布 ↔ OCR 文字行分布」互相关，估出每页纵向仿射校正 {k, shift}（shift = 页高比例），
// 作为 transform 施加到该页 textLayer：染色/选区贴回墨迹；框/连线/导出从校正后 span 取位置，一起贴合。
// 校正量按比例存（缩放无关），缩放重渲只需重 apply。置信度低或幅度过大则不校（宁缺毋滥）。
let bAlign = {} // pageNumber -> { k, shift }
let aAlign = {}
const ALIGN_BINS = 300

function alignNormalize(prof) {
  const n = prof.length
  let mean = 0
  for (let i = 0; i < n; i++) mean += prof[i]
  mean /= n
  const out = new Float64Array(n)
  let norm = 0
  for (let i = 0; i < n; i++) { out[i] = prof[i] - mean; norm += out[i] * out[i] }
  norm = Math.sqrt(norm) || 1
  for (let i = 0; i < n; i++) out[i] /= norm
  return out
}

// 墨迹行分布：每个纵向 bin 内的暗像素数（抽样列省时）。canvas 被污染(跨域)时返回 null，放弃校准。
function alignInkProfile(canvas, bins) {
  const w = canvas.width
  const h = canvas.height
  if (!w || !h) return null
  let ctx
  try { ctx = canvas.getContext('2d', { willReadFrequently: true }) } catch (e) { ctx = canvas.getContext('2d') }
  if (!ctx) return null
  let img
  try { img = ctx.getImageData(0, 0, w, h) } catch (e) { return null }
  const data = img.data
  const prof = new Float64Array(bins)
  const colStep = Math.max(1, Math.floor(w / 200))
  for (let y = 0; y < h; y++) {
    const rowOff = y * w * 4
    let dark = 0
    for (let x = 0; x < w; x += colStep) {
      const o = rowOff + x * 4
      if (data[o + 3] > 16 && (0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2]) < 140) dark++
    }
    prof[Math.min(bins - 1, (y / h * bins) | 0)] += dark
  }
  return prof
}

// OCR 文字行分布：每个 bin 内 span 覆盖宽度之和（相对 canvas 矩形归一）。
function alignTextProfile(spans, canvasRect, bins) {
  const prof = new Float64Array(bins)
  const H = canvasRect.height || 1
  spans.forEach((s) => {
    const r = s.getBoundingClientRect()
    if (!r.height || !r.width) return
    const b0 = Math.max(0, Math.min(bins - 1, ((r.top - canvasRect.top) / H * bins) | 0))
    const b1 = Math.max(0, Math.min(bins - 1, ((r.bottom - canvasRect.top) / H * bins) | 0))
    for (let b = b0; b <= b1; b++) prof[b] += r.width
  })
  return prof
}

function alignResample(text, k, shiftBins, bins) {
  const out = new Float64Array(bins)
  for (let i = 0; i < bins; i++) {
    const src = (i - shiftBins) / k
    const s0 = Math.floor(src)
    if (s0 < 0 || s0 >= bins) continue
    const frac = src - s0
    const a = text[s0]
    const b = s0 + 1 < bins ? text[s0 + 1] : a
    out[i] = a + (b - a) * frac
  }
  return out
}

// 网格搜 (k, shift)：ink[i] ≈ text[(i-shift)/k] → 墨迹位置 = k·文字位置 + shift。
// 文字行是周期性的，互相关易混叠到相邻整行；故收窄搜索范围 + 惩罚大幅校正，偏好真实的小偏移。
function alignBest(ink, text, bins) {
  const inkN = alignNormalize(ink)
  let best = { score: -2, corr: 0, k: 1, shiftBins: 0 }
  const maxShift = Math.round(bins * 0.04) // 约 ±1.5 行，避免混叠到更远的行
  for (let ki = -6; ki <= 6; ki++) {
    const k = 1 + ki * 0.005 // 0.97 ~ 1.03
    for (let shift = -maxShift; shift <= maxShift; shift++) {
      const tN = alignNormalize(alignResample(text, k, shift, bins))
      let corr = 0
      for (let i = 0; i < bins; i++) corr += inkN[i] * tN[i]
      const penalty = 0.08 * (Math.abs(shift) / maxShift) + 1.2 * Math.abs(k - 1)
      const score = corr - penalty
      if (score > best.score) best = { score, corr, k, shiftBins: shift }
    }
  }
  return best
}

// 估算某侧每页校正并存入 store
function estimateAlign(paneRef, store) {
  const pane = paneRef?.value
  if (!pane || !pane.getNumPages) return
  const n = pane.getNumPages()
  for (let p = 1; p <= n; p++) {
    store[p] = { k: 1, shift: 0 }
    const pageEl = pane.getPageEl(p)
    const canvas = pageEl && pageEl.querySelector('canvas')
    const tl = pageEl && pageEl.querySelector('.textLayer')
    if (!canvas || !tl) continue
    tl.style.transform = '' // 先清残留 transform，确保测到 OCR 原位
    const spans = Array.from(tl.querySelectorAll('span')).filter((s) => (s.textContent || '').trim())
    if (spans.length < 6) continue
    const ink = alignInkProfile(canvas, ALIGN_BINS)
    if (!ink) continue
    const text = alignTextProfile(spans, canvas.getBoundingClientRect(), ALIGN_BINS)
    const { corr, k, shiftBins } = alignBest(ink, text, ALIGN_BINS)
    const shift = shiftBins / ALIGN_BINS
    // 置信度(原始相关度) + 幅度门槛：不达标不校正；过小校正(<0.4%)忽略，省得抖
    const ok = corr >= 0.25 && Math.abs(shift) <= 0.035 && k >= 0.96 && k <= 1.04 && (Math.abs(shift) > 0.004 || Math.abs(k - 1) > 0.004)
    if (ok) store[p] = { k, shift }
    console.log(`[FileDiff][墨迹对齐] 页${p} corr=${corr.toFixed(2)} k=${k.toFixed(3)} shift=${shift.toFixed(4)} ${ok ? '应用' : '跳过'}`)
  }
}

// 把存好的校正作为 transform 施加到该侧每页 textLayer（缩放重渲后重调）
function applyAlign(paneRef, store) {
  const pane = paneRef?.value
  if (!pane || !pane.getNumPages) return
  const n = pane.getNumPages()
  for (let p = 1; p <= n; p++) {
    const pageEl = pane.getPageEl(p)
    const tl = pageEl && pageEl.querySelector('.textLayer')
    if (!tl) continue
    const c = store[p] || { k: 1, shift: 0 }
    if (c.k === 1 && !c.shift) { tl.style.transform = ''; tl.style.overflow = ''; continue }
    const h = pageEl.getBoundingClientRect().height
    tl.style.transformOrigin = '0 0'
    tl.style.overflow = 'visible' // 否则向下平移会被 textLayer 的 overflow:hidden 裁掉底部行
    tl.style.transform = `translateY(${(c.shift * h).toFixed(2)}px) scaleY(${c.k})`
  }
}

// 扫描侧自动校准（估算 + 施加）。打印 PDF 原生文字层通常已对齐，不主动动它；
// 偏移主要来自 searchable PDF 的 OCR 隐藏文字层。
function calibrateAlign() {
  const bScanned = !!(liveBSearchableUrl.value || props.sourceBSearchableUrl)
  const aScanned = !!props.sourceASearchableUrl
  bAlign = {}
  aAlign = {}
  try {
    if (bScanned) { estimateAlign(pdfPaneBRef, bAlign); applyAlign(pdfPaneBRef, bAlign) }
    if (aScanned) { estimateAlign(pdfPaneARef, aAlign); applyAlign(pdfPaneARef, aAlign) }
    console.log('[FileDiff][墨迹对齐] B=', JSON.stringify(bAlign), ' A=', JSON.stringify(aAlign))
  } catch (e) { console.warn('[FileDiff][墨迹对齐] 失败', e) }
}

// 从一组 DOM 标记求归一化区域 {page, yTop, yBottom}（相对所在页元素，缩放无关）。
// 优先用字符级覆盖层 fd-mark-rect；没有时退回 textLayer span。
function spanRegion(nodes, paneRef) {
  if (!nodes || !nodes.length) return null
  const pane = paneRef?.value
  if (!pane || !pane.getPageEl) return null
  const byPage = new Map()
  nodes.forEach((s) => {
    const wrap = s.closest && s.closest('.pdf-page-wrap')
    const pg = wrap ? parseInt(wrap.dataset.pageNumber || '0', 10) : 0
    if (!pg) return
    if (!byPage.has(pg)) byPage.set(pg, [])
    byPage.get(pg).push(s)
  })
  if (!byPage.size) return null
  let page = 0
  let best = -1
  byPage.forEach((arr, pg) => { if (arr.length > best) { best = arr.length; page = pg } })
  const pageEl = pane.getPageEl(page)
  if (!pageEl) return null
  const pr = pageEl.getBoundingClientRect()
  if (!pr.height) return null
  let top = Infinity
  let bottom = -Infinity
  let left = Infinity
  let right = -Infinity
  byPage.get(page).forEach((s) => {
    const r = s.getBoundingClientRect()
    if (!r.height && !r.width) return
    const isMark = s.classList && s.classList.contains('fd-mark-rect')
    const inset = isMark ? 0 : Math.max(0, r.height * 0.24)
    const visualTop = r.top + inset
    const visualBottom = r.bottom - inset
    if (visualTop < top) top = visualTop
    if (visualBottom > bottom) bottom = visualBottom
    if (r.left < left) left = r.left
    if (r.right > right) right = r.right
  })
  if (top === Infinity) return null
  const yTop = Math.max(0, Math.min(1, (top - pr.top) / pr.height))
  const yBottom = Math.max(0, Math.min(1, (bottom - pr.top) / pr.height))
  const xLeft = Math.max(0, Math.min(1, (left - pr.left) / pr.width))
  const xRight = Math.max(0, Math.min(1, (right - pr.left) / pr.width))
  return { page, yTop, yBottom, xLeft, xRight }
}

// 差异清单（单一事实源）：与染色同一次 diff（diffDocumentDetailed）的变更块，
// 位置直接取自已染色的 span → 框/连线/导出与颜色完全一致，根除两套 diff 互相偏移。
// 归一化 y 比例缩放无关，缩放后清单无需重建（保留用户编辑的批注）。
function buildTextDiffList() {
  if (oldType.value !== 'pdf' || newType.value !== 'pdf') return
  try {
    const localNotes = currentNoteMap()
    const res = diffDocumentForCurrentMode(
      { selector: oldSelector, type: oldType.value },
      { selector: newSelector, type: newType.value }
    )
    applyDegenerate(res)
    const blocks = res.blocks || []
    // 每个变更块 → 位置：A 框取删除 span、B 框取新增 span；纯删除用锚点 span 薄带定位
    const raw = blocks.map((b) => {
      const leftPos = spanRegion(b.leftMarks?.length ? b.leftMarks : b.leftSpans, pdfPaneARef)
      let rightPos = spanRegion(b.rightMarks?.length ? b.rightMarks : b.rightSpans, pdfPaneBRef)
      if (!rightPos && b.anchorRightSpan) {
        const ap = spanRegion([b.anchorRightSpan], pdfPaneBRef)
        if (ap) rightPos = { ...ap, yBottom: ap.yTop, approx: true }
      }
      return { type: b.type, change: { type: b.type, leftText: b.leftText, rightText: b.rightText }, leftPos, rightPos }
    }).filter((it) => it.leftPos || it.rightPos)
    // 视觉自上而下排（按 B 侧位置；无 B 位置排末尾），#序号即阅读顺序
    raw.sort((a, b) => {
      const pa = a.rightPos ? a.rightPos.page : 1e9
      const pb = b.rightPos ? b.rightPos.page : 1e9
      if (pa !== pb) return pa - pb
      const ya = a.rightPos ? a.rightPos.yTop : 1e9
      const yb = b.rightPos ? b.rightPos.yTop : 1e9
      return ya - yb
    })
    // 相邻块若 B 侧同页且纵向间距小，聚成一个区域（一个框/气泡），避免逐字碎框
    const MERGE_GAP = 0.02 // 约 1.5 行
    const merged = []
    raw.forEach((it) => {
      const last = merged[merged.length - 1]
      const near = last && it.rightPos && last.rightPos &&
        it.rightPos.page === last.rightPos.page &&
        (it.rightPos.yTop - last.rightPos.yBottom) <= MERGE_GAP
      if (near) {
        last.changes.push(it.change)
        last.types.add(it.type)
        last.rightPos.yTop = Math.min(last.rightPos.yTop, it.rightPos.yTop)
        last.rightPos.yBottom = Math.max(last.rightPos.yBottom, it.rightPos.yBottom)
        if (Number.isFinite(it.rightPos.xLeft) && Number.isFinite(it.rightPos.xRight)) {
          last.rightPos.xLeft = Math.min(last.rightPos.xLeft ?? it.rightPos.xLeft, it.rightPos.xLeft)
          last.rightPos.xRight = Math.max(last.rightPos.xRight ?? it.rightPos.xRight, it.rightPos.xRight)
        }
        last.rightPos.approx = last.rightPos.approx && it.rightPos.approx
        if (it.leftPos) {
          if (!last.leftPos) last.leftPos = { ...it.leftPos }
          else if (last.leftPos.page === it.leftPos.page) {
            last.leftPos.yTop = Math.min(last.leftPos.yTop, it.leftPos.yTop)
            last.leftPos.yBottom = Math.max(last.leftPos.yBottom, it.leftPos.yBottom)
            if (Number.isFinite(it.leftPos.xLeft) && Number.isFinite(it.leftPos.xRight)) {
              last.leftPos.xLeft = Math.min(last.leftPos.xLeft ?? it.leftPos.xLeft, it.leftPos.xLeft)
              last.leftPos.xRight = Math.max(last.leftPos.xRight ?? it.leftPos.xRight, it.leftPos.xRight)
            }
          }
        }
      } else {
        merged.push({
          types: new Set([it.type]),
          changes: [it.change],
          leftPos: it.leftPos ? { ...it.leftPos } : null,
          rightPos: it.rightPos ? { ...it.rightPos } : null
        })
      }
    })
    const list = merged.map((m) => {
      const item = {
        type: m.types.size === 1 ? [...m.types][0] : 'modify',
        leftText: m.changes.map((c) => c.leftText).filter(Boolean).join(' '),
        rightText: m.changes.map((c) => c.rightText).filter(Boolean).join(' '),
        changes: m.changes,
        leftPos: m.leftPos,
        rightPos: m.rightPos
      }
      item.note = defaultNote(item) // 批注默认文案：与导出口径一致，用户可在清单里改写
      // 当前页面已编辑批注优先；否则取后端已保存批注；最后才用默认文案。
      const sig = diffSignature(item)
      const saved = localNotes[sig] ?? compareNoteMap.value[sig]
      if (saved != null && saved !== '') item.note = normalizeNotePrefix(saved)
      return item
    })
    ocrDiffList.value = list
    currentDiffIdx.value = -1
    expandedDiffIdxSet.value = new Set()
    editingNoteIdx.value = -1
    noteInputRefs.clear()
    diffTypeFilter.value = 'all'
    console.log('[FileDiff] 差异清单(span同源):', list.length, '处',
      '(add', list.filter((x) => x.type === 'add').length,
      'del', list.filter((x) => x.type === 'del').length,
      'modify', list.filter((x) => x.type === 'modify').length, ')')
    // 诊断：定位有效性。leftPos/rightPos 为空会导致「连线不画」「导出无批注」。
    console.log('[FileDiff][定位诊断] blocks=', blocks.length, 'raw(有位置)=', raw.length, 'list=', list.length,
      '| 有rightPos=', list.filter((x) => x.rightPos).length, '有leftPos=', list.filter((x) => x.leftPos).length,
      '| 样例=', list.slice(0, 3).map((x) => `${x.type} L:${x.leftPos ? x.leftPos.page + '@' + x.leftPos.yTop.toFixed(2) : '∅'} R:${x.rightPos ? x.rightPos.page + '@' + x.rightPos.yTop.toFixed(2) : '∅'}`).join(' ; '))
    scheduleConn() // 清单就绪后显示中间差异图标条
  } catch (e) {
    console.warn('[FileDiff] 构建差异清单失败', e)
  }
}

watch(
  readyList,
  (val) => {
    if (val[0] && val[1]) {
      compareFun()
      trySetupSyncScroll()
      if (oldType.value === 'pdf' && newType.value === 'pdf') {
        // 延后两帧：calibrateAlign 要读 canvas 像素、buildTextDiffList 要取 span 位置，
        // 两者都依赖「布局+绘制已完成」。刚 rendered 时同步立即跑可能读不到（位置全空 →
        // 连线缺右端、导出无批注）。等两帧确保就绪，再校准、建清单。
        requestAnimationFrame(() => requestAnimationFrame(() => {
          calibrateAlign() // 扫描件墨迹对齐：必须在染色/取位置之前，让 textLayer 先归位
          buildTextDiffList()
        }))
      }
    }
  },
  { deep: true }
)

// 「整块高亮」开关：控制连线层显隐。关 → 清掉框/虚线/图标；开 → 若有选中项则重画。
watch(blockHighlight, (on) => {
  if (!on) {
    activeConn.value = null
    connBadges.value = []
  } else {
    scheduleConn()
  }
})

watch(ignoreFormatDiff, () => {
  if (oldType.value !== 'pdf' || newType.value !== 'pdf') return
  currentDiffIdx.value = -1
  activeConn.value = null
  connBadges.value = []
  compareFun()
  buildTextDiffList()
  scheduleConn()
})

// AI 审核/差异清单抽屉开关 → 左右 pane 宽度与位置变，连线框横向坐标需重算。
// 抽屉切换可能带过渡，分几个时间点重算覆盖动画。
watch([aiPanelOpen, diffPanelOpen], () => {
  scheduleConn()
  setTimeout(scheduleConn, 60)
  setTimeout(scheduleConn, 240)
  if (layoutRefitTimer) clearTimeout(layoutRefitTimer)
  layoutRefitTimer = setTimeout(() => {
    layoutRefitTimer = null
    refitAfterLayoutChange()
  }, 120)
})

async function reload() {
  unbindSyncScroll()
  readyList.value = [false, false]
  msgLoading.value = true
  degenerateSide.value = null
  oldSelector = '.old-docx .docx-wrapper > .docx > article'
  newSelector = '.new-docx .docx-wrapper > .docx > article'
  // 清空差异清单（重新加载后重建）
  ocrDiffList.value = []
  currentDiffIdx.value = -1
  // 清空连线层
  activeConn.value = null
  connBadges.value = []
  console.log('[FileDiff] reload A=', props.sourceAUrl, 'B=', props.sourceBUrl)
  console.log('[FileDiff] type A=', oldType.value, 'B=', newType.value)
  await loadBothPdfs()
}

watch(
  () => [
    props.sourceAUrl,
    props.sourceBUrl,
    props.sourceASearchableUrl,
    props.sourceBSearchableUrl,
    liveBSearchableUrl.value
  ],
  () => reload()
)

// ossId 变了重启轮询(切换协议时)
watch(() => props.sourceBOssId, () => {
  ocrSelfHealTried = false
  startOcrPolling()
})

onMounted(() => {
  reload()
  startOcrPolling()
})
onBeforeUnmount(() => {
  stopOcrPolling()
  unbindSyncScroll()
  revokeBlobUrls()
  if (connRaf) cancelAnimationFrame(connRaf)
  if (layoutRefitTimer) clearTimeout(layoutRefitTimer)
  if (autoFollowReleaseTimer) clearTimeout(autoFollowReleaseTimer)
})
</script>

<style scoped>
.file-diff-viewer {
  --ai-panel-width: 320px;
  --diff-panel-width: 360px;
  --title-center-offset: 0px;
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  color: #000;
  overflow: hidden;
}
.file-diff-viewer.ai-panel-visible {
  --title-center-offset: calc(var(--ai-panel-width) / 2);
}
.file-diff-viewer.diff-panel-visible {
  --title-center-offset: calc(var(--diff-panel-width) / -2);
}
.file-diff-viewer.ai-panel-visible.diff-panel-visible {
  --title-center-offset: calc((var(--ai-panel-width) - var(--diff-panel-width)) / 2);
}

.file-diff-viewer :deep(.docx-wrapper) {
  background-color: #fff;
  padding: 0;
}
.file-diff-viewer :deep(.docx-wrapper > section.docx) {
  margin-bottom: 0;
  box-shadow: none;
}

.similarity-bar {
  flex-shrink: 0;
  padding: 10px 16px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  border-bottom: 1px solid #ebeef5;
  background: linear-gradient(180deg, #fafbfc, #f0f2f5);
  gap: 12px;
}
.similarity-bar .bar-left {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  min-width: 0;
  z-index: 1;
}
.similarity-bar .label {
  position: absolute;
  left: calc(50% + var(--title-center-offset));
  top: 50%;
  transform: translate(-50%, -50%);
  font-weight: 600;
  color: #303133;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-width: 0;
  max-width: 560px;
  width: 560px;
  overflow: hidden;
  white-space: nowrap;
  pointer-events: none;
  transition: left 0.2s ease;
}
.similarity-bar .side-block {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.similarity-bar .side-block:first-child {
  justify-self: end;
}
.similarity-bar .side-block:last-child {
  justify-self: start;
}
.similarity-bar .side-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 320px;
}
.similarity-bar .side-tag {
  font-weight: 700;
  flex-shrink: 0;
}
.similarity-bar .old-tag {
  border-color: #fac5cd;
  background: #fef0f0;
  color: #c45656;
}
.similarity-bar .new-tag {
  border-color: #c7f0d2;
  background: #f0f9eb;
  color: #529b2e;
}
.similarity-bar .vs {
  color: #999;
  margin: 0 4px;
}
.similarity-bar .sim-text {
  color: #606266;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  flex-shrink: 0;
  min-width: 0;
  margin-left: auto;
  z-index: 1;
}
.similarity-bar .ocr-debug-toggle {
  margin-right: 0;
}
.similarity-bar .close-btn {
  margin-left: 10px;
  font-size: 16px;
  color: #909399;
}
.similarity-bar .close-btn:hover {
  color: #f56c6c;
}

.ocr-banner {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  font-size: 13px;
  border-bottom: 1px solid #ebeef5;
}
.ocr-banner.progress {
  background: #ecf5ff;
  color: #409eff;
}
.ocr-banner.fail {
  background: #fef0f0;
  color: #f56c6c;
}
.ocr-banner.degenerate {
  background: #fdf6ec;
  color: #e6a23c;
}

.comparison-list {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
  position: relative;
}

/* ===== 差异清单侧栏 ===== */
.diff-panel {
  flex: 0 0 var(--diff-panel-width);
  height: 100%;
  overflow: hidden;
  border-right: 1px solid #ebeef5;
  background: #fff;
  display: flex;
  flex-direction: column;
  min-height: 0;
  font-size: 13px;
  /* 复位全局 aside{} 主题样式的渗入：.diff-panel 是 <aside>，会被全局
     aside{padding:8px 24px;margin-bottom:20px;line-height:32px;...} 撑出多余左右边距，
     导致与异常清单(.ca-list 是 div)左右不一致 */
  padding: 0;
  margin: 0;
  border-radius: 0;
  line-height: normal;
}
/* 差异清单置于最右时：用左边框代替右边框 */
.diff-panel-right {
  border-right: none;
  border-left: 1px solid #e6e8eb;
}
.diff-panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid #eef0f2;
  background: #fff;
  flex-shrink: 0;
}
.diff-panel-header .diff-title {
  font-weight: 600;
  color: #303133;
}
.diff-panel-header .diff-count {
  color: #909399;
  font-size: 12px;
}
.diff-panel-header .diff-count .diff-count-num {
  font-size: 18px;
  font-weight: 700;
  color: #f56c6c;
  margin-right: 2px;
}
.diff-nav {
  margin-left: auto;
  display: flex;
  gap: 4px;
}
.diff-nav-btn {
  width: 24px;
  height: 24px;
  border: 1px solid #dcdfe6;
  background: #fff;
  border-radius: 4px;
  cursor: pointer;
  color: #606266;
}
.diff-nav-btn:hover:not(:disabled) {
  border-color: #409eff;
  color: #409eff;
}
.diff-nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.diff-empty {
  flex: 1;
  padding-top: 40px;
}
/* 差异清单标签过滤（仿异常清单 .ai-filter） */
.diff-filter {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  padding: 8px 14px;
  border-bottom: 1px solid #eef0f2;
  flex-shrink: 0;
}
.diff-filter-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 3px 4px;
  font-size: 11px;
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 999px;
  color: #606266;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
  white-space: nowrap;
  overflow: hidden;
}
.diff-filter-btn:hover {
  border-color: #c0c4cc;
  color: #303133;
}
.diff-filter-btn .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #c0c4cc;
}
.diff-filter-btn.dt-all .dot { background: #409eff; }
.diff-filter-btn.dt-add .dot { background: #67c23a; }
.diff-filter-btn.dt-del .dot { background: #f56c6c; }
.diff-filter-btn.dt-modify .dot { background: #e6a23c; }
.diff-filter-btn .diff-filter-count {
  background: #f0f2f5;
  color: #909399;
  border-radius: 8px;
  padding: 0 5px;
  font-size: 10px;
  line-height: 14px;
  min-width: 14px;
  text-align: center;
}
.diff-filter-btn.active {
  background: #ecf5ff;
  border-color: #409eff;
  color: #409eff;
}
.diff-filter-btn.active.dt-add { background: #f0f9eb; border-color: #67c23a; color: #67c23a; }
.diff-filter-btn.active.dt-del { background: #fef0f0; border-color: #f56c6c; color: #f56c6c; }
.diff-filter-btn.active.dt-modify { background: #fdf6ec; border-color: #e6a23c; color: #e6a23c; }
.diff-filter-btn.active .diff-filter-count {
  background: rgba(255,255,255,0.6);
  color: inherit;
}
.diff-list {
  list-style: none;
  margin: 0;
  padding: 6px;
  overflow-y: auto;
  flex: 1;
  /* 预留滚动条空间：78 条必出滚动条，否则右侧外边距被滚动条吃掉，与异常清单左右不一致 */
  scrollbar-gutter: stable;
}
.diff-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 4px;
  border: 1px solid transparent;
}
.diff-item:hover {
  background: #f0f2f5;
}
.diff-item.active {
  background: #ecf5ff;
  border-color: #409eff;
}
.diff-badge {
  flex: 0 0 auto;
  height: 18px;
  padding: 0 6px;
  border-radius: 3px;
  font-size: 11px;
  line-height: 18px;
  color: #fff;
}
.diff-badge.dt-add {
  background: #67c23a;
}
.diff-badge.dt-del {
  background: #f56c6c;
}
.diff-badge.dt-modify {
  background: #e6a23c;
}
.diff-texts {
  position: relative;
  flex: 1;
  min-width: 0;
  width: 100%;
  padding-right: 28px;
}
.diff-text-row {
  display: flex;
  align-items: flex-start;
  max-width: 100%;
  min-width: 0;
  line-height: 1.5;
}
.diff-text-content {
  flex: 1;
  min-width: 0;
  display: -webkit-box;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
}
.diff-texts.expanded .diff-text-content {
  -webkit-line-clamp: 3;
}
/* 选中/激活态也保持省略，避免点击后文字撑开过高 */
.diff-item.active .diff-text-content,
.diff-item:hover .diff-text-content {
  white-space: normal;
  overflow: hidden;
  text-overflow: ellipsis;
}
.diff-expand-btn {
  position: absolute;
  right: 0;
  bottom: 1px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  background: transparent;
  color: #409eff;
  cursor: pointer;
  padding: 0;
  width: 18px;
  height: 18px;
  font-size: 13px;
  line-height: 18px;
}
.diff-expand-btn:hover {
  color: #66b1ff;
}
.diff-text-row .dt-tag {
  display: inline-block;
  flex: 0 0 auto;
  font-size: 10px;
  color: #909399;
  border: 1px solid #dcdfe6;
  border-radius: 2px;
  padding: 0 3px;
  margin-right: 4px;
}
.diff-text-row.left .diff-text-content {
  color: #c45656;
}
.diff-text-row.right .diff-text-content {
  color: #529b2e;
}
/* 清单条目头部：徽标 + 序号 + 右上角(保存/删除) */
.diff-item-head {
  display: flex;
  align-items: center;
  gap: 6px;
}
.diff-seq {
  font-size: 11px;
  color: #909399;
}
/* 编辑+删除统一右上角（仅图标） */
.diff-actions {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}
.diff-edit-btn {
  color: #909399;
  cursor: pointer;
  font-size: 14px;
}
.diff-edit-btn:hover,
.diff-edit-btn.active {
  color: #409eff;
}
.diff-edit-btn.is-saving {
  color: #409eff;
  cursor: default;
}
.diff-del-btn {
  color: #c0c4cc;
  cursor: pointer;
  font-size: 14px;
}
.diff-del-btn:hover {
  color: #f56c6c;
}
/* 批注默认只读，点击笔进入编辑态，失焦自动保存 */
.diff-note {
  margin-top: 2px;
}
.diff-note :deep(.ant-input) {
  font-size: 12px;
  line-height: 1.5;
  padding: 4px 6px;
  min-height: 26px;
  cursor: default;
  background: #fff;
  border-color: #dcdfe6;
  color: #606266;
  box-shadow: none;
}
.diff-note :deep(.ant-input[readonly]) {
  background: #fafafa;
}
.diff-note :deep(.ant-input.is-editing) {
  cursor: text;
  background: #fff;
  border-color: #409eff;
}

.comparison-list .pane {
  flex: 1 1 0;
  height: 100%;
  position: relative;
  border-right: 1px solid #ebeef5;
  overflow: hidden;
}
.comparison-list .pane:last-child {
  border-right: none;
}

/* ===== 连线层（文字层模式）===== */
/* 连线浮层：覆盖整个对比区，不挡 PDF 操作 */
.conn-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 6;
}
.conn-svg {
  position: absolute;
  top: 0;
  left: 0;
}
/* 左右高亮框 */
.conn-rect {
  fill: none;
  stroke-width: 2;
  pointer-events: stroke;
  cursor: pointer;
}
.conn-rect.dt-add { stroke: #67c23a; }
.conn-rect.dt-del { stroke: #f56c6c; }
.conn-rect.dt-modify { stroke: #e6a23c; }
/* 连接虚线 */
.conn-line {
  fill: none;
  stroke-width: 1.5;
  stroke-dasharray: 6 4;
  pointer-events: stroke;
  cursor: pointer;
}
.conn-line.dt-add { stroke: #67c23a; }
.conn-line.dt-del { stroke: #f56c6c; }
.conn-line.dt-modify { stroke: #e6a23c; }

/* 工具条：缩放 */
.pdf-toolbar {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin: 0 6px;
}
.pdf-toolbar .tb-btn {
  width: 22px;
  height: 22px;
  border: 1px solid #dcdfe6;
  background: #fff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  color: #606266;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.pdf-toolbar .tb-btn:hover { border-color: #409eff; color: #409eff; }
.pdf-toolbar .tb-zoom {
  min-width: 42px;
  text-align: center;
  font-size: 12px;
  color: #606266;
  cursor: pointer;
}
.pdf-toolbar .tb-zoom:hover { color: #409eff; }

/* 缩放重渲遮罩 */
.zoom-mask {
  position: absolute;
  inset: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(1px);
  font-size: 14px;
  color: #409eff;
}
.zoom-mask .anticon { font-size: 22px; }

/* 中间固定分割条：留白通道，承载差异图标。flex item，始终居于左右 pane 之间 */
.diff-gutter {
  flex: 0 0 46px;
  height: 100%;
  position: relative;
  background: #f5f7fa;
  border-left: 1px solid #ebeef5;
  border-right: 1px solid #ebeef5;
}
.conn-badge {
  position: absolute;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 22px;
  height: 22px;
  padding: 0;
  border: 2px solid #fff;
  border-radius: 50%;
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
  color: #fff;
  cursor: pointer;
  pointer-events: auto;
  z-index: 8;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
  transition: transform 0.12s, box-shadow 0.12s;
}
.conn-badge.dt-add { background: #67c23a; }
.conn-badge.dt-del { background: #f56c6c; }
.conn-badge.dt-modify { background: #e6a23c; }
.conn-badge .anticon { font-size: 13px; }
.conn-badge:hover {
  transform: translate(-50%, -50%) scale(1.25);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}
.conn-badge.active {
  transform: translate(-50%, -50%) scale(1.3);
  box-shadow: 0 0 0 3px #409eff, 0 2px 8px rgba(0, 0, 0, 0.4);
}

/* AI 审核侧栏 */
.ai-panel {
  flex: 0 0 var(--ai-panel-width);
  height: 100%;
  overflow: auto;
  border-right: 1px solid #ebeef5;
  background: #fafbfc;
  padding: 14px 14px 30px;
  font-size: 13px;
  padding:0px;
  color: #303133;
}
.ai-panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ebeef5;
  margin-bottom: 12px;
}
.ai-panel-header .ai-icon {
  color: #409eff;
  font-size: 16px;
}
.ai-panel-header .ai-title {
  font-weight: 600;
  flex: 1;
}
.ai-overview {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 14px;
}
.ai-overview-item {
  text-align: center;
  padding: 8px 4px;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 6px;
}
.ai-overview-item .oi-num {
  font-size: 18px;
  font-weight: 700;
  color: #303133;
  line-height: 1.2;
}
.ai-overview-item .oi-num.danger { color: #f56c6c; }
.ai-overview-item .oi-num.warning { color: #e6a23c; }
.ai-overview-item .oi-num.info { color: #909399; }
.ai-overview-item .oi-label {
  font-size: 11px;
  color: #909399;
  margin-top: 2px;
}
.ai-summary {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  padding: 10px 12px;
  margin-bottom: 14px;
}
.ai-summary-content {
  white-space: pre-wrap;
  line-height: 1.6;
  color: #606266;
  font-size: 12px;
  margin-top: 6px;
}
.ai-section-title {
  font-weight: 600;
  color: #303133;
  font-size: 13px;
}
.ai-section-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 10px;
}
.ai-filter {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}
.ai-filter-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 3px 4px;
  font-size: 11px;
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 999px;
  color: #606266;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
  white-space: nowrap;
  overflow: hidden;
}
.ai-filter-btn:hover {
  border-color: #c0c4cc;
  color: #303133;
}
.ai-filter-btn .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #c0c4cc;
}
.ai-filter-btn.sev-error .dot { background: #f56c6c; }
.ai-filter-btn.sev-warning .dot { background: #e6a23c; }
.ai-filter-btn.sev-info .dot { background: #909399; }
.ai-filter-btn.sev-all .dot { background: #409eff; }
.ai-filter-btn .ai-filter-count {
  background: #f0f2f5;
  color: #909399;
  border-radius: 8px;
  padding: 0 5px;
  font-size: 10px;
  line-height: 14px;
  min-width: 14px;
  text-align: center;
}
.ai-filter-btn.active {
  background: #ecf5ff;
  border-color: #409eff;
  color: #409eff;
}
.ai-filter-btn.active.sev-error { background: #fef0f0; border-color: #f56c6c; color: #f56c6c; }
.ai-filter-btn.active.sev-warning { background: #fdf6ec; border-color: #e6a23c; color: #e6a23c; }
.ai-filter-btn.active.sev-info { background: #f4f4f5; border-color: #909399; color: #303133; }
.ai-filter-btn.active .ai-filter-count {
  background: rgba(255,255,255,0.6);
  color: inherit;
}

.ai-issues .ai-empty {
  text-align: center;
  padding: 12px 0;
}
.ai-issue-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ai-issue-item {
  background: #fff;
  border: 1px solid #ebeef5;
  border-left-width: 3px;
  border-radius: 6px;
  padding: 10px 12px;
  font-size: 12px;
  line-height: 1.5;
  transition: box-shadow 0.15s ease, transform 0.15s ease;
}
.ai-issue-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  transform: translateY(-1px);
}
.ai-issue-item.sev-error { border-left-color: #f56c6c; }
.ai-issue-item.sev-warning { border-left-color: #e6a23c; }
.ai-issue-item.sev-info { border-left-color: #909399; }

.ai-issue-head {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.ai-sev-chip {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 3px;
  letter-spacing: 0.5px;
  flex-shrink: 0;
}
.ai-sev-chip.sev-error { background: #fef0f0; color: #f56c6c; }
.ai-sev-chip.sev-warning { background: #fdf6ec; color: #e6a23c; }
.ai-sev-chip.sev-info { background: #f4f4f5; color: #909399; }

.ai-issue-field {
  font-weight: 600;
  color: #303133;
  font-size: 13px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ai-match-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  padding: 1px 7px;
  border-radius: 10px;
  flex-shrink: 0;
}
.ai-match-chip .match-icon {
  font-weight: 700;
}
.ai-match-chip.match-matched { background: #f0f9eb; color: #67c23a; }
.ai-match-chip.match-mismatched { background: #fef0f0; color: #f56c6c; }
.ai-match-chip.match-uncertain { background: #fdf6ec; color: #e6a23c; }
.ai-match-chip.match-not_found { background: #f4f4f5; color: #909399; }

.ai-issue-desc {
  color: #606266;
  margin-top: 6px;
  font-size: 12px;
}
.ai-issue-values {
  margin-top: 8px;
  background: #fafbfc;
  border-radius: 4px;
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.value-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 11px;
}
.value-row .value-tag {
  flex-shrink: 0;
  padding: 0 5px;
  border-radius: 3px;
  font-size: 10px;
  line-height: 16px;
  font-weight: 600;
}
.value-row.form-row .value-tag { background: #ecf5ff; color: #409eff; }
.value-row.extract-row .value-tag { background: #f0f9eb; color: #67c23a; }
.value-row .value-text {
  color: #303133;
  word-break: break-all;
  flex: 1;
}

.ai-issue-sugg {
  margin-top: 8px;
  padding: 6px 8px;
  background: #ecf5ff;
  border-radius: 4px;
  color: #409eff;
  font-size: 11px;
  display: flex;
  align-items: flex-start;
  gap: 4px;
  line-height: 1.5;
}
.ai-issue-sugg .sugg-icon {
  margin-top: 2px;
  flex-shrink: 0;
}
.ai-issue-loc {
  margin-top: 6px;
  color: #909399;
  font-size: 11px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.similarity-bar .diff-panel-toggle .anticon {
  font-size: 14px;
  margin-right: 3px;
}

.docx-box-wrap {
  height: 100%;
  overflow: auto;
  background: #f5f5f5;
}
.docx-box {
  margin: 0 auto;
  padding: 12px 0;
}
.image-box-wrap {
  height: 100%;
  overflow: auto;
  background: #525659;
  text-align: center;
  padding: 12px;
}
.preview-image {
  max-width: 100%;
  background: #fff;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.15);
}

.fetch-loading,
.fetch-error {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 8px;
  color: #606266;
  font-size: 13px;
}
.fetch-error {
  color: #f56c6c;
}
</style>

<!-- 非 scoped：el-tooltip 的 popper 被 teleport 到 body，scoped 样式选不中 -->
<style>
.diff-tooltip {
  max-width: 360px !important;
}
.diff-tooltip .diff-tip {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.diff-tooltip .diff-tip-row {
  display: flex;
  gap: 6px;
  align-items: flex-start;
  line-height: 1.6;
  word-break: break-all;
  white-space: normal;
}
.diff-tooltip .diff-tip-tag {
  flex: 0 0 auto;
  font-size: 11px;
  padding: 0 5px;
  border-radius: 3px;
  color: #fff;
  margin-top: 2px;
}
.diff-tooltip .diff-tip-tag.del {
  background: #f56c6c;
}
.diff-tooltip .diff-tip-tag.add {
  background: #67c23a;
}
.diff-tooltip .diff-tip-text {
  flex: 1;
  color: #303133;
}
</style>
