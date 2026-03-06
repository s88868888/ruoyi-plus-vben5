<script setup lang="ts">
import type { VxeGridProps } from '#/adapter/vxe-table';
import type { BizDocumentConfig } from '#/api/bid/documentConfig';

import type { BizSubmissionChapter } from '#/api/bid/chapter';

import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { Button, message, Modal, Space, Tag, Dropdown, Menu, MenuItem } from 'ant-design-vue';
import { FileTextOutlined, PlusOutlined, EllipsisOutlined } from '@ant-design/icons-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { addConfig, deleteConfig, getDocumentConfigList } from '#/api/bid/documentConfig';
import { getChapterTree } from '#/api/bid/chapter';
import { submissionInfo } from '#/api/bid/submission';
import { useListTablePreference } from '#/preferences/userPreference';
import DocumentConfigDrawer from './modules/document-config-drawer.vue';

const route = useRoute();
const router = useRouter();
const tablePreference = useListTablePreference();

const submissionId = computed(() => route.params.id as string);
const submissionData = ref<any>({});

const tableCssVars = computed(() => ({
  '--list-header-bg': tablePreference.headerBgColor,
  '--list-header-color': tablePreference.headerTextColor,
  '--list-header-padding-y': `${tablePreference.headerPaddingY}px`,
  '--list-cell-padding-y': `${tablePreference.cellPaddingY}px`,
}));

// 全量配置，用于统计卡片
const allConfigs = ref<BizDocumentConfig[]>([]);

// 每个配置对应的章节统计（configId -> stats）
const chapterStatsMap = ref<Record<number, { totalArticles: number; completedArticles: number; generatingArticles: number; pendingArticles: number }>>({});

/** 从章节树中提取所有叶子节点（无 children 的节点才是文章） */
function collectLeafNodes(nodes: BizSubmissionChapter[]): BizSubmissionChapter[] {
  const leaves: BizSubmissionChapter[] = [];
  function walk(list: BizSubmissionChapter[]) {
    for (const node of list) {
      if (node.children && node.children.length > 0) {
        walk(node.children);
      } else {
        leaves.push(node);
      }
    }
  }
  walk(nodes);
  return leaves;
}

/** 加载所有配置的章节统计 */
async function loadAllChapterStats() {
  const map: Record<number, { totalArticles: number; completedArticles: number; generatingArticles: number; pendingArticles: number }> = {};
  await Promise.all(
    allConfigs.value.map(async (config) => {
      if (!config.id) return;
      try {
        const tree = await getChapterTree({ submissionId: submissionId.value, documentId: String(config.id) });
        const leaves = collectLeafNodes(tree || []);
        const completed = leaves.filter((l) => l.generationStatus === 'completed').length;
        const generating = leaves.filter((l) => l.generationStatus === 'generating').length;
        map[config.id] = {
          totalArticles: leaves.length,
          completedArticles: completed,
          generatingArticles: generating,
          pendingArticles: leaves.length - completed - generating,
        };
      } catch {
        map[config.id!] = { totalArticles: 0, completedArticles: 0, generatingArticles: 0, pendingArticles: 0 };
      }
    }),
  );
  chapterStatsMap.value = map;
}

/** 获取某个配置的章节统计 */
function getConfigChapterStats(configId?: number) {
  if (!configId) return { totalArticles: 0, completedArticles: 0, generatingArticles: 0, pendingArticles: 0 };
  return chapterStatsMap.value[configId] || { totalArticles: 0, completedArticles: 0, generatingArticles: 0, pendingArticles: 0 };
}

const documentStats = computed(() => {
  const stats = { technical: 0, commercial: 0, complete: 0, total: 0, generated: 0, generating: 0, pending: 0 };
  allConfigs.value.forEach((config) => {
    if (config.documentType === 'technical') stats.technical++;
    else if (config.documentType === 'commercial') stats.commercial++;
    else if (config.documentType === 'complete') stats.complete++;
  });
  stats.total = stats.technical + stats.commercial + stats.complete;

  // 已生成/生成中/待生成 基于叶子章节（文章）统计
  Object.values(chapterStatsMap.value).forEach((s) => {
    stats.generated += s.completedArticles;
    stats.generating += s.generatingArticles;
    stats.pending += s.pendingArticles;
  });
  return stats;
});

