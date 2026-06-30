<template>
  <Page
    :auto-content-height="true"
    class="tool-workspace-page"
    content-class="flex min-h-0 flex-col"
  >
    <div v-if="!activeTool" class="tool-entry">
      <div class="entry-heading">
        <h1>选择一个工具开始处理文件</h1>
      </div>

      <div class="tool-grid">
        <button
          v-for="tool in tools"
          :key="tool.key"
          class="tool-card"
          :class="`tool-card--${tool.key}`"
          type="button"
          @click="selectTool(tool.key)"
        >
          <span class="tool-icon">
            <component :is="tool.icon" />
          </span>
          <span class="tool-name">{{ tool.title }}</span>
          <span class="tool-desc">{{ tool.description }}</span>
        </button>
      </div>
    </div>

    <ToolComparePreviewer
      v-else-if="activeTool === 'compare'"
      v-model:base-file="baseFile"
      v-model:compare-file="compareFile"
      :checking="checking"
      :exporting="exporting"
      :importing="importing"
      :result="result"
      :result-error="resultError"
      :result-status="resultStatus"
      :submitting="submitting"
      :task-id="taskId"
      @back="backToEntry"
      @check-now="checkNow"
      @close-result="backToEntry"
      @export-project="handleExport"
      @import-project="triggerImport"
      @start="startTask"
    />

    <ToolSingleDocPreviewer
      v-else
      v-model:doc-file="docFile"
      v-model:reference-data="referenceData"
      v-model:standard-ids="standardIds"
      :checking="checking"
      :exporting="exporting"
      :importing="importing"
      :mode="singleMode"
      :redact-enabled="contentAuditRedactEnabled"
      :result="result"
      :result-error="resultError"
      :result-status="resultStatus"
      :submitting="submitting"
      :task-id="taskId"
      @back="backToEntry"
      @check-now="checkNow"
      @close-result="backToEntry"
      @export-project="handleExport"
      @import-project="triggerImport"
      @open-rules="openAuditRules"
      @redact-saved="onRedactSaved"
      @start="startTask"
    />

    <AuditRuleDialog
      v-model="standardIds"
      v-model:open="auditRuleOpen"
      v-model:reference-data="referenceData"
      :mode="singleMode"
      :submitting="submitting"
      @confirm="confirmAuditRules"
    />

    <input
      ref="importInputRef"
      accept=".zip"
      class="hidden-input"
      type="file"
      @change="handleImportFile"
    />
  </Page>
</template>

<script setup lang="ts">
import { computed, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  DiffOutlined,
  EyeInvisibleOutlined,
  FileSearchOutlined,
} from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';

import { reviewTaskExport, reviewTaskImport } from '#/api/review/task';
import { getToolResult, toolCreateAndExecute } from '#/api/review/tool';
import type { ReviewToolResult } from '#/api/review/tool/model';
import { configInfoByKey } from '#/api/system/config';

import AuditRuleDialog from './AuditRuleDialog.vue';
import ToolComparePreviewer from './ToolComparePreviewer.vue';
import ToolSingleDocPreviewer from './ToolSingleDocPreviewer.vue';

type ToolKey = 'audit' | 'compare' | 'redact';

interface ToolFile {
  name: string;
  ossId: null | number | string;
  url: string;
}

const tools = [
  {
    description: '左右上传基准与对比文件，直接在预览器里生成差异清单。',
    icon: DiffOutlined,
    key: 'compare',
    title: '附件对比',
  },
  {
    description: '上传待审文件并选择规则，直接在预览器里定位审核结果。',
    icon: FileSearchOutlined,
    key: 'audit',
    title: '内容审核',
  },
  {
    description: '上传文件并选择规则，直接在预览器里定位并脱敏导出。',
    icon: EyeInvisibleOutlined,
    key: 'redact',
    title: '文件脱敏',
  },
] as const;

const route = useRoute();
const activeTool = ref<null | ToolKey>(null);

const baseFile = ref<null | ToolFile>(null);
const compareFile = ref<null | ToolFile>(null);
const docFile = ref<null | ToolFile>(null);
const standardIds = ref<any[]>([]);
const referenceData = ref('');
const redactFocusPoints = ref<string[]>([]);

