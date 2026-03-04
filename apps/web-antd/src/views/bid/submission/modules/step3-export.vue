<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Button, message, Radio, RadioGroup, Space, Tag, Tooltip } from 'ant-design-vue';
import {
  DownloadOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  PushpinOutlined,
} from '@ant-design/icons-vue';
import type { VxeGridProps } from '#/adapter/vxe-table';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { useListTablePreference } from '#/preferences/userPreference';
import {
  exportDocument,
  getLatestDocumentList,
  saveDocumentVersion,
  type BizSubmissionDocument,
} from '#/api/bid/submissionDocument';

interface Props {
  submissionId: string;
  chapterTree?: any[];
}

const props = defineProps<Props>();
const emit = defineEmits(['prev', 'back']);

const tablePreference = useListTablePreference();
const tableCssVars = computed(() => ({
  '--list-header-bg': tablePreference.headerBgColor,
  '--list-header-color': tablePreference.headerTextColor,
  '--list-header-padding-y': `${tablePreference.headerPaddingY}px`,
  '--list-cell-padding-y': `${tablePreference.cellPaddingY}px`,
}));

// 导出格式
const exportFormat = ref<'docx' | 'pdf'>('docx');

// 记录正在导出的行
const exportingIds = ref<Set<string>>(new Set());

// 归纳为新版本
const savingVersion = ref(false);

async function handleSaveVersion() {
  const checked = tableApi.grid?.getCheckboxRecords() as BizSubmissionDocument[];
  if (!checked || checked.length === 0) {
    message.warning('请至少勾选一个文档');
    return;
  }
  savingVersion.value = true;
  let successCount = 0;
  for (const row of checked) {
    if (!row.documentConfigId) continue;
    try {
      const result = await saveDocumentVersion(row.documentConfigId, props.submissionId);
      successCount++;
    } catch {
      message.error(`${row.documentName || '文档'} 归纳失败`);
    }
  }
  savingVersion.value = false;
  if (successCount > 0) {
    message.success(`已归纳 ${successCount} 个文档为新版本`);
    tableApi.reload();
  }
}

// VXE Grid 配置
const gridOptions: VxeGridProps = {
  height: 'auto',
  checkboxConfig: { highlight: true, labelField: '' },
  columns: [
    { type: 'checkbox', width: 50 },
    { type: 'seq', width: 60, title: '序号' },
    {
      field: 'documentName',
      title: '文档名称',
      minWidth: 220,
      fixed: 'left',
      slots: { default: 'documentName' },
    },
    {
      field: 'companyName',
      title: '公司名称',
      minWidth: 160,
      formatter: ({ cellValue }: any) => cellValue || '-',
    },
    {
      field: 'documentType',
      title: '文档类型',
      width: 110,
      slots: { default: 'documentType' },
    },
    {
      field: 'version',
      title: '版本号',
      width: 100,
      slots: { default: 'version' },
      headerAlign: 'center',
      align: 'center',
    },
    {
      field: 'generationStatus',
      title: '生成状态',
      width: 110,
      slots: { default: 'generationStatus' },
    },
    {
      field: 'action',
      title: '操作',
      width: 100,
      fixed: 'right',
      slots: { default: 'action' },
    },
  ],
  keepSource: true,
  pagerConfig: { enabled: false },
  proxyConfig: {
    ajax: {
      query: async () => {
        const data = await getLatestDocumentList(props.submissionId);
        return { rows: data || [], total: (data || []).length };
      },
    },
  },
  rowConfig: { keyField: 'id', isCurrent: true },
  id: 'step3-export-grid',
};

const [ExportTable, tableApi] = useVbenVxeGrid({ gridOptions } as any);

onMounted(() => {
  tableApi.reload();
});

// 文档类型标签
const documentTypeMap: Record<string, { label: string; color: string }> = {
  commercial: { label: '商务标', color: 'blue' },
  technical: { label: '技术标', color: 'green' },
  complete: { label: '整本标书', color: 'orange' },
};

function getDocTypeInfo(type?: string) {
  return type ? (documentTypeMap[type] || { label: type, color: 'default' }) : { label: '-', color: 'default' };
}

// 生成状态
function getStatusColor(status?: string) {
  const map: Record<string, string> = {
    completed: 'success',
    generating: 'processing',
    pending: 'default',
    failed: 'error',
  };
  return status ? (map[status] || 'default') : 'default';
}

function getStatusText(status?: string) {
  const map: Record<string, string> = {
    completed: '已完成',
    generating: '生成中',
    pending: '待生成',
    failed: '失败',
  };
  return status ? (map[status] || status) : '-';
}

