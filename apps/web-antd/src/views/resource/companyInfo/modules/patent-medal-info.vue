<script setup lang="ts">
import type { VxeGridProps } from '#/adapter/vxe-table';
import type { BizPatentMedal } from '#/api/resource/patent-medal';

import { computed, ref } from 'vue';
import { useVbenDrawer } from '@vben/common-ui';
import { getVxePopupContainer } from '@vben/utils';
import { Button, Dropdown, Menu, MenuItem, Popconfirm, Space, Tag, message } from 'ant-design-vue';
import { EllipsisOutlined, PlusOutlined } from '@ant-design/icons-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { patentMedalList, patentMedalRemove } from '#/api/resource/patent-medal';
import CommonFilter from '#/components/CommonFilter/index.vue';
import { useListTablePreference } from '#/preferences/userPreference';

import PatentMedalDrawer from '../../patent-medal/modules/patent-medal-drawer.vue';
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
    field: 'patentName',
    label: '专利名称',
    type: 'a-input',
    value: '',
    isCommon: true,
  },
  {
    field: 'patentType',
    label: '专利类型',
    type: 'a-select',
    value: '',
    isCommon: false,
    options: [
      { label: '发明专利', value: '1' },
      { label: '实用新型专利', value: '2' },
      { label: '外观设计专利', value: '3' },
    ],
  },
  {
    field: 'status',
    label: '状态',
    type: 'a-select',
    value: '',
    isCommon: false,
    options: [
      { label: '有效', value: '0' },
      { label: '无效', value: '1' },
    ],
  },
  {
    field: 'patentNumber',
    label: '专利号',
    type: 'a-input',
    value: '',
    isCommon: false,
  },
  {
    field: 'authorizationDate',
    label: '授权公告日',
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

    if (key === 'authorizationDate' && value.start && value.end) {
      processedParams['params[beginAuthorizationDate]'] = value.start;
      processedParams['params[endAuthorizationDate]'] = value.end;
    } else {
      processedParams[key] = value;
    }
  });

  searchParams.value = processedParams;
  tableApi.query();
}

// 专利类型映射
const patentTypeMap: Record<string, string> = {
  '1': '发明专利',
  '2': '实用新型专利',
  '3': '外观设计专利',
};

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
    { field: 'patentName', title: '专利名称', minWidth: 200, headerAlign: 'left', align: 'left' },
    {
      field: 'patentType',
      title: '专利类型',
      width: 140,
      headerAlign: 'left',
      align: 'left',
      formatter: ({ cellValue }) => patentTypeMap[cellValue] || cellValue,
    },
    { field: 'patentNumber', title: '专利号', minWidth: 180, headerAlign: 'left', align: 'left' },
    { field: 'authorizationDate', title: '授权公告日', width: 120, headerAlign: 'left', align: 'left' },
    { field: 'patentee', title: '专利权人', minWidth: 150, headerAlign: 'left', align: 'left' },
    {
      field: 'status',
      title: '状态',
      width: 80,
      slots: { default: 'status' },
    },
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

        return await patentMedalList(params);
      },
    },
  },
  rowConfig: {
    keyField: 'id',
  },
  id: 'resource-patent-medal-index',
};

const [BasicTable, tableApi] = useVbenVxeGrid({
  gridOptions,
} as any);

// 抽屉
const [PatentMedalDetailDrawer, drawerApi] = useVbenDrawer({
  connectedComponent: PatentMedalDrawer,
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
function handleEdit(record: BizPatentMedal) {
  drawerApi.setData({
    id: record.id,
    deptId: props.deptId,
    isEdit: true,
  });
  drawerApi.open();
}

// 删除
async function handleDelete(record: BizPatentMedal) {
  if (!record.id) return;
  await patentMedalRemove([record.id]);
  message.success('删除成功');
  await tableApi.query();
}

// 保存成功回调
async function handleSuccess() {
  await tableApi.query();
}
</script>

<template>
  <div class="patent-medal-info flex flex-col gap-4 h-full overflow-hidden">
    <div class="filter-section">
      <CommonFilter :filter-data="filterData" @query="handleFilterQuery">
        <template #action>
          <Button v-if="!readonly" type="primary" @click="handleAdd">
            <PlusOutlined />
            新增专利
          </Button>
        </template>
      </CommonFilter>
    </div>

    <div class="table-style-wrapper flex-1 overflow-hidden" :style="tableCssVars">
      <BasicTable>
        <template #table-title>
          <SectionTitle title="专利奖章列表" />
        </template>

        <template #status="{ row }">
          <Tag :color="row.status === '0' ? 'green' : 'red'">
            {{ row.status === '0' ? '有效' : '无效' }}
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
                      :title="`确认删除专利【${row.patentName}】吗？`"
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

    <PatentMedalDetailDrawer @reload="handleSuccess" />
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
