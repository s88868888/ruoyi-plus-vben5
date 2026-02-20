<script setup lang="ts">
import type { VbenFormProps } from '@vben/common-ui';
import type { VxeGridProps } from '#/adapter/vxe-table';
import type { BizFinanceInfo } from '#/api/resource/finance';

import { useVbenDrawer } from '@vben/common-ui';
import { getVxePopupContainer } from '@vben/utils';
import { Button, Popconfirm, Space, message } from 'ant-design-vue';
import { PlusOutlined, DownloadOutlined } from '@ant-design/icons-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { financeList, financeRemove } from '#/api/resource/finance';

import FinanceDrawer from './finance-drawer.vue';
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
      fieldName: 'financeName',
      label: '财务信息名称',
      component: 'Input',
    },
    {
      fieldName: 'infoType',
      label: '信息类型',
      component: 'Input',
    },
    {
      fieldName: 'financeDateRange',
      label: '时间范围',
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
    { field: 'financeName', title: '财务信息名称', minWidth: 180 },
    { field: 'infoType', title: '信息类型', minWidth: 120 },
    { field: 'financeDate', title: '时间', width: 120 },
    {
      field: 'attachmentName',
      title: '附件',
      minWidth: 150,
      slots: { default: 'attachment' },
    },
    { field: 'createByName', title: '创建人', width: 100 },
    { field: 'createTime', title: '创建时间', minWidth: 160 },
    {
      field: 'action',
      title: '操作',
      width: 180,
      fixed: 'right',
      slots: { default: 'action' },
    },
  ],
  keepSource: true,
  pagerConfig: {},
  proxyConfig: {
    ajax: {
      query: async ({ page }, formValues = {}) => {
        const { financeDateRange, ...rest } = formValues;
        const params: any = {
          pageNum: page.currentPage,
          pageSize: page.pageSize,
          deptId: props.deptId,
          ...rest,
        };

        // 处理时间范围
        if (financeDateRange && financeDateRange.length === 2) {
          params['params[beginFinanceDate]'] = financeDateRange[0];
          params['params[endFinanceDate]'] = financeDateRange[1];
        }

        return await financeList(params);
      },
    },
  },
  rowConfig: {
    keyField: 'id',
  },
  id: 'resource-finance-index',
};

const [BasicTable, tableApi] = useVbenVxeGrid({
  formOptions,
  gridOptions,
});

// 抽屉
const [FinanceDetailDrawer, drawerApi] = useVbenDrawer({
  connectedComponent: FinanceDrawer,
});

// 新增
function handleAdd() {
  drawerApi.setData({
    deptId: props.deptId,
    mode: 'add',
  });
  drawerApi.open();
}

// 查看
function handleView(record: BizFinanceInfo) {
  drawerApi.setData({
    id: record.id,
    deptId: props.deptId,
    mode: 'view',
  });
  drawerApi.open();
}

// 编辑
function handleEdit(record: BizFinanceInfo) {
  drawerApi.setData({
    id: record.id,
    deptId: props.deptId,
    mode: 'edit',
  });
  drawerApi.open();
}

// 删除
async function handleDelete(record: BizFinanceInfo) {
  if (!record.id) return;
  await financeRemove([record.id]);
  message.success('删除成功');
  await tableApi.query();
}

// 下载附件
function handleDownload(record: BizFinanceInfo) {
  if (record.attachmentUrl) {
    window.open(record.attachmentUrl, '_blank');
  }
}

// 保存成功回调
async function handleSuccess() {
  await tableApi.query();
}
</script>

<template>
  <div class="finance-info h-full overflow-hidden">
    <BasicTable>
      <template #table-title>
        <SectionTitle title="财务信息列表" />
      </template>
      <template #toolbar-tools>
        <Space>
          <Button type="primary" @click="handleAdd">
            <PlusOutlined />
            新增财务信息
          </Button>
        </Space>
      </template>

      <template #attachment="{ row }">
        <Space v-if="row.attachmentName">
          <span>{{ row.attachmentName }}</span>
          <Button
            size="small"
            type="link"
            @click.stop="handleDownload(row)"
          >
            <DownloadOutlined />
            下载
          </Button>
        </Space>
        <span v-else>-</span>
      </template>

      <template #action="{ row }">
        <Space>
          <ghost-button @click.stop="handleView(row)">
            查看
          </ghost-button>
          <ghost-button @click.stop="handleEdit(row)">
            编辑
          </ghost-button>
          <Popconfirm
            :get-popup-container="getVxePopupContainer"
            placement="left"
            :title="`确认删除财务信息【${row.financeName}】吗？`"
            @confirm="handleDelete(row)"
          >
            <ghost-button danger @click.stop="">
              删除
            </ghost-button>
          </Popconfirm>
        </Space>
      </template>
    </BasicTable>

    <FinanceDetailDrawer @reload="handleSuccess" />
  </div>
</template>
