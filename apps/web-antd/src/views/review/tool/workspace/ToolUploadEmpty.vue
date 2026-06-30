<template>
  <div class="viewer-upload-empty">
    <div class="upload-page">
      <div class="upload-head">
        <Tag :color="tagColor">{{ tagText }}</Tag>
        <span class="file-name" :title="file?.name">{{ file?.name || '等待上传' }}</span>
      </div>
      <SingleFileUpload
        :key="file?.ossId || 'empty-upload'"
        :accept="accept"
        :model-value="file"
        class="viewer-upload"
        :tip="tip"
        @update:model-value="updateFile"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Tag } from 'ant-design-vue';

import SingleFileUpload from '../components/SingleFileUpload.vue';

interface ToolFile {
  name: string;
  ossId: null | number | string;
  url: string;
}

defineProps<{
  accept?: string;
  file: null | ToolFile;
  tagColor?: string;
  tagText: string;
  tip: string;
}>();

const emit = defineEmits(['update:file']);

function updateFile(file: null | ToolFile) {
  emit('update:file', file);
}
</script>

<style scoped>
.viewer-upload-empty {
  display: flex;
  justify-content: center;
  min-height: 100%;
  padding: 16px 0;
}

.upload-page {
  display: flex;
  width: min(780px, 92%);
  min-height: 720px;
  flex-direction: column;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.28);
}

.upload-head {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
  align-items: center;
  height: 44px;
  min-width: 0;
  padding: 0 16px;
  border-bottom: 1px solid #edf1f6;
}

.file-name {
  min-width: 0;
  overflow: hidden;
  color: #667085;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.viewer-upload {
  flex: 1;
  min-height: 0;
  padding: 18px;
}

.viewer-upload :deep(.ant-upload-drag) {
  min-height: 100%;
  background: #fbfcfe;
}
</style>