// 关联公司数
const companyCount = computed(() => {
  if (!submissionData.value?.selectedCompanies) return 0;
  try {
    const companies = JSON.parse(submissionData.value.selectedCompanies);
    return Array.isArray(companies) ? companies.length : 0;
  } catch {
    return 0;
  }
});

const documentTypeMap: Record<string, string> = {
  commercial: '商务标',
  technical: '技术标',
  complete: '整本标书',
};

const documentTypeColors: Record<string, string> = {
  commercial: 'blue',
  technical: 'green',
  complete: 'orange',
};

// 表格配置
const gridOptions: VxeGridProps = {
  height: 'auto',
  columns: [
    { type: 'seq', width: 60, title: '序号' },
    {
      field: 'companyName',
      title: '公司名称',
      minWidth: 200,
      headerAlign: 'left',
      align: 'left',
    },
    {
      field: 'documentType',
      title: '文档类型',
      width: 120,
      slots: { default: 'documentType' },
    },
    {
      field: 'documentNo',
      title: '同类型序号',
      width: 120,
      headerAlign: 'center',
      align: 'center',
    },
    {
      field: 'remark',
      title: '备注',
      minWidth: 180,
      headerAlign: 'left',
      align: 'left',
      formatter: ({ cellValue }: any) => cellValue || '-',
    },
    {
      field: 'catalogCount',
      title: '目录数',
      width: 100,
      headerAlign: 'center',
      align: 'center',
      slots: { default: 'catalogCount' },
    },
    {
      field: 'chapterStatus',
      title: '章节状态',
      width: 160,
      headerAlign: 'center',
      align: 'center',
      slots: { default: 'chapterStatus' },
    },
    {
      field: 'action',
      title: '操作',
      width: 140,
      fixed: 'right',
      slots: { default: 'action' },
    },
  ],
  keepSource: true,
  pagerConfig: {},
  proxyConfig: {
    ajax: {
      query: async ({ page }) => {
        const configs = await getDocumentConfigList(submissionId.value as any);
        allConfigs.value = configs;
        // 异步加载章节统计（不阻塞表格渲染）
        loadAllChapterStats();
        const start = (page.currentPage - 1) * page.pageSize;
        return {
          rows: configs.slice(start, start + page.pageSize),
          total: configs.length,
        };
      },
    },
  },
  rowConfig: { keyField: 'id' },
  id: 'bid-document-config',
};

const [BasicTable, tableApi] = useVbenVxeGrid({ gridOptions } as any);

// 加载投标项目信息（用于顶部信息卡片）
async function loadSubmissionInfo() {
  try {
    const data = await submissionInfo(submissionId.value);
    submissionData.value = data || {};
  } catch {
    message.error('加载项目信息失败');
  }
}

// 格式化预算金额
function formatBudget(amount?: number) {
  if (!amount) return '-';
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// 项目类型
function getProjectTypeLabel(type?: string) {
  const typeMap: Record<string, string> = { engineering: '工程', goods: '货物', service: '服务' };
  return type ? typeMap[type] || type : '-';
}

function getProjectTypeColor(type?: string) {
  const colorMap: Record<string, string> = { engineering: 'blue', goods: 'green', service: 'orange' };
  return type ? colorMap[type] || 'default' : 'default';
}

// 招标方式
function getBidMethodLabel(method?: string) {
  const methodMap: Record<string, string> = {
    public: '公开招标',
    invite: '邀请招标',
    competitive: '竞争性谈判',
    inquiry: '询价采购',
    single: '单一来源',
  };
  return method ? methodMap[method] || method : '-';
}

// 抽屉引用
const documentConfigDrawerRef = ref<InstanceType<typeof DocumentConfigDrawer>>();

function handleAdd() {
  documentConfigDrawerRef.value?.drawerApi.open();
}

async function handleDrawerSuccess(data: any) {
  try {
    // 计算下一个可用的序号
    const existingConfigs = allConfigs.value.filter(
      (c) => c.companyId === data.companyId && c.documentType === data.documentType
    );
    const maxNo = existingConfigs.length > 0
      ? Math.max(...existingConfigs.map((c) => c.documentNo || 0))
      : 0;
    const nextNo = maxNo + 1;

    await addConfig({
      bidSubmissionId: submissionId.value as any,
      companyId: data.companyId,
      companyName: data.companyName,
      documentType: data.documentType,
      documentNo: nextNo,
      remark: data.remark,
    });
    message.success('添加成功');
    tableApi.query();
  } catch {
    message.error('添加失败');
  }
}

function handleDelete(row: BizDocumentConfig) {
  if (!row.id) return;
  Modal.confirm({
    title: '确认删除该配置吗？',
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      await deleteConfig(row.id!);
      message.success('删除成功');
      tableApi.query();
    },
  });
}

