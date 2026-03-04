<template>
  <div ref="divRef" :style="containerStyle" />
</template>

<script setup lang="ts">
import { AiEditor } from 'aieditor';
import 'aieditor/dist/style.css';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

import { useAppConfig } from '@vben/hooks';
import { useAccessStore } from '@vben/stores';

const props = defineProps<{
  modelValue?: string;
  height?: number;
  placeholder?: string;
  chapterId?: number;
}>();

const containerStyle = computed(() => {
  const base: Record<string, string> = {
    // border: '1px solid #d9d9d9',
    borderRadius: '6px',
  };
  if (props.height) {
    base.height = `${props.height}px`;
  }
  return base;
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
  change: [value: string];
}>();

const divRef = ref<HTMLElement>();
let aiEditor: AiEditor | null = null;

const accessStore = useAccessStore();
const { clientId } = useAppConfig(import.meta.env, import.meta.env.PROD);

onMounted(() => {
  if (!divRef.value) return;

  aiEditor = new AiEditor({
    element: divRef.value,
    placeholder: props.placeholder ?? '请输入内容...',
    content: props.modelValue ?? '',
    onChange: (editor) => {
      const html = editor.getHtml();
      emit('update:modelValue', html);
      emit('change', html);
    },
    ai: {
      models: {
        custom: {
          url: '/api/bid/submission/chapter/ai/assist',
          headers: () => ({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessStore.accessToken}`,
            ClientID: clientId,
          }),
          wrapPayload: (prompt: string) => {
            const sepIdx = prompt.indexOf('||');
            const action = sepIdx > -1 ? prompt.substring(0, sepIdx) : 'polish';
            const content = sepIdx > -1 ? prompt.substring(sepIdx + 2) : prompt;
            return JSON.stringify({ action, prompt: content, chapterId: props.chapterId });
          },
          parseMessage: (chunk: string) => ({ role: 'ai', content: chunk }),
          protocol: 'sse',
        },
      },
      menus: [
        {
          icon: '',
          name: 'AI续写',
          prompt: 'continue||{content}',
          text: 'focusBefore',
          model: 'custom',
        },
        {
          icon: '',
          name: 'AI改写',
          prompt: 'rewrite||{content}',
          text: 'selected',
          model: 'custom',
        },
        {
          icon: '',
          name: 'AI扩写',
          prompt: 'expand||{content}',
          text: 'selected',
          model: 'custom',
        },
        {
          icon: '',
          name: 'AI润色',
          prompt: 'polish||{content}',
          text: 'selected',
          model: 'custom',
        },
        {
          icon: '',
          name: 'AI总结',
          prompt: 'summarize||{content}',
          text: 'selected',
          model: 'custom',
        },
        {
          icon: '',
          name: '翻译英文',
          prompt: 'translate_en||{content}',
          text: 'selected',
          model: 'custom',
        },
        {
          icon: '',
          name: '翻译中文',
          prompt: 'translate_zh||{content}',
          text: 'selected',
          model: 'custom',
        },
        {
          icon: '',
          name: 'AI校对',
          prompt: 'check||{content}',
          text: 'selected',
          model: 'custom',
        },
      ],
    },
  });
});

onUnmounted(() => {
  aiEditor?.destroy();
  aiEditor = null;
});

/** 向编辑器光标处插入 HTML 内容 */
function insertHtml(html: string) {
  if (!aiEditor) return;
  aiEditor.insert(html);
}

defineExpose({ insertHtml });

// 外部更新内容时同步到编辑器
watch(
  () => props.modelValue,
  (val) => {
    if (val !== undefined && aiEditor) {
      const current = aiEditor.getHtml();
      if (current !== val) {
        aiEditor.setContent(val);
      }
    }
  },
);
</script>

<style scoped>
:deep(.aie-container .aie-bubble-menu) {
  background-color: #fff !important;
  border-color: #e9e9e9 !important;
  color: #333 !important;
}

:deep(.aie-container .aie-bubble-menu-item svg) {
  fill: #333 !important;
}

/* AI菜单气泡（无 theme 的 tippy）- 去掉黑色背景 */
:deep(.aie-container .tippy-box:not([data-theme])),
:deep(.aie-container .tippy-box:not([data-theme]) .tippy-content) {
  background-color: #fff !important;
  color: #333 !important;
}

:deep(.aie-container .tippy-box:not([data-theme])[data-placement^='top'] .tippy-arrow:before) {
  border-top-color: #fff !important;
}

:deep(.aie-container .tippy-box:not([data-theme])[data-placement^='bottom'] .tippy-arrow:before) {
  border-bottom-color: #fff !important;
}

:deep(.aie-container .tippy-box:not([data-theme])[data-placement^='left'] .tippy-arrow:before) {
  border-left-color: #fff !important;
}

:deep(.aie-container .tippy-box:not([data-theme])[data-placement^='right'] .tippy-arrow:before) {
  border-right-color: #fff !important;
}

/* AI菜单文字乱码修复 - 补字体兜底 */
:deep(.aie-container .ai-command-container-item),
:deep(.aie-container .aie-ai-panel-footer p) {
  font-family: PingFang SC, Microsoft YaHei, Hiragino Sans GB, Arial, sans-serif !important;
}
</style>