const submitting = ref(false);
const checking = ref(false);
const importing = ref(false);
const exporting = ref(false);
const importInputRef = ref<HTMLInputElement | null>(null);

const taskId = ref('');
const result = ref<ReviewToolResult | null>(null);
const resultStatus = ref<'fail' | 'idle' | 'running' | 'success'>('idle');
const resultError = ref('');
const auditRuleOpen = ref(false);
const contentAuditRedactEnabled = ref(true);
const CONTENT_AUDIT_REDACT_CONFIG_KEY = 'review.contentAudit.redact.enabled';

const activeTitle = computed(() => {
  return tools.find((item) => item.key === activeTool.value)?.title || '审核工具';
});
const singleMode = computed<'audit' | 'redact'>(() =>
  activeTool.value === 'redact' ? 'redact' : 'audit',
);

function parseConfigBool(value: any, fallback = true) {
  const text = String(value ?? '').trim().toLowerCase();
  if (!text) return fallback;
  return !['false', '0', 'n', 'no', 'off'].includes(text);
}

async function loadContentAuditRedactConfig() {
  try {
    const value = await configInfoByKey(CONTENT_AUDIT_REDACT_CONFIG_KEY);
    contentAuditRedactEnabled.value = parseConfigBool(value, true);
  } catch {
    contentAuditRedactEnabled.value = true;
  }
}

function selectTool(key: ToolKey) {
  activeTool.value = key;
  resetResult();
}

function isToolKey(value: unknown): value is ToolKey {
  return value === 'compare' || value === 'audit' || value === 'redact';
}

function toolFromResult(value: ReviewToolResult | null | undefined): null | ToolKey {
  const type = String(value?.reviewtype || '').toUpperCase();
  if (type.includes('COMPARE')) return 'compare';
  if (type.includes('REDACT')) return 'redact';
  if (type.includes('AUDIT')) return 'audit';
  return null;
}

function backToEntry() {
  activeTool.value = null;
  resetAllInputs();
  resetResult();
}

function resetAllInputs() {
  baseFile.value = null;
  compareFile.value = null;
  docFile.value = null;
  standardIds.value = [];
  referenceData.value = '';
  redactFocusPoints.value = [];
}

function resetResult() {
  stopPoll();
  taskId.value = '';
  result.value = null;
  resultStatus.value = 'idle';
  resultError.value = '';
}

function extOf(name: string) {
  const match = /\.([a-z0-9]+)$/i.exec(name || '');
  return match?.[1] ? match[1].toLowerCase() : 'pdf';
}

function taskFile(file: ToolFile) {
  return {
    fileName: file.name,
    filePath: file.url,
    fileType: extOf(file.name),
    ossId: file.ossId,
  };
}

function canStartTask(tool: ToolKey) {
  if (submitting.value || resultStatus.value === 'running') return false;
  if (tool === 'compare') return !!baseFile.value && !!compareFile.value;
  if (tool === 'audit') return !!docFile.value && standardIds.value.length > 0;
  if (tool === 'redact') return !!docFile.value && redactFocusPoints.value.length > 0;
  return false;
}

async function startTask() {
  if (!activeTool.value || !canStartTask(activeTool.value)) return;
  submitting.value = true;
  stopPoll();
  try {
    const payload = buildTaskPayload(activeTool.value);
    const id = await toolCreateAndExecute(payload);
    if (!id) throw new Error('未获取到任务ID');
    taskId.value = String(id);
    result.value = null;
    resultError.value = '';
    resultStatus.value = 'running';
    await pollOnce();
  } catch (error: any) {
    message.error(`${activeTitle.value}启动失败：${error?.message || error}`);
  } finally {
    submitting.value = false;
  }
}

function openAuditRules() {
  if (activeTool.value !== 'audit' && activeTool.value !== 'redact') return;
  if (!docFile.value) {
    message.warning(activeTool.value === 'redact' ? '请先上传待脱敏文件' : '请先上传待审核文件');
    return;
  }
  auditRuleOpen.value = true;
}

