<script setup lang="ts">
import type { VxeGridProps } from '#/adapter/vxe-table';

import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { Button, Dropdown, Menu, MenuItem, Modal, Space, Tooltip, message } from 'ant-design-vue';
import { DiffOutlined, EllipsisOutlined, FileSearchOutlined, ExportOutlined, ImportOutlined } from '@ant-design/icons-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { useListTablePreference } from '#/preferences/userPreference';
import CommonFilter from '#/components/CommonFilter/index.vue';
import { reviewTaskList, reviewTaskRemove, reviewTaskExecute, reviewTaskExport, reviewTaskImport } from '#/api/review/task';
import { DictEnum } from '@vben/constants';
import { getDictOptions } from '#/utils/dict';
import { renderDict } from '#/utils/render';

const router = useRouter();
const tablePreference = useListTablePreference();

const tableCssVars = computed(() => ({
  '--list-header-bg': tablePreference.headerBgColor,
  '--list-header-color': tablePreference.headerTextColor,
  '--list-header-padding-y': `${tablePreference.headerPaddingY}px`,
  '--list-cell-padding-y': `${tablePreference.cellPaddingY}px`,
}));

const filterData = ref([
  {
    field: 'docName',
    label: '文档名称',
    type: 'a-input',
    data: '',
    isCommon: true,
  },
  {
    field: 'docType',
    label: '文档类型',
    type: 'a-select',
    data: '',
    options: getDictOptions(DictEnum.REVIEW_TASK_TYPE),
    isCommon: true,
  },
  {
    field: 'standard',
    label: '审核标准',
    type: 'a-select',
    data: '',
    options: [
      { label: '政府采购合同标准 v2.1', value: '1' },
      { label: '企业财务报销规范 v1.3', value: '2' },
      { label: '租赁合同审核标准 v1.0', value: '3' },
      { label: '内部审批表单规范 v3.0', value: '4' },
    ],
    isCommon: true,
  },
  {
    field: 'submitTime',
    label: '提交时间',
    type: 'a-date-picker-start-end',
    data: [],
    format: 'YYYY-MM-DD',
    isCommon: false,
  },
]);

const searchParams = ref<Record<string, any>>({});

const handleFilterQuery = (conditions: any[]) => {
  const queryParams: Record<string, any> = {};
  conditions.forEach((item) => {
    if (item.key === 'dtS_submitTime') {
      queryParams.submitTimeStart = item.value;
    } else if (item.key === 'dtE_submitTime') {
      queryParams.submitTimeEnd = item.value;
    } else {
      queryParams[item.key] = item.value;
    }
  });
  searchParams.value = queryParams;
  tableApi.query();
};

function tooltipDotStyle(color: string) {
  return {
    display: 'inline-block',
    width: '8px',
    height: '8px',
    marginRight: '6px',
    borderRadius: '50%',
    backgroundColor: color,
  };
}

const loading = ref(false);

const gridOptions: VxeGridProps = {
  checkboxConfig: {
    highlight: true,
    reserve: true,
    // 点整行任意位置即可勾选（操作按钮带 @click.stop 不受影响）
    trigger: 'row',
  },
  height: 'auto',
  columns: [
    { type: 'checkbox', width: 50 },
    {
      field: 'docName',
      title: '文档名称',
      minWidth: 350,
      headerAlign: 'left',
      align: 'left',
      slots: { default: 'docName' },
    },
    {
      field: 'standardNames',
      title: '审核标准',
      minWidth: 120,
      headerAlign: 'left',
      align: 'left',
    },
    {
      field: 'version',
      title: '审核次数',
      width: 90,
      align: 'center',
      slots: { default: 'reviewVersion' },
    },
    {
      field: 'errorCount',
      title: '问题数',
      width: 160,
      align: 'center',
      slots: { default: 'issueCount' },
    },
    {
      field: 'createTime',
      title: '提交时间',
      width: 160,
      headerAlign: 'left',
      align: 'left',
    },
    {
      field: 'reviewDuration',
      title: '耗时',
      width: 80,
      align: 'center',
      slots: { default: 'reviewTime' },
    },
    {
      field: 'action',
      title: '操作',
      width: 130,
      fixed: 'right',
      slots: { default: 'action' },
    },
  ],
  keepSource: true,
  pagerConfig: {},
  proxyConfig: {
    ajax: {
      query: async ({ page }) => {
        loading.value = true;
        try {
          const params = {
            pageNum: page.currentPage,
            pageSize: page.pageSize,
            ...searchParams.value,
          };
          return await reviewTaskList(params);
        } finally {
          loading.value = false;
        }
      },
    },
  },
  rowConfig: {
    keyField: 'id',
  },
  rowClassName: 'cursor-pointer',
  id: 'review-task-index',
};