function handleStartGenerate(row: BizDocumentConfig) {
  if (!row.id) {
    message.warning('文档配置ID不存在');
    return;
  }
  router.push(`/bid/submission/generate/${submissionId.value}/${row.id}`);
}

function handleBack() {
  router.push('/bid/submission');
}

onMounted(() => {
  loadSubmissionInfo();
});
</script>

<template>
  <Page :auto-content-height="true">
    <div class="flex h-full flex-col gap-4">

      <!-- 顶部基本信息卡片 -->
      <div class="header-card">
        <div class="header-title-row">
          <span class="header-project-name">{{ submissionData?.projectName || '投标项目配置' }}</span>
          <Button @click="handleBack">返回列表</Button>
        </div>
        <div class="header-metrics-row">
          <div class="header-metric">
            <div class="header-metric-label">招标单位</div>
            <div class="header-metric-value">{{ submissionData?.bidOrg || '-' }}</div>
          </div>
          <div class="header-metric">
            <div class="header-metric-label">项目类型</div>
            <div class="header-metric-value">
              <Tag v-if="submissionData?.projectType" :color="getProjectTypeColor(submissionData.projectType)">
                {{ getProjectTypeLabel(submissionData.projectType) }}
              </Tag>
              <span v-else>-</span>
            </div>
          </div>
          <div class="header-metric">
            <div class="header-metric-label">预算金额</div>
            <div class="header-metric-value">
              <span class="text-orange-500">{{ formatBudget(submissionData?.budgetAmount) }}</span>
            </div>
          </div>
          <div class="header-metric">
            <div class="header-metric-label">项目地区</div>
            <div class="header-metric-value">{{ submissionData?.projectRegion || '-' }}</div>
          </div>
          <div class="header-metric">
            <div class="header-metric-label">招标方式</div>
            <div class="header-metric-value">{{ getBidMethodLabel(submissionData?.bidMethod) }}</div>
          </div>
          <div class="header-metric">
            <div class="header-metric-label">关联公司数</div>
            <div class="header-metric-value">{{ companyCount }}</div>
          </div>
        </div>
      </div>

      <!-- 数据总览卡片 -->
      <div class="overview-card">
        <div class="overview-stats">
          <div class="stat-item">
            <div class="stat-label">技术标</div>
            <div class="stat-value">{{ documentStats.technical }}</div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <div class="stat-label">商务标</div>
            <div class="stat-value">{{ documentStats.commercial }}</div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <div class="stat-label">整份标书</div>
            <div class="stat-value">{{ documentStats.complete }}</div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item stat-item-total">
            <div class="stat-label">总数</div>
            <div class="stat-value stat-value-total">{{ documentStats.total }}</div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <div class="stat-label">已生成文章</div>
            <div class="stat-value" style="color: #52c41a">{{ documentStats.generated }}</div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <div class="stat-label">生成中文章</div>
            <div class="stat-value" style="color: #1890ff">{{ documentStats.generating }}</div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <div class="stat-label">待生成文章</div>
            <div class="stat-value" style="color: #909399">{{ documentStats.pending }}</div>
          </div>
        </div>
      </div>

      <!-- 配置卡片：标题栏 + 表格 -->
      <div class="config-card flex-1 overflow-hidden flex flex-col">
        <!-- 卡片头 -->
        <div class="config-card-head">
          <span class="card-title">
            <FileTextOutlined class="card-title-icon" />
            标书配置
          </span>
          <Button type="primary" size="small" @click="handleAdd">
            <PlusOutlined />
            添加配置
          </Button>
        </div>
        <!-- 表格区域 -->
        <div class="table-style-wrapper flex-1 overflow-hidden" :style="tableCssVars">
          <BasicTable class="h-full">
            <template #documentType="{ row }">
              <Tag :color="documentTypeColors[row.documentType]">
                {{ documentTypeMap[row.documentType] || row.documentType }}
              </Tag>
            </template>

            <template #catalogCount="{ row }">
              {{ getConfigChapterStats(row.id).totalArticles || '-' }}
            </template>

            <template #chapterStatus="{ row }">
              <template v-if="getConfigChapterStats(row.id).totalArticles > 0">
                <span class="chapter-status-cell">
                  <span class="chapter-status-completed">{{ getConfigChapterStats(row.id).completedArticles }}</span>
                  <span class="chapter-status-sep">/</span>
                  <span class="chapter-status-total">{{ getConfigChapterStats(row.id).totalArticles }}</span>
                  <span class="chapter-status-label">篇</span>
                </span>
              </template>
              <span v-else class="chapter-status-empty">未生成</span>
            </template>

            <template #action="{ row }">
              <Space>
                <ghost-button @click.stop="handleStartGenerate(row)">
                  {{ getConfigChapterStats(row.id).completedArticles > 0 && getConfigChapterStats(row.id).completedArticles === getConfigChapterStats(row.id).totalArticles ? '查看' : '开始生成' }}
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
      </div>

    </div>

    <!-- 添加配置抽屉 -->
    <DocumentConfigDrawer
      ref="documentConfigDrawerRef"
      @success="handleDrawerSuccess"
    />
  </Page>
