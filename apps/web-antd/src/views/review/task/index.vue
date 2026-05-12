<script setup lang="ts">
import type { VxeGridProps } from '#/adapter/vxe-table';

import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page, useVbenDrawer } from '@vben/common-ui';

import { Button, Dropdown, Menu, MenuItem, Modal, Space, Tag, Tooltip, message } from 'ant-design-vue';
import { EllipsisOutlined, PlusOutlined } from '@ant-design/icons-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { useListTablePreference } from '#/preferences/userPreference';
import CommonFilter from '#/components/CommonFilter/index.vue';
import CreateReviewDrawer from './modules/create-review-drawer.vue';
import { reviewTaskList, reviewTaskRemove, reviewTaskExecute } from '#/api/review/task';
import { DictEnum } from '@vben/constants';
import { getDictOptions } from '#/utils/dict';
import { renderDict } from '#/utils/render';

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
    options: getDictOptions(DictEnum.REVIEW_TASK_TYPE),
    isCommon: true,
  },
  {
    field: 'status',
    label: '状态',
    type: 'a-select',
    data: '',
    options: getDictOptions(DictEnum.REVIEW_TASK_STATUS),
    isCommon: true,
  },
  {
    field: 'passResult',
    label: '通过状态',
    type: 'a-select',
    data: '',
    options: getDictOptions(DictEnum.REVIEW_PASS_STATUS),
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

const taskTypeOptions = getDictOptions(DictEnum.REVIEW_TASK_TYPE);
const taskStatusOptions = getDictOptions(DictEnum.REVIEW_TASK_STATUS);
const passStatusOptions = getDictOptions(DictEnum.REVIEW_PASS_STATUS);

function getDictLabel(options: any[], value: string) {
  const item = options.find((o: any) => o.value === value);
  return item?.label || value;
}

function tooltipDotStyle(color: string) {
  return {
    display: 'inline-block',
    width: '8px',
    height: '8px',
    marginRight: '6px',
    borderRadius: '50%',
    backgroundColor: color,
  };
}

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
      field: 'docName',
      title: '文档名称',
      minWidth: 350,
      headerAlign: 'left',
      align: 'left',
      slots: { default: 'docName' },
    },
    {
      field: 'standardNames',
      title: '审核标准',
      minWidth: 120,
      headerAlign: 'left',
      align: 'left',
    },
    {
      field: 'passStatus',
      title: '通过状态',
      width: 110,
      align: 'center',
      slots: { default: 'passResult' },
    },
    {
      field: 'version',
      title: '审核次数',
      width: 90,
      align: 'center',
      slots: { default: 'reviewVersion' },
    },
    {
      field: 'errorCount',
      title: '问题数',
      width: 160,
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
      field: 'createTime',
      title: '提交时间',
      width: 160,
      headerAlign: 'left',
      align: 'left',
    },
    {
      field: 'reviewDuration',
      title: '耗时',
      width: 80,
      align: 'center',
      slots: { default: 'reviewTime' },
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
        loading.value = true;
        try {
          const params = {
            pageNum: page.currentPage,
            pageSize: page.pageSize,
            ...searchParams.value,
          };
          return await reviewTaskList(params);
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
    title: `确认删除审核记录【${row.taskName}】吗？`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      await reviewTaskRemove([row.id]);
      message.success('删除成功');
      await tableApi.query();
    },
  });
}

function handleExecute(row: any) {
  Modal.confirm({
    title: `确认执行审核【${row.taskName}】吗？`,
    okText: '确认',
    cancelText: '取消',
    async onOk() {
      await reviewTaskExecute(row.id);
      // message.success('审核任务已提交执行');
      await tableApi.query();
    },
  });
}

function handleTransferManual(row: any) {
  Modal.confirm({
    title: `确认将【${row.taskName}】转为人工审核吗？`,
    content: '转为人工审核后，将由人工审核员进行复核',
    okText: '确认',
    cancelText: '取消',
    onOk() {
      // message.success('已转为人工审核');
      tableApi.query();
    },
  });
}

