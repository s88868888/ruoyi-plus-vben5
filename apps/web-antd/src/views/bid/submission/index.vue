<script setup lang="ts">
import type { VxeGridProps } from '#/adapter/vxe-table';
import type { BizBidSubmission } from '#/api/bid/submission';

import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { getVxePopupContainer } from '@vben/utils';
import { Button, Dropdown, Menu, MenuItem, Modal, Popconfirm, Progress, Space, Tag, message } from 'ant-design-vue';
import { EllipsisOutlined, PlusOutlined } from '@ant-design/icons-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  cancelSubmissionGeneration,
  regenerateSubmission,
  startSubmissionGeneration,
  submissionList,
  submissionRemove,
} from '#/api/bid/submission';
import { useListTablePreference } from '#/preferences/userPreference';

import CommonFilter from '#/components/CommonFilter/index.vue';
import ProgressModal from './modules/progress-modal.vue';

const router = useRouter();
const tablePreference = useListTablePreference();

const tableCssVars = computed(() => ({
  '--list-header-bg': tablePreference.headerBgColor,
  '--list-header-color': tablePreference.headerTextColor,
  '--list-header-padding-y': `${tablePreference.headerPaddingY}px`,
  '--list-cell-padding-y': `${tablePreference.cellPaddingY}px`,
}));

// 筛选条件数据
const filterData = ref([
  {
    field: 'projectName',
    label: '项目名称',
    type: 'a-input',
    data: '',
    isCommon: true,
  },
  {
    field: 'bidOrg',
    label: '招标单位',
    type: 'a-input',
    data: '',
    isCommon: false,
  },
  {
    field: 'submissionStatus',
    label: '投标状态',
    type: 'a-select',
    data: '',
    options: [
      { label: '草稿', value: 'draft' },
      { label: '生成中', value: 'generating' },
      { label: '已完成', value: 'completed' },
      { label: '失败', value: 'failed' },
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

// 状态标签颜色
const statusColors: Record<string, string> = {
  draft: 'default',
  generating: 'processing',
  completed: 'success',
  failed: 'error',
};

// 状态标签文本
const statusLabels: Record<string, string> = {
  draft: '草稿',
  generating: '生成中',
  completed: '已完成',
  failed: '失败',
};

// 解析关联公司JSON
function parseCompanies(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) {
      return parsed.map((item: any) => typeof item === 'object' ? (item.companyName || item.name || String(item.id)) : String(item));
    }
    return [];
  } catch {
    return [];
  }
}

// 表格配置
const gridOptions: VxeGridProps = {
  checkboxConfig: {
    highlight: true,
    reserve: true,
  },
  height: 'auto',
  columns: [
    { type: 'checkbox', width: 50 },
    {
      field: 'projectName',
      title: '项目名称',
      minWidth: 220,
      headerAlign: 'left',
      align: 'left',
      slots: { default: 'projectName' },
    },
    {
      field: 'submissionStatus',
      title: '投标状态',
      width: 100,
      slots: { default: 'submissionStatus' },
    },
    {
      field: 'selectedCompanies',
      title: '关联公司',
      minWidth: 160,
      headerAlign: 'left',
      align: 'left',
      slots: { default: 'selectedCompanies' },
    },
    {
      field: 'generationProgress',
      title: '生成进度',
      width: 140,
      slots: { default: 'generationProgress' },
    },
    {
      field: 'documentStats',
      title: '文档完成',
      width: 110,
      headerAlign: 'center',
      align: 'center',
      slots: { default: 'documentStats' },
    },
    {
      field: 'chapterStructureGenerated',
      title: '章节结构',
      width: 100,
      headerAlign: 'center',
      align: 'center',
      slots: { default: 'chapterStructure' },
    },
    {
      field: 'startTime',
      title: '开始生成时间',
      width: 160,
      headerAlign: 'left',
      align: 'left',
      formatter: ({ cellValue }: any) => cellValue?.replace(/:\d{2}$/, '') || '-',
    },
    {
      field: 'endTime',
      title: '完成时间',
      width: 160,
      headerAlign: 'left',
      align: 'left',
      formatter: ({ cellValue }: any) => cellValue?.replace(/:\d{2}$/, '') || '-',
    },
    {
      field: 'createTime',
      title: '创建时间',
      width: 160,
      headerAlign: 'left',
      align: 'left',
      formatter: ({ cellValue }: any) => cellValue?.replace(/:\d{2}$/, '') || '-',
    },
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
        const params: any = {
          pageNum: page.currentPage,
          pageSize: page.pageSize,
          ...formValues,
          ...searchParams.value,
        };
        return await submissionList(params);
      },
    },
  },
  rowConfig: {
    keyField: 'id',
  },
  id: 'bid-submission-index',
};

const [BasicTable, tableApi] = useVbenVxeGrid({
  gridOptions,
} as any);

// 进度弹窗
const progressModalOpen = ref(false);
const currentSubmissionId = ref<number>();

// 新增
function handleAdd() {
  message.info('请从招标项目列表中点击"转为投标项目"按钮创建');
}

// 查看详情
function handleView(record: BizBidSubmission) {
  router.push(`/bid/submission/detail/${record.id}`);
}

// 配置文档
function handleConfig(record: BizBidSubmission) {
  router.push(`/bid/submission/config/${record.id}`);
}

// 开始生成
function handleGenerate(record: BizBidSubmission) {
  // 跳转到生成页面
  router.push(`/bid/submission/generate/${record.id}`);
}

