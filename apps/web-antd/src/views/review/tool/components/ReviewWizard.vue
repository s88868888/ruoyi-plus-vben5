<!--
  通用步骤条壳：antd Steps + 内容插槽 + 底部上一步/下一步/完成。
  - props.steps: [{title, description?}]
  - v-model:current 当前步索引
  - props.nextDisabled: 父级按当前步数据控制能否进入下一步
  - props.finishText: 动作步主按钮文案；点击 emit finish
  - 默认插槽暴露 { current }，父级按 current v-show 各步内容
-->
<template>
  <div class="review-wizard">
    <Steps :current="current" class="wiz-steps" :items="stepItems" />

    <div class="wiz-body">
      <slot :current="current" />
    </div>

    <div class="wiz-footer">
      <Button v-if="current > 0 && current <= actionIdx && !hideBack" @click="prev">
        上一步
      </Button>
      <Button
        v-if="current < actionIdx"
        type="primary"
        :disabled="nextDisabled"
        @click="next"
      >
        下一步
      </Button>
      <Button
        v-else-if="current === actionIdx"
        type="primary"
        :disabled="nextDisabled"
        :loading="finishLoading"
        @click="$emit('finish')"
      >
        {{ finishText }}
      </Button>
      <Button v-else-if="showRestart" @click="$emit('restart')">
        {{ restartText }}
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Button, Steps } from 'ant-design-vue';

interface StepDef {
  title: string;
  description?: string;
}

const props = defineProps<{
  steps: StepDef[];
  current?: number;
  nextDisabled?: boolean;
  finishText?: string;
  finishLoading?: boolean;
  hideBack?: boolean;
  // 主按钮在该步变「完成」并 emit finish（默认最后一步）。其后步骤为结果展示步。
  actionStep?: number;
  showRestart?: boolean;
  restartText?: string;
}>();

const emit = defineEmits(['update:current', 'finish', 'restart']);

const current = computed(() => props.current ?? 0);
const finishText = computed(() => props.finishText ?? '开始');
const restartText = computed(() => props.restartText ?? '重新开始');
const stepItems = computed(() =>
  props.steps.map((s) => ({ title: s.title, description: s.description })),
);
const actionIdx = computed(() =>
  props.actionStep != null && props.actionStep >= 0
    ? props.actionStep
    : props.steps.length - 1,
);

function next() {
  if (current.value < actionIdx.value) emit('update:current', current.value + 1);
}
function prev() {
  if (current.value > 0) emit('update:current', current.value - 1);
}
</script>

<style scoped>
.review-wizard {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.wiz-steps {
  margin: 8px 0 24px;
  flex-shrink: 0;
}
.wiz-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  padding: 8px 4px 20px;
}
.wiz-footer {
  display: flex;
  justify-content: center;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
  flex-shrink: 0;
}
</style>
