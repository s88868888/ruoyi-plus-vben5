<script setup lang="ts">
import type { VxeGridProps } from '#/adapter/vxe-table';

import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page, useVbenDrawer } from '@vben/common-ui';

import { Badge, Button, Dropdown, Menu, MenuItem, Modal, Space, Tag, message } from 'ant-design-vue';
import { EllipsisOutlined, PlusOutlined } from '@ant-design/icons-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { useListTablePreference } from '#/preferences/userPreference';
import CommonFilter from '#/components/CommonFilter/index.vue';
import AddKnowledgeDrawer from './modules/add-knowledge-drawer.vue';

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
    label: '知识库名称',
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
      { label: '综合类', value: 'general' },
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
      { label: '已停用', value: 'disabled' },
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
  general: { label: '综合类', color: 'cyan' },
};

const mockData = [
  { id: 1, name: '政府采购合同案例库', type: 'contract', caseCount: 128, patternCount: 23, accuracy: 95, linkedStandardCount: 2, status: 'active', updateTime: '2024-12-18', description: '政府采购服务、货物合同的历史审核案例及常见问题模式' },
  { id: 2, name: '合同纠纷判例库', type: 'contract', caseCount: 86, patternCount: 15, accuracy: 91, linkedStandardCount: 1, status: 'active', updateTime: '2024-12-15', description: '合同纠纷相关判例，用于增强违约、争议条款的审核能力' },
  { id: 3, name: '财政审计问题库', type: 'finance', caseCount: 42, patternCount: 8, accuracy: 88, linkedStandardCount: 1, status: 'active', updateTime: '2024-12-10', description: '财政审计中发现的常见问题及整改案例' },
  { id: 4, name: '企业服务合同案例库', type: 'contract', caseCount: 64, patternCount: 12, accuracy: 87, linkedStandardCount: 0, status: 'active', updateTime: '2024-11-28', description: '企业服务外包、咨询服务合同审核案例' },
  { id: 5, name: '物业租赁合同案例库', type: 'contract', caseCount: 53, patternCount: 9, accuracy: 90, linkedStandardCount: 1, status: 'active', updateTime: '2024-11-20', description: '物业租赁合同的历史审核案例，含租金、押金、维修条款等' },
  { id: 6, name: '劳动合同合规案例库', type: 'general', caseCount: 71, patternCount: 18, accuracy: 93, linkedStandardCount: 0, status: 'active', updateTime: '2024-11-15', description: '劳动合同合规审查相关案例，涵盖社保、工时、解除条件等' },
  { id: 7, name: '标书格式规范案例库', type: 'bid', caseCount: 35, patternCount: 6, accuracy: 82, linkedStandardCount: 1, status: 'active', updateTime: '2024-10-20', description: '投标文件格式审查案例' },
  { id: 8, name: '旧版财务报销库（已废弃）', type: 'finance', caseCount: 20, patternCount: 3, accuracy: 75, linkedStandardCount: 0, status: 'disabled', updateTime: '2024-06-01', description: '旧版报销规范案例，已被新规范替代' },
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
      title: '知识库名称',
      minWidth: 280,
      headerAlign: 'left',
      align: 'left',
      slots: { default: 'name' },
    },
    {
      field: 'caseCount',
      title: '案例数',
      width: 90,
      align: 'center',
      slots: { default: 'caseCount' },
    },
    {
      field: 'patternCount',
      title: '模式数',
      width: 90,
      align: 'center',
      slots: { default: 'patternCount' },
    },
    {
      field: 'accuracy',
      title: '准确率',
      width: 90,
      align: 'center',
      slots: { default: 'accuracy' },
    },
    {
      field: 'linkedStandardCount',
      title: '关联标准',
      width: 100,
      align: 'center',
      slots: { default: 'linkedStandard' },
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
  id: 'review-knowledge-index',
};

const [BasicTable, tableApi] = useVbenVxeGrid({
  gridOptions,
  gridEvents: {
    cellDblclick: ({ row }: any) => {
      handleViewDetail(row);
    },
  },
} as any);

const [AddDrawerComp, addDrawerApi] = useVbenDrawer({
  connectedComponent: AddKnowledgeDrawer,
});

function handleAdd() {
  addDrawerApi.open();
}

async function handleReload() {
  await tableApi.query();
}

function handleViewDetail(row: any) {
  router.push(`/review/knowledge/detail?id=${row.id}`);
}

function handleDisable(row: any) {
  Modal.confirm({
    title: `确认停用知识库【${row.name}】吗？`,
    content: '停用后关联的审核标准将不再使用该知识库进行增强',
    okText: '停用',
    okType: 'danger',
    cancelText: '取消',
    onOk() {
      message.success('已停用');
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
              新建知识库
            </Button>
          </Space>
        </div>
      </div>

      <!-- 表格区域 -->
      <div class="table-style-wrapper flex-1 overflow-hidden" :style="tableCssVars">
        <BasicTable class="h-full" table-title="知识库列表">
          <template #name="{ row }">
            <div class="flex flex-col gap-1">
              <div class="flex items-center gap-2">
                <span
                  class="doc-name-text cursor-pointer hover:underline"
                  @click="handleViewDetail(row)"
                >{{ row.name }}</span>
              </div>
              <div class="flex items-center gap-1">
                <Tag :color="typeMap[row.type]?.color" :bordered="false" class="tag-sm">
                  {{ typeMap[row.type]?.label || row.type }}
                </Tag>
                <span class="text-xs text-gray-400 truncate" style="max-width: 240px;">{{ row.description }}</span>
              </div>
            </div>
          </template>

          <template #caseCount="{ row }">
            <span class="text-gray-900 font-semibold"><span class="text-base">{{ row.caseCount }}</span><span class="text-xs ml-0.5">条</span></span>
          </template>

          <template #patternCount="{ row }">
            <span class="text-gray-900 font-semibold"><span class="text-base">{{ row.patternCount }}</span><span class="text-xs ml-0.5">个</span></span>
          </template>

          <template #accuracy="{ row }">
            <span
              class="font-semibold"
              :style="{ color: row.accuracy >= 90 ? '#52c41a' : row.accuracy >= 80 ? '#faad14' : '#ff4d4f' }"
            >{{ row.accuracy }}%</span>
          </template>

          <template #linkedStandard="{ row }">
            <span v-if="row.linkedStandardCount > 0" class="text-blue-500"><span class="text-base font-semibold">{{ row.linkedStandardCount }}</span><span class="text-xs ml-0.5">个</span></span>
            <span v-else class="text-gray-400">未关联</span>
          </template>

          <template #status="{ row }">
            <Badge v-if="row.status === 'active'" status="success" text="启用" />
            <Badge v-else status="default" text="已停用" />
          </template>

          <template #action="{ row }">
            <Space>
              <ghost-button @click.stop="handleViewDetail(row)">
                查看详情
              </ghost-button>
              <Dropdown placement="bottomRight">
                <template #overlay>
                  <Menu>
                    <MenuItem key="edit" @click="handleViewDetail(row)">
                      编辑
                    </MenuItem>
                    <MenuItem key="disable" @click="handleDisable(row)">
                      <span class="text-red-500">停用</span>
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
