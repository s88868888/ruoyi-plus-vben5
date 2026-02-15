<script setup lang="ts">
import type { VbenFormProps } from '@vben/common-ui';
import type { VxeGridProps } from '#/adapter/vxe-table';
import type { BizQualification } from '#/api/resource/qualification';

import { useVbenDrawer } from '@vben/common-ui';
import { getVxePopupContainer } from '@vben/utils';
import { Button, Popconfirm, Space, message } from 'ant-design-vue';
import { PlusOutlined } from '@ant-design/icons-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { qualificationList, qualificationRemove } from '#/api/resource/qualification';

import QualificationDrawer from './qualification-drawer.vue';
import SectionTitle from './section-title.vue';

const props = defineProps<{
  deptId?: number;
  deptName?: string;
}>();

// 搜索表单配置
const formOptions: VbenFormProps = {
  commonConfig: {
    labelWidth: 120,
    componentProps: { allowClear: true },
  },
  schema: [
    {
      fieldName: 'certNumber',
      label: '证书编号',
      component: 'Input',
    },
    {
      fieldName: 'certName',
      label: '证书名称',
      component: 'Input',
    },
    {
      fieldName: 'certCategory',
      label: '证书类别',
      component: 'Input',
    },
    {
      fieldName: 'certStatus',
      label: '证书状态',
      component: 'Input',
    },
    {
      fieldName: 'validStartDateRange',
      label: '有效期开始时间',
      component: 'RangePicker',
      componentProps: {
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
      },
    },
    {
      fieldName: 'validEndDateRange',
      label: '有效期结束时间',
      component: 'RangePicker',
      componentProps: {
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
      },
    },
  ],
  wrapperClass: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  collapsed: true,
  collapsedRows: 1,
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
    { type: 'seq', width: 60, title: '序号' },
    { field: 'certNumber', title: '证书编号', minWidth: 150 },
    { field: 'certName', title: '证书名称', minWidth: 180 },
    { field: 'certStatus', title: '证书状态', width: 100 },
    { field: 'certCategory', title: '证书类别', minWidth: 120 },
    { field: 'validStartDate', title: '有效期开始时间', minWidth: 120 },
    { field: 'validEndDate', title: '有效期结束时间', minWidth: 120 },
    { field: 'createByName', title: '创建人', width: 100 },
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
        const { validStartDateRange, validEndDateRange, ...rest } = formValues;
        const params: any = {
          pageNum: page.currentPage,
          pageSize: page.pageSize,
          deptId: props.deptId,
          ...rest,
        };

        // 处理日期范围
        if (validStartDateRange && validStartDateRange.length === 2) {
          params['params[beginValidStartDate]'] = validStartDateRange[0];
          params['params[endValidStartDate]'] = validStartDateRange[1];
        }
        if (validEndDateRange && validEndDateRange.length === 2) {
          params['params[beginValidEndDate]'] = validEndDateRange[0];
          params['params[endValidEndDate]'] = validEndDateRange[1];
        }

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
  formOptions,
  gridOptions,
});

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
  <div class="qualification-info h-full overflow-hidden">
    <BasicTable>
      <template #table-title>
        <SectionTitle title="企业资质列表" />
      </template>
      <template #toolbar-tools>
        <Space>
          <Button type="primary" @click="handleAdd">
            <PlusOutlined />
            新增资质
          </Button>
        </Space>
      </template>

      <template #action="{ row }">
        <Space>
          <ghost-button @click.stop="handleEdit(row)">
            编辑
          </ghost-button>
          <Popconfirm
            :get-popup-container="getVxePopupContainer"
            placement="left"
            :title="`确认删除资质【${row.certName}】吗？`"
            @confirm="handleDelete(row)"
          >
            <ghost-button danger @click.stop="">
              删除
            </ghost-button>
          </Popconfirm>
        </Space>
      </template>
    </BasicTable>

    <QualificationDetailDrawer @reload="handleSuccess" />
  </div>
</template>
