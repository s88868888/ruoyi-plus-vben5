<script setup lang="ts">
import type { VxeGridProps } from '#/adapter/vxe-table';
import type { BizBidProject } from '#/api/bid/project';

import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { getVxePopupContainer } from '@vben/utils';
import { Button, Dropdown, Menu, MenuItem, Popconfirm, Progress, Space, Tag, message } from 'ant-design-vue';
import { EllipsisOutlined, PlusOutlined } from '@ant-design/icons-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { bidProjectList, bidProjectRemove } from '#/api/bid/project';
import { useListTablePreference } from '#/preferences/userPreference';

import BidProjectDrawer from './modules/bid-project-three-step-drawer.vue';
import CommonFilter from '#/components/CommonFilter/index.vue';


const router = useRouter();
const tablePreference = useListTablePreference();

const tableCssVars = computed(() => ({
  '--list-header-bg': tablePreference.headerBgColor,
  '--list-header-color': tablePreference.headerTextColor,
  '--list-header-padding-y': `${tablePreference.headerPaddingY}px`,
  '--list-cell-padding-y': `${tablePreference.cellPaddingY}px`,
}));

// 筛选条件数据
const filterData = ref([
  {
    field: 'projectName',
    label: '项目名称',
    type: 'a-input',
    data: '',
    isCommon: true,
  },
  {
    field: 'bidOrg',
    label: '招标单位',
    type: 'a-input',
    data: '',
    isCommon: false,
  },
  {
    field: 'projectType',
    label: '项目类型',
    type: 'a-select',
    data: '',
    options: [
      { label: '工程', value: 'engineering' },
      { label: '货物', value: 'goods' },
      { label: '服务', value: 'service' },
    ],
    isCommon: true,
  },
  {
    field: 'status',
    label: '状态',
    type: 'a-select',
    data: '',
    options: [
      { label: '跟进中', value: 'following' },
      { label: '已投标', value: 'bid' },
      { label: '已中标', value: 'won' },
      { label: '未中标', value: 'lost' },
      { label: '已放弃', value: 'abandoned' },
    ],
    isCommon: true,
  },
  {
    field: 'publishDate',
    label: '发布日期',
    type: 'a-date-picker-start-end',
    data: [],
    format: 'YYYY-MM-DD',
    isCommon: true,
  },
  {
    field: 'deadline',
    label: '截止日期',
    type: 'a-date-picker-start-end',
    data: [],
    format: 'YYYY-MM-DD',
    isCommon: false,
  },
  {
    field: 'budgetAmount',
    label: '预算金额(万元)',
    type: 'a-input-range',
    data: { start: '', end: '' },
    isCommon: false,
  },
  {
    field: 'matchDegree',
    label: '契合度',
    type: 'a-select',
    data: '',
    options: [
      { label: '90%以上', value: '90' },
      { label: '70%-90%', value: '70' },
      { label: '50%-70%', value: '50' },
      { label: '50%以下', value: '0' },
    ],
    isCommon: false,
  },
]);

// 存储筛选条件
const searchParams = ref<Record<string, any>>({});

// 处理筛选条件变化
const handleFilterQuery = (conditions: any[]) => {
  const queryParams: Record<string, any> = {};
  conditions.forEach((item) => {
    // 处理特殊字段映射
    if (item.key === 'dtS_publishDate') {
      queryParams.publishDateStart = item.value;
    } else if (item.key === 'dtE_publishDate') {
      queryParams.publishDateEnd = item.value;
    } else if (item.key === 'dtS_deadline') {
      queryParams.deadlineStart = item.value;
    } else if (item.key === 'dtE_deadline') {
      queryParams.deadlineEnd = item.value;
    } else {
      queryParams[item.key] = item.value;
    }
  });
  searchParams.value = queryParams;
  tableApi.query();
};

// 项目类型标签颜色
const projectTypeColors: Record<string, string> = {
  engineering: 'blue',
  goods: 'green',
  service: 'orange',
};

// 项目类型标签文本
const projectTypeLabels: Record<string, string> = {
  engineering: '工程',
  goods: '货物',
  service: '服务',
};

// 招标方式标签文本
const bidMethodLabels: Record<string, string> = {
  public: '公开招标',
  invite: '邀请招标',
  competitive: '竞争性谈判',
  inquiry: '询价采购',
  single: '单一来源',
};

// 状态标签颜色
const statusColors: Record<string, string> = {
  following: 'processing',
  bid: 'warning',
  won: 'success',
  lost: 'error',
  abandoned: 'default',
};

// 状态标签文本
const statusLabels: Record<string, string> = {
  following: '跟进中',
  bid: '已投标',
  won: '已中标',
  lost: '未中标',
  abandoned: '已放弃',
};

