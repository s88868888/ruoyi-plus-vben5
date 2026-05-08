<script setup lang="ts">
import type { VxeGridProps } from '#/adapter/vxe-table';

import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page, useVbenDrawer } from '@vben/common-ui';

import { Button, Dropdown, Menu, MenuItem, Modal, Space, Tag, message } from 'ant-design-vue';
import { EllipsisOutlined, PlusOutlined } from '@ant-design/icons-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { useListTablePreference } from '#/preferences/userPreference';
import CommonFilter from '#/components/CommonFilter/index.vue';
import CreateReviewDrawer from './modules/create-review-drawer.vue';

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
    field: 'docName',
    label: '文档名称',
    type: 'a-input',
    data: '',
    isCommon: true,
  },
  {
    field: 'docType',
    label: '文档类型',
    type: 'a-select',
    data: '',
    options: [
      { label: '合同', value: 'contract' },
      { label: '财务账单', value: 'finance' },
      { label: '表单', value: 'form' },
      { label: '标书', value: 'bid' },
    ],
    isCommon: true,
  },
  {
    field: 'status',
    label: '状态',
    type: 'a-select',
    data: '',
    options: [
      { label: '待审核', value: 'pending' },
      { label: '审核中', value: 'processing' },
      { label: '已完成', value: 'completed' },
      { label: '审核失败', value: 'failed' },
    ],
    isCommon: true,
  },
  {
    field: 'passResult',
    label: '通过状态',
    type: 'a-select',
    data: '',
    options: [
      { label: '通过', value: 'pass' },
      { label: '不通过', value: 'reject' },
      { label: '跳过', value: 'manual' },
    ],
    isCommon: true,
  },
  {
    field: 'standard',
    label: '审核标准',
    type: 'a-select',
    data: '',
    options: [
      { label: '政府采购合同标准 v2.1', value: '1' },
      { label: '企业财务报销规范 v1.3', value: '2' },
      { label: '租赁合同审核标准 v1.0', value: '3' },
      { label: '内部审批表单规范 v3.0', value: '4' },
    ],
    isCommon: true,
  },
  {
    field: 'submitTime',
    label: '提交时间',
    type: 'a-date-picker-start-end',
    data: [],
    format: 'YYYY-MM-DD',
    isCommon: false,
  },
]);

const searchParams = ref<Record<string, any>>({});

const handleFilterQuery = (conditions: any[]) => {
  const queryParams: Record<string, any> = {};
  conditions.forEach((item) => {
    if (item.key === 'dtS_submitTime') {
      queryParams.submitTimeStart = item.value;
    } else if (item.key === 'dtE_submitTime') {
      queryParams.submitTimeEnd = item.value;
    } else {
      queryParams[item.key] = item.value;
    }
  });
  searchParams.value = queryParams;
  tableApi.query();
};

const docTypeColors: Record<string, string> = {
  contract: 'blue',
  finance: 'green',
  form: 'orange',
  bid: 'purple',
};

const docTypeLabels: Record<string, string> = {
  contract: '合同',
  finance: '财务账单',
  form: '表单',
  bid: '标书',
};

const statusColors: Record<string, string> = {
  pending: 'default',
  processing: 'processing',
  completed: 'success',
  failed: 'error',
};

const statusLabels: Record<string, string> = {
  pending: '待审核',
  processing: '审核中',
  completed: '已完成',
  failed: '审核失败',
};

const passResultColors: Record<string, string> = {
  pass: 'success',
  reject: 'error',
  manual: 'warning',
};

const passResultLabels: Record<string, string> = {
  pass: '通过',
  reject: '不通过',
  manual: '跳过',
};

