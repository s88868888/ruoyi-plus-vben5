<script setup lang="ts">
import type { VxeGridProps } from '#/adapter/vxe-table';
import type { BizQualification } from '#/api/resource/qualification';

import { computed, ref } from 'vue';
import { useVbenDrawer } from '@vben/common-ui';
import { getVxePopupContainer } from '@vben/utils';
import { Button, Dropdown, Menu, MenuItem, Popconfirm, Space, message } from 'ant-design-vue';
import { EllipsisOutlined, PlusOutlined } from '@ant-design/icons-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { qualificationList, qualificationRemove } from '#/api/resource/qualification';
import CommonFilter from '#/components/CommonFilter/index.vue';
import { useListTablePreference } from '#/preferences/userPreference';

import QualificationDrawer from './qualification-drawer.vue';
import SectionTitle from './section-title.vue';

const props = defineProps<{
  deptId?: number;
  deptName?: string;
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
    field: 'certNumber',
    label: '证书编号',
    type: 'a-input',
    value: '',
    isCommon: false,
  },
  {
    field: 'certName',
    label: '证书名称',
    type: 'a-input',
    value: '',
    isCommon: true,
  },
  {
    field: 'certCategory',
    label: '证书类别',
    type: 'a-input',
    value: '',
    isCommon: false,
  },
  {
    field: 'certStatus',
    label: '证书状态',
    type: 'a-input',
    value: '',
    isCommon: false,
  },
  {
    field: 'validStartDate',
    label: '有效期开始时间',
    type: 'a-date-picker-start-end',
    value: { start: '', end: '' },
    isCommon: false,
  },
  {
    field: 'validEndDate',
    label: '有效期结束时间',
    type: 'a-date-picker-start-end',
    value: { start: '', end: '' },
    isCommon: false,
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

    if (key === 'validStartDate' && value.start && value.end) {
      processedParams['params[beginValidStartDate]'] = value.start;
      processedParams['params[endValidStartDate]'] = value.end;
    } else if (key === 'validEndDate' && value.start && value.end) {
      processedParams['params[beginValidEndDate]'] = value.start;
      processedParams['params[endValidEndDate]'] = value.end;
    } else {
      processedParams[key] = value;
    }
  });

  searchParams.value = processedParams;
  tableApi.query();
}

// 表格配置
const gridOptions: VxeGridProps = {
  checkboxConfig: {
    highlight: true,
    reserve: true,
  },
  customConfig: {
    storage: true,
  },
  height: 'auto',
  columns: [
    { type: 'seq', width: 60, title: '序号' },
    { field: 'certNumber', title: '证书编号', minWidth: 150, headerAlign: 'left', align: 'left' },
    { field: 'certName', title: '证书名称', minWidth: 180, headerAlign: 'left', align: 'left' },
    { field: 'certStatus', title: '证书状态', width: 100, headerAlign: 'left', align: 'left' },
    { field: 'certCategory', title: '证书类别', minWidth: 120, headerAlign: 'left', align: 'left' },
    { field: 'validStartDate', title: '有效期开始时间', minWidth: 120, headerAlign: 'left', align: 'left' },
    { field: 'validEndDate', title: '有效期结束时间', minWidth: 120, headerAlign: 'left', align: 'left' },
    { field: 'createByName', title: '创建人', width: 100, headerAlign: 'left', align: 'left' },
    { field: 'createTime', title: '创建时间', minWidth: 160, headerAlign: 'left', align: 'left' },
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
        const params: any = {
          pageNum: page.currentPage,
          pageSize: page.pageSize,
          deptId: props.deptId,
          ...searchParams.value,
        };

        return await qualificationList(params);
      },
    },
  },
  rowConfig: {
    keyField: 'id',
  },
  id: 'resource-qualification-index',
};

const [BasicTable, tableApi] = useVbenVxeGrid({
  gridOptions,
} as any);

// 抽屉
const [QualificationDetailDrawer, drawerApi] = useVbenDrawer({
  connectedComponent: QualificationDrawer,
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
function handleEdit(record: BizQualification) {
  drawerApi.setData({
    id: record.id,
    deptId: props.deptId,
    isEdit: true,
  });
  drawerApi.open();
}

// 删除
async function handleDelete(record: BizQualification) {
  if (!record.id) return;
  await qualificationRemove([record.id]);
  message.success('删除成功');
  await tableApi.query();
}

// 保存成功回调
async function handleSuccess() {
  await tableApi.query();
}
</script>

<template>
  <div class="qualification-info flex flex-col gap-4 h-full overflow-hidden">
    <div class="filter-section">
      <CommonFilter :filter-data="filterData" @query="handleFilterQuery">
        <template #action>
          <Button type="primary" @click="handleAdd">
            <PlusOutlined />
            新增资质
          </Button>
        </template>
      </CommonFilter>
    </div>

    <div class="table-style-wrapper flex-1 overflow-hidden" :style="tableCssVars">
      <BasicTable>
        <template #table-title>
          <SectionTitle title="企业资质列表" />
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
                      :title="`确认删除资质【${row.certName}】吗？`"
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

    <QualificationDetailDrawer @reload="handleSuccess" />
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
