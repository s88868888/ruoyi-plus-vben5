<template>
  <!-- 单文档内容审查查看器：单栏 PdfPane（被审查文档）+ 右侧异常清单。
       清单样式与「附件对比」的差异清单统一：徽标+序号+删除 / 标准-文档 / 可编辑批注；
       支持导出批注（与附件对比同一套 exportAnnotatedPdf，单文档的被审查文档即对比里的 B 件）。
       染色定位来自审核结果：错填(mismatched)/存疑(uncertain) 按 extractedValue 在 textLayer 检索命中后染色；
       漏填(not_found) 文档里本无文字，只进清单、无法染色。 -->
  <div class="ca-viewer">
    <div class="ca-toolbar">
      <span class="ca-label">
        <Tag color="default" class="side-tag audit-tag">{{ isRedactMode ? '脱敏' : '审' }}</Tag>
        <span class="ca-title" :title="displayDocLabel">{{ isRedactMode ? '文件脱敏' : '内容审查' }}：{{ displayDocLabel }}</span>
        <Tag v-if="status === 'RUNNING'" color="warning">{{ isRedactMode ? '定位中…' : '审核中…' }}</Tag>
        <Tag v-else-if="status === 'FAIL'" color="error">{{ isRedactMode ? '定位失败' : '审核失败' }}</Tag>
        <span v-if="ocrTip" class="ca-ocr">
          <LoadingOutlined v-if="ocrLoading" spin />{{ ocrTip }}
        </span>
      </span>
      <span class="ca-actions">
        <!-- 缩放：与附件对比顶部缩放控件保持一致的样式 -->
        <span class="pdf-toolbar">
          <button class="tb-btn" @click="zoom(-0.1)" title="缩小">−</button>
          <span class="tb-zoom" @click="fitWidth" title="点击适应宽度">{{ zoomPercent }}%</span>
          <button class="tb-btn" @click="zoom(0.1)" title="放大">＋</button>
        </span>
        <Button
          v-if="!isRedactMode"
          type="link"
          size="small"
          class="ca-action-link"
          @click="listPanelOpen = !listPanelOpen"
        >
          <ProfileOutlined />
          <span>{{ listPanelOpen ? '收起清单' : '差异清单' }}</span>
        </Button>
        <Button
          v-if="!isRedactMode"
          type="link"
          size="small"
          class="ca-action-link"
          :loading="exporting"
          :disabled="!items.length"
          title="导出被审查文档，异常作为批注嵌入"
          @click="onExportAudit"
        >
          <DownloadOutlined />
          <span>打印</span>
        </Button>
        <Button
          v-if="canUseRedact"
          type="link"
          size="small"
          class="ca-action-link"
          :disabled="!docBytes"
          title="脱敏导出：在文档上框选敏感区域，导出像素涂黑的不可逆脱敏件"
          @click="openRedact"
        >
          <EyeInvisibleOutlined />
          <span>脱敏</span>
        </Button>
        <Button
          type="link"
          class="close-btn"
          title="关闭"
          @click="$emit('close')"
        >
          <CloseOutlined />
        </Button>
      </span>
    </div>

    <div ref="bodyRef" class="ca-body">
      <svg
        v-if="!isRedactMode && issueConn && listPanelOpen && activeListTab === 'issues'"
        class="issue-conn-overlay"
        :width="issueConn.w"
        :height="issueConn.h"
      >
        <path :d="issueConn.path" class="issue-conn-line" :class="`dt-${issueConn.type}`" />
        <circle :cx="issueConn.x0" :cy="issueConn.y0" r="3" class="issue-conn-dot" :class="`dt-${issueConn.type}`" />
        <circle :cx="issueConn.x1" :cy="issueConn.y1" r="3" class="issue-conn-dot" :class="`dt-${issueConn.type}`" />
      </svg>
      <div class="ca-doc">
        <!-- 缩放重渲遮罩：盖住重渲闪烁，等定位染色完成后撤掉 -->
        <div v-if="zooming" class="zoom-mask">
          <LoadingOutlined spin />
          <span>缩放渲染中…</span>
        </div>
        <PdfPane
          v-if="docBytes"
          ref="paneRef"
          :data="docBytes"
          side="AUDIT"
          :fit-factor="0.75"
          :max-page-width="740"
          :initial-scale="1"
          loading-text="加载文档…"
          @rendered="onRendered"
        />
        <div v-else class="ca-doc-empty">
          <LoadingOutlined spin />
          <span>{{ docError || '加载文档…' }}</span>
        </div>
      </div>

      <div v-show="listPanelOpen" class="ca-list">
        <!-- Tab 切换：异常清单 / 关注列表 -->
        <div v-if="!isRedactMode && canUseRedact" class="ca-list-tabs">
          <button
            class="ca-tab-btn"
            :class="{ active: activeListTab === 'issues' }"
            @click="activeListTab = 'issues'"
          >
            异常清单
            <Tag v-if="items.length" color="error" class="ca-tab-badge">{{ items.length }}</Tag>
          </button>
          <button
            class="ca-tab-btn"
            :class="{ active: activeListTab === 'focus' }"
            @click="activeListTab = 'focus'"
          >
            关注列表
            <Tag v-if="focusEntries.length" color="default" class="ca-tab-badge">{{ focusEntries.length }}</Tag>
          </button>
        </div>

        <!-- ============ Tab 1: 异常清单 ============ -->
        <template v-if="!isRedactMode && activeListTab === 'issues'">

        <!-- 严重程度过滤（与附件对比 AI 面板一致：严重/警告/提示） -->
        <div v-if="items.length && ready" class="ca-filter">
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

        <!-- 加载顺序：文档 → 差异色 → 清单。染色定位(ready)完成后才揭示清单 -->
        <ul v-if="items.length && ready && filteredItems.length" class="diff-list">
          <li
            v-for="entry in filteredItems"
            :key="entry.idx"
            :ref="(el) => setIssueItemRef(entry.idx, el)"
            class="diff-item"
            :class="[`dt-${caMeta(entry.item).type}`, { active: entry.idx === currentIdx }]"
            @click="gotoIssue(entry.idx)"
          >
            <div class="diff-item-head">
              <span class="diff-badge" :class="`dt-${caMeta(entry.item).type}`">{{ caMeta(entry.item).label }}</span>
              <span class="diff-seq">#{{ entry.idx + 1 }}</span>
              <span class="diff-field">{{ entry.item.fieldLabel || entry.item.fieldName || '字段' }}</span>
              <Tag v-if="locatedPos[entry.idx]" color="success" class="diff-loc">已定位</Tag>
              <!-- 编辑 + 删除 统一放在右上角（仅图标） -->
              <span class="diff-actions" @click.stop>
                <span
                  class="diff-save-btn"
                  :class="{ active: editingNoteIdx === entry.idx, 'is-saving': savingIdx === entry.idx }"
                  :title="savingIdx === entry.idx ? '保存中' : (editingNoteIdx === entry.idx ? '正在编辑，失去焦点保存' : '编辑批注')"
                  @click="beginAuditNoteEdit(entry.idx)"
                >
                  <LoadingOutlined v-if="savingIdx === entry.idx" spin />
                  <EditOutlined v-else />
                </span>
                <span class="diff-del-btn" title="删除此条（不导出）" @click="removeAudit(entry.idx)"><DeleteOutlined /></span>
              </span>
            </div>
            <!-- 规则说明：告诉用户这条按什么规则审的（规则原文）。@click.stop 不触发定位 -->
            <div
              v-if="entry.item.ruleContent"
              class="diff-rule"
              @click.stop="toggleRuleExpand(entry.idx)"
            >
              <span class="dt-tag">规则</span>
              <span class="diff-rule-text" :class="{ expanded: isRuleExpanded(entry.idx) }">{{ entry.item.ruleContent }}</span>
            </div>
            <div
              class="diff-texts"
              :class="{ expanded: isIssueTextExpanded(entry.idx) }"
            >
              <div class="diff-text left"><span class="dt-tag">标准</span><span class="diff-text-content">{{ entry.item.formValue || '—' }}</span></div>
              <div class="diff-text right"><span class="dt-tag">文档</span><span class="diff-text-content">{{ entry.item.extractedValue || '（空缺）' }}</span></div>
              <button
                v-if="needsIssueTextExpand(entry.item)"
                type="button"
                class="diff-expand-btn"
                :title="isIssueTextExpanded(entry.idx) ? '收起差异内容' : '展开差异内容'"
                @click.stop="toggleIssueText(entry.idx)"
              >
                {{ isIssueTextExpanded(entry.idx) ? '收起' : '...' }}
              </button>
            </div>
            <!-- 批注默认只读，点击编辑图标后进入编辑；失焦即保存。@click.stop 不触发定位 -->
            <div class="diff-note" @click.stop>
              <Input.TextArea
                :ref="(el) => setAuditNoteInputRef(entry.idx, el)"
                v-model:value="entry.item.note"
                :auto-size="{ minRows: 1, maxRows: 5 }"
                size="small"
                :readonly="editingNoteIdx !== entry.idx"
                :class="{ 'is-editing': editingNoteIdx === entry.idx }"
                placeholder="批注内容（导出时写入 PDF）"
                @blur="finishAuditNoteEdit(entry.idx)"
              />
            </div>
          </li>
        </ul>
        <Empty
          v-else-if="items.length && ready && !filteredItems.length"
          :image-style="{ height: '60px' }"
          description="无匹配问题"
        />
        <div v-else-if="items.length && !ready" class="ca-list-tip">
          <LoadingOutlined spin /><span>定位差异中…</span>
        </div>
        <Empty
          v-else
          :image-style="{ height: '70px' }"
          :description="issueEmptyText"
        />
        </template>

        <!-- ============ Tab 2: 关注列表 ============ -->
        <template v-if="canUseRedact && activeListTab === 'focus'">
          <!-- 定位状态过滤（全部 / 已定位 / 缺漏），与异常清单过滤条样式一致 -->
          <div v-if="focusEntries.length && ready" class="ca-filter">
            <button
              v-for="opt in focusFilterOptions"
              :key="opt.key"
              class="ai-filter-btn"
              :class="{ active: focusFilter === opt.key, [`focus-${opt.key}`]: true }"
              @click="focusFilter = opt.key"
            >
              <span class="dot"></span>{{ opt.label }}
              <span class="ai-filter-count">{{ countByFocusStatus(opt.key) }}</span>
            </button>
          </div>
          <div v-if="focusCategoryOptions.length > 1 && ready" class="focus-category-filter">
            <button
              v-for="opt in focusCategoryOptions"
              :key="opt.key"
              class="focus-category-btn"
              :class="{ active: focusCategoryFilter === opt.key }"
              @click="focusCategoryFilter = opt.key"
            >
              <span>{{ opt.label }}</span>
              <span class="ai-filter-count">{{ opt.count }}</span>
            </button>
          </div>

          <!-- 关注列表内容（要点粒度） -->
          <ul v-if="filteredFocusItems.length && ready" class="diff-list">
            <li
              v-for="(entry, i) in filteredFocusItems"
              :key="entry.placeholder ? 'ph-' + (entry.item.keyword || entry.item.category) + '-' + i : 'focus-' + entry.idx"
              class="diff-item focus-item"
              :class="{ active: !entry.placeholder && entry.idx === focusCurrentIdx }"
              @click="!entry.placeholder && gotoFocus(entry.idx)"
            >
              <div class="diff-item-head">
                <span class="diff-badge dt-focus">关注</span>
                <span class="focus-category-chip" :title="focusCategoryLabel(entry.item)">
                  {{ focusCategoryLabel(entry.item) }}
                </span>
                <span class="diff-field focus-keyword-title">
                  {{ entry.item.keyword || entry.item.fieldLabel || '—' }}
                  <span
                    v-if="entry.item.fieldLabel && entry.item.fieldLabel !== entry.item.keyword"
                    class="focus-sublabel"
                  >· {{ entry.item.fieldLabel }}</span>
                </span>
                <Tag
                  v-if="!entry.placeholder && (focusOccPos[entry.idx]?.length || 0) > 1"
                  color="warning"
                  class="focus-occ-tag"
                  :title="`此片段在文中出现 ${focusOccPos[entry.idx].length} 处，点击可逐处跳转`"
                >{{ focusOccPos[entry.idx].length }}处<template v-if="focusActiveOcc[entry.idx] != null"> · 第{{ focusActiveOcc[entry.idx] + 1 }}</template></Tag>
                <Tag v-if="entry.placeholder || !entry.item.extractedValue" color="error" class="diff-loc">缺漏</Tag>
                <Tag v-else-if="focusLocatedPos[entry.idx]" color="success" class="diff-loc">已定位</Tag>
              </div>
              <div class="diff-texts">
                <div class="diff-text focus-text">
                  <span class="dt-tag">文档</span>{{ entry.placeholder || !entry.item.extractedValue ? '文中未提及' : entry.item.extractedValue }}
                </div>
              </div>
              <div v-if="entry.item.location && !entry.placeholder" class="focus-location">
                <AimOutlined />{{ entry.item.location }}
              </div>
            </li>
          </ul>
          <Empty
            v-else-if="focusEntries.length && ready && !filteredFocusItems.length"
            :image-style="{ height: '60px' }"
            description="当前筛选无关注项"
          />
          <div v-else-if="focusEntries.length && !ready" class="ca-list-tip">
            <LoadingOutlined spin /><span>定位中…</span>
          </div>
          <Empty
            v-else
            :image-style="{ height: '70px' }"
            description="暂无关注要点（请在规则中开启关注并填写关注要点）"
          />
        </template>
      </div>
    </div>

    <!-- 查看规则：展示该审核任务实际使用的规则库（按 taskId 透传引擎规则） -->
    <Modal
      v-if="!isRedactMode"
      v-model:open="rulesDialog"
      title="AI 审核规则"
      :width="780"
      :footer="null"
      class="ca-rules-dialog"
      @after-open-change="(o) => { if (o) loadRules() }"
    >
      <div v-if="rulesLoading" class="ca-rules-loading">
        <LoadingOutlined spin />
        <span>加载规则…</span>
      </div>
      <template v-else>
        <div v-if="rulesList.length" class="ca-rules-summary">
          <span>共 {{ rulesList.length }} 条规则</span>
          <Tag color="error">严重 {{ countRuleSev('must') }}</Tag>
          <Tag color="warning">警告 {{ countRuleSev('should') }}</Tag>
          <Tag color="processing">提示 {{ countRuleSev('suggest') }}</Tag>
        </div>
        <Table
          v-if="rulesList.length"
          :data-source="rulesList"
          :columns="ruleColumns"
          :pagination="false"
          size="small"
          bordered
          :scroll="{ y: '56vh' }"
          row-key="id"
          class="ca-rules-table"
        >
          <template #bodyCell="{ column, index, record }">
            <template v-if="column.key === 'idx'">{{ index + 1 }}</template>
            <template v-else-if="column.dataIndex === 'category'">{{ record.category || '-' }}</template>
            <template v-else-if="column.key === 'severity'">
              <Tag :color="ruleSevColor(record.severity)">{{ ruleSevLabel(record.severity) }}</Tag>
            </template>
            <template v-else-if="column.dataIndex === 'checkField'">{{ record.checkField || '-' }}</template>
            <template v-else-if="column.dataIndex === 'weight'">{{ record.weight ?? '-' }}</template>
          </template>
        </Table>
        <Empty v-else :image-style="{ height: '70px' }" :description="rulesError || '该审核任务未配置规则'" />
      </template>
    </Modal>

    <!-- 脱敏编辑器：在文档上框选敏感区，导出像素涂黑、无文字层的不可逆脱敏件 -->
    <RedactEditor
      v-model:open="redactOpen"
      :pdf-bytes="redactBytes"
      :init-boxes="redactInitBoxes"
      :saved-boxes="redactSavedBoxes"
      :file-name="redactFileName"
      :saving="redactSaving"
      @save="saveRedactBoxes"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, onActivated, onDeactivated, nextTick } from 'vue'
