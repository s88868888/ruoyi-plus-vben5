<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { Button, Spin } from 'ant-design-vue';
import {
  CloseOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
} from '@ant-design/icons-vue';
import VueOfficeDocx from '@vue-office/docx/lib/v3/vue-office-docx.mjs';
import '@vue-office/docx/lib/v3/index.css';

interface Props {
  visible: boolean;
  fileUrl: string;
  fileName: string;
  fileFormat: string; // pdf, docx, doc
}

const props = defineProps<Props>();
const emit = defineEmits(['close']);

// 拖拽和缩放状态
const containerRef = ref<HTMLElement>();
const posX = ref(100);
const posY = ref(100);
const width = ref(800);
const height = ref(600);
const isDragging = ref(false);
const isResizing = ref(false);
const isFullscreen = ref(false);
const dragStartX = ref(0);
const dragStartY = ref(0);
const dragStartPosX = ref(0);
const dragStartPosY = ref(0);
const resizeStartX = ref(0);
const resizeStartY = ref(0);
const resizeStartW = ref(0);
const resizeStartH = ref(0);
const loading = ref(true);
const error = ref(false);

// 保存全屏前的状态
const savedPos = ref({ x: 0, y: 0, w: 0, h: 0 });

const isPdf = computed(
  () => props.fileFormat?.toLowerCase() === 'pdf',
);
const isDocx = computed(() =>
  ['docx', 'doc'].includes(props.fileFormat?.toLowerCase() || ''),
);

const containerStyle = computed(() => {
  if (isFullscreen.value) {
    return {
      position: 'fixed' as const,
      left: '0px',
      top: '0px',
      width: '100vw',
      height: '100vh',
      zIndex: 10000,
    };
  }
  return {
    position: 'fixed' as const,
    left: `${posX.value}px`,
    top: `${posY.value}px`,
    width: `${width.value}px`,
    height: `${height.value}px`,
    zIndex: 10000,
  };
});

// 拖拽开始
function onDragStart(e: MouseEvent) {
  if (isFullscreen.value) return;
  isDragging.value = true;
  dragStartX.value = e.clientX;
  dragStartY.value = e.clientY;
  dragStartPosX.value = posX.value;
  dragStartPosY.value = posY.value;
  e.preventDefault();
}

// 缩放开始
function onResizeStart(e: MouseEvent) {
  if (isFullscreen.value) return;
  isResizing.value = true;
  resizeStartX.value = e.clientX;
  resizeStartY.value = e.clientY;
  resizeStartW.value = width.value;
  resizeStartH.value = height.value;
  e.preventDefault();
  e.stopPropagation();
}

function onMouseMove(e: MouseEvent) {
  if (isDragging.value) {
    const dx = e.clientX - dragStartX.value;
    const dy = e.clientY - dragStartY.value;
    posX.value = dragStartPosX.value + dx;
    posY.value = dragStartPosY.value + dy;
  }
  if (isResizing.value) {
    const dx = e.clientX - resizeStartX.value;
    const dy = e.clientY - resizeStartY.value;
    width.value = Math.max(400, resizeStartW.value + dx);
    height.value = Math.max(300, resizeStartH.value + dy);
  }
}

function onMouseUp() {
  isDragging.value = false;
  isResizing.value = false;
}

function toggleFullscreen() {
  if (isFullscreen.value) {
    posX.value = savedPos.value.x;
    posY.value = savedPos.value.y;
    width.value = savedPos.value.w;
    height.value = savedPos.value.h;
    isFullscreen.value = false;
  } else {
    savedPos.value = {
      x: posX.value,
      y: posY.value,
      w: width.value,
      h: height.value,
    };
    isFullscreen.value = true;
  }
}

function handleClose() {
  emit('close');
}

function handleRendered() {
  loading.value = false;
}

function handleError() {
  loading.value = false;
  error.value = true;
}

