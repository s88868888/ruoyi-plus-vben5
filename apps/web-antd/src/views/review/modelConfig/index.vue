<script setup lang="ts">
import type { VxeGridProps } from '#/adapter/vxe-table';

import { computed, h, ref } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';

import { Badge, Button, Dropdown, Menu, MenuItem, Modal, Space, Tag, message } from 'ant-design-vue';
import { EllipsisOutlined, PlusOutlined } from '@ant-design/icons-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { useListTablePreference } from '#/preferences/userPreference';
import CommonFilter from '#/components/CommonFilter/index.vue';
import ModelConfigEditDrawer from './modules/edit-drawer.vue';
import { reviewModelConfigList, reviewModelConfigRemove, reviewModelConfigTest } from '#/api/review/modelConfig';

const tablePreference = useListTablePreference();

const tableCssVars = computed(() => ({
  '--list-header-bg': tablePreference.headerBgColor,
  '--list-header-color': tablePreference.headerTextColor,
  '--list-header-padding-y': `${tablePreference.headerPaddingY}px`,
  '--list-cell-padding-y': `${tablePreference.cellPaddingY}px`,
}));

const filterData = ref([
  { field: 'name', label: '名称', type: 'a-input', data: '', isCommon: true },
  { field: 'code', label: '编码', type: 'a-input', data: '', isCommon: true },
  {
    field: 'purpose',
    label: '用途',
    type: 'a-select',
    data: '',
    options: [
      { label: 'Chat / AI 审核', value: 'chat' },
      { label: 'OCR 文字识别', value: 'ocr' },
    ],
    isCommon: true,
  },
  {
    field: 'provider',
    label: '提供方',
    type: 'a-select',
    data: '',
    options: [
      { label: 'Ollama (本地)', value: 'ollama' },
      { label: 'DashScope (阿里云百炼)', value: 'dashscope' },
      { label: 'PaddleOCR (本地)', value: 'paddleocr' },
      { label: 'Qwen-VL OCR (云端)', value: 'qwen-vl-ocr' },
    ],
    isCommon: true,
  },
  {
    field: 'enabled',
    label: '状态',
    type: 'a-select',
    data: '',
    options: [
      { label: '启用中', value: '1' },
      { label: '已停用', value: '0' },
    ],
    isCommon: true,
  },
]);

const searchParams = ref<Record<string, any>>({});

const handleFilterQuery = (conditions: any[]) => {
  const queryParams: Record<string, any> = {};
  conditions.forEach((item) => {
    queryParams[item.key] = item.value;
  });
  searchParams.value = queryParams;
  tableApi.query();
};

const loading = ref(false);

const providerColor: Record<string, string> = {
  ollama: 'green',
  dashscope: 'blue',
  paddleocr: 'orange',
  'qwen-vl-ocr': 'purple',
};

const purposeColor: Record<string, string> = {
  chat: 'cyan',
  ocr: 'magenta',
};

const purposeLabel: Record<string, string> = {
  chat: 'Chat',
  ocr: 'OCR',
};