import { Button, Empty, Input, Modal, Table, Tag, message } from 'ant-design-vue'
import {
  LoadingOutlined, CloseOutlined, DeleteOutlined, DownloadOutlined,
  ProfileOutlined, AimOutlined, EditOutlined,
  InfoCircleFilled, WarningFilled, EyeInvisibleOutlined
} from '@ant-design/icons-vue'
import PdfPane from './PdfPane.vue'
import RedactEditor from './RedactEditor.vue'
import { exportAnnotatedPdf } from '#/utils/exportAnnotatedPdf'
import { saveIssueNote, saveRedactData, getToolRules, getOcrStatus } from '#/api/review/tool'

const props = defineProps({
  // audit=内容审查；redact=文件脱敏，只显示关注列表和脱敏导出，不显示异常清单。
  viewerMode: { type: String, default: 'audit' },
  // 本地审核任务ID（cs_biz_ai_review.id），保存批注时回写用；为空则保存按钮禁用
  taskId: { type: [String, Number], default: '' },
  docUrl: { type: String, default: '' },
  docSearchableUrl: { type: String, default: '' },
  docOssId: { type: [String, Number], default: null },
  docOcrStatus: { type: String, default: '' },
  docLabel: { type: String, default: '被审查文档' },
  // 审核结果：异常项数组（fieldName/fieldLabel/formValue/extractedValue/matchStatus/severity/location/description/suggestion）
  issues: { type: Array, default: () => [] },
  // 关注列表：AI提取的文本片段（keyword/category/fieldLabel/extractedValue/location/confidence）
  focusItems: { type: Array, default: () => [] },
  // 关注要点列表：规则库中 focusEnabled=1 且填写要点的 [{keyword,category}]（前端按要点生成列表与缺漏占位）
  focusKeywords: { type: Array, default: () => [] },
  // 内容审核中是否展示关注定位+脱敏；文件脱敏模式始终展示。
  redactEnabled: { type: Boolean, default: true },
  // 已保存的手动脱敏框 JSON（仅保存用户手动框）
  redactData: { type: String, default: '' },
  status: { type: String, default: '' }
})
const emit = defineEmits(['close', 'reanalyze', 'redact-saved'])

const isRedactMode = computed(() => props.viewerMode === 'redact')
const canUseRedact = computed(() => isRedactMode.value || props.redactEnabled !== false)

function normalizeDocLabel(value) {
  const s = String(value || '').trim()
  return s && s !== '被审查文档' ? s : ''
}
function fileNameFromUrl(url) {
  const raw = String(url || '').trim()
  if (!raw) return ''
  const withoutQuery = raw.split('#')[0].split('?')[0].replace(/\\/g, '/')
  const last = withoutQuery.split('/').filter(Boolean).pop() || ''
  try {
    return normalizeDocLabel(decodeURIComponent(last))
  } catch (e) {
    return normalizeDocLabel(last)
  }
}

// ===== 查看规则：按 taskId 透传该审核任务实际使用的规则库 =====
const rulesDialog = ref(false)
const rulesLoading = ref(false)
const rulesList = ref([])
const rulesError = ref('')
let rulesLoaded = false
const ruleSevMap = {
  must: { label: '严重', color: 'error' },
  should: { label: '警告', color: 'warning' },
  suggest: { label: '提示', color: 'processing' },
  error: { label: '严重', color: 'error' },
  warning: { label: '警告', color: 'warning' },
  info: { label: '提示', color: 'processing' }
}
function ruleSevLabel(s) {
  return ruleSevMap[(s || '').toLowerCase()]?.label || (s || '-')
}
function ruleSevColor(s) {
  return ruleSevMap[(s || '').toLowerCase()]?.color || 'default'
}
function countRuleSev(key) {
  // 兼容 must/should/suggest 与 error/warning/info 两套词表
  const alias = { must: ['must', 'error'], should: ['should', 'warning'], suggest: ['suggest', 'info'] }[key] || [key]
  return rulesList.value.filter((r) => alias.includes((r.severity || '').toLowerCase())).length
}
async function loadRules() {
  if (rulesLoaded || !props.taskId) return
  rulesLoading.value = true
  rulesError.value = ''
  try {
    const rows = await getToolRules(String(props.taskId))
    rulesList.value = rows || []
    rulesLoaded = true
  } catch (e) {
    rulesError.value = '加载规则失败：' + (e?.message || e)
    message.error(rulesError.value)
  } finally {
    rulesLoading.value = false
  }
}

// 「查看规则」表格列（antd Table）
const ruleColumns = [
  { title: '#', key: 'idx', width: 46, align: 'center' },
  { title: '规则内容', dataIndex: 'content', ellipsis: true, minWidth: 280 },
  { title: '分类', dataIndex: 'category', width: 120, ellipsis: true },
  { title: '严重程度', key: 'severity', width: 90, align: 'center' },
  { title: '检查字段', dataIndex: 'checkField', width: 120, ellipsis: true },
  { title: '权重', dataIndex: 'weight', width: 70, align: 'center' }
]

const paneRef = ref(null)
const bodyRef = ref(null)
// KeepAlive 缓存本页：切走是 deactivated 而非 unmount。该标志为 false 时，
// 一切异步回调（RAF/MO/轮询/监听）都不得再碰 DOM 或写响应式，避免与路由
// <Transition> 移动缓存子树时抢同一批节点（insertBefore 报错根因）。
let viewerActive = true
const docBytes = ref(null)
const docError = ref('')
const currentIdx = ref(-1)
const exporting = ref(false)
// 异常清单面板显示/隐藏（顶部「差异清单」按钮控制）
const listPanelOpen = ref(true)
// 当前缩放比例（用于顶部缩放控件中间显示百分比）。默认 100%
const zoomScale = ref(1)
const zoomPercent = computed(() => (zoomScale.value ? Math.round(zoomScale.value * 100) : 100))
// 缩放重渲中：盖遮罩，等定位染色完成后撤掉
const zooming = ref(false)

