<script setup lang="ts">
import type { VxeGridProps } from '#/adapter/vxe-table';
import type { BizCompetitor } from '#/api/resource/competitor';

import { computed, ref } from 'vue';
import { useVbenDrawer } from '@vben/common-ui';
import { Button, Dropdown, Menu, MenuItem, Modal, Space, Tag, message } from 'ant-design-vue';
import { EllipsisOutlined, PlusOutlined } from '@ant-design/icons-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { competitorList, competitorRemove } from '#/api/resource/competitor';
import CommonFilter from '#/components/CommonFilter/index.vue';
import { useListTablePreference } from '#/preferences/userPreference';

import { competitorLevelOptions, competitorCompanyTypeOptions } from './common-options';
import CompetitorDrawer from './competitor-drawer.vue';
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
    field: 'companyName',
    label: '公司名称',
    type: 'a-input',
    data: '',
    isCommon: true,
  },
  {
    field: 'companyType',
    label: '公司类型',
    type: 'a-select',
    data: '',
    isCommon: true,
    options: competitorCompanyTypeOptions,
  },
  {
    field: 'competitorLevel',
    label: '竞争级别',
    type: 'a-select',
    data: '',
    isCommon: true,
    options: competitorLevelOptions,
  },
  {
    field: 'province',
    label: '所在省份',
    type: 'a-input',
    data: '',
    isCommon: false,
  },
]);

// 搜索参数
const searchParams = ref<Record<string, any>>({});

// 处理筛选查询
function handleFilterQuery(conditions: any[]) {
  const queryParams: Record<string, any> = {};
  conditions.forEach(({ key, value }) => {
    queryParams[key] = value;
  });
  searchParams.value = queryParams;
  tableApi.query();
}

// 竞争级别颜色映射
const levelColorMap: Record<string, string> = {
  '强': 'red',
  '中': 'orange',
  '弱': 'green',
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
    { field: 'companyName', title: '公司名称', minWidth: 200, headerAlign: 'left', align: 'left' },
    { field: 'companyType', title: '公司类型', width: 110, headerAlign: 'left', align: 'left' },
    {
      field: 'competitorLevel',
      title: '竞争级别',
      width: 100,
      slots: { default: 'competitorLevel' },
    },
    { field: 'businessScope', title: '主营业务', minWidth: 180, headerAlign: 'left', align: 'left' },
    { field: 'province', title: '所在省份', width: 110, headerAlign: 'left', align: 'left' },
    { field: 'city', title: '所在城市', width: 110, headerAlign: 'left', align: 'left' },
    { field: 'registeredCapital', title: '注册资本（万元）', minWidth: 140, headerAlign: 'right', align: 'right' },
    { field: 'contactPerson', title: '联系人', width: 100, headerAlign: 'left', align: 'left' },
    { field: 'contactPhone', title: '联系电话', minWidth: 130, headerAlign: 'left', align: 'left' },
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

        return await competitorList(params);
      },
    },
  },
  rowConfig: {
    keyField: 'id',
  },
  id: 'resource-competitor-index',
};

const [BasicTable, tableApi] = useVbenVxeGrid({
  gridOptions,
} as any);

// 抽屉
const [CompetitorDetailDrawer, drawerApi] = useVbenDrawer({
  connectedComponent: CompetitorDrawer,
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
function handleEdit(record: BizCompetitor) {
  drawerApi.setData({
    id: record.id,
    deptId: props.deptId,
    isEdit: true,
  });
  drawerApi.open();
}

// 删除
function handleDelete(record: BizCompetitor) {
  if (!record.id) return;
  Modal.confirm({
    title: `确认删除竞争公司【${record.companyName}】吗？`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      await competitorRemove([record.id!]);
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
  <div class="competitor-info flex flex-col gap-4 h-full overflow-hidden">
    <div class="filter-section">
      <div class="flex items-center justify-between">
        <CommonFilter
          :filter-data="filterData"
          type="both"
          @handle-query="handleFilterQuery"
        />
        <Button v-if="!readonly" type="primary" @click="handleAdd">
          <PlusOutlined />
          新增竞争公司
        </Button>
      </div>
    </div>

    <div class="table-style-wrapper flex-1 overflow-hidden" :style="tableCssVars">
      <BasicTable>
        <template #table-title>
          <SectionTitle title="竞争公司列表" />
        </template>

        <template #competitorLevel="{ row }">
          <Tag v-if="row.competitorLevel" :color="levelColorMap[row.competitorLevel] || 'default'">
            {{ row.competitorLevel }}
          </Tag>
          <span v-else>-</span>
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

    <CompetitorDetailDrawer @reload="handleSuccess" />
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
