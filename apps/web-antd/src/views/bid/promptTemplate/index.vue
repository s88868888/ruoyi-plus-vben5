<script setup lang="ts">
import type { VxeGridProps } from '#/adapter/vxe-table';
import type { BizAiPromptTemplate } from '#/api/bid/promptTemplate';

import { ref } from 'vue';
import { Button, Dropdown, Menu, MenuItem, Popconfirm, Space, Tag, message } from 'ant-design-vue';
import { EllipsisOutlined, PlusOutlined } from '@ant-design/icons-vue';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { getVxePopupContainer } from '@vben/utils';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { promptTemplateList, promptTemplateRemove } from '#/api/bid/promptTemplate';

import CommonFilter from '#/components/CommonFilter/index.vue';
import PromptTemplateDrawer from './modules/prompt-template-drawer.vue';

// 筛选条件数据
const filterData = ref([
  {
    field: 'templateName',
    label: '模板名称',
    type: 'a-input',
    data: '',
    isCommon: true,
  },
  {
    field: 'templateType',
    label: '模板类型',
    type: 'a-select',
    data: '',
    options: [
      { label: '招标分析', value: 'bid_analysis' },
      { label: '评分标准', value: 'scoring_criteria' },
      { label: '风险评估', value: 'risk_assessment' },
      { label: '其他', value: 'other' },
    ],
    isCommon: true,
  },
  {
    field: 'status',
    label: '状态',
    type: 'a-select',
    data: '',
    options: [
      { label: '正常', value: '0' },
      { label: '停用', value: '1' },
    ],
    isCommon: true,
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
  checkboxConfig: {
    highlight: true,
    reserve: true,
  },
  height: 'auto',
  columns: [
    { type: 'checkbox', width: 50 },
    { field: 'templateName', title: '模板名称', minWidth: 150, headerAlign: 'left', align: 'left' },
    {
      field: 'templateType',
      title: '模板类型',
      width: 120,
      slots: { default: 'templateType' },
    },
    { field: 'promptContent', title: '提示词内容', minWidth: 300, showOverflow: 'tooltip', headerAlign: 'left', align: 'left' },
    {
      field: 'isSystem',
      title: '系统模板',
      width: 100,
      slots: { default: 'isSystem' },
    },
    { field: 'sortOrder', title: '排序', width: 80, align: 'right', headerAlign: 'right' },
    {
      field: 'status',
      title: '状态',
      width: 80,
      slots: { default: 'status' },
    },
    { field: 'createTime', title: '创建时间', minWidth: 160, headerAlign: 'left', align: 'left' },
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
        return await promptTemplateList({
          pageNum: page.currentPage,
          pageSize: page.pageSize,
          ...formValues,
          ...searchParams.value,
        });
      },
    },
  },
  rowConfig: {
    keyField: 'id',
  },
  id: 'bid-prompt-template-index',
};

const [BasicTable, tableApi] = useVbenVxeGrid({
  gridOptions,
} as any);

// 抽屉
const [PromptTemplateDetailDrawer, drawerApi] = useVbenDrawer({
  connectedComponent: PromptTemplateDrawer,
});

// 新增
function handleAdd() {
  drawerApi.setData({
    isEdit: false,
  });
  drawerApi.open();
}

// 编辑
function handleEdit(record: BizAiPromptTemplate) {
  drawerApi.setData({
    id: record.id,
    isEdit: true,
  });
  drawerApi.open();
}

// 删除
async function handleDelete(record: BizAiPromptTemplate) {
  if (!record.id) return;
  if (record.isSystem === '1') {
    message.warning('系统模板不允许删除');
    return;
  }
  await promptTemplateRemove([record.id]);
  message.success('删除成功');
  await tableApi.query();
}

// 保存成功回调
async function handleSuccess() {
  await tableApi.query();
}
</script>

<template>

  <Page :auto-content-height="true">
    <div class="flex h-full flex-col gap-4">
      <!-- 筛选条件区域 -->
      <div class="shrink-0 bg-white p-4 rounded shadow-sm">
        <div class="flex items-center justify-between">
          <CommonFilter
            :filter-data="filterData"
            type="both"
            @handle-query="handleFilterQuery"
          />
          <Button type="primary" @click="handleAdd">
            <PlusOutlined />
            新增
          </Button>
        </div>
      </div>

      <!-- 表格区域 -->
      <div class="flex-1 overflow-hidden">
        <BasicTable class="h-full" table-title="AI提示词模板列表">
          <template #templateType="{ row }">
            <Tag v-if="row.templateType === 'bid_analysis'" color="blue">招标分析</Tag>
            <Tag v-else-if="row.templateType === 'scoring_criteria'" color="green">评分标准</Tag>
            <Tag v-else-if="row.templateType === 'risk_assessment'" color="orange">风险评估</Tag>
            <Tag v-else color="default">其他</Tag>
          </template>

          <template #isSystem="{ row }">
            <Tag v-if="row.isSystem === '1'" color="purple">是</Tag>
            <Tag v-else color="default">否</Tag>
          </template>

          <template #status="{ row }">
            <Tag v-if="row.status === '0'" color="success">正常</Tag>
            <Tag v-else color="error">停用</Tag>
          </template>

          <template #action="{ row }">
            <Space>
              <Button type="link" size="small" @click="handleEdit(row)">编辑</Button>
              <Dropdown placement="bottomRight">
                <template #overlay>
                  <Menu>
                    <MenuItem key="delete">
                      <Popconfirm
                        :get-popup-container="getVxePopupContainer"
                        placement="left"
                        title="确定删除该模板吗？"
                        :disabled="row.isSystem === '1'"
                        @confirm="handleDelete(row)"
                      >
                        <span :class="row.isSystem === '1' ? '' : 'text-red-500'">删除</span>
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
    </div>
   <PromptTemplateDetailDrawer @success="handleSuccess" />
  </Page>


</template>
