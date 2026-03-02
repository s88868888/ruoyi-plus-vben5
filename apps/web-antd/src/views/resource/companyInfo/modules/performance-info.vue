<script setup lang="ts">
import type { VxeGridProps } from '#/adapter/vxe-table';
import type { BizPerformance } from '#/api/resource/performance';

import { computed, ref } from 'vue';
import { useVbenDrawer } from '@vben/common-ui';
import { getVxePopupContainer } from '@vben/utils';
import { Button, Dropdown, Menu, MenuItem, Popconfirm, Space, message } from 'ant-design-vue';
import { EllipsisOutlined, PlusOutlined } from '@ant-design/icons-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { performanceList, performanceRemove } from '#/api/resource/performance';
import CommonFilter from '#/components/CommonFilter/index.vue';
import { useListTablePreference } from '#/preferences/userPreference';

import PerformanceDrawer from './performance-drawer.vue';
import SectionTitle from './section-title.vue';

const props = defineProps<{
  deptId?: number;
  deptName?: string;
  readonly?: boolean;
}>();

const tablePreference = useListTablePreference();

const tableCssVars = computed(() => ({
  '--list-header-bg': tablePreference.headerBgColor,
  '--list-header-color': tablePreference.headerTextColor,
  '--list-header-padding-y': `${tablePreference.headerPaddingY}px`,
  '--list-cell-padding-y': `${tablePreference.cellPaddingY}px`,
}));

// 筛选条件配置
const filterData = ref([
  {
    field: 'name',
    label: '名称',
    type: 'a-input',
    value: '',
    isCommon: true,
  },
  {
    field: 'performanceCategory',
    label: '业绩分类',
    type: 'a-select',
    value: '',
    isCommon: false,
    options: [],
  },
  {
    field: 'bidDate',
    label: '中标日期',
    type: 'a-date-picker-start-end',
    value: { start: '', end: '' },
    isCommon: false,
  },
  {
    field: 'signingDate',
    label: '签约日期',
    type: 'a-date-picker-start-end',
    value: { start: '', end: '' },
    isCommon: false,
  },
  {
    field: 'startDate',
    label: '开工日期',
    type: 'a-date-picker-start-end',
    value: { start: '', end: '' },
    isCommon: false,
  },
  {
    field: 'completionDate',
    label: '竣工日期',
    type: 'a-date-picker-start-end',
    value: { start: '', end: '' },
    isCommon: false,
  },
  {
    field: 'contractAmount',
    label: '合同金额（元）',
    type: 'a-input-range',
    value: { start: '', end: '' },
    isCommon: false,
  },
  {
    field: 'projectManager',
    label: '项目负责人',
    type: 'a-input',
    value: '',
    isCommon: false,
  },
  {
    field: 'ownerUnitName',
    label: '业主单位名称',
    type: 'a-input',
    value: '',
    isCommon: false,
  },
  {
    field: 'projectLocation',
    label: '项目所在地',
    type: 'a-input',
    value: '',
    isCommon: false,
  },
  {
    field: 'processType',
    label: '工艺类型',
    type: 'a-select',
    value: '',
    isCommon: false,
    options: [],
  },
]);

// 搜索参数
const searchParams = ref<Record<string, any>>({});

// 处理筛选查询
function handleFilterQuery(params: Record<string, any>) {
  const processedParams: Record<string, any> = {};

  Object.keys(params).forEach((key) => {
    const value = params[key];
    if (value === undefined || value === null || value === '') return;

    if (key === 'bidDate' && value.start && value.end) {
      processedParams['params[beginBidDate]'] = value.start;
      processedParams['params[endBidDate]'] = value.end;
    } else if (key === 'signingDate' && value.start && value.end) {
      processedParams['params[beginSigningDate]'] = value.start;
      processedParams['params[endSigningDate]'] = value.end;
    } else if (key === 'startDate' && value.start && value.end) {
      processedParams['params[beginStartDate]'] = value.start;
      processedParams['params[endStartDate]'] = value.end;
    } else if (key === 'completionDate' && value.start && value.end) {
      processedParams['params[beginCompletionDate]'] = value.start;
      processedParams['params[endCompletionDate]'] = value.end;
    } else if (key === 'contractAmount' && (value.start || value.end)) {
      if (value.start) {
        processedParams['params[minContractAmount]'] = value.start;
      }
      if (value.end) {
        processedParams['params[maxContractAmount]'] = value.end;
      }
    } else {
      processedParams[key] = value;
    }
  });

  searchParams.value = processedParams;
  tableApi.query();
}