</template>

<style scoped>
/* 顶部基本信息卡片 */
.header-card {
  background: #fff;
  padding: 24px 32px;
  border: 1px solid #d8d8d8;
  border-radius: 16px;
  flex-shrink: 0;
}

.header-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.header-project-name {
  font-size: 20px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.header-metrics-row {
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
  column-gap: 32px;
  row-gap: 16px;
  padding: 16px 0 0;
  border-top: 1px solid #f0f0f0;
}

.header-metric {
  padding: 0;
  min-width: 140px;
}

.header-metric-label {
  color: #909399;
  font-size: 13px;
  line-height: 20px;
  margin-bottom: 4px;
}

.header-metric-value {
  color: rgba(0, 0, 0, 0.88);
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
}

.text-orange-500 {
  color: #ff7849;
}

/* 数据总览卡片 */
.overview-card {
  background: #fff;
  border: 1px solid #d8d8d8;
  border-radius: 16px;
  padding: 12px 24px;
  flex-shrink: 0;
}

.overview-stats {
  display: flex;
  align-items: center;
  justify-content: space-around;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.stat-label {
  color: #909399;
  font-size: 14px;
  line-height: 22px;
}

.stat-value {
  color: rgba(0, 0, 0, 0.88);
  font-size: 28px;
  font-weight: 600;
  line-height: 36px;
}

.stat-item-total .stat-label {
  color: rgba(0, 0, 0, 0.88);
  font-weight: 600;
}

.stat-value-total {
  color: #1890ff;
  font-size: 32px;
}

.stat-divider {
  width: 1px;
  height: 40px;
  background: #f0f0f0;
}

/* 配置卡片 */
.config-card {
  background: #fff;
  border: 1px solid #d8d8d8;
  border-radius: 16px;
  overflow: hidden;
}

.config-card-head {
  padding: 10px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
}

.card-title-icon {
  color: hsl(var(--primary));
  font-size: 16px;
  margin-right: 8px;
}

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

/* 章节状态单元格 */
.chapter-status-cell {
  /* display: flex; */
  /* align-items: center; */
  gap: 2px;
  font-size: 14px;
}

.chapter-status-completed {
  color: #52c41a;
  font-weight: 600;
}

.chapter-status-sep {
  color: #d9d9d9;
  margin: 0 2px;
}

.chapter-status-total {
  color: rgba(0, 0, 0, 0.65);
  font-weight: 600;
}

.chapter-status-label {
  color: #909399;
  font-size: 12px;
  margin-left: 2px;
}

.chapter-status-empty {
  color: #909399;
  font-size: 13px;
}
</style>