const [BasicTable, tableApi] = useVbenVxeGrid({
  gridOptions,
  gridEvents: {
    cellDblclick: ({ row }: any) => {
      handleView(row);
    },
  },
} as any);

function handleView(row: any) {
  // 工具任务（附件对比 / 内容审查）→ 跳对应向导页并带 taskId，直接打开查看器。
  // taskType 兼作提示词模板类型，可能是 Document_Review 等自定义值，故：
  // 含 COMPARE → 对比；含 AUDIT 或来源是 AI 工具（OA_AI_TOOL/CS_AI_TOOL/AI_TOOL）→ 内容审查。
  const type = String(row.taskType || '').toUpperCase();
  const source = String(row.sourceType || '').toUpperCase();
  const isTool = source.includes('AI_TOOL');
  if (type.includes('COMPARE')) {
    router.push(`/review/tool/compare?taskId=${row.id}&fullscreen=1`);
    return;
  }
  if (type.includes('AUDIT') || isTool) {
    router.push(`/review/tool/audit?taskId=${row.id}&fullscreen=1`);
    return;
  }
  handleReviewDetail(row);
}

function handleReviewDetail(row: any) {
  if (row.docType === 'finance') {
    router.push(`/review/task/result-finance?id=${row.id}`);
  } else {
    router.push(`/review/task/result?id=${row.id}`);
  }
}

// 顶部「做对比 / 审核分析」按钮：跳工具向导页
function goTool(kind: 'audit' | 'compare') {
  router.push(kind === 'compare' ? '/review/tool/compare' : '/review/tool/audit');
}

function handleDelete(row: any) {
  Modal.confirm({
    title: `确认删除审核记录【${row.taskName}】吗？`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      await reviewTaskRemove([row.id]);
      message.success('删除成功');
      await tableApi.query();
    },
  });
}

function handleExecute(row: any) {
  Modal.confirm({
    title: `确认执行审核【${row.taskName}】吗？`,
    okText: '确认',
    cancelText: '取消',
    async onOk() {
      await reviewTaskExecute(row.id);
      // message.success('审核任务已提交执行');
      await tableApi.query();
    },
  });
}

function handleActionMenuClick(key: string | number, row: any) {
  if (key === 'review-detail') {
    handleReviewDetail(row);
    return;
  }
  if (key === 'delete') {
    handleDelete(row);
  }
}

// ==================== 工程包 导出 / 导入 ====================
const exporting = ref(false);
const importing = ref(false);
const importInputRef = ref<HTMLInputElement | null>(null);