// 本地可编辑清单：从 props.issues 派生，每条带可改写的 note（默认填好摘要，导出即写入）
const items = ref([])
// 每条的定位结果 {page,yTop,yBottom}|null，与命中的 span 列表（点击高亮）
const locatedPos = ref([])
let hitSpans = []
const issueConn = ref(null)
const issueItemRefs = new Map()
let connRaf = 0
const expandedIssueTextSet = ref(new Set())
const editingNoteIdx = ref(-1)
const noteInputRefs = new Map()

// ===== 严重程度过滤（严重/警告/提示），与附件对比 AI 面板一致 =====
const severityFilter = ref('all')
const severityFilterOptions = [
  { key: 'all', label: '全部' },
  { key: 'error', label: '严重' },
  { key: 'warning', label: '警告' },
  { key: 'info', label: '提示' }
]
function sevKey(it) {
  return (it.severity || 'info').toString().toLowerCase()
}
function countBySeverity(key) {
  if (key === 'all') return items.value.length
  return items.value.filter((it) => sevKey(it) === key).length
}
// 过滤后仍带原始下标，保证 locatedPos/gotoIssue/removeAudit/currentIdx 取数不串位
const filteredItems = computed(() => {
  const out = []
  items.value.forEach((item, idx) => {
    if (severityFilter.value === 'all' || sevKey(item) === severityFilter.value) {
      out.push({ item, idx })
    }
  })
  return out
})

function issueTextOf(it) {
  return `${it?.formValue || ''} ${it?.extractedValue || ''}`.replace(/\s+/g, ' ').trim()
}

function needsIssueTextExpand(it) {
  const std = (it?.formValue || '').replace(/\s+/g, ' ').trim()
  const doc = (it?.extractedValue || '').replace(/\s+/g, ' ').trim()
  return std.length > 24 || doc.length > 24 || issueTextOf(it).length > 42
}

function isIssueTextExpanded(idx) {
  return expandedIssueTextSet.value.has(idx)
}

function toggleIssueText(idx) {
  const next = new Set(expandedIssueTextSet.value)
  if (next.has(idx)) next.delete(idx)
  else next.add(idx)
  expandedIssueTextSet.value = next
}

// 规则说明展开/收起（默认收起为单行省略，点击展开看全文）
const expandedRuleSet = ref(new Set())
function isRuleExpanded(idx) {
  return expandedRuleSet.value.has(idx)
}
function toggleRuleExpand(idx) {
  const next = new Set(expandedRuleSet.value)
  if (next.has(idx)) next.delete(idx)
  else next.add(idx)
  expandedRuleSet.value = next
}

function setAuditNoteInputRef(idx, el) {
  if (el) noteInputRefs.set(idx, el)
  else noteInputRefs.delete(idx)
}

function setIssueItemRef(idx, el) {
  if (el) issueItemRefs.set(idx, el)
  else issueItemRefs.delete(idx)
}

function spansRect(spans) {
  if (!spans || !spans.length) return null
  let left = Infinity
  let top = Infinity
  let right = -Infinity
  let bottom = -Infinity
  spans.forEach((span) => {
    const r = span.getBoundingClientRect()
    if (!r.width && !r.height) return
    left = Math.min(left, r.left)
    top = Math.min(top, r.top)
    right = Math.max(right, r.right)
    bottom = Math.max(bottom, r.bottom)
  })
  if (!Number.isFinite(left)) return null
  return { left, top, right, bottom, width: right - left, height: bottom - top }
}

function isVerticallyVisible(rect, containerRect) {
  return rect.bottom >= containerRect.top && rect.top <= containerRect.bottom
}

function computeIssueConn() {
  const base = bodyRef.value
  const idx = currentIdx.value
  if (!viewerActive || !base || idx < 0 || !listPanelOpen.value || activeListTab.value !== 'issues') {
    issueConn.value = null
    return
  }
  const item = items.value[idx]
  const listEl = issueItemRefs.get(idx)
  const spans = hitSpans[idx]
  const paneContainer = paneRef.value?.getContainer?.()
  if (!item || !listEl || !spans || !spans.length || !paneContainer) {
    issueConn.value = null
    return
  }
  const baseRect = base.getBoundingClientRect()
  const docRect = paneContainer.getBoundingClientRect()
  const listRect = listEl.getBoundingClientRect()
  const markRect = spansRect(spans)
  if (!markRect || !isVerticallyVisible(markRect, docRect) || !isVerticallyVisible(listRect, baseRect)) {
    issueConn.value = null
    return
  }
  const x0 = markRect.right - baseRect.left + 4
  const y0 = markRect.top + markRect.height / 2 - baseRect.top
  const x1 = listRect.left - baseRect.left - 4
  const y1 = listRect.top + Math.min(36, Math.max(18, listRect.height / 2)) - baseRect.top
  const gap = Math.max(40, Math.abs(x1 - x0) * 0.45)
  const c0 = x0 + gap
  const c1 = x1 - gap
  issueConn.value = {
    w: base.clientWidth,
    h: base.clientHeight,
    type: caMeta(item).type,
    x0,
    y0,
    x1,
    y1,
    path: `M ${x0} ${y0} C ${c0} ${y0}, ${c1} ${y1}, ${x1} ${y1}`
  }
}

function scheduleIssueConn() {
  if (!viewerActive || connRaf) return
  connRaf = requestAnimationFrame(() => {
    connRaf = 0
    computeIssueConn()
  })
}

function focusAuditNoteInput(idx) {
  nextTick(() => {
    const input = noteInputRefs.get(idx)
    const textarea = input?.textarea || input?.$el?.querySelector?.('textarea')
    textarea?.focus?.()
  })
}

function beginAuditNoteEdit(idx) {
  if (savingIdx.value >= 0) return
  editingNoteIdx.value = idx
  focusAuditNoteInput(idx)
}

async function finishAuditNoteEdit(idx) {
  if (editingNoteIdx.value !== idx) return
  editingNoteIdx.value = -1
  await saveAudit(idx)
}
// 文档渲染+染色定位完成后才揭示清单（加载顺序：文档 → 差异色 → 清单）
const ready = ref(false)
// 兜底重染：pdfjs 缩放/重渲会重建 textLayer 的 span 冲掉染色，用 MutationObserver 监听后自动重染
let mo = null
let moDebounce = null

// ===== 右侧面板 Tab：异常清单 / 关注列表 =====
const activeListTab = ref(isRedactMode.value ? 'focus' : 'issues')
const issueEmptyText = computed(() => props.status === 'RUNNING' ? '审核中，请稍候…' : '暂无异常（或尚未审查，点右上角【重新审查】）')

// ===== 关注列表：要点粒度 + 定位 =====
// 关注列表以「关注要点」（中文原文）为唯一粒度，分类标签直接取要点名。
const focusCurrentIdx = ref(-1)
let focusHitSpans = []
const focusLocatedPos = ref([])
// 每个要点在文档中命中的"全部位置"：focusOccPos[idx] = [region, region, ...]（同一要点可重复出现多次）
const focusOccPos = ref([])
// 每个要点各次出现对应的 span 数组：focusOccSpans[idx] = [[span...], [span...]]，用于逐次定位高亮
let focusOccSpans = []
// 当前定位到第几次出现：focusActiveOcc[idx] = 次序下标，点击同一要点循环跳转下一处
const focusActiveOcc = ref({})
// 搜索版 PDF 的 OCR textLayer 可能与扫描墨迹有轻微纵向偏移；按页缓存校正比例，供高亮/连线/定位复用
let auditAlign = {}
const ALIGN_BINS = 300

// 关注列表过滤（按定位状态：全部 / 已定位 / 缺漏），与异常清单过滤条样式一致
const focusFilter = ref('all')
const focusFilterOptions = [
  { key: 'all', label: '全部' },
  { key: 'located', label: '已定位' },
  { key: 'missing', label: '缺漏' }
]
const focusCategoryFilter = ref('all')
const fallbackCategoryNames = new Set(['未分类', '其他', '其它', ''])

function textOf(v) {
  return v == null ? '' : String(v).trim()
}

function focusCategoryRaw(item) {
  return textOf(
    item?.categoryLabel ||
    item?.categoryName ||
    item?.category ||
    item?.pointCategory ||
    item?.groupName ||
    item?.fieldGroup
  )
}

// 已定位：非占位、有原文、且在文档文字层命中
function isFocusLocated(entry) {
  return !entry.placeholder && !!entry.item.extractedValue && !!focusLocatedPos.value[entry.idx]
}
function countByFocusStatus(key) {
  const all = focusEntries.value
  if (key === 'all') return all.length
  if (key === 'located') return all.filter(isFocusLocated).length
  return all.filter((e) => !isFocusLocated(e)).length
}

function focusCategoryLabel(item) {
  const point = textOf(item?.keyword || item?.fieldLabel || item?.fieldName)
  if (point) return point
  const raw = focusCategoryRaw(item)
  return fallbackCategoryNames.has(raw) ? '关注要点' : raw
}

function focusCategoryKey(entry) {
  return focusCategoryLabel(entry.item)
}

// 关注列表（要点粒度）：以规则库要点 focusKeywords 为骨架，匹配 AI 提取的 focusItem。
// - 同一要点可对应【多条】focusItem（如「地址」=甲方/乙方/见证方地址），每条各一行
// - 完全无命中 → "文中未提及"缺漏占位（idx=-1）
// - idx 指向 props.focusItems 原始下标，供 gotoFocus/高亮/focusLocatedPos 复用
const focusEntries = computed(() => {
  if (!canUseRedact.value) return []
  const items = props.focusItems || []
  const keywords = props.focusKeywords || []
  const usedIdx = new Set()
  const entries = []

  // 找某要点对应的【全部】focusItem 下标（keyword 精确匹配；回退按 category 兼容旧数据）
  const findItemIdxs = (kw) => {
    let idxs = items
      .map((it, i) => ({ it, i }))
      .filter(({ it, i }) => !usedIdx.has(i) && it.keyword && it.keyword === kw.keyword)
      .map(({ i }) => i)
    if (!idxs.length && kw.category) {
      idxs = items
        .map((it, i) => ({ it, i }))
        .filter(({ it, i }) => !usedIdx.has(i) && !it.keyword && it.category === kw.category)
        .map(({ i }) => i)
    }
    return idxs
  }

  if (keywords.length) {
    for (const kw of keywords) {
      const idxs = findItemIdxs(kw)
      // 仅保留有原文的命中项；多条则逐条成行
      const valid = idxs.filter((i) => {
        const v = items[i]?.extractedValue
        return v && v.trim()
      })
      if (valid.length) {
        valid.forEach((i) => {
          usedIdx.add(i)
          const it = items[i]
          entries.push({
            item: { ...it, keyword: it.keyword || kw.keyword, category: it.category || kw.category },
            idx: i, placeholder: false
          })
        })
        // 标记其余空原文项为已用，避免重复展示
        idxs.forEach((i) => usedIdx.add(i))
      } else {
        // 无任何有效命中 → 缺漏占位
        idxs.forEach((i) => usedIdx.add(i))
        entries.push({
          item: { keyword: kw.keyword, category: kw.category, fieldLabel: kw.keyword, extractedValue: '', location: '' },
          idx: -1, placeholder: true
        })
      }
    }
  }
  // 追加：AI 提取了但不在要点骨架内的项（防御性，正常不应出现）
  items.forEach((it, i) => {
    if (usedIdx.has(i)) return
    if (keywords.length && !it.keyword) return // 旧分类项在要点模式下不再单独展示
    entries.push({ item: it, idx: i, placeholder: !(it.extractedValue && it.extractedValue.trim()) })
  })
  return entries
})