// Mock 数据
const mockData = [
  { id: 1, docName: 'XX市政府采购服务合同-2024.docx', docType: 'contract', standard: '政府采购合同标准 v2.1', status: 'completed', passResult: 'reject', issueCount: 7, misjudgedCount: 2, reviewVersion: 3, submitter: '李四', submitTime: '2024-12-20 14:30', reviewTime: '18秒' },
  { id: 2, docName: '2024年Q4财务报销汇总表.xlsx', docType: 'finance', standard: '企业财务报销规范 v1.3', status: 'completed', passResult: 'pass', issueCount: 3, misjudgedCount: 1, reviewVersion: 1, submitter: '王五', submitTime: '2024-12-20 13:15', reviewTime: '12秒' },
  { id: 3, docName: '项目立项审批表-智慧城市.pdf', docType: 'form', standard: '内部审批表单规范 v3.0', status: 'completed', passResult: 'reject', issueCount: 4, misjudgedCount: 0, reviewVersion: 2, submitter: '赵六', submitTime: '2024-12-20 10:00', reviewTime: '15秒' },
  { id: 4, docName: 'XX区城市更新项目可行性报告.docx', docType: 'form', standard: '项目申报材料审核标准 v1.2', status: 'processing', passResult: '', issueCount: 0, misjudgedCount: 0, reviewVersion: 1, submitter: '赵六', submitTime: '2024-12-20 09:50', reviewTime: '-' },
  { id: 5, docName: 'XX物业租赁合同-商铺A区.docx', docType: 'contract', standard: '租赁合同审核标准 v1.0', status: 'completed', passResult: 'pass', issueCount: 2, misjudgedCount: 1, reviewVersion: 2, submitter: '张三', submitTime: '2024-12-19 16:20', reviewTime: '20秒' },
  { id: 6, docName: '12月份差旅报销单-批量.zip', docType: 'finance', standard: '企业财务报销规范 v1.3', status: 'pending', passResult: '', issueCount: 0, misjudgedCount: 0, reviewVersion: 1, submitter: '李四', submitTime: '2024-12-20 15:00', reviewTime: '-' },
  { id: 7, docName: 'XX市智慧停车项目投标文件.docx', docType: 'bid', standard: '标书格式规范 v2.0', status: 'completed', passResult: 'manual', issueCount: 5, misjudgedCount: 3, reviewVersion: 4, submitter: '钱七', submitTime: '2024-12-19 11:30', reviewTime: '25秒' },
  { id: 8, docName: '物业服务合同-XX花园.docx', docType: 'contract', standard: '企业服务合同标准 v1.0', status: 'completed', passResult: 'pass', issueCount: 1, misjudgedCount: 0, reviewVersion: 1, submitter: '张三', submitTime: '2024-12-18 09:00', reviewTime: '16秒' },
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
      field: 'docName',
      title: '文档名称',
      minWidth: 350,
      headerAlign: 'left',
      align: 'left',
      slots: { default: 'docName' },
    },
    {
      field: 'standard',
      title: '审核标准',
      minWidth: 120,
      headerAlign: 'left',
      align: 'left',
    },
    {
      field: 'passResult',
      title: '通过状态',
      width: 110,
      align: 'center',
      slots: { default: 'passResult' },
    },
    {
      field: 'reviewVersion',
      title: '审核次数',
      width: 90,
      align: 'center',
      slots: { default: 'reviewVersion' },
    },
    {
      field: 'issueCount',
      title: '问题数',
      width: 90,
      align: 'center',
      slots: { default: 'issueCount' },
    },
    {
      field: 'misjudgedCount',
      title: '误判数',
      width: 90,
      align: 'center',
      slots: { default: 'misjudgedCount' },
    },
    {
      field: 'submitTime',
      title: '提交时间',
      width: 160,
      headerAlign: 'left',
      align: 'left',
    },
    {
      field: 'reviewTime',
      title: '耗时',
      width: 80,
      align: 'center',
    },
    {
      field: 'action',
      title: '操作',
      width: 120,
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
  id: 'review-task-index',
};

const [BasicTable, tableApi] = useVbenVxeGrid({
  gridOptions,
  gridEvents: {
    cellDblclick: ({ row }: any) => {
      handleView(row);
    },
  },
} as any);

// 抽屉
const [CreateDrawerComp, createDrawerApi] = useVbenDrawer({
  connectedComponent: CreateReviewDrawer,
});