// 导出：勾选行 → 打成 zip 工程包（附件原件 + 结果/关注/规则快照/脱敏框），不动后端原数据
async function handleExport() {
  const rows = tableApi.grid?.getCheckboxRecords?.() || [];
  if (!rows.length) {
    message.warning('请先勾选要导出的任务');
    return;
  }
  exporting.value = true;
  const hide = message.loading(`正在打包 ${rows.length} 个任务…`, 0);
  try {
    const ids = rows.map((r: any) => r.id);
    const blob = await reviewTaskExport(ids);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const ts = new Date()
      .toLocaleString('zh-CN', { hour12: false })
      .replace(/[/:\s]/g, '')
      .replace(/,/g, '');
    a.href = url;
    a.download = `审核工程包_${ts}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    message.success(`已导出 ${rows.length} 个任务`);
  } catch (e: any) {
    message.error('导出失败：' + (e?.message || e));
  } finally {
    hide();
    exporting.value = false;
  }
}

function triggerImport() {
  importInputRef.value?.click();
}

// 导入：选 zip → 后端重新落库为全新任务（新 id、附件重传 OSS）→ 刷新列表
async function handleImportFile(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = ''; // 清空，允许重复选同一文件
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.zip')) {
    message.warning('请选择 .zip 工程包文件');
    return;
  }
  importing.value = true;
  const hide = message.loading('正在导入工程包…', 0);
  try {
    const newIds = await reviewTaskImport(file);
    message.success(`导入成功，新建 ${newIds?.length || 0} 个任务`);
    await tableApi.query();
  } catch (e: any) {
    message.error('导入失败：' + (e?.message || e));
  } finally {
    hide();
    importing.value = false;
  }
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
          <Space>
            <Button :loading="exporting" @click="handleExport">
              <ExportOutlined />
              导出
            </Button>
            <Button :loading="importing" @click="triggerImport">
              <ImportOutlined />
              导入
            </Button>
            <Button @click="goTool('compare')">
              <DiffOutlined />
              附件对比
            </Button>
            <Button @click="goTool('audit')">
              <FileSearchOutlined />
              审核分析
            </Button>
          </Space>
          <input
            ref="importInputRef"
            type="file"
            accept=".zip"
            style="display: none"
            @change="handleImportFile"
          />
        </div>
      </div>

      <!-- 表格区域 -->
      <div class="table-style-wrapper flex-1 overflow-hidden" :style="tableCssVars">
        <BasicTable class="h-full" table-title="审核任务列表" :loading="loading">
          <template #docName="{ row }">
            <div class="flex flex-col gap-1">
              <div class="flex items-center gap-2">
                <span class="doc-name-text">{{ row.taskName }}</span>
                <component :is="renderDict(row.status, DictEnum.REVIEW_TASK_STATUS)" />
              </div>
              <div class="flex items-center gap-1 text-xs text-gray-400">
                <component v-if="row.passStatus" :is="renderDict(row.passStatus, DictEnum.REVIEW_PASS_STATUS)" />
                <span v-else>-</span>
              </div>
            </div>
          </template>

          <template #issueCount="{ row }">
            <Tooltip
              v-if="(row.errorCount || 0) + (row.warningCount || 0) + (row.infoCount || 0) > 0"
              placement="top"
            >
              <template #title>
                <div>
                  <div><span :style="tooltipDotStyle('#ff4d4f')" />严重：{{ row.errorCount || 0 }}</div>
                  <div><span :style="tooltipDotStyle('#faad14')" />警告：{{ row.warningCount || 0 }}</div>
                  <div><span :style="tooltipDotStyle('#1677ff')" />提示：{{ row.infoCount || 0 }}</div>
                </div>
              </template>
              <span class="issue-dots">
                <span v-if="(row.errorCount || 0) > 0" class="issue-dot issue-dot-error">
                  <span class="issue-dot-num">{{ row.errorCount }}</span>
                </span>
                <span v-if="(row.warningCount || 0) > 0" class="issue-dot issue-dot-warning">
                  <span class="issue-dot-num">{{ row.warningCount }}</span>
                </span>
                <span v-if="(row.infoCount || 0) > 0" class="issue-dot issue-dot-info">
                  <span class="issue-dot-num">{{ row.infoCount }}</span>
                </span>
              </span>
            </Tooltip>
            <span v-else-if="row.status === 'completed'" class="text-green-500 font-semibold">
              无
            </span>
            <span v-else class="text-gray-400">-</span>
          </template>

          <template #reviewVersion="{ row }">
            <span v-if="(row.version || 0) > 1" class="text-black">
              <span class="text-base font-semibold">{{ row.version }}</span>
              <span class="text-xs font-normal text-gray-400 ml-0.5">次</span>
            </span>
            <span v-else class="text-gray-400">
              <span class="text-base">{{ row.version || '-' }}</span>
              <span v-if="row.version" class="text-xs ml-0.5">次</span>
            </span>
          </template>

          <template #reviewTime="{ row }">
            <span v-if="row.reviewDuration" class="text-gray-600">
              {{ row.reviewDuration >= 1000 ? (row.reviewDuration / 1000).toFixed(1) + 's' : row.reviewDuration + 'ms' }}
            </span>
            <span v-else class="text-gray-400">-</span>
          </template>

          <template #action="{ row }">
            <Space>
              <ghost-button v-if="row.status === 'completed'" @click.stop="handleView(row)">
                查看
              </ghost-button>
              <ghost-button v-if="row.status === 'pending'" @click.stop="handleExecute(row)">
                执行审核
              </ghost-button>
              <Dropdown placement="bottomRight">
                <template #overlay>
                  <Menu @click="({ key }: any) => handleActionMenuClick(key, row)">
                    <MenuItem v-if="row.status === 'completed'" key="review-detail">
                      审核详情
                    </MenuItem>
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
    </div>
  </Page>
</template>

<style scoped>
.doc-name-text {
  font-size: 14px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.88);
}

.tag-sm {
  font-size: 11px !important;
  padding: 0 4px !important;
  line-height: 18px !important;
  margin-inline-end: 0 !important;
}

.table-style-wrapper :deep(.vxe-table--header-wrapper),
.table-style-wrapper :deep(.vxe-header--column) {
  background-color: var(--list-header-bg) !important;
}

.table-style-wrapper :deep(.vxe-header--column .vxe-cell) {
  color: var(--list-header-color) !important;
}

.table-style-wrapper :deep(.vxe-header--column) {
  padding-top: var(--list-header-padding-y) !important;
  padding-bottom: var(--list-header-padding-y) !important;
}

.table-style-wrapper :deep(.vxe-body--column) {
  padding-top: var(--list-cell-padding-y) !important;
  padding-bottom: var(--list-cell-padding-y) !important;
}

.issue-dots {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.issue-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 11px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  line-height: 1;
}

.issue-dot-error {
  background-color: #ff4d4f;
}

.issue-dot-warning {
  background-color: #faad14;
}

.issue-dot-info {
  background-color: #1677ff;
}

.issue-dot-num {
  line-height: 1;
}
</style>