async function confirmAuditRules(ids: any[], focusPoints?: string[]) {
  standardIds.value = ids;
  redactFocusPoints.value = focusPoints || [];
  auditRuleOpen.value = false;
  await startTask();
}

function buildTaskPayload(tool: ToolKey) {
  if (tool === 'compare') {
    return {
      files: [taskFile(baseFile.value!), taskFile(compareFile.value!)],
      sourceType: 'AI_TOOL',
      standardIds: [],
      taskName: `工具-附件对比-${baseFile.value!.name} ↔ ${compareFile.value!.name}`,
      taskType: 'ATTACHMENT_COMPARE',
    };
  }
  if (tool === 'audit') {
    return {
      files: [taskFile(docFile.value!)],
      formSnapshot: referenceData.value || undefined,
      sourceType: 'AI_TOOL',
      standardIds: standardIds.value,
      taskName: `工具-内容审核-${docFile.value!.name}`,
      taskType: 'CONTENT_AUDIT',
    };
  }
  return {
    files: [taskFile(docFile.value!)],
    formSnapshot: JSON.stringify({
      focusPoints: redactFocusPoints.value,
      standardId: standardIds.value[0] || null,
    }),
    sourceType: 'AI_TOOL',
    standardIds: standardIds.value,
    taskName: `工具-文件脱敏-${docFile.value!.name}`,
    taskType: 'FILE_REDACT',
  };
}

let pollTimer: ReturnType<typeof setTimeout> | null = null;

function stopPoll() {
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
}

function schedulePoll() {
  stopPoll();
  pollTimer = setTimeout(pollOnce, 5000);
}

async function pollOnce() {
  if (!taskId.value) return;
  try {
    const nextResult = await getToolResult(taskId.value);
    if (nextResult?.status === 'SUCCESS') {
      const resultTool = toolFromResult(nextResult);
      if (resultTool) activeTool.value = resultTool;
      result.value = nextResult;
      resultStatus.value = 'success';
      stopPoll();
      return;
    }
    if (nextResult?.status === 'FAIL') {
      result.value = nextResult || null;
      resultError.value = nextResult?.errorMsg || '';
      resultStatus.value = 'fail';
      stopPoll();
      return;
    }
    resultStatus.value = 'running';
    schedulePoll();
  } catch {
    schedulePoll();
  }
}

async function checkNow() {
  if (checking.value) return;
  checking.value = true;
  try {
    await pollOnce();
  } finally {
    checking.value = false;
  }
}

function triggerImport() {
  importInputRef.value?.click();
}

async function handleImportFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.zip')) {
    message.warning('请选择 .zip 工程文件');
    return;
  }

  importing.value = true;
  const hide = message.loading('正在导入工程文件...', 0);
  try {
    const newIds = await reviewTaskImport(file);
    const nextTaskId = newIds?.[0];
    if (!nextTaskId) {
      message.warning('工程文件导入成功，但未返回任务ID');
      return;
    }
    taskId.value = String(nextTaskId);
    result.value = null;
    resultError.value = '';
    resultStatus.value = 'running';
    await pollOnce();
    message.success('工程文件导入成功');
  } catch (error: any) {
    message.error(`导入工程文件失败：${error?.message || error}`);
  } finally {
    hide();
    importing.value = false;
  }
}

async function handleExport() {
  if (!taskId.value) {
    message.warning('请先完成一次任务后再导出工程文件');
    return;
  }

  exporting.value = true;
  const hide = message.loading('正在导出工程文件...', 0);
  try {
    const blob = await reviewTaskExport([taskId.value]);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const ts = new Date()
      .toLocaleString('zh-CN', { hour12: false })
      .replace(/[/:\s]/g, '')
      .replace(/,/g, '');
    anchor.href = url;
    anchor.download = `${activeTitle.value}_工程文件_${ts}.zip`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    message.success('工程文件导出成功');
  } catch (error: any) {
    message.error(`导出工程文件失败：${error?.message || error}`);
  } finally {
    hide();
    exporting.value = false;
  }
}