const gridOptions: VxeGridProps = {
  checkboxConfig: { highlight: true, reserve: true },
  height: 'auto',
  columns: [
    { type: 'checkbox', width: 50 },
    { field: 'name', title: '名称', minWidth: 200, headerAlign: 'left', align: 'left', slots: { default: 'name' } },
    { field: 'code', title: '编码', width: 180, slots: { default: 'code' } },
    { field: 'purpose', title: '用途', width: 100, align: 'center', slots: { default: 'purpose' } },
    { field: 'provider', title: '提供方', width: 130, align: 'center', slots: { default: 'provider' } },
    { field: 'modelName', title: '模型ID', width: 220, align: 'center' },
    { field: 'temperature', title: '温度', width: 70, align: 'center' },
    {
      field: 'numCtx',
      title: '上下文/MaxTokens',
      width: 140,
      align: 'center',
      slots: { default: 'tokens' },
    },
    { field: 'enabled', title: '状态', width: 80, slots: { default: 'enabled' } },
    { field: 'updateTime', title: '更新时间', width: 160, headerAlign: 'left', align: 'left' },
    { field: 'action', title: '操作', width: 180, fixed: 'right', slots: { default: 'action' } },
  ],
  keepSource: true,
  pagerConfig: {},
  proxyConfig: {
    ajax: {
      query: async ({ page }) => {
        loading.value = true;
        try {
          const res = await reviewModelConfigList({
            provider: searchParams.value.provider,
            enabled: searchParams.value.enabled,
            purpose: searchParams.value.purpose,
          });
          let list = res || [];
          // 名称/编码 前端模糊过滤（后端只支持 provider/enabled 精确）
          if (searchParams.value.name) {
            list = list.filter((r) => (r.name || '').includes(searchParams.value.name));
          }
          if (searchParams.value.code) {
            list = list.filter((r) => (r.code || '').includes(searchParams.value.code));
          }
          const start = (page.currentPage - 1) * page.pageSize;
          return { rows: list.slice(start, start + page.pageSize), total: list.length };
        } finally {
          loading.value = false;
        }
      },
    },
  },
  rowConfig: { keyField: 'id' },
  rowClassName: 'cursor-pointer',
  id: 'review-model-config-index',
};

const [BasicTable, tableApi] = useVbenVxeGrid({ gridOptions } as any);

const [EditDrawerComp, editDrawerApi] = useVbenDrawer({ connectedComponent: ModelConfigEditDrawer });

function handleAdd() {
  editDrawerApi.setData({ mode: 'add' });
  editDrawerApi.open();
}

function handleEdit(row: any) {
  editDrawerApi.setData({ mode: 'edit', record: row });
  editDrawerApi.open();
}

async function handleReload() {
  await tableApi.query();
}

function handleDelete(row: any) {
  Modal.confirm({
    title: `确认删除模型配置【${row.name}】吗？`,
    content: '删除后引用该配置的提示词模板会回退到默认通道',
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      await reviewModelConfigRemove([row.id]);
      message.success('已删除');
      await tableApi.query();
    },
  });
}

async function handleTestRow(row: any) {
  const hide = message.loading(`正在测试【${row.name}】...`, 0);
  try {
    const res = await reviewModelConfigTest(row);
    hide();
    if (res?.ok) {
      Modal.success({
        title: `连接成功 · ${row.name}`,
        width: 560,
        content: h('div', { style: { fontSize: '13px', lineHeight: '1.7' } }, [
          h('div', null, [h('strong', null, '用例：'), res.testCase]),
          h('div', null, [h('strong', null, '耗时：'), `${res.durationMs} ms`]),
          h('div', null, [h('strong', null, '端点：'), res.endpoint]),
          h('div', { style: { marginTop: '8px' } }, [h('strong', null, '返回：')]),
          h('pre', {
            style: {
              background: 'rgba(0,0,0,0.04)', padding: '8px', borderRadius: '4px',
              fontSize: '12px', maxHeight: '200px', overflow: 'auto', whiteSpace: 'pre-wrap',
            },
          }, res.message || '(空)'),
        ]),
      });
    } else {
      Modal.error({
        title: `连接失败 · ${row.name}`,
        width: 560,
        content: h('div', { style: { fontSize: '13px', lineHeight: '1.7' } }, [
          h('div', null, [h('strong', null, '用例：'), res?.testCase || '-']),
          h('div', null, [h('strong', null, '耗时：'), `${res?.durationMs ?? 0} ms`]),
          h('div', null, [h('strong', null, '端点：'), res?.endpoint || '-']),
          h('div', { style: { marginTop: '8px' } }, [h('strong', null, '错误：')]),
          h('pre', {
            style: {
              background: 'rgba(255,77,79,0.06)', padding: '8px', borderRadius: '4px',
              border: '1px solid rgba(255,77,79,0.2)',
              fontSize: '12px', maxHeight: '240px', overflow: 'auto',
              whiteSpace: 'pre-wrap', color: '#a8071a',
            },
          }, res?.message || '未知错误'),
        ]),
      });
    }
  } catch (e: any) {
    hide();
    message.error('测试请求失败：' + (e?.message || '未知'));
  }
}
</script>

