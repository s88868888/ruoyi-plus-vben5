<script setup lang="ts">
import type { VxeGridProps } from '#/adapter/vxe-table';
import type { BizPersonnel } from '#/api/resource/personnel';

import { computed, ref } from 'vue';
import { useVbenDrawer } from '@vben/common-ui';
import { getVxePopupContainer } from '@vben/utils';
import { Button, Dropdown, Menu, MenuItem, Popconfirm, Space, Tag, message } from 'ant-design-vue';
import { EllipsisOutlined, PlusOutlined } from '@ant-design/icons-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { personnelList, personnelRemove } from '#/api/resource/personnel';
import { useListTablePreference } from '#/preferences/userPreference';

import PersonnelDrawer from './personnel-drawer.vue';
import SectionTitle from './section-title.vue';
import CommonFilter from '#/components/CommonFilter/index.vue';

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

// 筛选条件数据
const filterData = ref([
  {
    field: 'name',
    label: '姓名',
    type: 'a-input',
    data: '',
    isCommon: true,
  },
  {
    field: 'gender',
    label: '性别',
    type: 'a-select',
    data: '',
    options: [
      { label: '男', value: '0' },
      { label: '女', value: '1' },
    ],
    isCommon: true,
  },
  {
    field: 'phone',
    label: '联系方式',
    type: 'a-input',
    data: '',
    isCommon: false,
  },
  {
    field: 'idCardNumber',
    label: '证件号码',
    type: 'a-input',
    data: '',
    isCommon: false,
  },
  {
    field: 'position',
    label: '职务',
    type: 'a-input',
    data: '',
    isCommon: false,
  },
  {
    field: 'status',
    label: '状态',
    type: 'a-select',
    data: '',
    options: [
      { label: '在职', value: '0' },
      { label: '离职', value: '1' },
    ],
    isCommon: false,
  },
  {
    field: 'hireDate',
    label: '入职时间',
    type: 'a-date-picker-start-end',
    data: [],
    format: 'YYYY-MM-DD',
    isCommon: false,
  },
]);

// 存储筛选条件
const searchParams = ref<Record<string, any>>({});

// 处理筛选条件变化
const handleFilterQuery = (conditions: any[]) => {
  const queryParams: Record<string, any> = {};
  conditions.forEach((item) => {
    queryParams[item.key] = item.value;
  });
  searchParams.value = queryParams;
  tableApi.query();
};

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
    { type: 'checkbox', width: 50 },
    { field: 'name', title: '姓名', minWidth: 100, headerAlign: 'left', align: 'left' },
    {
      field: 'gender',
      title: '性别',
      width: 80,
      slots: { default: 'gender' },
    },
    { field: 'idCardType', title: '证件类型', minWidth: 100, headerAlign: 'left', align: 'left' },
    { field: 'idCardNumber', title: '证件号码', minWidth: 180, headerAlign: 'left', align: 'left' },
    { field: 'phone', title: '联系方式', minWidth: 130, headerAlign: 'left', align: 'left' },
    { field: 'position', title: '职务', minWidth: 120, headerAlign: 'left', align: 'left' },
    { field: 'hireDate', title: '入职时间', minWidth: 120, headerAlign: 'left', align: 'left', formatter: ({ cellValue }: any) => cellValue ? cellValue.split(' ')[0] : '' },
    {
      field: 'status',
      title: '状态',
      width: 80,
      slots: { default: 'status' },
    },
    { field: 'createTime', title: '创建时间', minWidth: 120, headerAlign: 'left', align: 'left', formatter: ({ cellValue }: any) => cellValue ? cellValue.split(' ')[0] : '' },
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
        return await personnelList({
          pageNum: page.currentPage,
          pageSize: page.pageSize,
          deptId: props.deptId,
          ...formValues,
          ...searchParams.value,
        });
      },
    },
  },
  rowConfig: {
    keyField: 'id',
  },
  id: 'resource-personnel-index',
};

const [BasicTable, tableApi] = useVbenVxeGrid({
  gridOptions,
} as any);

// 抽屉
const [PersonnelDetailDrawer, drawerApi] = useVbenDrawer({
  connectedComponent: PersonnelDrawer,
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
function handleEdit(record: BizPersonnel) {
  drawerApi.setData({
    id: record.id,
    deptId: props.deptId,
    isEdit: true,
  });
  drawerApi.open();
}

// 删除
async function handleDelete(record: BizPersonnel) {
  if (!record.id) return;
  await personnelRemove([record.id]);
  message.success('删除成功');
  await tableApi.query();
}

// 保存成功回调
async function handleSuccess() {
  await tableApi.query();
}
</script>

<template>
  <div class="personnel-info h-full flex flex-col gap-4">
    <!-- 筛选条件区域 -->
    <div class="shrink-0 bg-white p-4 rounded shadow-sm">
      <div class="flex items-center justify-between">
        <CommonFilter
          :filter-data="filterData"
          type="both"
          @handle-query="handleFilterQuery"
        />
        <Button type="primary" @click="handleAdd">
          <PlusOutlined />
          新增人员
        </Button>
      </div>
    </div>

    <!-- 表格区域 -->
    <div class="table-style-wrapper flex-1 overflow-hidden" :style="tableCssVars">
      <BasicTable class="h-full">
        <template #table-title>
          <SectionTitle title="人员列表" />
        </template>

        <template #gender="{ row }">
          {{ row.gender === '0' ? '男' : row.gender === '1' ? '女' : '-' }}
        </template>

        <template #status="{ row }">
          <Tag :color="row.status === '0' ? 'green' : 'red'">
            {{ row.status === '0' ? '在职' : '离职' }}
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
                  <MenuItem key="delete">
                    <Popconfirm
                      :get-popup-container="getVxePopupContainer"
                      placement="left"
                      :title="`确认删除人员【${row.name}】吗？`"
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

    <PersonnelDetailDrawer @success="handleSuccess" />
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
