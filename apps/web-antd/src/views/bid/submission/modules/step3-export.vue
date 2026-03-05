<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Button, message, Space, Tag, Tooltip } from 'ant-design-vue';
import {
  DownloadOutlined,
  PushpinOutlined,
} from '@ant-design/icons-vue';
import type { VxeGridProps } from '#/adapter/vxe-table';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { useListTablePreference } from '#/preferences/userPreference';
import {
  exportDocument,
  getAllDocumentList,
  saveAllDocumentVersion,
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

// 导出格式，固定为 docx
const exportFormat = 'docx';

// 记录正在导出的行
const exportingIds = ref<Set<string>>(new Set());

// 归纳为新版本
const savingVersion = ref(false);

async function handleSaveVersion() {
  savingVersion.value = true;
  try {
    await saveAllDocumentVersion(props.submissionId);
    message.success('已归纳所有章节为新版本');
    tableApi.reload();
  } catch {
    message.error('归纳失败，请重试');
  } finally {
    savingVersion.value = false;
  }
}

// VXE Grid 配置
const gridOptions: VxeGridProps = {
  height: 'auto',
  checkboxConfig: { highlight: true, labelField: '' },
  columns: [
    { type: 'checkbox', width: 50, fixed: 'left' },
    { type: 'seq', width: 60, title: '序号' },
    {
      field: 'documentName',
      title: '文档名称',
      minWidth: 220,
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
      width: 80,
      align: 'center',
      formatter: ({ cellValue }: any) => (cellValue != null ? `v${cellValue}` : '-'),
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
        const data = await getAllDocumentList(props.submissionId);
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
    const blob = await exportDocument(row.id, exportFormat);
    const fileName = `${row.documentName || '标书文档'}_v${row.version}.${exportFormat}`;
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
      const blob = await exportDocument(row.id, exportFormat);
      const fileName = `${row.documentName || '标书文档'}_v${row.version}.${exportFormat}`;
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

        <!-- 生成状态 -->
        <template #generationStatus="{ row }">
          <Tag :color="getStatusColor(row.generationStatus)">
            {{ getStatusText(row.generationStatus) }}
          </Tag>
        </template>

        <!-- 操作列 -->
        <template #action="{ row }">
          <Tooltip title="导出 Word">
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
    justify-content: flex-end;
    padding: 12px 16px;
    background: #fff;
    border: 1px solid #f0f0f0;
    border-radius: 8px;
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
