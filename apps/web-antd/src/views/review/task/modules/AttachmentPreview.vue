<script setup lang="ts">
/**
 * 通用审核附件预览组件
 *
 * 设计目标：新增文件类型时只动这一个文件
 *  - 图片(png/jpg/jpeg/webp/bmp/gif)  → <Image> 缩略图，支持点击放大
 *  - PDF                              → <iframe> 内嵌预览
 *  - Office 文档(doc/docx/xls/xlsx/ppt/pptx) → 头部链接，浏览器侧下载或外部打开
 *  - 视频(mp4/webm/mov)               → <video> 内嵌播放器
 *  - 音频(mp3/wav)                    → <audio> 内嵌播放器
 *  - 其他                             → 头部链接 fallback
 *
 * 加新类型只需在 typeMatchers 加一条匹配 + 在模板里加对应分支
 */
import { computed } from 'vue';
import { Image } from 'ant-design-vue';
import { FileTextOutlined } from '@ant-design/icons-vue';

interface ReviewFile {
  id?: number | string;
  fileName?: string;
  fileType?: string;
  fileSuffix?: string;
  filePath?: string;
  url?: string;
}

const props = defineProps<{ file: ReviewFile }>();

const url = computed(() => props.file?.filePath || props.file?.url || '');
const ext = computed(() =>
  (props.file?.fileType || props.file?.fileSuffix || '')
    .toLowerCase()
    .replace(/^\./, ''),
);

// 单一的类型分发表 —— 新增文件类型在这里加一行 + 在模板里加对应渲染分支
const typeKey = computed(() => {
  const e = ext.value;
  if (['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'image'].includes(e)) return 'image';
  if (e === 'pdf') return 'pdf';
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(e)) return 'office';
  if (['mp4', 'webm', 'mov', 'm4v'].includes(e)) return 'video';
  if (['mp3', 'wav', 'ogg', 'm4a'].includes(e)) return 'audio';
  return 'fallback';
});
</script>

<template>
  <div class="attachment-preview-item">
    <div class="attachment-preview-header">
      <FileTextOutlined class="attachment-preview-icon" />
      <span class="attachment-preview-name">{{ file.fileName }}</span>
      <a
        v-if="url"
        :href="url"
        target="_blank"
        class="attachment-preview-open"
      >在新窗口打开</a>
    </div>

    <!-- 图片：可点击放大 -->
    <Image
      v-if="typeKey === 'image'"
      :src="url"
      :alt="file.fileName"
      class="attachment-image"
    />

    <!-- PDF：iframe 内嵌 -->
    <iframe
      v-else-if="typeKey === 'pdf'"
      :src="url"
      class="attachment-pdf-frame"
    />

    <!-- 视频 -->
    <video
      v-else-if="typeKey === 'video'"
      :src="url"
      controls
      class="attachment-video"
    />

    <!-- 音频 -->
    <audio
      v-else-if="typeKey === 'audio'"
      :src="url"
      controls
      class="attachment-audio"
    />

    <!-- Office 文档（doc/docx/xls/xlsx/ppt/pptx）：浏览器原生不支持内嵌预览 -->
    <div v-else-if="typeKey === 'office'" class="attachment-office-tip">
      {{ ext.toUpperCase() }} 文档无法内嵌预览，请点击"在新窗口打开"由浏览器/本地 Office 处理
    </div>

    <!-- 其他类型 fallback：头部链接已足够 -->
  </div>
</template>

<style scoped>
.attachment-preview-item {
  margin-top: 8px;
  padding: 10px 12px;
  background: #fafafa;
  border-radius: 6px;
}

.attachment-preview-item + .attachment-preview-item {
  margin-top: 12px;
}

.attachment-preview-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  font-size: 13px;
}

.attachment-preview-icon {
  color: #909399;
}

.attachment-preview-name {
  color: #303133;
  font-weight: 500;
  flex: 1;
  word-break: break-all;
}

.attachment-preview-open {
  font-size: 12px;
  color: #1677ff;
  flex-shrink: 0;
}

.attachment-image {
  width: 100%;
  max-height: 400px;
  object-fit: contain;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
}

.attachment-pdf-frame {
  width: 100%;
  height: 520px;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  background: #fff;
}

.attachment-video,
.attachment-audio {
  width: 100%;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  background: #000;
}

.attachment-audio {
  background: #fff;
  height: 48px;
}

.attachment-office-tip {
  color: #909399;
  font-size: 12px;
  padding: 12px;
  background: #fff;
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  text-align: center;
}
</style>
