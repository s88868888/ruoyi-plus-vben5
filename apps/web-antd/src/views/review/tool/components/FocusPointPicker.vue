<template>
  <div class="focus-picker">
    <Select
      v-model:value="selectedStandardId"
      :options="standardOptions"
      :filter-option="filterOption"
      placeholder="请选择关注点来源"
      style="width: 100%"
      allow-clear
      show-search
      @change="onStandardChange"
    />

    <div v-if="loading" class="focus-state">
      <LoadingOutlined spin />
      <span>加载关注点...</span>
    </div>

    <div v-else-if="selectedStandardId" class="focus-box">
      <Checkbox
        :checked="allChecked"
        :indeterminate="indeterminate"
        :disabled="!focusOptions.length"
        @change="toggleAll"
      >
        全选关注点
      </Checkbox>

      <CheckboxGroup
        v-model:value="checkedValues"
        class="focus-grid"
        :options="focusOptions"
        @change="emitChange"
      />

      <Empty
        v-if="!focusOptions.length"
        :image-style="{ height: '56px' }"
        description="该来源暂无启用关注点"
      />
    </div>

    <div v-else class="focus-empty">
      选择一个已维护关注点的审核标准，文件脱敏将只定位这些关注点，不执行审核评分。
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { LoadingOutlined } from '@ant-design/icons-vue';
import { Checkbox, Empty, message, Select } from 'ant-design-vue';

import {
  reviewStandardFocusList,
  reviewStandardList,
} from '#/api/review/standard';

const CheckboxGroup = Checkbox.Group;

const props = defineProps<{
  modelValue?: string[];
  standardId?: any;
}>();

const emit = defineEmits(['update:modelValue', 'update:standardId', 'change']);

const standards = ref<{ id: any; name: string }[]>([]);
const selectedStandardId = ref<any>(props.standardId);
const loading = ref(false);
const focusItems = ref<{ keyword: string; id?: any }[]>([]);
const checkedValues = ref<string[]>(props.modelValue || []);

const standardOptions = computed(() =>
  standards.value.map((s) => ({
    label: s.name,
    value: s.id,
  })),
);

const focusOptions = computed(() =>
  focusItems.value.map((item) => ({
    label: item.keyword,
    value: item.keyword,
  })),
);

const allChecked = computed(
  () => !!focusOptions.value.length && checkedValues.value.length === focusOptions.value.length,
);
const indeterminate = computed(
  () => checkedValues.value.length > 0 && checkedValues.value.length < focusOptions.value.length,
);

watch(
  () => props.modelValue,
  (value) => {
    checkedValues.value = value || [];
  },
);
watch(
  () => props.standardId,
  (value) => {
    selectedStandardId.value = value;
  },
);

onMounted(async () => {
  try {
    const res = await reviewStandardList({ pageNum: 1, pageSize: 1000 });
    standards.value = (res.rows || []).map((r: any) => ({
      id: r.id,
      name: r.name || `标准 ${r.id}`,
    }));
  } catch (e: any) {
    message.error('加载关注点来源失败：' + (e?.message || e));
  }
});

function filterOption(input: string, option: any) {
  return String(option.label || '').toLowerCase().includes(input.toLowerCase());
}

async function onStandardChange(id: any) {
  selectedStandardId.value = id;
  focusItems.value = [];
  checkedValues.value = [];
  emitChange();
  if (!id) return;

  loading.value = true;
  try {
    const list = await reviewStandardFocusList(id);
    focusItems.value = (list || [])
      .filter((item: any) => item.status !== '1' && item.keyword)
      .map((item: any) => ({
        id: item.id,
        keyword: String(item.keyword).trim(),
      }))
      .filter((item) => item.keyword);
  } catch (e: any) {
    message.error('加载关注点失败：' + (e?.message || e));
  } finally {
    loading.value = false;
  }
}

function toggleAll(e: any) {
  checkedValues.value = e.target.checked
    ? focusOptions.value.map((item) => String(item.value))
    : [];
  emitChange();
}

function emitChange() {
  emit('update:standardId', selectedStandardId.value);
  emit('update:modelValue', checkedValues.value);
  emit('change', checkedValues.value);
}
</script>

<style scoped>
.focus-picker {
  width: 100%;
}
.focus-state,
.focus-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 140px;
  margin-top: 12px;
  color: #606266;
  font-size: 13px;
  border: 1px dashed #dcdfe6;
  border-radius: 8px;
  background: #fafafa;
}
.focus-box {
  margin-top: 12px;
  padding: 14px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: #fff;
}
.focus-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px 14px;
  margin-top: 12px;
}
.focus-grid :deep(.ant-checkbox-wrapper) {
  margin-inline-start: 0;
  min-width: 0;
}
</style>
