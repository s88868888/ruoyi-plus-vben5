<script setup lang="ts">
import type { VxeGridProps } from '#/adapter/vxe-table';

import { computed, ref } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';

import { Badge, Button, Dropdown, Menu, MenuItem, Modal, Space, message } from 'ant-design-vue';
import { EllipsisOutlined, PlusOutlined } from '@ant-design/icons-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { useListTablePreference } from '#/preferences/userPreference';
import CommonFilter from '#/components/CommonFilter/index.vue';
import PromptEditDrawer from './modules/prompt-edit-drawer.vue';
import { reviewPromptList, reviewPromptRemove } from '#/api/review/prompt';

const tablePreference = useListTablePreference();

const tableCssVars = computed(() => ({
  '--list-header-bg': tablePreference.headerBgColor,
  '--list-header-color': tablePreference.headerTextColor,
  '--list-header-padding-y': `${tablePreference.headerPaddingY}px`,
  '--list-cell-padding-y': `${tablePreference.cellPaddingY}px`,
}));

const filterData = ref([
  {
    field: 'name',
    label: '模板名称',
    type: 'a-input',
    data: '',
    isCommon: true,
  },
  {
    field: 'type',
    label: '类型编码',
    type: 'a-input',
    data: '',
    isCommon: true,
  },
  {
    field: 'status',
    label: '状态',
    type: 'a-select',
    data: '',
    options: [
      { label: '启用中', value: '0' },
      { label: '已停用', value: '1' },
    ],
    isCommon: true,
  },
]);

const searchParams = ref<Record<string, any>>({});

const handleFilterQuery = (conditions: any[]) => {
  const queryParams: Record<string, any> = {};
  conditions.forEach((item) => {
    queryParams[item.key] = item.value;
  });
  searchParams.value = queryParams;
  tableApi.query();
};

const loading = ref(false);

const gridOptions: VxeGridProps = {
  checkboxConfig: {
    highlight: true,
    reserve: true,
  },
  height: 'auto',
  columns: [
    { type: 'checkbox', width: 50 },
    {
      field: 'name',
      title: '模板名称',
      minWidth: 200,
      headerAlign: 'left',
      align: 'left',
      slots: { default: 'name' },
    },
    {
      field: 'type',
      title: '类型编码',
      width: 140,
      align: 'center',
      slots: { default: 'type' },
    },
    {
      field: 'modelName',
      title: '模型',
      width: 130,
      align: 'center',
    },
    {
      field: 'temperature',
      title: '温度',
      width: 80,
      align: 'center',
    },
    {
      field: 'status',
      title: '状态',
      width: 80,
      slots: { default: 'status' },
    },
    {
      field: 'createTime',
      title: '创建时间',
      width: 120,
      headerAlign: 'left',
      align: 'left',
    },
    {
      field: 'action',
      title: '操作',
      width: 140,
      fixed: 'right',
      slots: { default: 'action' },
    },
  ],
  keepSource: true,
  pagerConfig: {},
  proxyConfig: {
    ajax: {
      query: async ({ page }) => {
        loading.value = true;
        try {
          const res = await reviewPromptList(searchParams.value.type);
          // 前端分页（后端接口返回的是全量列表）
          const list = res || [];
          const start = (page.currentPage - 1) * page.pageSize;
          return {
            rows: list.slice(start, start + page.pageSize),
            total: list.length,
          };
        } finally {
          loading.value = false;
        }
      },
    },
  },
  rowConfig: {
    keyField: 'id',
  },
  rowClassName: 'cursor-pointer',
  id: 'review-prompt-index',
};

const [BasicTable, tableApi] = useVbenVxeGrid({
  gridOptions,
} as any);

const [EditDrawerComp, editDrawerApi] = useVbenDrawer({
  connectedComponent: PromptEditDrawer,
});

function handleAdd() {
  editDrawerApi.setData({ mode: 'add' });
  editDrawerApi.open();
}

function handleEdit(row: any) {
  editDrawerApi.setData({ mode: 'edit', record: row });
  editDrawerApi.open();
}

async function handleReload() {
  await tableApi.query();
}

function handleDelete(row: any) {
  Modal.confirm({
    title: `确认删除模板【${row.name}】吗？`,
    content: '删除后使用该模板的审核任务将回退到通用模板',
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      await reviewPromptRemove([row.id]);
      message.success('已删除');
      await tableApi.query();
    },
  });
}
</script>

<template>
  <Page :auto-content-height="true">
    <div class="flex h-full flex-col gap-4">
      <!-- 筛选条件区域 -->
      <div class="shrink-0 bg-white p-4 rounded shadow-sm">
        <div class="flex items-center justify-between">
          <CommonFilter
            :filter-data="filterData"
            type="both"
            @handle-query="handleFilterQuery"
          />
          <Space>
            <Button type="primary" @click="handleAdd">
              <PlusOutlined />
              新增提示词模板
            </Button>
          </Space>
        </div>
      </div>

      <!-- 表格区域 -->
      <div class="table-style-wrapper flex-1 overflow-hidden" :style="tableCssVars">
        <BasicTable class="h-full" table-title="提示词模板列表" :loading="loading">
          <template #name="{ row }">
            <div class="flex flex-col gap-1">
              <span class="doc-name-text cursor-pointer hover:underline" @click="handleEdit(row)">
                {{ row.name }}
              </span>
              <span v-if="row.remark" class="text-xs text-gray-400 truncate" style="max-width: 300px;">
                {{ row.remark }}
              </span>
            </div>
          </template>

          <template #type="{ row }">
            <code class="type-code">{{ row.type }}</code>
          </template>

          <template #status="{ row }">
            <Badge v-if="row.status === '0'" status="success" text="启用" />
            <Badge v-else status="default" text="已停用" />
          </template>

          <template #action="{ row }">
            <Space>
              <ghost-button @click.stop="handleEdit(row)">编辑</ghost-button>
              <Dropdown placement="bottomRight">
                <template #overlay>
                  <Menu>
                    <MenuItem key="delete" @click="handleDelete(row)">
                      <span class="text-red-500">删除</span>
                    </MenuItem>
                  </Menu>
                </template>
                <a-button size="small" type="link">
                  <EllipsisOutlined />
                </a-button>
              </Dropdown>
            </Space>
          </template>
        </BasicTable>
      </div>
    </div>
    <EditDrawerComp @reload="handleReload" />
  </Page>
</template>

<style scoped>
.doc-name-text {
  font-size: 14px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.88);
}

.type-code {
  padding: 2px 8px;
  background: #f5f5f5;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 12px;
  font-family: 'SFMono-Regular', Consolas, monospace;
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
