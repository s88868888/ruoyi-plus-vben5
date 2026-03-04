<script setup lang="ts">
import type { VxeGridProps } from '#/adapter/vxe-table';
import type { BizQualification } from '#/api/resource/qualification';

import { computed, ref } from 'vue';
import { useVbenDrawer } from '@vben/common-ui';
import { Button, Dropdown, Menu, MenuItem, Modal, Space, message } from 'ant-design-vue';
import { EllipsisOutlined, PlusOutlined } from '@ant-design/icons-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { qualificationList, qualificationRemove } from '#/api/resource/qualification';
import CommonFilter from '#/components/CommonFilter/index.vue';
import { useListTablePreference } from '#/preferences/userPreference';

import { qualificationCertCategoryOptions, qualificationCertStatusOptions, qualificationIssuingAuthorityOptions } from './common-options';
import QualificationDrawer from './qualification-drawer.vue';
import SectionTitle from './section-title.vue';

const props = withDefaults(defineProps<{
  deptId?: number;
  deptName?: string;
  readonly?: boolean;
  autoHeight?: boolean;
}>(), {
  autoHeight: false,
});

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
    field: 'certName',
    label: '证书名称',
    type: 'a-input',
    data: '',
    isCommon: true,
  },
  {
    field: 'certCategory',
    label: '证书类别',
    type: 'a-select',
    data: '',
    isCommon: true,
    options: qualificationCertCategoryOptions,
  },
  {
    field: 'certNumber',
    label: '证书编号',
    type: 'a-input',
    data: '',
    isCommon: false,
  },
  {
    field: 'certStatus',
    label: '证书状态',
    type: 'a-select',
    data: '',
    isCommon: false,
    options: qualificationCertStatusOptions,
  },
  {
    field: 'issuingAuthority',
    label: '发证机关',
    type: 'a-select',
    data: '',
    isCommon: false,
    options: qualificationIssuingAuthorityOptions,
  },
  {
    field: 'validStartDate',
    label: '有效期开始时间',
    type: 'a-date-picker-start-end',
    data: [],
    isCommon: false,
  },
  {
    field: 'validEndDate',
    label: '有效期结束时间',
    type: 'a-date-picker-start-end',
    data: [],
    isCommon: false,
  },
]);

// 搜索参数
const searchParams = ref<Record<string, any>>({});

// 日期范围字段映射
const dateRangeMapping: Record<string, string> = {
  validStartDateStart: 'params[beginValidStartDate]',
  validStartDateEnd: 'params[endValidStartDate]',
  validEndDateStart: 'params[beginValidEndDate]',
  validEndDateEnd: 'params[endValidEndDate]',
};

// 处理筛选查询
function handleFilterQuery(conditions: any[]) {
  const queryParams: Record<string, any> = {};
  conditions.forEach(({ key, value }) => {
    queryParams[dateRangeMapping[key] || key] = value;
  });
  searchParams.value = queryParams;
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
  height: props.autoHeight ? 'auto' : 500,
  columns: [
    ...(props.readonly ? [] : [{ type: 'checkbox', width: 50 }]),
    { type: 'seq', width: 60, title: '序号' },
    { field: 'certNumber', title: '证书编号', minWidth: 150, headerAlign: 'left', align: 'left' },
    { field: 'certName', title: '证书名称', minWidth: 180, headerAlign: 'left', align: 'left' },
    { field: 'certStatus', title: '证书状态', width: 100, headerAlign: 'left', align: 'left' },
    { field: 'certCategory', title: '证书类别', minWidth: 120, headerAlign: 'left', align: 'left' },
    { field: 'validStartDate', title: '有效期开始时间', minWidth: 120, headerAlign: 'left', align: 'left' },
    { field: 'validEndDate', title: '有效期结束时间', minWidth: 120, headerAlign: 'left', align: 'left' },
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
function handleDelete(record: BizQualification) {
  if (!record.id) return;
  Modal.confirm({
    title: `确认删除资质【${record.certName}】吗？`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      await qualificationRemove([record.id!]);
      message.success('删除成功');
      await tableApi.query();
    },
  });
}

// 保存成功回调
async function handleSuccess() {
  await tableApi.query();
}
</script>

<template>
  <div class="qualification-info flex flex-col gap-4 h-full overflow-hidden">
    <div class="filter-section">
      <div class="flex items-center justify-between">
        <CommonFilter
          :filter-data="filterData"
          type="both"
          @handle-query="handleFilterQuery"
        />
        <Button v-if="!readonly" type="primary" @click="handleAdd">
          <PlusOutlined />
          新增资质
        </Button>
      </div>
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
                <Menu @click="({ key }: any) => { if (key === 'delete') handleDelete(row); }">
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
