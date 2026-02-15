<script setup lang="ts">
import type { VbenFormProps } from '@vben/common-ui';
import type { VxeGridProps } from '#/adapter/vxe-table';
import type { BizProjectKnowledge } from '#/api/resource/knowledge';

import { useVbenDrawer } from '@vben/common-ui';
import { getVxePopupContainer } from '@vben/utils';
import { Button, Popconfirm, Space, Tag, message } from 'ant-design-vue';
import { PlusOutlined, DownloadOutlined } from '@ant-design/icons-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { knowledgeList, knowledgeRemove } from '#/api/resource/knowledge';

import KnowledgeDrawer from './knowledge-drawer.vue';
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
      fieldName: 'knowledgeName',
      label: '知识名称',
      component: 'Input',
    },
    {
      fieldName: 'projectType',
      label: '挂标项目类型',
      component: 'Input',
    },
    {
      fieldName: 'description',
      label: '描述',
      component: 'Input',
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
    { field: 'knowledgeName', title: '知识名称', minWidth: 180 },
    { field: 'projectType', title: '挂标项目类型', minWidth: 120 },
    { field: 'description', title: '描述', minWidth: 200 },
    {
      field: 'dataPermissionType',
      title: '数据权限',
      width: 100,
      slots: { default: 'dataPermission' },
    },
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
        const params: any = {
          pageNum: page.currentPage,
          pageSize: page.pageSize,
          deptId: props.deptId,
          ...formValues,
        };

        return await knowledgeList(params);
      },
    },
  },
  rowConfig: {
    keyField: 'id',
  },
  id: 'resource-knowledge-index',
};

const [BasicTable, tableApi] = useVbenVxeGrid({
  formOptions,
  gridOptions,
});

// 抽屉
const [KnowledgeDetailDrawer, drawerApi] = useVbenDrawer({
  connectedComponent: KnowledgeDrawer,
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
function handleView(record: BizProjectKnowledge) {
  drawerApi.setData({
    id: record.id,
    deptId: props.deptId,
    mode: 'view',
  });
  drawerApi.open();
}

// 编辑
function handleEdit(record: BizProjectKnowledge) {
  drawerApi.setData({
    id: record.id,
    deptId: props.deptId,
    mode: 'edit',
  });
  drawerApi.open();
}

// 删除
async function handleDelete(record: BizProjectKnowledge) {
  if (!record.id) return;
  await knowledgeRemove([record.id]);
  message.success('删除成功');
  await tableApi.query();
}

// 下载附件
function handleDownload(record: BizProjectKnowledge) {
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
  <div class="knowledge-info h-full overflow-hidden">
    <BasicTable>
      <template #table-title>
        <SectionTitle title="项目知识列表" />
      </template>
      <template #toolbar-tools>
        <Space>
          <Button type="primary" @click="handleAdd">
            <PlusOutlined />
            新增
          </Button>
        </Space>
      </template>

      <template #dataPermission="{ row }">
        <Tag v-if="row.dataPermissionType === '0'" color="red">私域</Tag>
        <Tag v-else-if="row.dataPermissionType === '1'" color="green">公域</Tag>
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
            :title="`确认删除知识【${row.knowledgeName}】吗？`"
            @confirm="handleDelete(row)"
          >
            <ghost-button danger @click.stop="">
              删除
            </ghost-button>
          </Popconfirm>
        </Space>
      </template>
    </BasicTable>

    <KnowledgeDetailDrawer @reload="handleSuccess" />
  </div>
</template>
