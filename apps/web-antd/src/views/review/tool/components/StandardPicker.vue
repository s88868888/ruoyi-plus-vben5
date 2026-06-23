<!--
  标准选择器：多选审核标准 + 每个选中标准的「规则/关注要点」只读预览。
  数据：reviewStandardList（下拉）、reviewStandardRuleList/reviewStandardFocusList（预览）。emit standardIds[]。
-->
<template>
  <div class="std-picker">
    <Select
      v-model:value="selected"
      mode="multiple"
      :options="standardOptions"
      :filter-option="filterOption"
      placeholder="请选择审核标准（可多选）"
      style="width: 100%"
      max-tag-count="responsive"
      @change="onChange"
    />

    <div v-if="selected.length" class="std-preview">
      <Collapse v-model:active-key="activePanels">
        <CollapsePanel v-for="id in selected" :key="String(id)">
          <template #header>
            <span class="std-title">{{ nameOf(id) }}</span>
            <Tag class="std-cnt">规则 {{ (preview[id]?.rules || []).length }}</Tag>
            <Tag color="default" class="std-cnt">
              关注 {{ (preview[id]?.focus || []).length }}
            </Tag>
          </template>

          <div v-if="preview[id]?.loading" class="std-loading">
            <LoadingOutlined spin /><span>加载中...</span>
          </div>
          <template v-else>
            <StandardRulePreviewTable
              v-if="(preview[id]?.rules || []).length"
              :rules="preview[id].rules"
              :standard-id="id"
            />
            <Empty
              v-else
              :image-style="{ height: '50px' }"
              description="该标准暂无启用规则"
            />

            <div v-if="(preview[id]?.focus || []).length" class="focus-tags">
              <span class="focus-label">关注要点：</span>
              <Tag v-for="(f, i) in preview[id].focus" :key="i" class="focus-tag">
                {{ f.keyword }}
              </Tag>
            </div>
          </template>
        </CollapsePanel>
      </Collapse>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { LoadingOutlined } from '@ant-design/icons-vue';
import { Collapse, Empty, message, Select, Tag } from 'ant-design-vue';

import {
  reviewStandardFocusList,
  reviewStandardList,
  reviewStandardRuleList,
} from '#/api/review/standard';

import StandardRulePreviewTable from './StandardRulePreviewTable.vue';

const CollapsePanel = Collapse.Panel;

const emit = defineEmits(['update:modelValue', 'change']);

const standards = ref<{ id: any; name: string }[]>([]);
const selected = ref<any[]>([]);
const activePanels = ref<string[]>([]);
const preview = ref<Record<string, any>>({});

const standardOptions = computed(() =>
  standards.value.map((s) => ({ label: s.name, value: s.id })),
);

function filterOption(input: string, option: any) {
  return String(option.label || '').toLowerCase().includes(input.toLowerCase());
}

function nameOf(id: any) {
  return standards.value.find((s) => s.id === id)?.name || `标准 ${id}`;
}

onMounted(async () => {
  try {
    const res = await reviewStandardList({ pageNum: 1, pageSize: 1000 });
    const rows = res.rows || [];
    standards.value = rows.map((r: any) => ({
      id: r.id,
      name: r.name || `标准 ${r.id}`,
    }));
  } catch (e: any) {
    message.error('加载审核标准失败：' + (e?.message || e));
  }
});

function onChange(val: any) {
  const ids = Array.isArray(val) ? val : [];
  emit('update:modelValue', ids);
  emit('change', ids);
  ids.forEach((id) => {
    if (!preview.value[id]) loadPreview(id);
  });
}

async function loadPreview(id: any) {
  preview.value[id] = { loading: true, rules: [], focus: [] };
  try {
    const [rulesRes, focusRes] = await Promise.all([
      reviewStandardRuleList(id, { pageNum: 1, pageSize: 1000 }),
      reviewStandardFocusList(id),
    ]);
    preview.value[id] = {
      loading: false,
      rules: rulesRes.rows || [],
      focus: focusRes || [],
    };
  } catch (e: any) {
    preview.value[id] = { loading: false, rules: [], focus: [] };
    message.error('加载规则预览失败：' + (e?.message || e));
  }
}
</script>

<style scoped>
.std-preview {
  margin-top: 12px;
}
.std-title {
  font-weight: 600;
  margin-right: 10px;
}
.std-cnt {
  margin-right: 6px;
}
.std-loading {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px;
  color: #909399;
  font-size: 13px;
}
.focus-tags {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
.focus-label {
  color: #606266;
  font-size: 13px;
}
.focus-tag {
  margin: 0;
}
</style>
