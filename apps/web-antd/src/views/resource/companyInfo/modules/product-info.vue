<script setup lang="ts">
import type { VxeGridProps } from '#/adapter/vxe-table';
import type { BizProduct } from '#/api/resource/product';

import { computed, ref } from 'vue';
import { useVbenDrawer } from '@vben/common-ui';
import { getVxePopupContainer } from '@vben/utils';
import { Button, Dropdown, Menu, MenuItem, Popconfirm, Space, message } from 'ant-design-vue';
import { EllipsisOutlined, PlusOutlined } from '@ant-design/icons-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { productList, productRemove } from '#/api/resource/product';
import { useListTablePreference } from '#/preferences/userPreference';

import ProductDrawer from './product-drawer.vue';
import SectionTitle from './section-title.vue';
import CommonFilter from '#/components/CommonFilter/index.vue';

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

// 筛选条件数据
const filterData = ref([
  {
    field: 'productName',
    label: '产品名称',
    type: 'a-input',
    data: '',
    isCommon: true,
  },
  {
    field: 'productCategory',
    label: '产品分类',
    type: 'a-input',
    data: '',
    isCommon: true,
  },
  {
    field: 'productModel',
    label: '产品型号',
    type: 'a-input',
    data: '',
    isCommon: false,
  },
  {
    field: 'hasPurchaseContract',
    label: '是否有购买合同',
    type: 'a-select',
    data: '',
    options: [
      { label: '是', value: '1' },
      { label: '否', value: '0' },
    ],
    isCommon: false,
  },
  {
    field: 'useStartDate',
    label: '投入使用开始时间',
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
    { field: 'productName', title: '产品名称', minWidth: 150, headerAlign: 'left', align: 'left' },
    { field: 'productModel', title: '产品型号', minWidth: 120, headerAlign: 'left', align: 'left' },
    { field: 'productCategory', title: '产品分类', minWidth: 120, headerAlign: 'left', align: 'left' },
    { field: 'quantity', title: '数量', width: 100, align: 'right', headerAlign: 'right' },
    { field: 'useStartDate', title: '投入使用开始时间', minWidth: 120, headerAlign: 'left', align: 'left' },
    { field: 'useEndDate', title: '投入使用结束时间', minWidth: 120, headerAlign: 'left', align: 'left' },
    {
      field: 'hasPurchaseContract',
      title: '是否有购买合同',
      width: 130,
      slots: { default: 'hasPurchaseContract' },
    },
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
      query: async ({ page }, formValues = {}) => {
        return await productList({
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
  id: 'resource-product-index',
};

const [BasicTable, tableApi] = useVbenVxeGrid({
  gridOptions,
} as any);

// 抽屉
const [ProductDetailDrawer, drawerApi] = useVbenDrawer({
  connectedComponent: ProductDrawer,
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
function handleEdit(record: BizProduct) {
  drawerApi.setData({
    id: record.id,
    deptId: props.deptId,
    isEdit: true,
  });
  drawerApi.open();
}

// 删除
async function handleDelete(record: BizProduct) {
  if (!record.id) return;
  await productRemove([record.id]);
  message.success('删除成功');
  await tableApi.query();
}

// 保存成功回调
async function handleSuccess() {
  await tableApi.query();
}
</script>

<template>
  <div class="product-info h-full flex flex-col gap-4">
    <!-- 筛选条件区域 -->
    <div class="shrink-0 bg-white p-4 rounded shadow-sm">
      <div class="flex items-center justify-between">
        <CommonFilter
          :filter-data="filterData"
          type="both"
          @handle-query="handleFilterQuery"
        />
        <Button v-if="!readonly" type="primary" @click="handleAdd">
          <PlusOutlined />
          新增产品
        </Button>
      </div>
    </div>

    <!-- 表格区域 -->
    <div class="table-style-wrapper flex-1 overflow-hidden" :style="tableCssVars">
      <BasicTable class="h-full">
        <template #table-title>
          <SectionTitle title="产品列表" />
        </template>

        <template #hasPurchaseContract="{ row }">
          {{ row.hasPurchaseContract === '1' ? '是' : '否' }}
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
                      :title="`确认删除产品【${row.productName}】吗？`"
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

    <ProductDetailDrawer @reload="handleSuccess" />
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