const focusCategoryOptions = computed(() => {
  const map = new Map()
  focusEntries.value.forEach((entry) => {
    const key = focusCategoryKey(entry)
    map.set(key, (map.get(key) || 0) + 1)
  })
  const items = Array.from(map.entries())
    .map(([key, count]) => ({ key, label: key, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'zh-Hans-CN'))
  return [{ key: 'all', label: '全部要点', count: focusEntries.value.length }, ...items]
})

// 过滤后的关注列表：按定位状态过滤（全部/已定位/缺漏）
const filteredFocusItems = computed(() => {
  let all = focusEntries.value
  if (focusCategoryFilter.value !== 'all') {
    all = all.filter((entry) => focusCategoryKey(entry) === focusCategoryFilter.value)
  }
  if (focusFilter.value === 'all') return all
  if (focusFilter.value === 'located') return all.filter(isFocusLocated)
  return all.filter((e) => !isFocusLocated(e))
})

watch(focusCategoryOptions, (opts) => {
  if (!opts.some((opt) => opt.key === focusCategoryFilter.value)) {
    focusCategoryFilter.value = 'all'
  }
})

// 关注列表定位：复用已有的 text search 逻辑
function locateFocusItems() {
  const pane = paneRef.value
  if (!pane) return
  const nodes = pane.getTextLayerNodes?.() || []
  if (!nodes.length) return
  // 清除旧关注高亮
  nodes.forEach((n) => {
    n.querySelectorAll('span.ca-focus').forEach((s) => s.classList.remove('ca-focus', 'ca-focus-active'))
    // 同时清掉异常清单的高亮，避免两套高亮叠加
    n.querySelectorAll('span.ca-hit').forEach((s) => s.classList.remove('ca-hit', 'ca-mismatch', 'ca-uncertain', 'ca-missing', 'ca-active'))
  })
  const pages = nodes.map(buildPageChars)
  const located = []
  const occPos = []
  focusHitSpans = []
  focusOccSpans = []
  focusActiveOcc.value = {}
  ;(props.focusItems || []).forEach((it, idx) => {
    const normVal = normalizeText(it.extractedValue)
    let occs = []
    if (normVal && normVal.length >= 2) {
      // 1) 先尝试整串完整匹配（全文所有出现位置）——短摘录、单句最理想
      occs = searchAllInPages(pages, normVal, idx)
      // 2) 整串没命中：长摘录多为跨段/重排文本，按子句拆分逐句染色，作为"一处"汇总
      if (!occs.length) {
        const one = searchFocusSegmentsAsOne(pages, focusSegments(it.extractedValue))
        if (one) occs = [one]
      }
    }
    focusOccSpans[idx] = occs.map((o) => o.spans)
    occPos[idx] = occs.map((o) => o.region)
    // 首次出现的 span 作为整体高亮集合（供 gotoFocus 清理/激活）
    focusHitSpans[idx] = occs.flatMap((o) => o.spans)
    located[idx] = occs.length ? occs[0].region : null
  })
  focusLocatedPos.value = located
  focusOccPos.value = occPos
}

// 在所有页面中搜索文本：返回全部出现位置 [{region, spans}]（同一要点可重复命中多次）
function searchAllInPages(pages, text, idx) {
  const results = []
  for (const pg of pages) {
    let from = 0
    let i = pg.text.indexOf(text, from)
    while (i >= 0) {
      const spans = uniqueSpans(pg.refs, i, i + text.length)
      spans.forEach((s) => s.classList.add('ca-focus'))
      results.push({ region: regionOf(spans), spans })
      from = i + Math.max(text.length, 1)
      i = pg.text.indexOf(text, from)
    }
  }
  return results
}

// 关注摘录值常是跨多段/多句的长文本（AI 会重排、补列表号、漏标点），整串 indexOf 必然落空。
// 拆成可独立检索的子句：剥方括号标注、行首列表序号(1./一、)，按标点+换行切段，去噪去占位词。
// 阈值取 ≥6（比 looseSegments 的 2 更高），子句更独特、避免短串误命中；保留文档阅读顺序。
function focusSegments(raw) {
  let s = String(raw || '')
  s = s.replace(/[\[【][^\]】]*[\]】]/g, ' ')
  const parts = s.split(/[\s:：,，;；、。.!！?？（）()「」『』“”"'《》<>\-—~…]+|\.{2,}/)
  const segs = []
  for (let p of parts) {
    // 剥行首列表序号：1. / 1、/ 1) / 一、/ （1） 等（这些在 PDF 里常和正文分属不同 span，会断开匹配）
    p = p.replace(/^\s*[（(]?(?:[0-9]{1,3}|[一二三四五六七八九十]{1,3})[）).、]\s*/, '')
    p = normalizeText(p)
    if (p.length < 6) continue
    if (NOISE_TOKENS.includes(p)) continue
    segs.push(p)
  }
  return Array.from(new Set(segs))
}

// 把多个子句作为"一处"染色：逐句在全文找首次出现并打 ca-focus，汇总全部 span，
// 区域取阅读顺序最靠前的子句（供 gotoFocus 滚动定位）。命中任一子句即视为已定位。
function searchFocusSegmentsAsOne(pages, segments) {
  if (!segments.length) return null
  const allSpans = []
  let topRegion = null
  for (const seg of segments) {
    for (const pg of pages) {
      const i = pg.text.indexOf(seg)
      if (i < 0) continue
      const spans = uniqueSpans(pg.refs, i, i + seg.length)
      spans.forEach((s) => s.classList.add('ca-focus'))
      allSpans.push(...spans)
      const region = regionOf(spans)
      if (region && (!topRegion || region.page < topRegion.page
          || (region.page === topRegion.page && region.yTop < topRegion.yTop))) {
        topRegion = region
      }
      break // 每个子句只取首次出现，避免重复累计
    }
  }
  if (!allSpans.length) return null
  return { region: topRegion, spans: allSpans }
}

// 点击关注项：定位到该要点。若该要点在文中出现多次，重复点击循环跳转下一处
function gotoFocus(idx) {
  const occs = focusOccPos.value[idx] || []
  // 清掉所有激活态高亮
  Object.keys(focusActiveOcc.value).forEach((k) => {
    const arr = (focusOccSpans[k] || []).flat()
    arr.forEach((s) => s.classList.remove('ca-focus-active'))
  })
  ;(focusHitSpans || []).forEach((arr) => arr && arr.forEach((s) => s.classList.remove('ca-focus-active')))

  if (!occs.length) {
    focusCurrentIdx.value = idx
    return
  }
  // 同一要点重复点击 → 下一处；切换要点 → 从第一处开始
  let occIdx = focusCurrentIdx.value === idx ? ((focusActiveOcc.value[idx] ?? -1) + 1) % occs.length : 0
  focusActiveOcc.value = { ...focusActiveOcc.value, [idx]: occIdx }
  focusCurrentIdx.value = idx

  const spans = (focusOccSpans[idx] && focusOccSpans[idx][occIdx]) || []
  spans.forEach((s) => s.classList.add('ca-focus-active'))
  const pos = occs[occIdx]
  if (pos) paneRef.value?.scrollToPos?.(pos)
}

// 异常类型 → 与附件对比统一的色票(dt-*) + 审查语义标签
// 颜色规则：severity=error 用红色(dt-del)，severity=warning 用黄色(dt-modify)
function caMeta(it) {
  const m = (it.matchStatus || '').toLowerCase()
  const sev = (it.severity || '').toLowerCase()
  let label = '提示'
  if (m === 'mismatched') label = '错填'
  else if (m === 'not_found') label = '漏填'
  else if (m === 'uncertain') label = '存疑'
  else if (sev === 'error') label = '异常'
  else if (sev === 'warning') label = '警告'

  // 颜色跟随 severity：error→红色，warning→黄色，info→黄色
  const type = sev === 'error' ? 'del' : 'modify'
  return { type, label }
}

function normalizeAuditNotePrefix(note) {
  return (note || '').replace(/^【(?:修改|新增|删除|错填|漏填|存疑|异常|警告|提示)】/, '【批注】')
}

// 批注默认文案：统一使用【批注】前缀。用户改写后即为导出批注内容
function defaultNoteAudit(it) {
  const field = it.fieldLabel || it.fieldName || ''
  const std = (it.formValue || '').trim()
  const doc = (it.extractedValue || '').trim()
  const sug = (it.suggestion || '').trim()
  const desc = (it.description || '').trim()
  let body
  if ((it.matchStatus || '').toLowerCase() === 'not_found') {
    body = `${field}：文档中未填写${std ? `（标准值：${std}）` : ''}`
  } else {
    body = `${field}：标准值「${std || '—'}」，文档为「${doc || '空'}」`
  }
  const tail = sug ? `。建议：${sug}` : (desc ? `。${desc}` : '')
  return `【批注】${body}${tail}`
}

function buildItems() {
  // 同字段去重（保留第一条）：模型偶尔对同一 field 输出多条，前端兜底保证清单干净
  const seen = new Set()
  const out = []
  for (const it of (props.issues || [])) {
    const key = (it.fieldName || it.fieldLabel || '').trim().toLowerCase()
    if (key && seen.has(key)) continue
    if (key) seen.add(key)
    // 已保存过的 note 优先；否则用默认摘要文案
    const note = (it.note != null && it.note !== '') ? normalizeAuditNotePrefix(it.note) : defaultNoteAudit(it)
    out.push({ ...it, note })
  }
  items.value = out
  expandedIssueTextSet.value = new Set()
  expandedRuleSet.value = new Set()
  editingNoteIdx.value = -1
  noteInputRefs.clear()
}
// issues 变化时重建清单；文档已渲染才重新定位（mount 时 docBytes 还没好，等 onRendered 再定位，保证"文档→色→清单"顺序）
watch(() => props.issues, () => {
  buildItems()
  issueItemRefs.clear()
  issueConn.value = null
  if (docBytes.value) { ready.value = false; scheduleLocate() }
}, { immediate: true, deep: true })

// 切换 Tab（异常清单 / 关注列表）时重新渲染对应高亮，避免两套高亮残留
watch(activeListTab, () => {
  issueConn.value = null
  if (docBytes.value) scheduleLocate()
})

watch([isRedactMode, canUseRedact], ([redactMode, enabled]) => {
  if (redactMode) {
    listPanelOpen.value = true
    activeListTab.value = 'focus'
    return
  }
  if (!enabled && activeListTab.value === 'focus') {
    activeListTab.value = 'issues'
  }
}, { immediate: true })

watch([listPanelOpen, severityFilter, filteredItems], () => {
  nextTick(scheduleIssueConn)
}, { flush: 'post' })

// ===== OCR 轮询：扫描件无文字层时等 searchable PDF =====
const liveSearchable = ref('')
const liveOcrStatus = ref('')
const ocrElapsedSec = ref(0)
let ocrPollTimer = null
let ocrElapsedTimer = null

const effectiveUrl = computed(() => liveSearchable.value || props.docSearchableUrl || props.docUrl)
const displayDocLabel = computed(() => normalizeDocLabel(props.docLabel) || fileNameFromUrl(props.docUrl) || fileNameFromUrl(props.docSearchableUrl) || '被审查文档')
const hasTextLayerSource = computed(() => !!(liveSearchable.value || props.docSearchableUrl))
const currentOcrStatus = computed(() => liveOcrStatus.value || props.docOcrStatus || '')
const ocrLoading = computed(() => {
  const s = currentOcrStatus.value
  return !hasTextLayerSource.value && (s === 'PENDING' || s === 'RUNNING')
})
const ocrTip = computed(() => {
  if (hasTextLayerSource.value) return ''
  const s = currentOcrStatus.value
  if (s === 'PENDING' || s === 'RUNNING') return `文档识别中…(${ocrElapsedSec.value}s) 完成后自动可定位`
  if (s === 'FAIL') return '文档识别失败，异常仅在清单展示，无法在文档上定位'
  return ''
})

async function fetchOcrStatusOnce() {
  if (!props.docOssId) return
  try {
    const data = await getOcrStatus(props.docOssId) || {}
    if (data.ocrStatus) liveOcrStatus.value = data.ocrStatus
    if (data.ocrStatus === 'SUCCESS' && data.searchableUrl) {
      liveSearchable.value = data.searchableUrl
      stopOcrPolling()
    } else if (data.ocrStatus === 'FAIL' || data.ocrStatus === 'SKIP' || data.ocrStatus === 'NONE') {
      stopOcrPolling()
    }
  } catch (e) {
    console.warn('[ContentAudit] OCR 状态查询失败', e)
  }
}
function startOcrPolling() {
  stopOcrPolling()
  if (!props.docOssId || hasTextLayerSource.value) return
  const s = currentOcrStatus.value
  if (s === 'SUCCESS' || s === 'FAIL' || s === 'SKIP' || s === 'NONE') return
  ocrElapsedSec.value = 0
  ocrElapsedTimer = setInterval(() => { ocrElapsedSec.value += 1 }, 1000)
  ocrPollTimer = setInterval(fetchOcrStatusOnce, 10000)
  fetchOcrStatusOnce()
}
function stopOcrPolling() {
  if (ocrPollTimer) { clearInterval(ocrPollTimer); ocrPollTimer = null }
  if (ocrElapsedTimer) { clearInterval(ocrElapsedTimer); ocrElapsedTimer = null }
}

// ===== 文档加载 =====
async function loadDoc() {
  const url = effectiveUrl.value
  ready.value = false
  auditAlign = {}
  if (mo) { mo.disconnect(); mo = null } // 换文档：PdfPane 会重挂，旧观察器作废
  docBytes.value = null
  docError.value = ''
  if (!url) { docError.value = '无被审查文档'; return }
  try {
    const cb = url.includes('?') ? `&_t=${Date.now()}` : `?_t=${Date.now()}`
    const resp = await fetch(url + cb, { credentials: 'omit', cache: 'no-store' })
    if (!resp.ok) throw new Error('HTTP ' + resp.status)
    docBytes.value = await (await resp.blob()).arrayBuffer()
  } catch (e) {
    console.error('[ContentAudit] 文档加载失败', e)
    docError.value = '加载失败：' + (e.message || e)
    message.error('文档加载失败：' + (e.message || e))
  }
}
watch(effectiveUrl, loadDoc, { immediate: true })

// ===== 定位 + 染色 =====
function normChar(ch) {
  const code = ch.charCodeAt(0)
  let c = ch
  if (code >= 0xff10 && code <= 0xff19) c = String.fromCharCode(code - 0xfee0)
  else if (code >= 0xff21 && code <= 0xff5a) c = String.fromCharCode(code - 0xfee0)
  if (/\s/.test(c)) return ''
  return c
}
function normalizeText(s) {
  let out = ''
  for (const ch of String(s || '')) { const c = normChar(ch); if (c) out += c }
  return out
}
function buildPageChars(node) {
  const refs = []
  const charRefs = []
  let text = ''
  node.querySelectorAll('span').forEach((span) => {
    if (span.childElementCount > 0) return
    const raw = span.textContent || ''
    for (let i = 0; i < raw.length; i++) {
      const c = normChar(raw[i])
      if (!c) continue
      text += c
      refs.push(span)
      charRefs.push({ span, start: i, end: i + 1 })
    }
  })
  return { node, text, refs, charRefs }
}
function uniqueSpans(refs, start, end) {
  const seen = new Set()
  const out = []
  for (let i = start; i < end && i < refs.length; i++) {
    const s = refs[i]
    if (!seen.has(s)) { seen.add(s); out.push(s) }
  }
  return out
}

// ============ 扫描件墨迹对齐（自动校准）============
// OCR searchable PDF 的隐藏文字层有时比扫描墨迹偏上/偏下。这里读取当前页 canvas 的暗像素行分布，
// 与 textLayer span 行分布做互相关，估出每页纵向 transform，让高亮框和连线贴回真实墨迹。
function alignNormalize(prof) {
  const n = prof.length
  let mean = 0
  for (let i = 0; i < n; i++) mean += prof[i]
  mean /= n
  const out = new Float64Array(n)
  let norm = 0
  for (let i = 0; i < n; i++) {
    out[i] = prof[i] - mean
    norm += out[i] * out[i]
  }
  norm = Math.sqrt(norm) || 1
  for (let i = 0; i < n; i++) out[i] /= norm
  return out
}

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

function alignBest(ink, text, bins) {
  const inkN = alignNormalize(ink)
  let best = { score: -2, corr: 0, k: 1, shiftBins: 0 }
  const maxShift = Math.round(bins * 0.04)
  for (let ki = -6; ki <= 6; ki++) {
    const k = 1 + ki * 0.005
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

function estimateAuditAlign() {
  const pane = paneRef.value
  if (!pane || !pane.getNumPages) return
  const n = pane.getNumPages()
  for (let p = 1; p <= n; p++) {
    auditAlign[p] = { k: 1, shift: 0 }
    const pageEl = pane.getPageEl(p)
    const canvas = pageEl && pageEl.querySelector('canvas')
    const tl = pageEl && pageEl.querySelector('.textLayer')
    if (!canvas || !tl) continue
    tl.style.transform = ''
    tl.style.overflow = ''
    const spans = Array.from(tl.querySelectorAll('span')).filter((s) => (s.textContent || '').trim())
    if (spans.length < 6) continue
    const ink = alignInkProfile(canvas, ALIGN_BINS)
    if (!ink) continue
    const text = alignTextProfile(spans, canvas.getBoundingClientRect(), ALIGN_BINS)
    const { corr, k, shiftBins } = alignBest(ink, text, ALIGN_BINS)
    const shift = shiftBins / ALIGN_BINS
    const ok = corr >= 0.25 && Math.abs(shift) <= 0.035 && k >= 0.96 && k <= 1.04 && (Math.abs(shift) > 0.004 || Math.abs(k - 1) > 0.004)
    if (ok) auditAlign[p] = { k, shift }
    console.log(`[ContentAudit][墨迹对齐] 页${p} corr=${corr.toFixed(2)} k=${k.toFixed(3)} shift=${shift.toFixed(4)} ${ok ? '应用' : '跳过'}`)
  }
}

function applyAuditAlign() {
  const pane = paneRef.value
  if (!pane || !pane.getNumPages) return
  const n = pane.getNumPages()
  for (let p = 1; p <= n; p++) {
    const pageEl = pane.getPageEl(p)
    const tl = pageEl && pageEl.querySelector('.textLayer')
    if (!tl) continue
    const c = auditAlign[p] || { k: 1, shift: 0 }
    if (c.k === 1 && !c.shift) {
      tl.style.transform = ''
      tl.style.overflow = ''
      continue
    }
    const h = pageEl.getBoundingClientRect().height
    tl.style.transformOrigin = '0 0'
    tl.style.overflow = 'visible'
    tl.style.transform = `translateY(${(c.shift * h).toFixed(2)}px) scaleY(${c.k})`
  }
}

function calibrateAuditAlign() {
  auditAlign = {}
  if (!hasTextLayerSource.value) return
  try {
    estimateAuditAlign()
    applyAuditAlign()
    console.log('[ContentAudit][墨迹对齐]', JSON.stringify(auditAlign))
  } catch (e) {
    console.warn('[ContentAudit][墨迹对齐] 失败', e)
  }
}

function regionOf(spans) {
  if (!spans.length) return null
  const wrap = spans[0].closest('.pdf-page-wrap')
  const page = wrap ? parseInt(wrap.dataset.pageNumber, 10) || 1 : 1
  const pageEl = paneRef.value?.getPageEl?.(page) || wrap
  if (!pageEl) return null
  const pr = pageEl.getBoundingClientRect()
  if (!pr.height) return null
  let top = Infinity
  let bottom = -Infinity
  spans.forEach((s) => {
    const r = s.getBoundingClientRect()
    top = Math.min(top, r.top)
    bottom = Math.max(bottom, r.bottom)
  })
  const yTop = Math.max(0, Math.min(1, (top - pr.top) / pr.height))
  const yBottom = Math.max(0, Math.min(1, (bottom - pr.top) / pr.height))
  return { page, yTop, yBottom }
}
function clearMarks(nodes) {
  nodes.forEach((n) => {
    n.querySelectorAll('span.ca-hit').forEach((s) => s.classList.remove('ca-hit', 'ca-mismatch', 'ca-uncertain', 'ca-missing', 'ca-active'))
    // 同时清掉关注列表的高亮，避免两套高亮叠加（蓝色盖过红/黄）
    n.querySelectorAll('span.ca-focus').forEach((s) => s.classList.remove('ca-focus', 'ca-focus-active'))
  })
}
// 在各页文本里检索 normVal，命中则给对应 span 打 cls 并记 hitSpans[idx]，返回区域；未命中返回 null
function searchAndMark(pages, normVal, cls, idx) {
  if (!normVal || normVal.length < 2) return null
  for (const pg of pages) {
    const i = pg.text.indexOf(normVal)
    if (i >= 0) {
      const spans = uniqueSpans(pg.refs, i, i + normVal.length)
      spans.forEach((s) => s.classList.add('ca-hit', cls))
      hitSpans[idx] = spans
      return regionOf(spans)
    }
  }
  return null
}
// AI 摘录值常带加工噪声（[空白]/（盖章）/冒号/“无”“未填写”等占位词），整串在 OCR 原文里搜不到。
// 这里把它拆成可检索的纯文本片段：先剥方括号标注与占位词，再按标点切段，返回去重后按长度降序的候选串。
const NOISE_TOKENS = ['空白', '无', '未填写', '未填', '缺失', '未提及', '空', '略', '未知', '不详', '待填']
function looseSegments(raw) {
  let s = String(raw || '')
  // 去掉方括号/中括号标注（[空白]、【说明】等整体剔除——多为 AI 注释而非原文）
  s = s.replace(/[\[【][^\]】]*[\]】]/g, ' ')
  // 按标点（含全/半角冒号逗号顿号括号引号省略号等）切成片段
  const parts = s.split(/[\s:：,，;；、。.（）()「」『』“”"'《》<>\-—~…]+|\.{2,}/)
  const segs = []
  for (let p of parts) {
    p = normalizeText(p)
    if (p.length < 2) continue
    if (NOISE_TOKENS.includes(p)) continue
    segs.push(p)
  }
  // 长片段优先（更独特、更不易误命中）
  return Array.from(new Set(segs)).sort((a, b) => b.length - a.length)
}
// 宽松定位：先整串精确匹配，失败则用去噪后的子片段逐个重试，命中即染色。方案A
function looseSearchAndMark(pages, rawVal, cls, idx) {
  let pos = searchAndMark(pages, normalizeText(rawVal), cls, idx)
  if (pos) return pos
  for (const seg of looseSegments(rawVal)) {
    pos = searchAndMark(pages, seg, cls, idx)
    if (pos) return pos
  }
  return null
}
// 漏填锚点：文档里没有"值"可染，改为按字段标签/常见关键词找到"该填的位置"（标签处），指过去
const ANCHOR_KW = {
  xybh: ['协议编号', '编号', '协议号'],
  qysj: ['签约日期', '落款日期', '签约时间', '落款', '签约', '日期'],
  khm: ['开户名', '户名', '账户名', '收款人'],
  khh: ['开户行', '开户银行', '银行'],
  yhzh: ['银行账号', '银行账户', '账号', '卡号'],
  hh: ['户号', '户主', '户编号'],
  bcje: ['补偿金额', '补偿款', '补偿总额', '合计', '金额'],
  bcmj: ['补偿面积', '安置面积', '建筑面积', '面积']
}
function anchorTexts(it) {
  const arr = []
  const kw = ANCHOR_KW[(it.fieldName || '').toLowerCase()]
  if (kw) arr.push(...kw)
  if (it.fieldLabel) arr.push(it.fieldLabel)
  return arr
}
function locateIssues() {
  const pane = paneRef.value
  if (!pane) return
  const nodes = pane.getTextLayerNodes?.() || []
  if (!nodes.length) return
  clearMarks(nodes)
  const pages = nodes.map(buildPageChars)
  const located = []
  hitSpans = []
  items.value.forEach((it, idx) => {
    const ms = (it.matchStatus || '').toLowerCase()
    const sev = (it.severity || '').toLowerCase()
    // 染色类名跟随 severity：error→红色，warning→黄色
    const hlClass = sev === 'error' ? 'ca-mismatch' : 'ca-uncertain'
    let pos = null
    // 1) 错填/存疑：按文档值染色定位（宽松匹配：整串搜不到时剥噪声+分段重试）
    if (ms !== 'not_found') {
      pos = looseSearchAndMark(pages, it.extractedValue, hlClass, idx)
    }
    // 2) 漏填 或 上面没命中：按字段标签/关键词锚到"该填的位置"，用缺失样式（虚线灰底）
    if (!pos) {
      for (const a of anchorTexts(it)) {
        pos = searchAndMark(pages, normalizeText(a), 'ca-missing', idx)
        if (pos) break
      }
    }
    located[idx] = pos
  })
  locatedPos.value = located
  scheduleIssueConn()
}
// 渲染/缩放后再定位：textLayer 文本由 pdfjs 异步填充，重渲（尤其缩放）后要等它就绪再染色，
// 否则取到空文本 → 匹配不到 → 染色"消失"。逐帧重试直到 textLayer 有文本，再染色并揭示清单。
let locateRaf = null
function scheduleLocate() {
  if (!viewerActive) return
  if (locateRaf) cancelAnimationFrame(locateRaf)
  let tries = 0
  const tick = () => {
    const nodes = paneRef.value?.getTextLayerNodes?.() || []
    const hasText = nodes.length > 0 && nodes.some((n) => (n.textContent || '').trim().length > 0)
    if (!hasText && tries < 40) {
      tries++
      locateRaf = requestAnimationFrame(tick)
      return
    }
    locateRaf = null
    if (hasTextLayerSource.value) {
      if (Object.keys(auditAlign).length) applyAuditAlign()
      else calibrateAuditAlign()
    }
    // 只渲染当前 Tab 对应的高亮，避免两套高亮叠加（互相覆盖颜色）
    if (canUseRedact.value && (isRedactMode.value || activeListTab.value === 'focus')) {
      locateFocusItems()
    } else {
      locateIssues()
    }
    ready.value = true
    zooming.value = false // 定位染色完成，撤掉缩放遮罩
    scheduleIssueConn()
  }
  locateRaf = requestAnimationFrame(tick)
}
// textLayer 一旦重建（缩放/重渲会触发 childList 变化）就防抖重染。
// locateIssues 只改 class（不增删节点），不会自触发本观察器，无死循环。
function setupTextLayerObserver() {
  const root = paneRef.value?.getContainer?.()
  if (!root || mo) return
  mo = new MutationObserver(() => {
    if (moDebounce) clearTimeout(moDebounce)
    moDebounce = setTimeout(() => {
      if (!viewerActive) return
      if (hasTextLayerSource.value) applyAuditAlign()
      if (canUseRedact.value && (isRedactMode.value || activeListTab.value === 'focus')) locateFocusItems()
      else locateIssues()
      scheduleIssueConn()
    }, 100)
  })
  mo.observe(root, { childList: true, subtree: true })
}
function onRendered() { zoomScale.value = paneRef.value?.getScale?.() || zoomScale.value; scheduleLocate(); setupTextLayerObserver() }

function gotoIssue(idx) {
  currentIdx.value = idx
  hitSpans.forEach((arr) => arr && arr.forEach((s) => s.classList.remove('ca-active')))
  const spans = hitSpans[idx]
  if (spans) spans.forEach((s) => s.classList.add('ca-active'))
  const pos = locatedPos.value[idx]
  if (pos) paneRef.value?.scrollToPos?.(pos)
  scheduleIssueConn()
  setTimeout(scheduleIssueConn, 80)
  setTimeout(scheduleIssueConn, 260)
}

// 删除一条（误判/不导出）：维护选中索引，重新定位（索引变了）
function removeAudit(idx) {
  items.value.splice(idx, 1)
  noteInputRefs.clear()
  const nextExpanded = new Set()
  expandedIssueTextSet.value.forEach((i) => {
    if (i < idx) nextExpanded.add(i)
    else if (i > idx) nextExpanded.add(i - 1)
  })
  expandedIssueTextSet.value = nextExpanded
  if (editingNoteIdx.value === idx) editingNoteIdx.value = -1
  else if (editingNoteIdx.value > idx) editingNoteIdx.value -= 1
  if (currentIdx.value === idx) currentIdx.value = -1
  else if (currentIdx.value > idx) currentIdx.value -= 1
  issueItemRefs.clear()
  scheduleLocate()
  scheduleIssueConn()
}

// 保存单条批注：写回后端 result_data，刷新后仍保留。每条独立 loading，避免互相阻塞
const savingIdx = ref(-1)
async function saveAudit(idx) {
  const it = items.value[idx]
  if (!it) return
  if (!props.taskId) { message.warning('缺少审核任务ID，无法保存批注'); return }
  if (savingIdx.value >= 0) return
  it.note = normalizeAuditNotePrefix(it.note)
  savingIdx.value = idx
  try {
    await saveIssueNote({
      taskId: String(props.taskId),
      fieldName: it.fieldName || '',
      fieldLabel: it.fieldLabel || '',
      note: it.note || ''
    })
    message.success('批注已保存')
  } catch (e) {
    console.error('[ContentAudit] 保存批注失败', e)
    message.error('保存失败：' + (e?.message || e))
  } finally {
    savingIdx.value = -1
  }
}

async function zoom(d) {
  const pane = paneRef.value
  if (!pane || zooming.value) return
  // 以父级 zoomScale 为基准（默认 100%），步进后钳制，先乐观更新百分比再重渲，
  // 不依赖 setScale 后的 getScale 读回时序
  const base = zoomScale.value || pane.getScale?.() || 1
  const next = Math.max(0.3, Math.min(3, Math.round((base + d) * 100) / 100))
  zoomScale.value = next
  zooming.value = true
  await pane.setScale(next)
  scheduleLocate() // 重渲后重试定位染色，完成时撤遮罩
  setTimeout(scheduleIssueConn, 120)
  setTimeout(scheduleIssueConn, 320)
}

// 适应宽度：点击中间百分比触发，按容器宽度重渲（'width' 由 pane 内部算，需读回实际比例）
async function fitWidth() {
  const pane = paneRef.value
  if (!pane || zooming.value) return
  zooming.value = true
  await pane.setScale('width')
  zoomScale.value = pane.getScale?.() || 1
  scheduleLocate()
  setTimeout(scheduleIssueConn, 120)
  setTimeout(scheduleIssueConn, 320)
}

// ===== 导出批注（与附件对比同一套 exportAnnotatedPdf）=====
function exportTypeLabel(t) { return { add: '新增', del: '错填', modify: '疑似' }[t] || '审查' }
async function onExportAudit() {
  if (exporting.value) return
  if (!docBytes.value) { message.warning('文档尚未就绪'); return }
  if (!items.value.length) { message.warning('暂无可标注的异常'); return }
  exporting.value = true
  try {
    const bytes = docBytes.value.slice(0)
    const exportItems = items.value.map((it, idx) => ({
      type: caMeta(it).type,
      leftText: it.formValue || '',
      rightText: it.extractedValue || '',
      rightPos: locatedPos.value[idx] || null, // 文档定位；漏填/未命中 → null → 末尾汇总页
      note: it.note
    }))
    const fname = displayDocLabel.value.replace(/[\\/:*?"<>|]/g, '_')
    const n = await exportAnnotatedPdf(bytes, exportItems, exportTypeLabel, `${fname}_内容审查批注.pdf`)
    const skipped = exportItems.length - n
    message.success(`已导出 ${n} 处批注${skipped > 0 ? `（${skipped} 处无法在文档定位，已列入末尾汇总页）` : ''}`)
  } catch (e) {
    console.error('[ContentAudit] 导出批注失败', e)
    message.error('导出失败：' + (e?.message || e))
  } finally {
    exporting.value = false
  }
}

// ===== 脱敏导出（独立弹窗 RedactEditor）：拍平成图 + 像素涂黑，不可逆 =====
const redactOpen = ref(false)
const redactBytes = ref(null)
const redactInitBoxes = ref([])
const redactSaving = ref(false)
const redactFileName = computed(() => {
  const fname = displayDocLabel.value.replace(/[\\/:*?"<>|]/g, '_')
  return `${fname}_脱敏件.pdf`
})
function clamp01(v) { return Math.max(0, Math.min(1, v)) }

function normalizeRedactBox(box) {
  const page = Number(box?.page)
  const x0 = clamp01(Number(box?.x0))
  const y0 = clamp01(Number(box?.y0))
  const x1 = clamp01(Number(box?.x1))
  const y1 = clamp01(Number(box?.y1))
  if (!Number.isFinite(page) || page < 1) return null
  if (![x0, y0, x1, y1].every(Number.isFinite)) return null
  if (Math.abs(x1 - x0) < 0.002 || Math.abs(y1 - y0) < 0.002) return null
  return {
    page: Math.floor(page),
    x0: Math.min(x0, x1),
    y0: Math.min(y0, y1),
    x1: Math.max(x0, x1),
    y1: Math.max(y0, y1)
  }
}

function parseRedactData(data) {
  if (!data) return []
  try {
    const parsed = JSON.parse(data)
    const arr = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.boxes) ? parsed.boxes : [])
    return arr.map(normalizeRedactBox).filter(Boolean)
  } catch (e) {
    console.warn('[ContentAudit] 解析脱敏框选数据失败', e)
    return []
  }
}

const redactSavedBoxes = computed(() => parseRedactData(props.redactData))

async function saveRedactBoxes(manualBoxes) {
  if (!props.taskId) { message.warning('缺少任务ID，无法保存框选'); return }
  const boxes = (manualBoxes || []).map(normalizeRedactBox).filter(Boolean)
  const redactData = JSON.stringify({ boxes })
  redactSaving.value = true
  try {
    await saveRedactData({ taskId: props.taskId, redactData })
    emit('redact-saved', redactData)
    message.success(`已保存 ${boxes.length} 个手动脱敏框`)
  } catch (e) {
    console.error('[ContentAudit] 保存脱敏框选失败', e)
    message.error('保存失败：' + (e?.message || e))
  } finally {
    redactSaving.value = false
  }
}

function rangeRectsForMatch(pg, start, end) {
  const charRefs = pg.charRefs || []
  const groups = []
  for (let i = start; i < end && i < charRefs.length; i++) {
    const ref = charRefs[i]
    if (!ref?.span) continue
    const last = groups[groups.length - 1]
    if (last && last.span === ref.span && ref.start <= last.rawEnd) {
      last.rawEnd = ref.end
    } else {
      groups.push({ span: ref.span, rawStart: ref.start, rawEnd: ref.end })
    }
  }

  const out = []
  groups.forEach((g) => {
    const textNode = Array.from(g.span.childNodes || []).find((n) => n.nodeType === Node.TEXT_NODE)
    let rects = []
    if (textNode) {
      const range = document.createRange()
      try {
        const max = textNode.textContent?.length || 0
        range.setStart(textNode, Math.max(0, Math.min(g.rawStart, max)))
        range.setEnd(textNode, Math.max(0, Math.min(g.rawEnd, max)))
        rects = Array.from(range.getClientRects()).filter((r) => r.width && r.height)
      } catch (e) {
        rects = []
      } finally {
        range.detach?.()
      }
    }
    if (!rects.length) {
      const r = g.span.getBoundingClientRect()
      if (r.width || r.height) rects = [r]
    }
    rects.forEach((rect) => out.push({ page: pageOfSpan(g.span), rect }))
  })
  return out.filter((x) => x.page)
}

function searchAllRectsReadonly(pages, text) {
  const out = []
  const normVal = normalizeText(text)
  if (!normVal || normVal.length < 2) return out
  for (const pg of pages) {
    let from = 0
    let i = pg.text.indexOf(normVal, from)
    while (i >= 0) {
      out.push(...rangeRectsForMatch(pg, i, i + normVal.length))
      from = i + Math.max(normVal.length, 1)
      i = pg.text.indexOf(normVal, from)
    }
  }
  return out
}

function firstRectsReadonly(pages, text) {
  const normVal = normalizeText(text)
  if (!normVal || normVal.length < 2) return []
  for (const pg of pages) {
    const i = pg.text.indexOf(normVal)
    if (i >= 0) return rangeRectsForMatch(pg, i, i + normVal.length)
  }
  return []
}

function pageOfSpan(span) {
  const wrap = span?.closest?.('.pdf-page-wrap')
  return wrap ? (parseInt(wrap.dataset.pageNumber, 10) || 1) : 0
}

function stripFocusLabelPrefix(text, item) {
  let s = String(text || '').trim()
  const labels = [
    item?.fieldLabel,
    item?.fieldName,
    item?.keyword,
    focusCategoryLabel(item)
  ].map((x) => String(x || '').trim()).filter(Boolean)

  for (const label of labels) {
    if (!label || s === label) continue
    if (s.startsWith(label)) {
      s = s.slice(label.length).trim()
      s = s.replace(/^[\s:：,，;；、.\-—_（）()【】\[\]]+/, '').trim()
      break
    }
  }
  return s
}

function focusValueCandidates(item) {
  const raw = String(item?.extractedValue || '').trim()
  if (!raw) return []
  if (/^(文中未提及|未提及|未填写|空缺|无|暂无|—|-)$/.test(raw)) return []

  const candidates = []
  const chunks = raw
    .split(/[\n\r]+|[；;。]+/)
    .map((x) => x.trim())
    .filter(Boolean)

  for (const chunk of chunks.length ? chunks : [raw]) {
    let value = stripFocusLabelPrefix(chunk, item)
    const colonIdx = value.search(/[:：]/)
    if (colonIdx >= 0 && colonIdx < value.length - 1) {
      value = value.slice(colonIdx + 1).trim()
    }
    value = value.replace(/^[\s:：,，;；、.\-—_]+/, '').replace(/[\s,，;；。]+$/, '').trim()
    if (normalizeText(value).length >= 2) candidates.push(value)
  }

  const seen = new Set()
  return candidates.filter((x) => {
    const key = normalizeText(x)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function collectFocusValueRectsReadonly() {
  const pane = paneRef.value
  if (!pane) return []
  const nodes = pane.getTextLayerNodes?.() || []
  if (!nodes.length) return []
  const pages = nodes.map(buildPageChars)
  const allRects = []
  ;(props.focusItems || []).forEach((it) => {
    const candidates = focusValueCandidates(it)
    candidates.forEach((candidate) => {
      const rects = searchAllRectsReadonly(pages, candidate)
      if (rects.length) {
        allRects.push(...rects)
      } else {
        for (const seg of focusSegments(candidate)) {
          allRects.push(...firstRectsReadonly(pages, seg))
        }
      }
    })
  })
  return allRects
}

function rectGroupsToBoxes(byPage) {
  const out = []
  byPage.forEach((rects, page) => {
    const pageEl = paneRef.value?.getPageEl?.(page)
    if (!pageEl) return
    const pr = pageEl.getBoundingClientRect()
    if (!pr.width || !pr.height) return
    rects.sort((a, b) => a.top - b.top)
    // 行聚类：新矩形纵向中点落在当前行带内 → 同行合并，否则起新行
    const lines = []
    rects.forEach((r) => {
      const last = lines[lines.length - 1]
      const mid = (r.top + r.bottom) / 2
      if (last && mid >= last.top && mid <= last.bottom) {
        last.left = Math.min(last.left, r.left)
        last.right = Math.max(last.right, r.right)
        last.top = Math.min(last.top, r.top)
        last.bottom = Math.max(last.bottom, r.bottom)
      } else {
        lines.push({ left: r.left, top: r.top, right: r.right, bottom: r.bottom })
      }
    })
    const padX = pr.width * 0.004
    const padY = pr.height * 0.004
    lines.forEach((ln) => {
      const x0 = clamp01((ln.left - pr.left - padX) / pr.width)
      const y0 = clamp01((ln.top - pr.top - padY) / pr.height)
      const x1 = clamp01((ln.right - pr.left + padX) / pr.width)
      const y1 = clamp01((ln.bottom - pr.top + padY) / pr.height)
      if (x1 - x0 > 0.002 && y1 - y0 > 0.002) out.push({ page, x0, y0, x1, y1 })
    })
  })
  return out
}

function rectsToBoxes(pageRects) {
  const byPage = new Map()
  pageRects.forEach(({ page, rect }) => {
    if (!page || !rect || (!rect.width && !rect.height)) return
    if (!byPage.has(page)) byPage.set(page, [])
    byPage.get(page).push(rect)
  })
  return rectGroupsToBoxes(byPage)
}
function openRedact() {
  if (!canUseRedact.value) return
  if (!docBytes.value) { message.warning('文档尚未就绪'); return }
  let valueBoxes = []
  try {
    valueBoxes = rectsToBoxes(collectFocusValueRectsReadonly())
  } catch (e) {
    console.warn('[ContentAudit] 计算自动脱敏框失败', e)
  }
  redactInitBoxes.value = valueBoxes
  redactBytes.value = docBytes.value.slice(0)
  redactOpen.value = true
  if (!valueBoxes.length) {
    message.info('未自动匹配到关注文档值区域，请在文档上手动框选脱敏')
  }
}

function handleConnViewportChange() {
  scheduleIssueConn()
}

// 停掉一切会碰 DOM / 写响应式的异步活动。KeepAlive 切走(deactivated)与真正卸载
// (unmount)都走这里，确保缓存子树被 <Transition> 搬动时没有游离回调在改它。
function disarmViewer() {
  viewerActive = false
  stopOcrPolling()
  if (locateRaf) { cancelAnimationFrame(locateRaf); locateRaf = null }
  if (connRaf) { cancelAnimationFrame(connRaf); connRaf = 0 }
  if (mo) { mo.disconnect(); mo = null }
  if (moDebounce) { clearTimeout(moDebounce); moDebounce = null }
  window.removeEventListener('resize', handleConnViewportChange)
  window.removeEventListener('scroll', handleConnViewportChange, true)
}

// 恢复活动：首次挂载与 KeepAlive 重新激活都走这里。监听器同引用重复 add 会被浏览器去重，
// startOcrPolling 内部先 stop，故可安全重入。
function armViewer() {
  viewerActive = true
  window.addEventListener('resize', handleConnViewportChange)
  window.addEventListener('scroll', handleConnViewportChange, true)
  startOcrPolling()
}

onMounted(armViewer)
onBeforeUnmount(disarmViewer)
onDeactivated(disarmViewer)
onActivated(() => {
  armViewer()
  // 缓存恢复后 textLayer DOM 仍在，但观察器与染色已停：重挂观察器并重定位一次。
  if (docBytes.value && paneRef.value) {
    setupTextLayerObserver()
    scheduleLocate()
  }
})
</script>

<style scoped>
.ca-viewer {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #f5f6f8;
  overflow: hidden;
}
.ca-toolbar {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  font-size: 13px;
  background: linear-gradient(180deg, #fafbfc, #f0f2f5);
  border-bottom: 1px solid #ebeef5;
}
.ca-label {
  order: 1;
  font-weight: 600;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ca-rules-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 28px 0;
  color: #909399;
  font-size: 13px;
}
.ca-rules-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  font-size: 13px;
  color: #606266;
}
.ca-label .side-tag {
  font-weight: 700;
}
.ca-label .audit-tag {
  border-color: #d9c6f0;
  background: #f5f0fb;
  color: #8957c9;
}
.ca-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ca-actions {
  order: 3;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}
.ca-rules-btn {
  order: 2;
  margin-left: auto;
  margin-right: -2px;
  border: 0;
  background: transparent;
  color: #606266;
  font-weight: 500;
  padding: 0 2px;
  height: 24px;
}
.ca-rules-btn:hover,
.ca-rules-btn:focus {
  background: transparent;
  color: #409eff;
}
.ca-action-link {
  color: #606266;
  font-weight: 500;
}
.ca-action-link:hover {
  color: #409eff;
}
.ca-action-link :deep(.anticon) {
  font-size: 14px;
  margin-right: 3px;
}
.close-btn {
  margin-left: 4px;
  font-size: 16px;
  color: #909399;
}
.close-btn:hover {
  color: #f56c6c;
}
.ca-ocr { font-size: 12px; color: #e6a23c; display: inline-flex; align-items: center; gap: 4px; }
/* 缩放控件：与附件对比 .pdf-toolbar 保持一致 */
.pdf-toolbar {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-right: 4px;
}
.pdf-toolbar .tb-btn {
  width: 24px;
  height: 24px;
  border: 1px solid #dcdfe6;
  background: #fff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  color: #606266;
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
.ca-body { position: relative; flex: 1; display: flex; min-height: 0; overflow: hidden; }
.issue-conn-overlay {
  position: absolute;
  inset: 0;
  z-index: 12;
  pointer-events: none;
}
.issue-conn-line {
  fill: none;
  stroke: #e6a23c;
  stroke-width: 1.5;
  stroke-dasharray: 5 4;
  opacity: 0.9;
}
.issue-conn-line.dt-del { stroke: #f56c6c; }
.issue-conn-line.dt-modify { stroke: #e6a23c; }
.issue-conn-dot {
  fill: #fff;
  stroke: #e6a23c;
  stroke-width: 2;
}
.issue-conn-dot.dt-del { stroke: #f56c6c; }
.issue-conn-dot.dt-modify { stroke: #e6a23c; }
.ca-doc { flex: 1; min-width: 0; min-height: 0; display: flex; position: relative; overflow: hidden; }
/* 缩放重渲遮罩：等定位加载完毕才撤掉 */
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
.ca-doc-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #909399;
}
.ca-list {
  width: 360px;
  flex-shrink: 0;
  border-left: 1px solid #e6e8eb;
  background: #fff;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.ca-list-head {
  padding: 10px 14px;
  font-weight: 600;
  color: #303133;
  border-bottom: 1px solid #eef0f2;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

/* ===== Tab 切换条 ===== */
.ca-list-tabs {
  display: flex;
  border-bottom: 1px solid #eef0f2;
  flex-shrink: 0;
}
.ca-tab-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 10px 8px;
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}
.ca-tab-btn:hover { color: #409eff; }
.ca-tab-btn.active {
  color: #409eff;
  border-bottom-color: #409eff;
}
.ca-tab-badge { margin-left: 2px; }

/* ===== 关注列表项样式（区别于问题项） ===== */
.diff-item.focus-item:hover { background: #f0f9eb; }
.diff-item.focus-item.active { background: #e8f5e6; border-color: #67c23a; }
.diff-badge.dt-focus {
  background: #67c23a;
}
.diff-text.focus-text { color: #303133; }
.focus-keyword-title {
  font-weight: 600;
  color: #303133;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.focus-sublabel { font-weight: 400; color: #909399; font-size: 12px; }
.focus-category-chip {
  max-width: 86px;
  padding: 1px 6px;
  border: 1px solid #d9ecff;
  border-radius: 3px;
  background: #ecf5ff;
  color: #337ecc;
  font-size: 10px;
  line-height: 16px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-shrink: 0;
}
.focus-location {
  font-size: 11px;
  color: #909399;
  display: flex;
  align-items: center;
  gap: 3px;
  margin-top: 2px;
}
.ca-list-tip { display: flex; align-items: center; justify-content: center; gap: 8px; color: #909399; padding: 24px; flex: 1; }

/* ===== 严重程度过滤条（与附件对比 AI 面板按钮样式一致） ===== */
.ca-filter {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  padding: 8px 10px;
  border-bottom: 1px solid #eef0f2;
  flex-shrink: 0;
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
/* 关注列表过滤条配色：全部=蓝 / 已定位=绿 / 缺漏=红 */
.ai-filter-btn.focus-all .dot { background: #409eff; }
.ai-filter-btn.focus-located .dot { background: #67c23a; }
.ai-filter-btn.focus-missing .dot { background: #f56c6c; }
.ai-filter-btn.active.focus-located { background: #f0f9eb; border-color: #67c23a; color: #67c23a; }
.ai-filter-btn.active.focus-missing { background: #fef0f0; border-color: #f56c6c; color: #f56c6c; }
.ai-filter-btn.active .ai-filter-count {
  background: rgba(255, 255, 255, 0.6);
  color: inherit;
}
.focus-category-filter {
  display: flex;
  gap: 6px;
  padding: 0 10px 8px;
  border-bottom: 1px solid #eef0f2;
  overflow-x: auto;
  scrollbar-width: thin;
  flex-shrink: 0;
}
.focus-category-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 150px;
  height: 24px;
  padding: 0 8px;
  border: 1px solid #d9ecff;
  border-radius: 999px;
  background: #fff;
  color: #606266;
  cursor: pointer;
  font-size: 11px;
  font-family: inherit;
  white-space: nowrap;
  flex: 0 0 auto;
}
.focus-category-btn span:first-child {
  overflow: hidden;
  text-overflow: ellipsis;
}
.focus-category-btn:hover,
.focus-category-btn.active {
  border-color: #409eff;
  background: #ecf5ff;
  color: #409eff;
}

/* ===== 与「附件对比」差异清单统一的样式 ===== */
.diff-list { list-style: none; margin: 0; padding: 6px; overflow-y: auto; flex: 1; scrollbar-gutter: stable; }
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
.diff-item:hover { background: #f0f2f5; }
.diff-item.active { background: #ecf5ff; border-color: #409eff; }
.diff-item-head { display: flex; align-items: center; gap: 6px; }
.diff-badge {
  flex: 0 0 auto;
  height: 18px;
  padding: 0 6px;
  border-radius: 3px;
  font-size: 11px;
  line-height: 18px;
  color: #fff;
}
.diff-badge.dt-add { background: #67c23a; }
.diff-badge.dt-del { background: #f56c6c; }
.diff-badge.dt-modify { background: #e6a23c; }
.diff-seq { font-size: 11px; color: #909399; }
.diff-field { font-size: 12px; color: #303133; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
/* 规则说明：标题下一行，告诉用户这条按什么规则审的。标签复用「标准/文档」描边样式 */
.diff-rule {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  margin: 5px 0 2px;
  cursor: pointer;
}
.diff-rule .dt-tag {
  display: inline-block;
  flex: 0 0 auto;
  font-size: 10px;
  color: #909399;
  border: 1px solid #dcdfe6;
  border-radius: 2px;
  padding: 0 3px;
  margin-top: 1px;
}
.diff-rule-text {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  color: #606266;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}
.diff-rule-text.expanded { -webkit-line-clamp: unset; }
.diff-loc { margin-left: auto; }
/* 关注要点出现次数角标：紧跟标题，不抢「已定位/缺漏」的右对齐位 */
.focus-occ-tag { flex: 0 0 auto; cursor: pointer; }
/* 保存+删除统一右上角（仅图标）；无「已定位」标签时也靠右 */
.diff-actions { margin-left: auto; display: inline-flex; align-items: center; gap: 8px; flex: 0 0 auto; }
.diff-loc + .diff-actions { margin-left: 6px; }
.diff-save-btn { color: #909399; cursor: pointer; font-size: 14px; }
.diff-save-btn:hover { color: #529b2e; }
.diff-save-btn.active { color: #67c23a; }
.diff-save-btn.is-saving { color: #409eff; cursor: default; }
.diff-del-btn { color: #c0c4cc; cursor: pointer; font-size: 14px; }
.diff-del-btn:hover { color: #f56c6c; }
.diff-texts {
  position: relative;
  flex: 1;
  min-width: 0;
  padding-right: 22px;
}
.diff-text {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  min-width: 0;
  font-size: 12px;
  line-height: 1.45;
}
.diff-text-content {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.diff-texts.expanded .diff-text-content {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  white-space: normal;
}
.diff-expand-btn {
  position: absolute;
  right: 0;
  bottom: 1px;
  border: 0;
  background: transparent;
  color: #409eff;
  cursor: pointer;
  font-size: 11px;
  line-height: 18px;
  padding: 0;
  font-family: inherit;
}
.diff-expand-btn:hover { color: #66b1ff; }
.diff-text .dt-tag {
  display: inline-block;
  flex: 0 0 auto;
  font-size: 10px;
  color: #909399;
  border: 1px solid #dcdfe6;
  border-radius: 2px;
  padding: 0 3px;
  margin-right: 4px;
}
.diff-text.left { color: #409eff; }
.diff-text.right { color: #c45656; }
.diff-note { margin-top: 2px; }
.diff-note :deep(.ant-input) {
  font-size: 12px;
  line-height: 1.5;
  padding: 4px 6px;
  min-height: 26px;
}
.diff-note :deep(.ant-input[readonly]) {
  cursor: default;
  color: #303133;
  background: #fafafa;
}
.diff-note :deep(.ant-input.is-editing) {
  cursor: text;
  background: #fff;
  border-color: #409eff;
}
</style>

<!-- 非 scoped：染色作用在 PdfPane 运行时插入的 textLayer span 上，scoped 选择器命不中 -->
<style>
.pdf-pane .textLayer span.ca-mismatch { background-color: rgba(245, 108, 108, 0.5); border-radius: 2px; }
.pdf-pane .textLayer span.ca-uncertain { background-color: rgba(230, 162, 60, 0.5); border-radius: 2px; }
.pdf-pane .textLayer span.ca-missing { background-color: rgba(144, 147, 153, 0.32); border-bottom: 2px dashed #909399; border-radius: 2px; }
.pdf-pane .textLayer span.ca-active { outline: 2px solid #409eff; outline-offset: 1px; }
.pdf-pane .textLayer span.ca-focus { background-color: rgba(64, 158, 255, 0.18); border-radius: 2px; }
.pdf-pane .textLayer span.ca-focus-active { outline: 2px solid #409eff; outline-offset: 1px; }
</style>
