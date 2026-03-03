<template>
  <div ref="divRef" :style="containerStyle" />
</template>

<script setup lang="ts">
import { AiEditor } from 'aieditor';
import 'aieditor/dist/style.css';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

import { useAccessStore } from '@vben/stores';

const props = defineProps<{
  modelValue?: string;
  height?: number;
  placeholder?: string;
}>();

const containerStyle = computed(() => {
  const base: Record<string, string> = {
    border: '1px solid #d9d9d9',
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
          url: '/resource/bid/submission/chapter/ai/assist',
          header: () => ({
            Authorization: `Bearer ${accessStore.accessToken}`,
          }),
          wrapPayload: (prompt: string) => JSON.stringify({ prompt }),
          parseMessage: (chunk: string) => ({ role: 'ai', content: chunk }),
          protocol: 'sse',
        },
      },
      menus: [
        {
          name: 'AI续写',
          prompt: '请基于以下内容续写，保持同样的专业风格：\n{content}',
          text: 'focusBefore',
          model: 'custom',
        },
        {
          name: 'AI改写',
          prompt: '请改写以下内容，使其更加专业规范：\n{content}',
          text: 'selected',
          model: 'custom',
        },
        {
          name: 'AI扩写',
          prompt: '请扩展以下内容，添加更多专业细节：\n{content}',
          text: 'selected',
          model: 'custom',
        },
        {
          name: 'AI润色',
          prompt: '请润色以下内容，提升表达质量：\n{content}',
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
