<!--
  基准值编辑器：内容审查的「标准值」来源。两种模式互转——
  键值对行（键|值|+/−）默认；切换「粘贴JSON」直接编辑 JSON 文本。
  对外 emit JSON 字符串（modelValue）。空则 emit ''。
-->
<template>
  <div class="ref-editor">
    <div class="ref-toolbar">
      <RadioGroup v-model:value="mode" button-style="solid" size="small" @change="onModeChange">
        <RadioButton value="kv">键值对</RadioButton>
        <RadioButton value="json">粘贴JSON</RadioButton>
      </RadioGroup>
      <span class="ref-tip">
        填写文档应符合的标准值，AI 据此判定错填/漏填（可留空，仅按规则审查）
      </span>
    </div>

    <template v-if="mode === 'kv'">
      <div v-for="(row, i) in rows" :key="i" class="ref-row">
        <Input
          v-model:value="row.k"
          placeholder="字段名，如 协议编号"
          class="ref-k"
          @change="emitKv"
        />
        <Input
          v-model:value="row.v"
          placeholder="标准值，如 XY2026001"
          class="ref-v"
          @change="emitKv"
        />
        <Button shape="circle" size="small" @click="addRow(i)">
          <template #icon><PlusOutlined /></template>
        </Button>
        <Button
          shape="circle"
          size="small"
          :disabled="rows.length === 1"
          @click="delRow(i)"
        >
          <template #icon><MinusOutlined /></template>
        </Button>
      </div>
    </template>

    <template v-else>
      <Textarea
        v-model:value="jsonText"
        :rows="8"
        placeholder='{"协议编号":"XY2026001","开户名":"张三"}'
        @change="emitJson"
      />
      <div v-if="jsonError" class="ref-err">JSON 格式有误：{{ jsonError }}</div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { MinusOutlined, PlusOutlined } from '@ant-design/icons-vue';
import { Button, Input, Radio } from 'ant-design-vue';

const RadioGroup = Radio.Group;
const RadioButton = Radio.Button;
const Textarea = Input.TextArea;

const emit = defineEmits(['update:modelValue']);

const mode = ref<'kv' | 'json'>('kv');
const rows = ref<{ k: string; v: string }[]>([{ k: '', v: '' }]);
const jsonText = ref('');
const jsonError = ref('');

function addRow(i: number) {
  rows.value.splice(i + 1, 0, { k: '', v: '' });
}
function delRow(i: number) {
  rows.value.splice(i, 1);
  emitKv();
}
function kvToObject() {
  const obj: Record<string, string> = {};
  rows.value.forEach((r) => {
    const k = (r.k || '').trim();
    if (k) obj[k] = (r.v || '').trim();
  });
  return obj;
}
function emitKv() {
  const obj = kvToObject();
  emit('update:modelValue', Object.keys(obj).length ? JSON.stringify(obj) : '');
}
function emitJson() {
  jsonError.value = '';
  const t = jsonText.value.trim();
  if (!t) {
    emit('update:modelValue', '');
    return;
  }
  try {
    JSON.parse(t);
    emit('update:modelValue', t);
  } catch (e: any) {
    jsonError.value = e.message;
  }
}
// 模式切换时把当前数据带过去，避免丢失
function onModeChange() {
  const next = mode.value;
  if (next === 'json') {
    const obj = kvToObject();
    jsonText.value = Object.keys(obj).length ? JSON.stringify(obj, null, 2) : '';
    emitJson();
  } else {
    try {
      const obj = jsonText.value.trim() ? JSON.parse(jsonText.value) : {};
      const arr = Object.keys(obj).map((k) => ({ k, v: String(obj[k]) }));
      rows.value = arr.length ? arr : [{ k: '', v: '' }];
    } catch {
      rows.value = [{ k: '', v: '' }];
    }
    emitKv();
  }
}
</script>

<style scoped>
.ref-editor {
  width: 100%;
}
.ref-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.ref-tip {
  color: #909399;
  font-size: 12px;
}
.ref-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.ref-k {
  width: 32%;
}
.ref-v {
  flex: 1;
}
.ref-err {
  color: #f56c6c;
  font-size: 12px;
  margin-top: 6px;
}
</style>