function handleRerun(row: any) {
  Modal.confirm({
    title: `确认重新审核【${row.taskName}】吗？`,
    content: '将清除当前审核结果并重新执行AI审核',
    okText: '确认',
    cancelText: '取消',
    async onOk() {
      await reviewTaskExecute(row.id);
      message.success('已重新提交审核');
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
              新建审核
            </Button>
          </Space>
        </div>
      </div>

      <!-- 表格区域 -->
      <div class="table-style-wrapper flex-1 overflow-hidden" :style="tableCssVars">
        <BasicTable class="h-full" table-title="审核任务列表" :loading="loading">
          <template #docName="{ row }">
            <div class="flex flex-col gap-1">
              <div class="flex items-center gap-2">
                <span class="doc-name-text">{{ row.taskName }}</span>
                <component :is="renderDict(row.status, DictEnum.REVIEW_TASK_STATUS)" />
              </div>
              <div class="flex items-center gap-1 text-xs text-gray-400">
                <component :is="renderDict(row.taskType, DictEnum.REVIEW_TASK_TYPE)" />
              </div>
            </div>
          </template>

          <template #passResult="{ row }">
            <component v-if="row.passStatus" :is="renderDict(row.passStatus, DictEnum.REVIEW_PASS_STATUS)" />
            <span v-else class="text-gray-400">-</span>
          </template>

          <template #issueCount="{ row }">
            <Tooltip
              v-if="(row.errorCount || 0) + (row.warningCount || 0) + (row.infoCount || 0) > 0"
              placement="top"
            >
              <template #title>
                <div>
                  <div><span :style="tooltipDotStyle('#ff4d4f')" />严重：{{ row.errorCount || 0 }}</div>
                  <div><span :style="tooltipDotStyle('#faad14')" />警告：{{ row.warningCount || 0 }}</div>
                  <div><span :style="tooltipDotStyle('#1677ff')" />提示：{{ row.infoCount || 0 }}</div>
                </div>
              </template>
              <span class="issue-dots">
                <span v-if="(row.errorCount || 0) > 0" class="issue-dot issue-dot-error">
                  <span class="issue-dot-num">{{ row.errorCount }}</span>
                </span>
                <span v-if="(row.warningCount || 0) > 0" class="issue-dot issue-dot-warning">
                  <span class="issue-dot-num">{{ row.warningCount }}</span>
                </span>
                <span v-if="(row.infoCount || 0) > 0" class="issue-dot issue-dot-info">
                  <span class="issue-dot-num">{{ row.infoCount }}</span>
                </span>
              </span>
            </Tooltip>
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
            <span v-if="(row.version || 0) > 1" class="text-black">
              <span class="text-base font-semibold">{{ row.version }}</span>
              <span class="text-xs font-normal text-gray-400 ml-0.5">次</span>
            </span>
            <span v-else class="text-gray-400">
              <span class="text-base">{{ row.version || '-' }}</span>
              <span v-if="row.version" class="text-xs ml-0.5">次</span>
            </span>
          </template>

          <template #reviewTime="{ row }">
            <span v-if="row.reviewDuration" class="text-gray-600">
              {{ row.reviewDuration >= 1000 ? (row.reviewDuration / 1000).toFixed(1) + 's' : row.reviewDuration + 'ms' }}
            </span>
            <span v-else class="text-gray-400">-</span>
          </template>

          <template #action="{ row }">
            <Space>
              <ghost-button v-if="row.status === 'completed'" @click.stop="handleView(row)">
                查看
              </ghost-button>
              <ghost-button v-if="row.status === 'pending'" @click.stop="handleExecute(row)">
                执行审核
              </ghost-button>
              <Dropdown placement="bottomRight">
                <template #overlay>
                  <Menu @click="({ key }: any) => { if (key === 'delete') handleDelete(row); if (key === 'manual') handleTransferManual(row); if (key === 'rerun') handleRerun(row); }">
                    <MenuItem v-if="row.status === 'completed' || row.status === 'failed'" key="rerun">
                      重新审核
                    </MenuItem>
                    <MenuItem v-if="row.status === 'completed' && row.passStatus !== 'manual'" key="manual">
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

.issue-dots {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.issue-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 11px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  line-height: 1;
}

.issue-dot-error {
  background-color: #ff4d4f;
}

.issue-dot-warning {
  background-color: #faad14;
}

.issue-dot-info {
  background-color: #1677ff;
}

.issue-dot-num {
  line-height: 1;
}
</style>
