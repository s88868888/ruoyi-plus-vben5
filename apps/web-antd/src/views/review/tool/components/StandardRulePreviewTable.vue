<template>
  <div class="table-style-wrapper rule-preview-table" :style="tableCssVars">
    <RuleTable>
      <template #severity="{ row }">
        <Tag :color="sevColor(row.severity)">
          {{ sevLabel(row.severity) }}
        </Tag>
      </template>
    </RuleTable>
  </div>
</template>

<script setup lang="ts">
import type { VxeGridProps } from '#/adapter/vxe-table';

import { computed, onMounted, watch } from 'vue';

import { Tag } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { useListTablePreference } from '#/preferences/userPreference';

const props = defineProps<{
  rules: any[];
  standardId: number | string;
}>();

const tablePreference = useListTablePreference();
const tableCssVars = computed(() => ({
  '--list-header-bg': tablePreference.headerBgColor,
  '--list-header-color': tablePreference.headerTextColor,
  '--list-header-padding-y': `${tablePreference.headerPaddingY}px`,
  '--list-cell-padding-y': `${tablePreference.cellPaddingY}px`,
}));

const sevMap: Record<string, { label: string; color: string }> = {
  must: { label: '严重', color: 'error' },
  should: { label: '警告', color: 'warning' },
  suggest: { label: '提示', color: 'processing' },
  error: { label: '严重', color: 'error' },
  warning: { label: '警告', color: 'warning' },
  info: { label: '提示', color: 'processing' },
};
const sevLabel = (s: string) => sevMap[(s || '').toLowerCase()]?.label || s || '-';
const sevColor = (s: string) =>
  sevMap[(s || '').toLowerCase()]?.color || 'default';

const gridOptions: VxeGridProps = {
  maxHeight: 320,
  columns: [
    { type: 'seq', title: '#', width: 60, align: 'center' },
    {
      field: 'content',
      title: '规则内容',
      minWidth: 300,
      headerAlign: 'left',
      align: 'left',
    },
    {
      field: 'severity',
      title: '严重程度',
      width: 110,
      align: 'center',
      slots: { default: 'severity' },
    },
  ],
  keepSource: true,
  toolbarConfig: { enabled: false },
  pagerConfig: { enabled: false },
  proxyConfig: {
    ajax: {
      query: async () => {
        const rows = props.rules || [];
        return { rows, total: rows.length };
      },
    },
  },
  rowConfig: {
    keyField: 'id',
    isHover: true,
  },
  id: `review-tool-standard-rules-${props.standardId}`,
};

const [RuleTable, tableApi] = useVbenVxeGrid({ gridOptions } as any);

onMounted(() => {
  tableApi.reload();
});

watch(
  () => props.rules,
  () => {
    tableApi.reload();
  },
  { deep: true },
);
</script>

<style scoped>
.rule-preview-table {
  width: 100%;
}

.table-style-wrapper :deep(.vxe-table--header-wrapper),
.table-style-wrapper :deep(.vxe-header--column) {
  background-color: var(--list-header-bg) !important;
}

.table-style-wrapper :deep(.vxe-header--column .vxe-cell) {
  color: var(--list-header-color) !important;
}

.table-style-wrapper :deep(.vxe-header--column) {
  padding-top: var(--list-header-padding-y) !important;
  padding-bottom: var(--list-header-padding-y) !important;
}

.table-style-wrapper :deep(.vxe-body--column) {
  padding-top: var(--list-cell-padding-y) !important;
  padding-bottom: var(--list-cell-padding-y) !important;
}
</style>
