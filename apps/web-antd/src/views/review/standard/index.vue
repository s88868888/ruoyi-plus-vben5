<script setup lang="ts">
import type { VxeGridProps } from '#/adapter/vxe-table';

import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page, useVbenDrawer } from '@vben/common-ui';

import { Badge, Button, Dropdown, Menu, MenuItem, Modal, Space, Tag } from 'ant-design-vue';
import { EllipsisOutlined, PlusOutlined, ThunderboltOutlined } from '@ant-design/icons-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { useListTablePreference } from '#/preferences/userPreference';
import CommonFilter from '#/components/CommonFilter/index.vue';
import AddStandardManualDrawer from './modules/add-standard-manual-drawer.vue';
import AddStandardDrawer from './modules/add-standard-drawer.vue';
import EditStandardDrawer from './modules/edit-standard-drawer.vue';
import { reviewStandardList, reviewStandardRemove } from '#/api/review/standard';

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
    field: 'isSystem',
    label: '是否通用',
    type: 'a-select',
    data: '',
    options: [
      { label: '通用', value: '1' },
      { label: '专用', value: '0' },
    ],
    isCommon: true,
  },
  {
    field: 'status',
    label: '状态',
    type: 'a-select',
    data: '',
    options: [
      { label: '启用中', value: '0' },
      { label: '已废止', value: '1' },
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
      field: 'promptTemplateName',
      title: '角色身份',
      minWidth: 160,
      headerAlign: 'left',
      align: 'left',
      slots: { default: 'roleIdentity' },
    },
    {
      field: 'useCount',
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
      field: 'updateByName',
      title: '更新人',
      width: 100,
      align: 'center',
    },
    {
      field: 'updateTime',
      title: '更新时间',
      width: 150,
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
          const params = {
            pageNum: page.currentPage,
            pageSize: page.pageSize,
            ...searchParams.value,
          };
          return await reviewStandardList(params);
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

// 手动新增抽屉（仅基本信息）
const [ManualAddDrawerComp, manualAddDrawerApi] = useVbenDrawer({
  connectedComponent: AddStandardManualDrawer,
});

// 智能解析抽屉（上传文档 AI 抽取规则）
const [AddDrawerComp, addDrawerApi] = useVbenDrawer({
  connectedComponent: AddStandardDrawer,
});

// 编辑抽屉
const [EditDrawerComp, editDrawerApi] = useVbenDrawer({
  connectedComponent: EditStandardDrawer,
});

function handleManualAdd() {
  manualAddDrawerApi.open();
}

function handleSmartParse() {
  addDrawerApi.open();
}

async function handleReload() {
  await tableApi.query();
}

function handleViewDetail(row: any) {
  router.push(`/review/standard/detail?id=${row.id}`);
}

function handleEdit(row: any) {
  editDrawerApi.setData({ id: row.id });
  editDrawerApi.open();
}

function handleDisable(row: any) {
  Modal.confirm({
    title: `确认废止规范【${row.name}】吗？`,
    content: '废止后该规范将不再用于新的审核任务',
    okText: '废止',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      await reviewStandardRemove([row.id]);
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
            <Button @click="handleManualAdd">
              <PlusOutlined />
              手动新增审核标准
            </Button>
            <Button type="primary" @click="handleSmartParse">
              <ThunderboltOutlined />
              智能解析
            </Button>
          </Space>
        </div>
      </div>

      <!-- 表格区域 -->
      <div class="table-style-wrapper flex-1 overflow-hidden" :style="tableCssVars">
        <BasicTable class="h-full" table-title="规范库列表" :loading="loading">
          <template #name="{ row }">
            <div class="flex flex-col gap-1">
              <div class="flex items-center gap-2">
                <span
                  class="doc-name-text cursor-pointer hover:underline"
                  @click="handleViewDetail(row)"
                >{{ row.name }}</span>
                <Tag v-if="row.isSystem === '1'" color="purple" class="m-0">通用</Tag>
                <Tag v-else color="default" class="m-0">专用</Tag>
              </div>
              <div v-if="row.description" class="text-xs text-gray-400 truncate">
                {{ row.description }}
              </div>
            </div>
          </template>

          <template #roleIdentity="{ row }">
            <Tag v-if="row.promptTemplateName" color="blue" class="m-0">
              {{ row.promptTemplateName }}
            </Tag>
            <Tag v-else color="default" class="m-0">未设角色</Tag>
          </template>

          <template #ruleCount="{ row }">
            <span class="text-blue-500 font-semibold"><span class="text-base">{{ row.ruleCount }}</span><span class="text-xs ml-0.5">条</span></span>
          </template>

          <template #usageCount="{ row }">
            <span class="text-gray-600"><span class="text-base font-semibold">{{ row.useCount ?? 0 }}</span><span class="text-xs ml-0.5">次</span></span>
          </template>

          <template #status="{ row }">
            <Badge v-if="row.status === '0'" status="success" text="启用" />
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
                    <MenuItem key="edit" @click="handleEdit(row)">
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
    <ManualAddDrawerComp @reload="handleReload" />
    <AddDrawerComp @reload="handleReload" />
    <EditDrawerComp @reload="handleReload" />
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
