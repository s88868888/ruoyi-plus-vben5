<template>
  <FileDiffViewer
    :ai-review="result || null"
    :diff-enabled="resultStatus === 'success'"
    :source-a-searchable-url="result?.printSearchableUrl || ''"
    :source-a-url="result?.printPdfUrl || baseFile?.url || ''"
    :source-b-ocr-status="result?.signOcrStatus || ''"
    :source-b-oss-id="result?.signOssId || null"
    :source-b-searchable-url="result?.signSearchableUrl || ''"
    :source-b-url="result?.signFileUrl || compareFile?.url || ''"
    source-a-label="基准文件"
    source-b-label="对比文件"
    @close="$emit(resultStatus === 'success' ? 'close-result' : 'back')"
  >
    <template #toolbar-actions>
      <Button :loading="importing" type="link" size="small" class="diff-panel-toggle" @click="$emit('import-project')">
        <ImportOutlined />
        <span>导入</span>
      </Button>
      <Button
        :disabled="exportDisabled"
        :loading="exporting"
        type="link"
        size="small"
        class="diff-panel-toggle"
        @click="$emit('export-project')"
      >
        <ExportOutlined />
        <span>导出</span>
      </Button>
      <Button
        type="link"
        size="small"
        class="diff-panel-toggle"
        :disabled="startDisabled"
        :loading="submitting"
        @click="$emit('start')"
      >
        <PlayCircleOutlined />
        <span>{{ taskId ? '重新对比' : '开始对比' }}</span>
      </Button>
      <Button
        v-if="resultStatus === 'running' && taskId"
        type="link"
        size="small"
        class="diff-panel-toggle"
        :loading="checking"
        @click="$emit('check-now')"
      >
        <ReloadOutlined />
        <span>立即刷新</span>
      </Button>
    </template>

    <template #emptyA>
      <ToolUploadEmpty
        :key="baseFile?.ossId || 'empty-base'"
        :file="baseFile"
        tag-color="blue"
        tag-text="基准文件"
        tip="上传基准文件"
        @update:file="updateBaseFile"
      />
    </template>

    <template #emptyB>
      <ToolUploadEmpty
        :key="compareFile?.ossId || 'empty-compare'"
        :file="compareFile"
        tag-color="green"
        tag-text="对比文件"
        tip="上传对比文件"
        @update:file="updateCompareFile"
      />
    </template>

    <template #emptyDiffPanel>
      <div class="tool-empty-panel">
        <LoadingOutlined v-if="resultStatus === 'running'" spin />
        <CloseCircleOutlined v-else-if="resultStatus === 'fail'" class="tool-empty-error" />
        <ProfileOutlined v-else class="tool-empty-icon" />
        <span v-if="resultStatus === 'running'">AI 正在对比文件...</span>
        <span v-else-if="resultStatus === 'fail'">{{ resultError || '附件对比失败，请检查文件后重新对比。' }}</span>
        <span v-else>上传左右文件后开始对比</span>
      </div>
    </template>

    <template #runningMask>
      <div v-if="resultStatus === 'running'" class="tool-viewer-mask">
        <LoadingOutlined spin class="state-spin" />
        <div class="state-title">AI 正在对比文件...</div>
        <Button type="link" :loading="checking" @click="$emit('check-now')">立即刷新</Button>
      </div>
    </template>
  </FileDiffViewer>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import {
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
import FileDiffViewer from '../components/FileDiffViewer.vue';
import ToolUploadEmpty from './ToolUploadEmpty.vue';

interface ToolFile {
  name: string;
  ossId: null | number | string;
  url: string;
}

const props = defineProps<{
  baseFile: null | ToolFile;
  checking?: boolean;
  compareFile: null | ToolFile;
  exporting?: boolean;
  importing?: boolean;
  result: null | ReviewToolResult;
  resultError?: string;
  resultStatus: 'fail' | 'idle' | 'running' | 'success';
  submitting?: boolean;
  taskId?: string;
}>();

const emit = defineEmits([
  'back',
  'check-now',
  'close-result',
  'export-project',
  'import-project',
  'start',
  'update:baseFile',
  'update:compareFile',
]);

const startDisabled = computed(() => {
  return props.submitting || props.resultStatus === 'running' || !props.baseFile || !props.compareFile;
});
const exportDisabled = computed(() => props.exporting || props.resultStatus !== 'success' || !props.taskId);

function updateBaseFile(file: null | ToolFile) {
  emit('update:baseFile', file);
}

function updateCompareFile(file: null | ToolFile) {
  emit('update:compareFile', file);
}
</script>

<style scoped>
:deep(.file-diff-viewer) {
  height: 100%;
  min-height: 0;
}

:deep(.diff-panel-visible) {
  --title-center-offset: calc(var(--diff-panel-width) / -2);
}

.tool-empty-panel {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  height: calc(100% - 42px);
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

:deep(.diff-panel-visible) .tool-viewer-mask {
  right: var(--diff-panel-width);
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
</style>