// 查看进度
function handleViewProgress(record: BizBidSubmission) {
  currentSubmissionId.value = record.id;
  progressModalOpen.value = true;
}

// 取消生成
function handleCancel(record: BizBidSubmission) {
  Modal.confirm({
    title: '确认取消',
    content: '确定要取消生成任务吗？',
    async onOk() {
      if (!record.id) return;
      await cancelSubmissionGeneration(record.id);
      message.success('已取消生成');
      await tableApi.query();
    },
  });
}

// 重新生成
function handleRegenerate(record: BizBidSubmission) {
  Modal.confirm({
    title: '确认重新生成',
    content: `确定要重新生成"${record.projectName}"的标书吗？`,
    async onOk() {
      if (!record.id) return;
      await regenerateSubmission(record.id);
      message.success('已开始重新生成');
      await tableApi.query();
    },
  });
}

// 删除
async function handleDelete(record: BizBidSubmission) {
  if (!record.id) return;
  await submissionRemove([record.id]);
  message.success('删除成功');
  await tableApi.query();
}

// 进度弹窗关闭回调
function handleProgressModalClose() {
  tableApi.query();
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
            <Button type="primary" @click="handleAdd">
              <PlusOutlined />
              新增
            </Button>
          </Space>
        </div>
      </div>

      <!-- 表格区域 -->
      <div class="table-style-wrapper flex-1 overflow-hidden" :style="tableCssVars">
        <BasicTable class="h-full" table-title="投标项目列表">
          <template #projectName="{ row }">
            <div class="flex flex-col">
              <span class="font-bold">{{ row.projectName }}</span>
              <span
                v-if="row.bidOrg"
                class="text-xs text-gray-400 overflow-hidden text-ellipsis whitespace-nowrap"
                :title="row.bidOrg"
              >
                {{ row.bidOrg }}
              </span>
            </div>
          </template>

          <template #submissionStatus="{ row }">
            <Tag :color="statusColors[row.submissionStatus]">
              {{ statusLabels[row.submissionStatus] || row.submissionStatus }}
            </Tag>
          </template>

          <template #selectedCompanies="{ row }">
            <template v-if="parseCompanies(row.selectedCompanies).length > 0">
              <Space :size="4" wrap>
                <Tag
                  v-for="company in parseCompanies(row.selectedCompanies)"
                  :key="company"
                  color="blue"
                >
                  {{ company }}
                </Tag>
              </Space>
            </template>
            <span v-else class="text-gray-400">未关联</span>
          </template>

          <template #generationProgress="{ row }">
            <Progress
              :percent="row.generationProgress || 0"
              :status="row.submissionStatus === 'failed' ? 'exception' : row.submissionStatus === 'completed' ? 'success' : 'active'"
              size="small"
            />
          </template>

          <template #documentStats="{ row }">
            <span>
              {{ row.completedDocuments || 0 }}/{{ row.totalDocuments || 0 }}
              <span v-if="row.failedDocuments" class="text-red-500">
                ({{ row.failedDocuments }}失败)
              </span>
            </span>
          </template>

          <template #chapterStructure="{ row }">
            <Tag :color="row.chapterStructureGenerated === 'Y' ? 'success' : 'default'">
              {{ row.chapterStructureGenerated === 'Y' ? '已生成' : '未生成' }}
            </Tag>
          </template>

          <template #action="{ row }">
            <Space>
              <ghost-button
                v-if="row.submissionStatus === 'draft'"
                @click.stop="handleConfig(row)"
              >
                配置文档
              </ghost-button>
              <ghost-button
                v-if="row.submissionStatus === 'generating'"
                @click.stop="handleViewProgress(row)"
              >
                查看进度
              </ghost-button>
              <Dropdown placement="bottomRight">
                <template #overlay>
                  <Menu>
                    <MenuItem key="view" @click="handleView(row)">
                      查看详情
                    </MenuItem>
                    <MenuItem
                      v-if="row.submissionStatus === 'draft'"
                      key="config"
                      @click="handleConfig(row)"
                    >
                      配置文档
                    </MenuItem>
                    <MenuItem
                      v-if="row.submissionStatus === 'generating'"
                      key="cancel"
                      @click="handleCancel(row)"
                    >
                      取消生成
                    </MenuItem>
                    <MenuItem
                      v-if="row.submissionStatus === 'failed' || row.submissionStatus === 'completed'"
                      key="regenerate"
                      @click="handleRegenerate(row)"
                    >
                      重新生成
                    </MenuItem>
                    <MenuItem key="delete">
                      <Popconfirm
                        :get-popup-container="getVxePopupContainer"
                        placement="left"
                        :title="`确认删除项目【${row.projectName}】吗？`"
                        @confirm="handleDelete(row)"
                      >
                        <span class="text-red-500">删除</span>
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

    <!-- 进度弹窗 -->
    <ProgressModal
      v-model:open="progressModalOpen"
      :submission-id="currentSubmissionId"
      @update:open="handleProgressModalClose"
    />
  </Page>
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

/* 表头上下内边距（作用于 th 元素） */
.table-style-wrapper :deep(.vxe-header--column) {
  padding-top: var(--list-header-padding-y) !important;
  padding-bottom: var(--list-header-padding-y) !important;
}

/* 单元格上下内边距（作用于 td 元素） */
.table-style-wrapper :deep(.vxe-body--column) {
  padding-top: var(--list-cell-padding-y) !important;
  padding-bottom: var(--list-cell-padding-y) !important;
}
</style>
