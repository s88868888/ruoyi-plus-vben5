<script setup lang="ts">
import type { VxeGridProps } from '#/adapter/vxe-table';
import type { BizProjectKnowledge } from '#/api/resource/knowledge';

import { computed, ref } from 'vue';
import { useVbenDrawer } from '@vben/common-ui';
import { Button, Dropdown, Menu, MenuItem, Modal, Space, Tag, message } from 'ant-design-vue';
import { DownloadOutlined, EllipsisOutlined, PlusOutlined } from '@ant-design/icons-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { knowledgeList, knowledgeRemove } from '#/api/resource/knowledge';
import CommonFilter from '#/components/CommonFilter/index.vue';
import { useListTablePreference } from '#/preferences/userPreference';

import { knowledgeProjectTypeOptions, dataPermissionTypeOptions } from './common-options';
import KnowledgeDrawer from './knowledge-drawer.vue';
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
    field: 'knowledgeName',
    label: '知识名称',
    type: 'a-input',
    data: '',
    isCommon: true,
  },
  {
    field: 'projectType',
    label: '挂标项目类型',
    type: 'a-select',
    data: '',
    isCommon: true,
    options: knowledgeProjectTypeOptions,
  },
  {
    field: 'dataPermissionType',
    label: '数据权限',
    type: 'a-select',
    data: '',
    isCommon: false,
    options: dataPermissionTypeOptions,
  },
  {
    field: 'description',
    label: '描述',
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
    { field: 'knowledgeName', title: '知识名称', minWidth: 180, headerAlign: 'left', align: 'left' },
    { field: 'projectType', title: '挂标项目类型', minWidth: 120, headerAlign: 'left', align: 'left' },
    { field: 'description', title: '描述', minWidth: 200, headerAlign: 'left', align: 'left' },
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
      headerAlign: 'left',
      align: 'left',
      slots: { default: 'attachment' },
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
  gridOptions,
} as any);

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
function handleDelete(record: BizProjectKnowledge) {
  if (!record.id) return;
  Modal.confirm({
    title: `确认删除知识【${record.knowledgeName}】吗？`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      await knowledgeRemove([record.id!]);
      message.success('删除成功');
      await tableApi.query();
    },
  });
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
  <div class="knowledge-info flex flex-col gap-4 h-full overflow-hidden">
    <div class="filter-section">
      <div class="flex items-center justify-between">
        <CommonFilter
          :filter-data="filterData"
          type="both"
          @handle-query="handleFilterQuery"
        />
        <Button v-if="!readonly" type="primary" @click="handleAdd">
          <PlusOutlined />
          新增
        </Button>
      </div>
    </div>

    <div class="table-style-wrapper flex-1 overflow-hidden" :style="tableCssVars">
      <BasicTable>
        <template #table-title>
          <SectionTitle title="项目知识列表" />
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

    <KnowledgeDetailDrawer @reload="handleSuccess" />
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