onMounted(() => {
  // 居中显示
  posX.value = Math.max(
    0,
    (window.innerWidth - width.value) / 2,
  );
  posY.value = Math.max(
    0,
    (window.innerHeight - height.value) / 2,
  );
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
});

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('mouseup', onMouseUp);
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      ref="containerRef"
      class="floating-preview"
      :style="containerStyle"
    >
      <!-- 标题栏 - 可拖拽 -->
      <div class="floating-header" @mousedown="onDragStart">
        <div class="header-title" :title="fileName">
          {{ fileName }}
        </div>
        <div class="header-actions" @mousedown.stop>
          <Button
            type="text"
            size="small"
            @click="toggleFullscreen"
          >
            <template #icon>
              <FullscreenExitOutlined v-if="isFullscreen" />
              <FullscreenOutlined v-else />
            </template>
          </Button>
          <Button
            type="text"
            size="small"
            @click="handleClose"
          >
            <template #icon>
              <CloseOutlined />
            </template>
          </Button>
        </div>
      </div>

      <!-- 内容区 -->
      <div class="floating-body">
        <Spin v-if="loading" class="loading-spin" tip="文件加载中..." />
        <div v-if="error" class="preview-error">
          文件预览失败，请检查文件格式是否正确
        </div>

        <!-- PDF 预览：使用浏览器原生 viewer，支持目录导航 -->
        <iframe
          v-if="isPdf"
          :src="fileUrl"
          class="preview-content preview-iframe"
          @load="handleRendered"
          @error="handleError"
        />

        <!-- Word 预览 -->
        <VueOfficeDocx
          v-if="isDocx"
          :src="fileUrl"
          class="preview-content"
          @rendered="handleRendered"
          @error="handleError"
        />

        <!-- 不支持的格式 -->
        <div
          v-if="!isPdf && !isDocx"
          class="preview-unsupported"
        >
          不支持预览该文件格式（{{ fileFormat }}），请下载后查看
        </div>
      </div>

      <!-- 右下角缩放手柄 -->
      <div
        v-if="!isFullscreen"
        class="resize-handle"
        @mousedown="onResizeStart"
      />
    </div>
  </Teleport>
</template>

<style scoped lang="less">
.floating-preview {
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  box-shadow: 0 6px 16px 0 rgba(0, 0, 0, 0.08),
    0 3px 6px -4px rgba(0, 0, 0, 0.12),
    0 9px 28px 8px rgba(0, 0, 0, 0.05);
  overflow: hidden;

  .floating-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: #fafafa;
    border-bottom: 1px solid #f0f0f0;
    cursor: move;
    flex-shrink: 0;
    user-select: none;

    .header-title {
      font-size: 14px;
      font-weight: 500;
      color: rgba(0, 0, 0, 0.88);
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      flex: 1;
      margin-right: 8px;
    }

    .header-actions {
      display: flex;
      gap: 4px;
      flex-shrink: 0;

      .ant-btn {
        color: #666;

        &:hover {
          color: rgba(0, 0, 0, 0.88);
          background: rgba(0, 0, 0, 0.06);
        }
      }
    }
  }

  .floating-body {
    flex: 1;
    overflow: hidden;
    position: relative;

    .loading-spin {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 1;
    }

    .preview-content {
      width: 100%;
      height: 100%;
    }

    .preview-iframe {
      border: none;
      display: block;
    }

    .preview-error {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #ff4d4f;
      font-size: 14px;
    }

    .preview-unsupported {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #999;
      font-size: 14px;
    }
  }

  .resize-handle {
    position: absolute;
    right: 0;
    bottom: 0;
    width: 16px;
    height: 16px;
    cursor: nwse-resize;
    z-index: 10;

    &::after {
      content: '';
      position: absolute;
      right: 3px;
      bottom: 3px;
      width: 8px;
      height: 8px;
      border-right: 2px solid #d9d9d9;
      border-bottom: 2px solid #d9d9d9;
    }
  }
}
</style>
