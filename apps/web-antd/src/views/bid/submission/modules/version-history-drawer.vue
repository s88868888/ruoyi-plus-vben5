<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Button, Drawer, message, Tag } from 'ant-design-vue';
import { DownloadOutlined, HistoryOutlined } from '@ant-design/icons-vue';
import type { VxeGridProps } from '#/adapter/vxe-table';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { useListTablePreference } from '#/preferences/userPreference';
import {
  exportDocument,
  getDocumentVersions,
  type BizSubmissionDocument,
} from '#/api/bid/submissionDocument';

interface Props {
  documentConfigId?: string;
  documentName?: string;
  exportFormat?: 'docx' | 'pdf';
}

const props = withDefaults(defineProps<Props>(), {
  exportFormat: 'docx',
});

const tablePreference = useListTablePreference();
const tableCssVars = computed(() => ({
  '--list-header-bg': tablePreference.headerBgColor,
  '--list-header-color': tablePreference.headerTextColor,
  '--list-header-padding-y': `${tablePreference.headerPaddingY}px`,
  '--list-cell-padding-y': `${tablePreference.cellPaddingY}px`,
}));

const visible = ref(false);
const exportingId = ref<string | null>(null);

function open() {
  visible.value = true;
  setTimeout(() => tableApi.reload(), 80);
}

function close() {
  visible.value = false;
}

defineExpose({ open, close });

const gridOptions: VxeGridProps = {
  height: 420,
  columns: [
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
      title: '状态',
      width: 100,
      slots: { default: 'status' },
      headerAlign: 'center',
      align: 'center',
    },
    {
      field: 'isLatest',
      title: '最新',
      width: 80,
      headerAlign: 'center',
      align: 'center',
      slots: { default: 'isLatest' },
    },
    {
      field: 'createTime',
      title: '保存时间',
      minWidth: 180,
      formatter: ({ cellValue }: any) => cellValue || '-',
    },
    {
      field: 'action',
      title: '操作',
      width: 160,
      fixed: 'right',
      slots: { default: 'action' },
    },
  ],
  keepSource: true,
  pagerConfig: { enabled: false },
  proxyConfig: {
    ajax: {
      query: async () => {
        if (!props.documentConfigId) return { rows: [], total: 0 };
        const data = await getDocumentVersions(props.documentConfigId);
        return { rows: data || [], total: (data || []).length };
      },
    },
  },
  rowConfig: { keyField: 'id', isCurrent: true },
  id: 'version-history-grid',
};

const [VersionTable, tableApi] = useVbenVxeGrid({ gridOptions } as any);

watch(
  () => props.documentConfigId,
  () => {
    if (visible.value && props.documentConfigId) {
      tableApi.reload();
    }
  },
);

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

async function handleExport(record: BizSubmissionDocument, format: 'docx' | 'pdf') {
  exportingId.value = record.id;
  try {
    const blob = await exportDocument(record.id, format);
    const fileName = `${record.documentName || '标书文档'}_v${record.version}.${format}`;
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    message.success(`${fileName} 导出成功`);
  } catch {
    message.error('导出失败，请重试');
  } finally {
    exportingId.value = null;
  }
}
</script>

<template>
  <Drawer
    v-model:open="visible"
    :title="`历史版本 - ${props.documentName || '文档'}`"
    width="760"
    :destroy-on-close="false"
  >
    <template #extra>
      <HistoryOutlined style="font-size: 16px; color: #999;" />
    </template>

    <div :style="tableCssVars">
      <VersionTable>
        <template #version="{ row }">
          <Tag :color="row.isLatest === '1' ? 'cyan' : 'default'">
            v{{ row.version }}
          </Tag>
        </template>
        <template #isLatest="{ row }">
          <Tag v-if="row.isLatest === '1'" color="cyan">最新</Tag>
          <span v-else style="color: #ccc;">-</span>
        </template>
        <template #status="{ row }">
          <Tag :color="getStatusColor(row.generationStatus)">
            {{ getStatusText(row.generationStatus) }}
          </Tag>
        </template>
        <template #action="{ row }">
          <Button
            type="link"
            size="small"
            :loading="exportingId === row.id"
            @click="handleExport(row, 'docx')"
          >
            <DownloadOutlined />
            Word
          </Button>
          <Button
            type="link"
            size="small"
            :loading="exportingId === row.id"
            @click="handleExport(row, 'pdf')"
          >
            <DownloadOutlined />
            PDF
          </Button>
        </template>
      </VersionTable>
    </div>

    <template #footer>
      <Button @click="close">关闭</Button>
    </template>
  </Drawer>
</template>
