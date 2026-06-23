<!--
  单文件上传：antd Upload.Dragger + customRequest 走 uploadApi(/resource/oss/upload，自动带鉴权)。
  上传成功 emit {ossId,url,name}。向导每步一个文件用。
-->
<template>
  <div class="single-upload">
    <UploadDragger
      v-if="!file"
      :show-upload-list="false"
      :accept="accept"
      :before-upload="beforeUpload"
      :custom-request="customRequest"
    >
      <p class="up-icon">
        <InboxOutlined />
      </p>
      <p class="up-text">{{ tip }}</p>
      <p class="up-hint">支持 {{ acceptHint }}，单个不超过 {{ maxSize }}MB</p>
    </UploadDragger>

    <div v-else class="up-done">
      <FileTextOutlined class="done-icon" />
      <span class="done-name" :title="file.name">{{ file.name }}</span>
      <Button type="link" @click="reset">
        <template #icon><ReloadOutlined /></template>
        重新上传
      </Button>
    </div>

    <div v-if="uploading || converting" class="up-loading">
      <LoadingOutlined spin /><span>{{ converting ? 'Word 转 PDF 中…' : '上传中…' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  FileTextOutlined,
  InboxOutlined,
  LoadingOutlined,
  ReloadOutlined,
} from '@ant-design/icons-vue';
import { Button, message, Upload } from 'ant-design-vue';
import { uploadApi } from '#/api/core/upload';
import { convertToPdf } from '#/api/review/tool';

const UploadDragger = Upload.Dragger;

interface ToolFile {
  ossId: number | string | null;
  url: string;
  name: string;
}

const props = defineProps<{
  tip?: string;
  accept?: string;
  maxSize?: number;
  modelValue?: ToolFile | null;
}>();
const emit = defineEmits(['update:modelValue', 'change']);

const tip = computed(() => props.tip ?? '点击或拖拽文件到此上传');
const accept = computed(
  () => props.accept ?? '.pdf,.docx,.doc,.xlsx,.xls,.png,.jpg,.jpeg',
);
const maxSize = computed(() => props.maxSize ?? 50);
const acceptHint = computed(() =>
  accept.value.replace(/\./g, '').replace(/,/g, '/'),
);

const file = ref<ToolFile | null>(props.modelValue ?? null);
const uploading = ref(false);
const converting = ref(false);

function beforeUpload(raw: File) {
  const okSize = raw.size / 1024 / 1024 < maxSize.value;
  if (!okSize) {
    message.error(`文件大小不能超过 ${maxSize.value}MB`);
    return Upload.LIST_IGNORE;
  }
  return true;
}

async function customRequest(options: any) {
  const { file: raw, onSuccess, onError } = options;
  uploading.value = true;
  try {
    const res = await uploadApi(raw);
    let f: ToolFile = { ossId: res.ossId, url: res.url, name: res.fileName };
    // Word(doc/docx) 自动转 PDF：查看器双 PDF 模式才能做字符级 diff
    if (/\.docx?$/i.test(res.fileName || '')) {
      converting.value = true;
      try {
        const c = await convertToPdf(res.ossId);
        if (c?.converted && c.url) {
          // 转出的 PDF 无独立 ossId，引擎按 filePath URL 下载；ossId 置 null 避免误下原 Word
          f = { ossId: c.ossId ?? null, url: c.url, name: c.name };
        }
      } catch (e: any) {
        message.warning('Word 转 PDF 失败，将按原文件处理：' + (e?.message || e));
      } finally {
        converting.value = false;
      }
    }
    file.value = f;
    emit('update:modelValue', f);
    emit('change', f);
    onSuccess?.(res);
  } catch (e) {
    message.error('上传失败，请重试');
    onError?.(e);
  } finally {
    uploading.value = false;
  }
}

function reset() {
  file.value = null;
  emit('update:modelValue', null);
  emit('change', null);
}
</script>

<style scoped>
.single-upload {
  width: 100%;
}
.single-upload :deep(.ant-upload-wrapper),
.single-upload :deep(.ant-upload-drag) {
  width: 100%;
  height: 100%;
}
.single-upload :deep(.ant-upload-drag) {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 220px;
}
.single-upload :deep(.ant-upload-btn) {
  height: 100%;
}
.up-icon {
  font-size: 42px;
  color: #c0c4cc;
  margin-bottom: 8px;
}
.up-text {
  color: #606266;
  font-size: 14px;
}
.up-hint {
  color: #909399;
  font-size: 12px;
  margin-top: 4px;
}
.up-done {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: #f5f7fa;
}
.done-icon {
  font-size: 20px;
  color: #1677ff;
}
.done-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #303133;
  font-weight: 600;
}
.up-loading {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  color: #909399;
  font-size: 13px;
}
</style>
