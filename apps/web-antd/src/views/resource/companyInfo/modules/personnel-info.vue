<script setup lang="ts">
import type { VbenFormProps } from '@vben/common-ui';
import type { VxeGridProps } from '#/adapter/vxe-table';
import type { BizPersonnel } from '#/api/resource/personnel';

import { useVbenDrawer } from '@vben/common-ui';
import { getVxePopupContainer } from '@vben/utils';
import { Button, Popconfirm, Space, Tag, message } from 'ant-design-vue';
import { PlusOutlined } from '@ant-design/icons-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { personnelList, personnelRemove } from '#/api/resource/personnel';

import PersonnelDrawer from './personnel-drawer.vue';
import SectionTitle from './section-title.vue';

const props = defineProps<{
  deptId?: number;
  deptName?: string;
}>();

// 搜索表单配置
const formOptions: VbenFormProps = {
  commonConfig: {
    labelWidth: 80,
    componentProps: { allowClear: true },
  },
  schema: [
    {
      fieldName: 'name',
      label: '姓名',
      component: 'Input',
    },
    {
      fieldName: 'gender',
      label: '性别',
      component: 'Select',
      componentProps: {
        options: [
          { label: '男', value: '0' },
          { label: '女', value: '1' },
        ],
      },
    },
    {
      fieldName: 'status',
      label: '状态',
      component: 'Select',
      componentProps: {
        options: [
          { label: '在职', value: '0' },
          { label: '离职', value: '1' },
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
  customConfig: {
    storage: true,
  },
  height: 'auto',
  columns: [
    { type: 'checkbox', width: 50 },
    { field: 'name', title: '姓名', minWidth: 100 },
    {
      field: 'gender',
      title: '性别',
      width: 80,
      slots: { default: 'gender' },
    },
    { field: 'idCardType', title: '证件类型', minWidth: 100 },
    { field: 'idCardNumber', title: '证件号码', minWidth: 180 },
    { field: 'phone', title: '联系方式', minWidth: 130 },
    { field: 'position', title: '职务', minWidth: 120 },
    { field: 'hireDate', title: '入职时间', minWidth: 120, formatter: ({ cellValue }: any) => cellValue ? cellValue.split(' ')[0] : '' },
    {
      field: 'status',
      title: '状态',
      width: 80,
      slots: { default: 'status' },
    },
    { field: 'createTime', title: '创建时间', minWidth: 120, formatter: ({ cellValue }: any) => cellValue ? cellValue.split(' ')[0] : '' },
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
  formOptions,
  gridOptions,
});

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
  <div class="personnel-info h-full overflow-hidden">
    <BasicTable>
      <template #table-title>
        <SectionTitle title="人员列表" />
      </template>
      <template #toolbar-tools>
        <Space>
          <Button type="primary" @click="handleAdd">
            <PlusOutlined />
            新增人员
          </Button>
        </Space>
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
          <Popconfirm
            :get-popup-container="getVxePopupContainer"
            placement="left"
            :title="`确认删除人员【${row.name}】吗？`"
            @confirm="handleDelete(row)"
          >
            <ghost-button danger @click.stop="">
              删除
            </ghost-button>
          </Popconfirm>
        </Space>
      </template>
    </BasicTable>

    <PersonnelDetailDrawer @success="handleSuccess" />
  </div>
</template>
