<script setup lang="ts">
import type { VxeGridProps } from '#/adapter/vxe-table';

import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page, useVbenDrawer } from '@vben/common-ui';

import { Button, Dropdown, Menu, MenuItem, Modal, Space, Tag, Badge, message } from 'ant-design-vue';
import { EllipsisOutlined, PlusOutlined } from '@ant-design/icons-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { useListTablePreference } from '#/preferences/userPreference';
import CommonFilter from '#/components/CommonFilter/index.vue';
import AddStandardDrawer from './modules/add-standard-drawer.vue';

const router = useRouter();
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
    label: '规范名称',
    type: 'a-input',
    data: '',
    isCommon: true,
  },
  {
    field: 'type',
    label: '类型',
    type: 'a-select',
    data: '',
    options: [
      { label: '合同类', value: 'contract' },
      { label: '财务类', value: 'finance' },
      { label: '表单类', value: 'form' },
      { label: '标书类', value: 'bid' },
      { label: '通用', value: 'universal' },
    ],
    isCommon: true,
  },
  {
    field: 'status',
    label: '状态',
    type: 'a-select',
    data: '',
    options: [
      { label: '启用中', value: 'active' },
      { label: '已废止', value: 'disabled' },
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

const typeMap: Record<string, { label: string; color: string }> = {
  contract: { label: '合同类', color: 'blue' },
  finance: { label: '财务类', color: 'green' },
  form: { label: '表单类', color: 'orange' },
  bid: { label: '标书类', color: 'purple' },
  universal: { label: '通用', color: 'cyan' },
};

// Mock 数据
const mockData = [
  { id: 1, name: '政府采购合同审核标准', version: 'v2.1', type: 'contract', ruleCount: 38, usageCount: 56, status: 'active', updateTime: '2024-12-15' },
  { id: 2, name: '企业财务报销规范', version: 'v1.3', type: 'finance', ruleCount: 25, usageCount: 134, status: 'active', updateTime: '2024-12-10' },
  { id: 3, name: '合同通用条款检查', version: 'v3.0', type: 'contract', ruleCount: 15, usageCount: 89, status: 'active', updateTime: '2024-11-20' },
  { id: 4, name: '内部审批表单规范', version: 'v3.0', type: 'form', ruleCount: 20, usageCount: 67, status: 'active', updateTime: '2024-11-15' },
  { id: 5, name: '租赁合同审核标准', version: 'v1.0', type: 'contract', ruleCount: 32, usageCount: 42, status: 'active', updateTime: '2024-12-01' },
  { id: 6, name: '标书格式规范', version: 'v2.0', type: 'bid', ruleCount: 28, usageCount: 22, status: 'active', updateTime: '2024-10-20' },
  { id: 7, name: '企业服务合同标准', version: 'v1.0', type: 'contract', ruleCount: 18, usageCount: 42, status: 'active', updateTime: '2024-09-10' },
  { id: 8, name: '通用规范（违规/敏感词/格式）', version: 'v4.0', type: 'universal', ruleCount: 12, usageCount: 300, status: 'active', updateTime: '2024-12-18' },
];

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
      title: '规范名称',
      minWidth: 260,
      headerAlign: 'left',
      align: 'left',
      slots: { default: 'name' },
    },
    {
      field: 'ruleCount',
      title: '规则数',
      width: 90,
      align: 'center',
      slots: { default: 'ruleCount' },
    },
    {
      field: 'usageCount',
      title: '使用次数',
      width: 100,
      align: 'center',
      slots: { default: 'usageCount' },
    },
    {
      field: 'status',
      title: '状态',
      width: 80,
      slots: { default: 'status' },
    },
    {
      field: 'updateTime',
      title: '更新时间',
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
        const start = (page.currentPage - 1) * page.pageSize;
        const end = start + page.pageSize;
        return {
          rows: mockData.slice(start, end),
          total: mockData.length,
        };
      },
    },
  },
  rowConfig: {
    keyField: 'id',
  },
  rowClassName: 'cursor-pointer',
  id: 'review-standard-index',
};

const [BasicTable, tableApi] = useVbenVxeGrid({
  gridOptions,
  gridEvents: {
    cellDblclick: ({ row }: any) => {
      handleViewDetail(row);
    },
  },
} as any);

// 新增抽屉
const [AddDrawerComp, addDrawerApi] = useVbenDrawer({
  connectedComponent: AddStandardDrawer,
});

function handleAdd() {
  addDrawerApi.open();
}

async function handleReload() {
  await tableApi.query();
}

function handleViewDetail(row: any) {
  router.push(`/review/standard/detail?id=${row.id}`);
}

function handleDisable(row: any) {
  Modal.confirm({
    title: `确认废止规范【${row.name}】吗？`,
    content: '废止后该规范将不再用于新的审核任务',
    okText: '废止',
    okType: 'danger',
    cancelText: '取消',
    onOk() {
      message.success('已废止');
      tableApi.query();
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
              新增审核标准
            </Button>
          </Space>
        </div>
      </div>

      <!-- 表格区域 -->
      <div class="table-style-wrapper flex-1 overflow-hidden" :style="tableCssVars">
        <BasicTable class="h-full" table-title="规范库列表">
          <template #name="{ row }">
            <div class="flex flex-col gap-1">
              <div class="flex items-center gap-2">
                <span
                  class="doc-name-text cursor-pointer hover:underline"
                  @click="handleViewDetail(row)"
                >{{ row.name }}</span>
                <span class="text-xs text-gray-400">{{ row.version }}</span>
              </div>
              <div class="flex items-center gap-1">
                <Tag :color="typeMap[row.type]?.color" :bordered="false" class="tag-sm">
                  {{ typeMap[row.type]?.label || row.type }}
                </Tag>
              </div>
            </div>
          </template>

          <template #ruleCount="{ row }">
            <span class="text-blue-500 font-semibold">{{ row.ruleCount }}</span>
          </template>

          <template #usageCount="{ row }">
            <span class="text-gray-600">{{ row.usageCount }}次</span>
          </template>

          <template #status="{ row }">
            <Badge v-if="row.status === 'active'" status="success" text="启用" />
            <Badge v-else status="default" text="已废止" />
          </template>

          <template #action="{ row }">
            <Space>
              <ghost-button @click.stop="handleViewDetail(row)">
                查看规则
              </ghost-button>
              <Dropdown placement="bottomRight">
                <template #overlay>
                  <Menu>
                    <MenuItem key="edit" @click="handleViewDetail(row)">
                      编辑
                    </MenuItem>
                    <MenuItem key="disable" @click="handleDisable(row)">
                      <span class="text-red-500">废止</span>
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
    <AddDrawerComp @reload="handleReload" />
  </Page>
</template>

<style scoped>
.doc-name-text {
  font-size: 14px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.88);
}

.tag-sm {
  font-size: 11px !important;
  padding: 0 4px !important;
  line-height: 18px !important;
  margin-inline-end: 0 !important;
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
