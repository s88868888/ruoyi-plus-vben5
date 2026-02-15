<script setup lang="ts">
import type { VbenFormProps } from '@vben/common-ui';
import type { VxeGridProps } from '#/adapter/vxe-table';
import type { BizPerformance } from '#/api/resource/performance';

import { useVbenDrawer } from '@vben/common-ui';
import { getVxePopupContainer } from '@vben/utils';
import { Button, Popconfirm, Space, message } from 'ant-design-vue';
import { PlusOutlined } from '@ant-design/icons-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { performanceList, performanceRemove } from '#/api/resource/performance';

import PerformanceDrawer from './performance-drawer.vue';
import SectionTitle from './section-title.vue';

const props = defineProps<{
  deptId?: number;
  deptName?: string;
}>();

// 搜索表单配置
const formOptions: VbenFormProps = {
  commonConfig: {
    labelWidth: 100,
    componentProps: { allowClear: true },
  },
  schema: [
    {
      fieldName: 'name',
      label: '名称',
      component: 'Input',
      componentProps: {
        placeholder: '请输入项目名称',
      },
    },
    {
      fieldName: 'performanceCategory',
      label: '业绩分类',
      component: 'Select',
      componentProps: {
        placeholder: '请选择',
        options: [],
      },
    },
    {
      fieldName: 'bidDateRange',
      label: '中标日期',
      component: 'RangePicker',
      componentProps: {
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
      },
    },
    {
      fieldName: 'signingDateRange',
      label: '签约日期',
      component: 'RangePicker',
      componentProps: {
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
      },
      dependencies: {
        show: false,
      },
    },
    {
      fieldName: 'startDateRange',
      label: '开工日期',
      component: 'RangePicker',
      componentProps: {
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
      },
      dependencies: {
        show: false,
      },
    },
    {
      fieldName: 'completionDateRange',
      label: '竣工日期',
      component: 'RangePicker',
      componentProps: {
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
      },
      dependencies: {
        show: false,
      },
    },
    {
      fieldName: 'contractAmountMin',
      label: '合同金额（元）',
      component: 'InputNumber',
      componentProps: {
        placeholder: '请输入',
        min: 0,
      },
      dependencies: {
        show: false,
      },
    },
    {
      fieldName: 'contractAmountMax',
      label: '至',
      component: 'InputNumber',
      componentProps: {
        placeholder: '请输入',
        min: 0,
      },
      dependencies: {
        show: false,
      },
    },
    {
      fieldName: 'projectManager',
      label: '项目负责人',
      component: 'Input',
      componentProps: {
        placeholder: '请输入项目负责人',
      },
    },
    {
      fieldName: 'ownerUnitName',
      label: '业主单位名称',
      component: 'Input',
      componentProps: {
        placeholder: '请输入业主单位名称',
      },
    },
    {
      fieldName: 'projectLocation',
      label: '项目所在地',
      component: 'Input',
      componentProps: {
        placeholder: '请输入项目所在地',
      },
    },
    {
      fieldName: 'processType',
      label: '工艺类型',
      component: 'Select',
      componentProps: {
        placeholder: '请选择工艺类型',
        options: [],
      },
    },
  ],
  wrapperClass: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
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
    { field: 'name', title: '名称', minWidth: 180 },
    { field: 'performanceCategory', title: '业绩分类', minWidth: 120 },
    { field: 'bidDate', title: '中标日期', minWidth: 120 },
    { field: 'signingDate', title: '签约日期', minWidth: 120 },
    { field: 'startDate', title: '开工日期', minWidth: 120 },
    { field: 'completionDate', title: '竣工日期', minWidth: 120 },
    { field: 'contractAmount', title: '合同金额（元）', minWidth: 130 },
    { field: 'projectManager', title: '项目负责人', minWidth: 120 },
    { field: 'ownerUnitName', title: '业主单位名称', minWidth: 180 },
    { field: 'projectLocation', title: '项目所在地', minWidth: 150 },
    { field: 'processType', title: '工艺类型', minWidth: 120 },
    { field: 'projectScale', title: '工程规模', minWidth: 120 },
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
        const {
          bidDateRange,
          signingDateRange,
          startDateRange,
          completionDateRange,
          contractAmountMin,
          contractAmountMax,
          ...rest
        } = formValues;

        const params: any = {
          pageNum: page.currentPage,
          pageSize: page.pageSize,
          deptId: props.deptId,
          ...rest,
        };

        // 处理日期范围
        if (bidDateRange && bidDateRange.length === 2) {
          params['params[beginBidDate]'] = bidDateRange[0];
          params['params[endBidDate]'] = bidDateRange[1];
        }
        if (signingDateRange && signingDateRange.length === 2) {
          params['params[beginSigningDate]'] = signingDateRange[0];
          params['params[endSigningDate]'] = signingDateRange[1];
        }
        if (startDateRange && startDateRange.length === 2) {
          params['params[beginStartDate]'] = startDateRange[0];
          params['params[endStartDate]'] = startDateRange[1];
        }
        if (completionDateRange && completionDateRange.length === 2) {
          params['params[beginCompletionDate]'] = completionDateRange[0];
          params['params[endCompletionDate]'] = completionDateRange[1];
        }

        // 处理金额范围
        if (contractAmountMin !== undefined && contractAmountMin !== null) {
          params['params[minContractAmount]'] = contractAmountMin;
        }
        if (contractAmountMax !== undefined && contractAmountMax !== null) {
          params['params[maxContractAmount]'] = contractAmountMax;
        }

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
  formOptions,
  gridOptions,
});

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
  <div class="performance-info h-full overflow-hidden">
    <BasicTable>
      <template #table-title>
        <SectionTitle title="业绩案例列表" />
      </template>
      <template #toolbar-tools>
        <Space>
          <Button type="primary" @click="handleAdd">
            <PlusOutlined />
            新增案例
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
            :title="`确认删除案例【${row.name}】吗？`"
            @confirm="handleDelete(row)"
          >
            <ghost-button danger @click.stop="">
              删除
            </ghost-button>
          </Popconfirm>
        </Space>
      </template>
    </BasicTable>

    <PerformanceDetailDrawer @reload="handleSuccess" />
  </div>
</template>