// 表格配置
const gridOptions: VxeGridProps = {
  checkboxConfig: {
    highlight: true,
    reserve: true,
  },
  height: 'auto',
  columns: [
    { type: 'checkbox', width: 50 },
    {
      field: 'projectName',
      title: '项目名称',
      minWidth: 200,
      headerAlign: 'left',
      align: 'left',
      slots: { default: 'projectName' },
    },
    { field: 'bidOrg', title: '招标单位', minWidth: 180, headerAlign: 'left', align: 'left' },
    {
      field: 'projectType',
      title: '项目类型',
      width: 100,
      slots: { default: 'projectType' },
    },
    {
      field: 'bidMethod',
      title: '招标方式',
      width: 120,
      headerAlign: 'left',
      align: 'left',
      slots: { default: 'bidMethod' },
    },
    {
      field: 'budgetAmount',
      title: '预算金额(万元)',
      width: 130,
      align: 'right',
      headerAlign: 'right',
      formatter: ({ cellValue }: any) => cellValue ? `¥${cellValue}` : '-',
    },
    {
      field: 'publishDate',
      title: '发布日期',
      width: 120,
      headerAlign: 'left',
      align: 'left',
      formatter: ({ cellValue }: any) => cellValue?.split(' ')[0] || '-',
    },
    {
      field: 'deadline',
      title: '截止日期',
      width: 120,
      headerAlign: 'left',
      align: 'left',
      formatter: ({ cellValue }: any) => cellValue?.split(' ')[0] || '-',
    },
    {
      field: 'matchDegree',
      title: '契合度',
      width: 120,
      slots: { default: 'matchDegree' },
    },
    {
      field: 'status',
      title: '状态',
      width: 100,
      slots: { default: 'status' },
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
      query: async ({ page }, formValues = {}) => {
        const { dateRange, ...rest } = formValues;
        const params: any = {
          pageNum: page.currentPage,
          pageSize: page.pageSize,
          ...rest,
          ...searchParams.value,
        };
        if (dateRange && dateRange.length === 2) {
          params.publishDate = dateRange[0];
          params.deadline = dateRange[1];
        }
        return await bidProjectList(params);
      },
    },
  },
  rowConfig: {
    keyField: 'id',
  },
  id: 'bid-project-index',
};

const [BasicTable, tableApi] = useVbenVxeGrid({
  gridOptions,
} as any);

// 抽屉
const [BidProjectDetailDrawer, drawerApi] = useVbenDrawer({
  connectedComponent: BidProjectDrawer,
});

// 新增
function handleAdd() {
  drawerApi.setData({
    isEdit: false,
  });
  drawerApi.open();
}

// 编辑
function handleEdit(record: BizBidProject) {
  drawerApi.setData({
    id: record.id,
    isEdit: true,
  });
  drawerApi.open();
}

// 查看
function handleView(record: BizBidProject) {

  console.log(record);
  
  // 跳转到详情页
  router.push(`/bid/project/detail/${record.id}`);
}

// 删除
async function handleDelete(record: BizBidProject) {
  if (!record.id) return;
  await bidProjectRemove([record.id]);
  message.success('删除成功');
  await tableApi.query();
}

// 保存成功回调
async function handleSuccess() {
  await tableApi.query();
}
</script>

<template>
  <Page :auto-content-height="true">
    <div class="flex h-full flex-col gap-4">
      <!-- 筛选条件区域 -->
      <div class="shrink-0 bg-white p-4 rounded shadow-sm">
        <div class="flex items-center justify-between" >
          <CommonFilter
            :filter-data="filterData"
            type="both"
            @handle-query="handleFilterQuery"
          />
          <Button type="primary" @click="handleAdd">
            <PlusOutlined />
            新增
          </Button>
        </div>
      </div>

      <!-- 表格区域 -->
      <div class="table-style-wrapper flex-1 overflow-hidden" :style="tableCssVars">
        <BasicTable
          class="h-full"
          table-title="招标项目列表"
        >
        <template #projectName="{ row }">
          <div class="flex flex-col">
            <span class="font-bold">{{ row.projectName }}</span>
            <span
              v-if="row.projectDesc"
              class="text-xs text-gray-400 overflow-hidden text-ellipsis whitespace-nowrap"
              :title="row.projectDesc"
            >
              {{ row.projectDesc }}
            </span>
          </div>
        </template>

        <template #projectType="{ row }">
          <Tag :color="projectTypeColors[row.projectType]">
            {{ projectTypeLabels[row.projectType] || row.projectType }}
          </Tag>
        </template>

        <template #bidMethod="{ row }">
          <span v-if="row.bidMethod">
            {{ bidMethodLabels[row.bidMethod] || row.bidMethod }}
          </span>
          <span v-else class="text-gray-400">-</span>
        </template>

        <template #matchDegree="{ row }">
          <Progress
            :percent="row.matchDegree || 0"
            :stroke-color="{
              '0%': '#108ee9',
              '100%': '#87d068',
            }"
            :style="{ width: '80px' }"
          />
        </template>

        <template #status="{ row }">
          <Tag :color="statusColors[row.status]">
            {{ statusLabels[row.status] || row.status }}
          </Tag>
        </template>

        <template #action="{ row }">
          <Space>
            <ghost-button @click.stop="handleEdit(row)">
              编辑
            </ghost-button>
            <Dropdown placement="bottomRight">
              <template #overlay>
                <Menu>
                  <MenuItem key="view" @click="handleView(row)">
                    查看
                  </MenuItem>
                  <MenuItem key="delete">
                    <Popconfirm
                      :get-popup-container="getVxePopupContainer"
                      placement="left"
                      :title="`确认删除项目【${row.projectName}】吗？`"
                      @confirm="handleDelete(row)"
                    >
                      <span class="text-red-500">删除</span>
                    </Popconfirm>
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
    <BidProjectDetailDrawer @reload="handleSuccess" />
  </Page>
</template>

<style scoped>
/* 表头背景色 */
.table-style-wrapper :deep(.vxe-table--header-wrapper),
.table-style-wrapper :deep(.vxe-header--column) {
  background-color: var(--list-header-bg) !important;
}

/* 表头文字颜色 */
.table-style-wrapper :deep(.vxe-header--column .vxe-cell) {
  color: var(--list-header-color) !important;
}

/* 表头上下内边距（作用于 th 元素） */
.table-style-wrapper :deep(.vxe-header--column) {
  padding-top: var(--list-header-padding-y) !important;
  padding-bottom: var(--list-header-padding-y) !important;
}

/* 单元格上下内边距（作用于 td 元素） */
.table-style-wrapper :deep(.vxe-body--column) {
  padding-top: var(--list-cell-padding-y) !important;
  padding-bottom: var(--list-cell-padding-y) !important;
}
</style>