<template>
  <Page :auto-content-height="true">
    <div class="flex h-full flex-col gap-4">
      <div class="shrink-0 bg-white p-4 rounded shadow-sm">
        <div class="flex items-center justify-between">
          <CommonFilter :filter-data="filterData" type="both" @handle-query="handleFilterQuery" />
          <Space>
            <Button type="primary" @click="handleAdd">
              <PlusOutlined />
              新增模型配置
            </Button>
          </Space>
        </div>
      </div>

      <div class="table-style-wrapper flex-1 overflow-hidden" :style="tableCssVars">
        <BasicTable class="h-full" table-title="AI 模型配置" :loading="loading">
          <template #name="{ row }">
            <div class="flex flex-col gap-1">
              <span class="doc-name-text cursor-pointer hover:underline" @click="handleEdit(row)">{{ row.name }}</span>
              <span v-if="row.remark" class="text-xs text-gray-400 truncate" style="max-width: 280px;">{{ row.remark }}</span>
            </div>
          </template>

          <template #code="{ row }"><code class="type-code">{{ row.code }}</code></template>

          <template #provider="{ row }">
            <Tag :color="providerColor[row.provider] || 'default'">{{ row.provider }}</Tag>
          </template>

          <template #purpose="{ row }">
            <Tag :color="purposeColor[row.purpose] || 'default'">
              {{ purposeLabel[row.purpose] || row.purpose || '-' }}
            </Tag>
          </template>

          <template #tokens="{ row }">
            <span v-if="row.provider === 'ollama'" class="text-xs text-gray-600">
              ctx {{ row.numCtx ?? '-' }} / out {{ row.numPredict ?? '-' }}
            </span>
            <span v-else class="text-xs text-gray-600">max {{ row.maxTokens ?? '-' }}</span>
          </template>

          <template #enabled="{ row }">
            <Badge v-if="row.enabled === '1'" status="success" text="启用" />
            <Badge v-else status="default" text="已停用" />
          </template>

          <template #action="{ row }">
            <Space>
              <ghost-button @click.stop="handleEdit(row)">编辑</ghost-button>
              <ghost-button @click.stop="handleTestRow(row)">测试</ghost-button>
              <Dropdown placement="bottomRight">
                <template #overlay>
                  <Menu>
                    <MenuItem key="delete" @click="handleDelete(row)">
                      <span class="text-red-500">删除</span>
                    </MenuItem>
                  </Menu>
                </template>
                <a-button size="small" type="link"><EllipsisOutlined /></a-button>
              </Dropdown>
            </Space>
          </template>
        </BasicTable>
      </div>
    </div>
    <EditDrawerComp @reload="handleReload" />
  </Page>
</template>

<style scoped>
.doc-name-text { font-size: 14px; font-weight: 700; color: rgba(0, 0, 0, 0.88); }
.type-code { padding: 2px 8px; background: #f5f5f5; border: 1px solid #d9d9d9; border-radius: 4px; font-size: 12px; font-family: 'SFMono-Regular', Consolas, monospace; }
.table-style-wrapper :deep(.vxe-table--header-wrapper),
.table-style-wrapper :deep(.vxe-header--column) { background-color: var(--list-header-bg) !important; }
.table-style-wrapper :deep(.vxe-header--column .vxe-cell) { color: var(--list-header-color) !important; }
.table-style-wrapper :deep(.vxe-header--column) { padding-top: var(--list-header-padding-y) !important; padding-bottom: var(--list-header-padding-y) !important; }
.table-style-wrapper :deep(.vxe-body--column) { padding-top: var(--list-cell-padding-y) !important; padding-bottom: var(--list-cell-padding-y) !important; }
</style>
