<template>
  <ContentAuditViewer
    :doc-label="docLabel"
    :doc-ocr-status="result?.signOcrStatus || ''"
    :doc-oss-id="result?.signOssId || null"
    :doc-searchable-url="result?.signSearchableUrl || ''"
    :doc-url="result?.signFileUrl || docFile?.url || ''"
    :empty-list-visible="resultStatus !== 'success'"
    :focus-items="resultStatus === 'success' ? result?.focusItems || [] : []"
    :focus-keywords="resultStatus === 'success' ? result?.focusKeywords || [] : []"
    :issues="resultStatus === 'success' && mode !== 'redact' ? result?.issues || [] : []"
    :initial-list-panel-open="false"
    :list-action-disabled="resultStatus !== 'success'"
    :print-action-disabled="resultStatus !== 'success'"
    :redact-data="result?.redactData || ''"
    :redact-action-disabled="resultStatus !== 'success'"
    :redact-enabled="mode === 'redact' || redactEnabled"
    :status="viewerStatus"
    :task-id="result?.id || taskId || ''"
    :viewer-mode="mode === 'redact' ? 'redact' : 'audit'"
    @close="$emit(resultStatus === 'success' ? 'close-result' : 'back')"
    @redact-saved="handleRedactSaved"
  >
    <template #toolbar-actions>
      <Button :loading="importing" type="link" size="small" class="ca-action-link" @click="$emit('import-project')">
        <ImportOutlined />
        <span>导入</span>
      </Button>
      <Button
        :disabled="exportDisabled"
        :loading="exporting"
        type="link"
        size="small"
        class="ca-action-link"
        @click="$emit('export-project')"
      >
        <ExportOutlined />
        <span>导出</span>
      </Button>
      <Button
        type="link"
        size="small"
        class="ca-action-link"
        :disabled="startDisabled"
        :loading="submitting"
        @click="handleStart"
      >
        <PlayCircleOutlined />
        <span>{{ taskId ? restartText : startText }}</span>
      </Button>
      <Button
        v-if="resultStatus === 'running' && taskId"
        type="link"
        size="small"
        class="ca-action-link"
        :loading="checking"
        @click="$emit('check-now')"
      >
        <ReloadOutlined />
        <span>立即刷新</span>
      </Button>
    </template>

    <template #emptyDoc>
      <ToolUploadEmpty
        :key="docFile?.ossId || 'empty-doc'"
        :accept="mode === 'redact' ? '.pdf,.docx,.doc' : undefined"
        :file="docFile"
        :tag-color="isAudit ? 'green' : 'red'"
        :tag-text="isAudit ? '待审核文件' : '待脱敏文件'"
        :tip="isAudit ? '上传待审核文件' : '上传待脱敏文件'"
        @update:file="updateDocFile"
      />
    </template>

    <template #emptyList>
      <div class="tool-empty-panel">
        <LoadingOutlined v-if="resultStatus === 'running'" spin />
        <CloseCircleOutlined v-else-if="resultStatus === 'fail'" class="tool-empty-error" />
        <ProfileOutlined v-else-if="isAudit" class="tool-empty-icon" />
        <AimOutlined v-else class="tool-empty-icon" />
        <span>{{ emptyListText }}</span>
      </div>
    </template>

    <template #runningMask>
      <div v-if="resultStatus === 'running'" class="tool-viewer-mask">
        <LoadingOutlined spin class="state-spin" />
        <div class="state-title">{{ runningText }}</div>
        <Button type="link" :loading="checking" @click="$emit('check-now')">立即刷新</Button>
      </div>
    </template>
  </ContentAuditViewer>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import {
  AimOutlined,
  CloseCircleOutlined,
  ExportOutlined,
  ImportOutlined,
  LoadingOutlined,
  PlayCircleOutlined,
  ProfileOutlined,
  ReloadOutlined,
} from '@ant-design/icons-vue';
import { Button } from 'ant-design-vue';

import type { ReviewToolResult } from '#/api/review/tool/model';

