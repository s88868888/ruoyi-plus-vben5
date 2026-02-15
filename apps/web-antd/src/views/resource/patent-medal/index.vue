<script setup lang="ts">
import type { VbenFormProps } from '@vben/common-ui';
import type { VxeGridProps } from '#/adapter/vxe-table';
import type { BizPatentMedal } from '#/api/resource/patent-medal';

import { useVbenDrawer } from '@vben/common-ui';
import { getVxePopupContainer } from '@vben/utils';
import { Button, Popconfirm, Space, Switch, Tag, message } from 'ant-design-vue';
import { PlusOutlined } from '@ant-design/icons-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  patentMedalList,
  patentMedalRemove,
} from '#/api/resource/patent-medal';

import PatentMedalDrawer from './modules/patent-medal-drawer.vue';

// 搜索表单配置
const formOptions: VbenFormProps = {
  commonConfig: {
    labelWidth: 100,
    componentProps: { allowClear: true },
  },
  schema: [
    {
      fieldName: 'patentName',
      label: '专利名称',
      component: 'Input',
    },
    {
      fieldName: 'patentType',
      label: '专利类型',
      component: 'Select',
      componentProps: {
        options: [
          { label: '发明专利', value: '1' },
          { label: '实用新型专利', value: '2' },
          { label: '外观设计专利', value: '3' },
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
    { field: 'patentName', title: '专利名称', minWidth: 150 },
    {
      field: 'patentType',
      title: '专利类型',
      width: 140,
      slots: { default: 'patentType' },
    },
    { field: 'patentNumber', title: '专利号', minWidth: 150 },
    { field: 'authorizationDate', title: '授权公告日', width: 120 },
    { field: 'patentee', title: '专利权人', minWidth: 150 },
    {
      field: 'status',
      title: '状态',
      width: 80,
      slots: { default: 'status' },
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
        return await patentMedalList({
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
  id: 'resource-patent-medal-index',
};

const [BasicTable, tableApi] = useVbenVxeGrid({
  formOptions,
  gridOptions,
});

// 抽屉
const [PatentMedalDetailDrawer, drawerApi] = useVbenDrawer({
  connectedComponent: PatentMedalDrawer,
});

// 新增
function handleAdd() {
  drawerApi.setData({
    isEdit: false,
  });
  drawerApi.open();
}

// 编辑
function handleEdit(record: BizPatentMedal) {
  drawerApi.setData({
    id: record.id,
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

// 获取专利类型标签
function getPatentTypeLabel(type: string): string {
  const typeMap: Record<string, string> = {
    '1': '发明专利',
    '2': '实用新型专利',
    '3': '外观设计专利',
  };
  return typeMap[type] || type;
}
</script>

<template>
  <div class="h-full">
    <BasicTable table-title="专利奖章列表">
      <template #toolbar-tools>
        <Space>
          <Button type="primary" @click="handleAdd">
            <PlusOutlined />
            新增
          </Button>
        </Space>
      </template>

      <template #patentType="{ row }">
        <Tag :color="row.patentType === '1' ? 'blue' : row.patentType === '2' ? 'green' : 'orange'">
          {{ getPatentTypeLabel(row.patentType) }}
        </Tag>
      </template>

      <template #status="{ row }">
        <Switch
          :checked="row.status === '0'"
          checked-children="有效"
          un-checked-children="无效"
          disabled
        />
      </template>

      <template #action="{ row }">
        <Space>
          <ghost-button @click.stop="handleEdit(row)">
            编辑
          </ghost-button>
          <Popconfirm
            :get-popup-container="getVxePopupContainer"
            placement="left"
            :title="`确认删除专利【${row.patentName}】吗？`"
            @confirm="handleDelete(row)"
          >
            <ghost-button danger @click.stop="">
              删除
            </ghost-button>
          </Popconfirm>
        </Space>
      </template>
    </BasicTable>

    <PatentMedalDetailDrawer @reload="handleSuccess" />
  </div>
</template>