function onRedactSaved(redactData: string) {
  if (result.value) result.value.redactData = redactData;
}

onBeforeUnmount(stopPoll);
onDeactivated(stopPoll);
onActivated(() => {
  if (taskId.value && resultStatus.value === 'running') pollOnce();
});
onMounted(async () => {
  await loadContentAuditRedactConfig();
  const queryTool = route.query.tool;
  const tool = Array.isArray(queryTool) ? queryTool[0] : queryTool;
  if (isToolKey(tool)) {
    selectTool(tool);
  }
});
</script>

<style scoped>
.tool-workspace-page {
  height: 100%;
}

.tool-entry {
  position: relative;
  isolation: isolate;
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 0;
  padding: clamp(28px, 5vw, 64px);
  overflow: hidden;
  background:
    linear-gradient(115deg, rgba(14, 116, 144, 0.08), transparent 32%),
    linear-gradient(295deg, rgba(18, 183, 106, 0.07), transparent 36%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.78), rgba(246, 248, 251, 0.88)),
    repeating-linear-gradient(90deg, rgba(16, 24, 40, 0.035) 0 1px, transparent 1px 72px),
    repeating-linear-gradient(0deg, rgba(16, 24, 40, 0.028) 0 1px, transparent 1px 72px),
    #eef3f8;
}

.tool-entry::before {
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  content: '';
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.68), transparent 28%, transparent 72%, rgba(255, 255, 255, 0.5)),
    linear-gradient(180deg, transparent 0%, rgba(255, 255, 255, 0.34) 54%, rgba(255, 255, 255, 0.7) 100%);
}

.entry-heading {
  margin-bottom: 22px;
  text-align: center;
}

.entry-kicker {
  color: #59616f;
  font-size: 13px;
  font-weight: 700;
}

.entry-heading h1 {
  margin: 8px 0 0;
  color: #182230;
  font-size: 17px;
  font-weight: 700;
  line-height: 1.4;
}

.tool-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(240px, 296px));
  gap: 16px;
  width: min(960px, 100%);
}

.tool-card {
  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  gap: 13px;
  min-height: 176px;
  padding: 22px 22px 20px;
  overflow: hidden;
  color: #fff;
  text-align: left;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  box-shadow:
    0 18px 42px rgba(15, 23, 42, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.22);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    filter 0.2s ease;
}

.tool-card::before {
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  content: '';
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.2), transparent 42%),
    linear-gradient(0deg, rgba(0, 0, 0, 0.08), transparent 68%);
}

.tool-card::after {
  position: absolute;
  right: 18px;
  bottom: 16px;
  width: 58px;
  height: 2px;
  pointer-events: none;
  content: '';
  background: rgba(255, 255, 255, 0.46);
  border-radius: 999px;
}

.tool-card:hover {
  box-shadow:
    0 24px 56px rgba(15, 23, 42, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  filter: saturate(1.04);
  transform: translateY(-4px);
}

.tool-card:focus-visible {
  outline: 3px solid rgba(46, 144, 250, 0.34);
  outline-offset: 3px;
}

.tool-card--compare {
  background: linear-gradient(145deg, #175cd3 0%, #2676d9 58%, #088ab2 100%);
}

.tool-card--audit {
  background: linear-gradient(145deg, #05603a 0%, #099268 55%, #12b76a 100%);
}

.tool-card--redact {
  background: linear-gradient(145deg, #912018 0%, #c43224 58%, #e04f2f 100%);
}

.tool-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  color: rgba(255, 255, 255, 0.95);
  font-size: 24px;
  background: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 8px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18);
}

.tool-name {
  margin-top: 3px;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.25;
}

.tool-desc {
  max-width: 210px;
  color: rgba(255, 255, 255, 0.88);
  font-size: 13px;
  line-height: 1.7;
}

.hidden-input {
  display: none;
}

@media (max-width: 1100px) {
  .tool-grid {
    grid-template-columns: 1fr;
    max-width: 420px;
  }

  .tool-card {
    min-height: 154px;
  }
}
</style>