// 表格配置
const gridOptions: VxeGridProps = {
  checkboxConfig: props.readonly ? undefined : {
    highlight: true,
    reserve: true,
  },
  customConfig: {
    storage: true,
  },
  height: 500,
  columns: [
    ...(props.readonly ? [] : [{ type: 'checkbox', width: 50 }]),
    { type: 'seq', width: 60, title: '序号' },
    { field: 'name', title: '名称', minWidth: 180, headerAlign: 'left', align: 'left' },
    { field: 'performanceCategory', title: '业绩分类', minWidth: 120, headerAlign: 'left', align: 'left' },
    { field: 'bidDate', title: '中标日期', minWidth: 120, headerAlign: 'left', align: 'left' },
    { field: 'signingDate', title: '签约日期', minWidth: 120, headerAlign: 'left', align: 'left' },
    { field: 'startDate', title: '开工日期', minWidth: 120, headerAlign: 'left', align: 'left' },
    { field: 'completionDate', title: '竣工日期', minWidth: 120, headerAlign: 'left', align: 'left' },
    { field: 'contractAmount', title: '合同金额（元）', minWidth: 130, headerAlign: 'right', align: 'right' },
    { field: 'projectManager', title: '项目负责人', minWidth: 120, headerAlign: 'left', align: 'left' },
    { field: 'ownerUnitName', title: '业主单位名称', minWidth: 180, headerAlign: 'left', align: 'left' },
    { field: 'projectLocation', title: '项目所在地', minWidth: 150, headerAlign: 'left', align: 'left' },
    { field: 'processType', title: '工艺类型', minWidth: 120, headerAlign: 'left', align: 'left' },
    { field: 'projectScale', title: '工程规模', minWidth: 120, headerAlign: 'left', align: 'left' },
    { field: 'createByName', title: '创建人', width: 100, headerAlign: 'left', align: 'left' },
    { field: 'createTime', title: '创建时间', minWidth: 160, headerAlign: 'left', align: 'left' },
    ...(props.readonly ? [] : [{
      field: 'action',
      title: '操作',
      width: 120,
      fixed: 'right',
      slots: { default: 'action' },
    }]),
  ],
  keepSource: true,
  pagerConfig: {},
  proxyConfig: {
    ajax: {
      query: async ({ page }) => {
        const params: any = {
          pageNum: page.currentPage,
          pageSize: page.pageSize,
          deptId: props.deptId,
          ...searchParams.value,
        };

        return await performanceList(params);
      },
    },
  },
  rowConfig: {
    keyField: 'id',
  },
  id: 'resource-performance-index',
};

const [BasicTable, tableApi] = useVbenVxeGrid({
  gridOptions,
} as any);

// 抽屉
const [PerformanceDetailDrawer, drawerApi] = useVbenDrawer({
  connectedComponent: PerformanceDrawer,
});

// 新增
function handleAdd() {
  drawerApi.setData({
    deptId: props.deptId,
    isEdit: false,
  });
  drawerApi.open();
}

// 编辑
function handleEdit(record: BizPerformance) {
  drawerApi.setData({
    id: record.id,
    deptId: props.deptId,
    isEdit: true,
  });
  drawerApi.open();
}

// 删除
async function handleDelete(record: BizPerformance) {
  if (!record.id) return;
  await performanceRemove([record.id]);
  message.success('删除成功');
  await tableApi.query();
}

// 保存成功回调
async function handleSuccess() {
  await tableApi.query();
}
</script>

<template>
  <div class="performance-info flex flex-col gap-4 h-full overflow-hidden">
    <div class="filter-section">
      <CommonFilter :filter-data="filterData" @query="handleFilterQuery">
        <template #action>
          <Button v-if="!readonly" type="primary" @click="handleAdd">
            <PlusOutlined />
            新增案例
          </Button>
        </template>
      </CommonFilter>
    </div>

    <div class="table-style-wrapper flex-1 overflow-hidden" :style="tableCssVars">
      <BasicTable>
        <template #table-title>
          <SectionTitle title="业绩案例列表" />
        </template>

        <template #action="{ row }">
          <Space>
            <ghost-button @click.stop="handleEdit(row)">
              编辑
            </ghost-button>
            <Dropdown placement="bottomRight">
              <template #overlay>
                <Menu>
                  <MenuItem key="delete">
                    <Popconfirm
                      :get-popup-container="getVxePopupContainer"
                      placement="left"
                      :title="`确认删除案例【${row.name}】吗？`"
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

    <PerformanceDetailDrawer @reload="handleSuccess" />
  </div>
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

/* 表头上下内边距 */
.table-style-wrapper :deep(.vxe-header--column) {
  padding-top: var(--list-header-padding-y) !important;
  padding-bottom: var(--list-header-padding-y) !important;
}

/* 单元格上下内边距 */
.table-style-wrapper :deep(.vxe-body--column) {
  padding-top: var(--list-cell-padding-y) !important;
  padding-bottom: var(--list-cell-padding-y) !important;
}
</style>