function handleAdd() {
  createDrawerApi.open();
}

async function handleReload() {
  await tableApi.query();
}

function handleView(row: any) {
  if (row.docType === 'finance') {
    router.push(`/review/task/result-finance?id=${row.id}`);
  } else {
    router.push(`/review/task/result?id=${row.id}`);
  }
}

function handleDelete(row: any) {
  Modal.confirm({
    title: `确认删除审核记录【${row.docName}】吗？`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    onOk() {
      message.success('删除成功');
      tableApi.query();
    },
  });
}

function handleTransferManual(row: any) {
  Modal.confirm({
    title: `确认将【${row.docName}】转为人工审核吗？`,
    content: '转为人工审核后，将由人工审核员进行复核',
    okText: '确认',
    cancelText: '取消',
    onOk() {
      message.success('已转为人工审核');
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
              新建审核
            </Button>
          </Space>
        </div>
      </div>

      <!-- 表格区域 -->
      <div class="table-style-wrapper flex-1 overflow-hidden" :style="tableCssVars">
        <BasicTable class="h-full" table-title="审核任务列表">
          <template #docName="{ row }">
            <div class="flex flex-col gap-1">
              <div class="flex items-center gap-2">
                <span class="doc-name-text">{{ row.docName }}</span>
                <Tag :color="statusColors[row.status]" :bordered="false" class="tag-sm">
                  {{ statusLabels[row.status] || row.status }}
                </Tag>
              </div>
              <div class="flex items-center gap-1 text-xs text-gray-400">
                <Tag :color="docTypeColors[row.docType]" :bordered="false" class="tag-sm">
                  {{ docTypeLabels[row.docType] || row.docType }}
                </Tag>
                <span>{{ row.submitter }}</span>
              </div>
            </div>
          </template>

          <template #passResult="{ row }">
            <Tag v-if="row.passResult" :color="passResultColors[row.passResult]">
              {{ passResultLabels[row.passResult] || row.passResult }}
            </Tag>
            <span v-else class="text-gray-400">-</span>
          </template>

          <template #issueCount="{ row }">
            <span v-if="row.issueCount > 0" class="text-red-500">
              <span class="text-base font-semibold">{{ row.issueCount }}</span>
              <span class="text-xs font-normal ml-0.5">个</span>
            </span>
            <span v-else-if="row.status === 'completed'" class="text-green-500 font-semibold">
              无
            </span>
            <span v-else class="text-gray-400">-</span>
          </template>

          <template #misjudgedCount="{ row }">
            <span v-if="row.misjudgedCount > 0" class="misjudged-count">
              <span class="text-base font-semibold">{{ row.misjudgedCount }}</span>
              <span class="text-xs font-normal ml-0.5">个</span>
            </span>
            <span v-else-if="row.status === 'completed'" class="text-gray-300">0</span>
            <span v-else class="text-gray-400">-</span>
          </template>

          <template #reviewVersion="{ row }">
            <span v-if="row.reviewVersion > 1" class="text-black">
              <span class="text-base font-semibold">{{ row.reviewVersion }}</span>
              <span class="text-xs font-normal text-gray-400 ml-0.5">次</span>
            </span>
            <span v-else class="text-gray-400">
              <span class="text-base">{{ row.reviewVersion }}</span>
              <span class="text-xs ml-0.5">次</span>
            </span>
          </template>

          <template #action="{ row }">
            <Space>
              <ghost-button v-if="row.status === 'completed'" @click.stop="handleView(row)">
                查看
              </ghost-button>
              <Dropdown placement="bottomRight">
                <template #overlay>
                  <Menu @click="({ key }: any) => { if (key === 'delete') handleDelete(row); if (key === 'manual') handleTransferManual(row); }">
                    <MenuItem v-if="row.status === 'completed' && row.passResult !== 'manual'" key="manual">
                      转人工审核
                    </MenuItem>
                    <MenuItem key="delete">
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
    <CreateDrawerComp @reload="handleReload" />
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

.misjudged-count {
  color: #8c8c8c;
}
</style>