// 单个导出
async function handleExportSingle(row: BizSubmissionDocument) {
  if (!row.id) return;
  exportingIds.value.add(row.id);
  try {
    const blob = await exportDocument(row.id, exportFormat.value);
    const fileName = `${row.documentName || '标书文档'}_v${row.version}.${exportFormat.value}`;
    triggerDownload(blob, fileName);
    message.success(`${fileName} 导出成功`);
  } catch {
    message.error('导出失败，请重试');
  } finally {
    exportingIds.value.delete(row.id);
  }
}

// 批量导出
async function handleBatchExport() {
  const checked = tableApi.grid?.getCheckboxRecords() as BizSubmissionDocument[];
  if (!checked || checked.length === 0) {
    message.warning('请至少勾选一个文档');
    return;
  }
  message.loading({ content: `正在导出 ${checked.length} 个文档...`, key: 'batch-export', duration: 0 });
  let successCount = 0;
  for (const row of checked) {
    if (!row.id) continue;
    exportingIds.value.add(row.id);
    try {
      const blob = await exportDocument(row.id, exportFormat.value);
      const fileName = `${row.documentName || '标书文档'}_v${row.version}.${exportFormat.value}`;
      triggerDownload(blob, fileName);
      successCount++;
    } catch {
      message.error(`${row.documentName} 导出失败`);
    } finally {
      exportingIds.value.delete(row.id);
    }
  }
  message.success({ content: `已导出 ${successCount} 个文档`, key: 'batch-export' });
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

function handlePrev() {
  emit('prev');
}

function handleFinish() {
  message.success('标书生成完成');
  emit('back');
}
</script>

<template>
  <div class="step3-export">
    <!-- 顶部工具栏 -->
    <div class="export-toolbar">
      <div class="toolbar-left">
        <span class="toolbar-title">导出格式：</span>
        <RadioGroup v-model:value="exportFormat" button-style="solid" size="small">
          <Radio.Button value="docx">
            <FileWordOutlined style="color: #2b579a; margin-right: 4px;" />
            Word (.docx)
          </Radio.Button>
          <Radio.Button value="pdf">
            <FilePdfOutlined style="color: #e74c3c; margin-right: 4px;" />
            PDF
          </Radio.Button>
        </RadioGroup>
      </div>
      <div class="toolbar-right">
        <Space>
          <Button @click="tableApi.reload()">刷新</Button>
          <Button :loading="savingVersion" @click="handleSaveVersion">
            <PushpinOutlined />
            归纳为新版本
          </Button>
          <Button type="primary" @click="handleBatchExport">
            <DownloadOutlined />
            批量导出
          </Button>
        </Space>
      </div>
    </div>

    <!-- VXE 表格 -->
    <div :style="tableCssVars" class="table-wrapper">
      <ExportTable>
        <!-- 文档名称（加粗） -->
        <template #documentName="{ row }">
          <span class="doc-name-main">{{ row.documentName || '-' }}</span>
        </template>

        <!-- 文档类型 Tag -->
        <template #documentType="{ row }">
          <Tag :color="getDocTypeInfo(row.documentType).color">
            {{ getDocTypeInfo(row.documentType).label }}
          </Tag>
        </template>

        <!-- 版本号 Tag（青色=最新） -->
        <template #version="{ row }">
          <Tag :color="row.isLatest === '1' ? 'cyan' : 'default'">
            v{{ row.version ?? 1 }}
          </Tag>
        </template>

        <!-- 生成状态 -->
        <template #generationStatus="{ row }">
          <Tag :color="getStatusColor(row.generationStatus)">
            {{ getStatusText(row.generationStatus) }}
          </Tag>
        </template>

        <!-- 操作列 -->
        <template #action="{ row }">
          <Tooltip :title="`导出 ${exportFormat === 'docx' ? 'Word' : 'PDF'}`">
            <Button
              type="link"
              size="small"
              :loading="exportingIds.has(row.id)"
              :disabled="row.generationStatus !== 'completed'"
              @click="handleExportSingle(row)"
            >
              <DownloadOutlined />
              导出
            </Button>
          </Tooltip>
        </template>
      </ExportTable>
    </div>

    <!-- 底部操作 -->
    <div class="action-bar">
      <Button @click="handlePrev">上一步</Button>
      <Button type="primary" @click="handleFinish">完成</Button>
    </div>

  </div>
</template>

<style scoped lang="less">
.step3-export {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
  gap: 16px;

  .export-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: #fff;
    border: 1px solid #f0f0f0;
    border-radius: 8px;

    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 12px;

      .toolbar-title {
        font-weight: 500;
        color: rgba(0, 0, 0, 0.65);
        white-space: nowrap;
      }
    }
  }

  .table-wrapper {
    flex: 1;
    min-height: 0;
    background: #fff;
    border: 1px solid #f0f0f0;
    border-radius: 8px;
    overflow: hidden;

    .doc-name-main {
      font-weight: 600;
      color: rgba(0, 0, 0, 0.88);
    }
  }

  .action-bar {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 0 0;
    border-top: 1px solid #f0f0f0;
  }
}
</style>
