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
      v-model:focus-points="focusPoints"
      v-model:focus-standard-id="focusStandardId"
      v-model:reference-data="referenceData"
      v-model:standard-ids="standardIds"
      :checking="checking"
      :exporting="exporting"
      :importing="importing"
      :mode="singleMode"
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
      @redact-saved="onRedactSaved"
      @start="startTask"
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
    description: '上传文件并选择关注点，直接在预览器里定位并脱敏导出。',
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
const focusPoints = ref<string[]>([]);
const focusStandardId = ref<any>();

const submitting = ref(false);
const checking = ref(false);
const importing = ref(false);
const exporting = ref(false);
const importInputRef = ref<HTMLInputElement | null>(null);

const taskId = ref('');
const result = ref<ReviewToolResult | null>(null);
const resultStatus = ref<'fail' | 'idle' | 'running' | 'success'>('idle');
const resultError = ref('');

const activeTitle = computed(() => {
  return tools.find((item) => item.key === activeTool.value)?.title || '审核工具';
});
const singleMode = computed<'audit' | 'redact'>(() =>
  activeTool.value === 'redact' ? 'redact' : 'audit',
);

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
  focusPoints.value = [];
  focusStandardId.value = undefined;
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
  return !!docFile.value && focusPoints.value.length > 0;
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
      focusPoints: focusPoints.value,
      standardId: focusStandardId.value || null,
    }),
    sourceType: 'AI_TOOL',
    standardIds: focusStandardId.value ? [focusStandardId.value] : [],
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
onMounted(() => {
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
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 0;
  padding: 28px;
  background:
    linear-gradient(135deg, rgba(23, 92, 211, 0.08), transparent 34%),
    linear-gradient(225deg, rgba(4, 120, 87, 0.08), transparent 36%),
    #f6f8fb;
}

.entry-heading {
  margin-bottom: 28px;
  text-align: center;
}

.entry-kicker {
  color: #59616f;
  font-size: 13px;
  font-weight: 700;
}

.entry-heading h1 {
  margin: 8px 0 0;
  color: #1f2937;
  font-size: 28px;
  font-weight: 700;
}

.tool-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(220px, 280px));
  gap: 18px;
  width: min(900px, 100%);
}

.tool-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 190px;
  padding: 22px;
  color: #fff;
  text-align: left;
  cursor: pointer;
  border: 0;
  border-radius: 8px;
  box-shadow: 0 18px 42px rgba(31, 41, 55, 0.16);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.tool-card:hover {
  box-shadow: 0 22px 52px rgba(31, 41, 55, 0.22);
  transform: translateY(-3px);
}

.tool-card--compare {
  background: linear-gradient(145deg, #175cd3, #2e90fa);
}

.tool-card--audit {
  background: linear-gradient(145deg, #047857, #12b76a);
}

.tool-card--redact {
  background: linear-gradient(145deg, #912018, #d92d20);
}

.tool-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  color: rgba(255, 255, 255, 0.95);
  font-size: 24px;
  background: rgba(255, 255, 255, 0.18);
  border-radius: 8px;
}

.tool-name {
  font-size: 20px;
  font-weight: 700;
}

.tool-desc {
  color: rgba(255, 255, 255, 0.86);
  font-size: 13px;
  line-height: 1.7;
}

.hidden-input {
  display: none;
}

@media (max-width: 1100px) {
  .tool-grid {
    grid-template-columns: 1fr;
  }
}
</style>
