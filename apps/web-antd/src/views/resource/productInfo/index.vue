<script setup lang="ts">
import type { VbenFormProps } from '@vben/common-ui';
import type { VxeGridProps } from '#/adapter/vxe-table';
import type { BizProduct } from '#/api/resource/product';

import { useVbenDrawer } from '@vben/common-ui';
import { getVxePopupContainer } from '@vben/utils';
import { Button, Popconfirm, Space, Tag, message } from 'ant-design-vue';
import { PlusOutlined } from '@ant-design/icons-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { productList, productRemove } from '#/api/resource/product';

import ProductDrawer from './modules/product-drawer.vue';

// 搜索表单配置
const formOptions: VbenFormProps = {
  commonConfig: {
    labelWidth: 100,
    componentProps: { allowClear: true },
  },
  schema: [
    {
      fieldName: 'productName',
      label: '产品名称',
      component: 'Input',
    },
    {
      fieldName: 'productModel',
      label: '产品型号',
      component: 'Input',
    },
    {
      fieldName: 'hasPurchaseContract',
      label: '是否有购买合同',
      component: 'Select',
      componentProps: {
        options: [
          { label: '是', value: '1' },
          { label: '否', value: '0' },
        ],
      },
    },
  ],
  wrapperClass: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
};

// 表格配置
const gridOptions: VxeGridProps = {
  checkboxConfig: {
    highlight: true,
    reserve: true,
  },
  columns: [
    { type: 'checkbox', width: 50 },
    { field: 'productName', title: '产品名称', minWidth: 150 },
    { field: 'productModel', title: '产品型号', minWidth: 120 },
    { field: 'quantity', title: '数量', width: 80 },
    { field: 'performanceDesc', title: '性能说明', minWidth: 200 },
    { field: 'useStartDate', title: '投入使用开始时间', minWidth: 140 },
    { field: 'useEndDate', title: '投入使用结束时间', minWidth: 140 },
    {
      field: 'hasPurchaseContract',
      title: '是否有购买合同',
      width: 130,
      slots: { default: 'hasPurchaseContract' },
    },
    { field: 'createBy', title: '创建人', width: 100 },
    { field: 'createTime', title: '创建时间', minWidth: 160 },
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
        return await productList({
          pageNum: page.currentPage,
          pageSize: page.pageSize,
          ...formValues,
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
  formOptions,
  gridOptions,
});

// 抽屉
const [ProductDetailDrawer, drawerApi] = useVbenDrawer({
  connectedComponent: ProductDrawer,
});

// 新增
function handleAdd() {
  drawerApi.setData({
    isEdit: false,
  });
  drawerApi.open();
}

// 编辑
function handleEdit(record: BizProduct) {
  drawerApi.setData({
    id: record.id,
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
  <div class="h-full">
    <BasicTable table-title="产品信息列表">
      <template #toolbar-tools>
        <Space>
          <Button type="primary" @click="handleAdd">
            <PlusOutlined />
            新增
          </Button>
        </Space>
      </template>

      <template #hasPurchaseContract="{ row }">
        <Tag :color="row.hasPurchaseContract === '1' ? 'green' : 'default'">
          {{ row.hasPurchaseContract === '1' ? '是' : '否' }}
        </Tag>
      </template>

      <template #action="{ row }">
        <Space>
          <ghost-button @click.stop="handleEdit(row)">
            编辑
          </ghost-button>
          <Popconfirm
            :get-popup-container="getVxePopupContainer"
            placement="left"
            :title="`确认删除产品【${row.productName}】吗？`"
            @confirm="handleDelete(row)"
          >
            <ghost-button danger @click.stop="">
              删除
            </ghost-button>
          </Popconfirm>
        </Space>
      </template>
    </BasicTable>

    <ProductDetailDrawer @reload="handleSuccess" />
  </div>
</template>