// @ts-expect-error 查看器为忠实移植的纯 JS SFC（含 pdfjs/canvas 复杂逻辑），不暴露 TS 类型
import ContentAuditViewer from '../components/ContentAuditViewer.vue';
import ToolUploadEmpty from './ToolUploadEmpty.vue';

interface ToolFile {
  name: string;
  ossId: null | number | string;
  url: string;
}

const props = defineProps<{
  checking?: boolean;
  docFile: null | ToolFile;
  exporting?: boolean;
  importing?: boolean;
  mode: 'audit' | 'redact';
  redactEnabled?: boolean;
  referenceData: string;
  result: null | ReviewToolResult;
  resultError?: string;
  resultStatus: 'fail' | 'idle' | 'running' | 'success';
  standardIds: any[];
  submitting?: boolean;
  taskId?: string;
}>();

const emit = defineEmits([
  'back',
  'check-now',
  'close-result',
  'export-project',
  'import-project',
  'open-rules',
  'redact-saved',
  'start',
  'update:docFile',
  'update:referenceData',
  'update:standardIds',
]);

const isAudit = computed(() => props.mode === 'audit');
const startText = computed(() => (isAudit.value ? '开始审核' : '开始脱敏'));
const restartText = computed(() => (isAudit.value ? '重新审核' : '重新脱敏'));
const runningText = computed(() => (isAudit.value ? 'AI 正在审核内容...' : 'AI 正在脱敏文件...'));
const failSubTitle = computed(() =>
  isAudit.value ? '内容审核失败，请稍后重新审核。' : '文件脱敏失败，请检查规则后重新脱敏。',
);
const docLabel = computed(
  () => props.result?.signFileName || props.docFile?.name || (isAudit.value ? '被审核文档' : '待脱敏文档'),
);
const viewerStatus = computed(() => {
  if (props.result?.status) return props.result.status;
  if (props.resultStatus === 'running') return 'RUNNING';
  if (props.resultStatus === 'fail') return 'FAIL';
  return '';
});
const startDisabled = computed(() => {
  return props.submitting || props.resultStatus === 'running' || !props.docFile;
});
const exportDisabled = computed(() => props.exporting || props.resultStatus !== 'success' || !props.taskId);
const emptyListText = computed(() => {
  if (props.resultStatus === 'running') return runningText.value;
  if (props.resultStatus === 'fail') return props.resultError || failSubTitle.value;
  const actionName = isAudit.value ? '审核' : '脱敏';
  if (props.docFile && props.standardIds.length) return `文件已预览，点击开始${actionName}确认规则`;
  if (props.standardIds.length) return `已选择 ${props.standardIds.length} 个规则库，上传文件后可开始${actionName}`;
  if (props.docFile) return `文件已预览，点击开始${actionName}后选择规则`;
  return '请先上传文件';
});

function updateDocFile(file: null | ToolFile) {
  emit('update:docFile', file);
}

function handleRedactSaved(value: string) {
  emit('redact-saved', value);
}

function handleStart() {
  emit('open-rules');
}
</script>

<style scoped>
:deep(.ca-viewer) {
  height: 100%;
  min-height: 0;
}

.ca-action-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.tool-empty-panel {
  display: flex;
  flex: 1;
  gap: 8px;
  align-items: center;
  justify-content: center;
  padding: 24px;
  color: #667085;
  font-size: 13px;
  text-align: center;
}

.tool-empty-icon {
  color: #98a2b3;
  font-size: 18px;
}

.tool-empty-error {
  color: #f04438;
  font-size: 18px;
}

.tool-viewer-mask {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(3px);
}

:deep(.list-panel-visible) .tool-viewer-mask {
  right: 360px;
}

.state-spin {
  color: #1677ff;
  font-size: 42px;
}

.state-title {
  margin-top: 14px;
  color: #1f2937;
  font-size: 17px;
  font-weight: 700;
}

.config-popover {
  width: min(720px, 72vw);
  max-height: 70vh;
  overflow: auto;
}

.config-title {
  margin-bottom: 10px;
  color: #344054;
  font-size: 14px;
  font-weight: 700;
}

.config-title--secondary {
  margin-top: 16px;
}
</style>
