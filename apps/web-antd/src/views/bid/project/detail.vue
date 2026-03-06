<script setup lang="ts">
import type { BizBidProject } from '#/api/bid/project';
import type { BizDocumentConfig } from '#/api/bid/documentConfig';
import type { AnchorNavItem } from '#/components/anchor-nav';
import type { BizBidSubmission } from '#/api/bid/submission';

import { computed, onMounted, ref, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { MarkdownPreviewer } from '@vben/common-ui';
import { Card, Empty, Spin, Tag, Button, Space, Steps, Progress } from 'ant-design-vue';
import {
  DownloadOutlined,
  ExpandOutlined,
  FileTextOutlined,
  FullscreenExitOutlined,
  RobotOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  TrophyOutlined,
  RocketOutlined,
} from '@ant-design/icons-vue';

import { AnchorNav } from '#/components/anchor-nav';
import { bidProjectInfo } from '#/api/bid/project';
import { getDocumentConfigList } from '#/api/bid/documentConfig';
import { submissionList } from '#/api/bid/submission';
import { getChapterTree } from '#/api/bid/chapter';
import type { BizSubmissionChapter } from '#/api/bid/chapter';
import { useDetailPagePreference } from '#/preferences/userPreference';
import {
  formatCnyAmount,
  formatCnyScientific,
  formatCnyUppercase,
  formatDateOnly,
  formatRemainingDays,
} from './utils/format';

const route = useRoute();
const router = useRouter();

// 项目详情数据，从 query 参数读取初始 loading 状态
const projectDetail = ref<BizBidProject>({
  aiAnalysisStatus: route.query.analyzing === '1' ? 'analyzing' : undefined,
  scoringCriteriaStatus: route.query.extracting === '1' ? 'extracting' : undefined,
  matchAnalysisStatus: route.query.processing === '1' ? 'processing' : undefined,
});
const loading = ref(false);

// 自动刷新相关
const refreshTimer = ref<NodeJS.Timeout | null>(null);
const isRefreshing = ref(false);

// 布局偏好设置（响应式单例，设置面板修改后立即生效）
const layoutPreference = useDetailPagePreference();

// 锚点导航项配置
const anchorNavItems = ref<AnchorNavItem[]>([
  { key: 'basic-info', title: '基本信息' },
  { key: 'submission-progress', title: '投标进度' },
  { key: 'doc-config', title: '标书配置' },
  { key: 'bid-info', title: '招标信息' },
  { key: 'contact-info', title: '联系信息' },
  { key: 'match-analysis', title: '契合度分析' },
  { key: 'scoring-criteria', title: '评分标准' },
  { key: 'ai-analysis', title: 'AI 分析' },
]);

// 滚动容器引用
const scrollContainer = ref<HTMLElement | null>(null);

const containerStyle = computed(() => {
  if (layoutPreference.contentWidth > 0) {
    return {
      maxWidth: `${layoutPreference.contentWidth}px`,
      margin: '0 auto',
      padding: '20px 24px',
    };
  }
  return { padding: '20px' };
});

// 卡片圆角样式
const cardRadiusStyle = computed(() => ({
  borderRadius: `${layoutPreference.cardRadius}px`,
}));

// 内容字体样式
const contentFontStyle = computed(() => ({
  fontSize: `${layoutPreference.fontSize}px`,
}));

// 项目类型标签配置
const projectTypeConfig: Record<string, { label: string; color: string }> = {
  engineering: { label: '工程', color: 'blue' },
  goods: { label: '货物', color: 'green' },
  service: { label: '服务', color: 'orange' },
};

// 招标方式配置
const bidMethodConfig: Record<string, string> = {
  public: '公开招标',
  invite: '邀请招标',
  competitive: '竞争性谈判',
  inquiry: '询价采购',
  single: '单一来源',
};

// 项目来源配置
const projectSourceConfig: Record<string, { label: string; color: string }> = {
  manual: { label: '手动录入', color: 'default' },
  import: { label: '导入', color: 'blue' },
  crawl: { label: '爬虫采集', color: 'cyan' },
  ai: { label: 'AI 生成', color: 'purple' },
  quick_generate: { label: '快速生成', color: 'green' },
  ai_generate: { label: '手动录入', color: 'default' },
};

// 状态配置
const statusConfig: Record<string, { label: string; color: string }> = {
  following: { label: '跟进中', color: 'processing' },
  bid: { label: '已投标', color: 'warning' },
  won: { label: '已中标', color: 'success' },
  lost: { label: '未中标', color: 'error' },
  abandoned: { label: '已放弃', color: 'default' },
};

// 计算属性
const projectTypeLabel = computed(() => {
  const type = projectDetail.value.projectType;
  return type ? projectTypeConfig[type]?.label || type : '-';
});

const projectTypeColor = computed(() => {
  const type = projectDetail.value.projectType;
  return type ? projectTypeConfig[type]?.color || 'default' : 'default';
});

const bidMethodLabel = computed(() => {
  const method = projectDetail.value.bidMethod;
  return method ? bidMethodConfig[method] || method : '-';
});

const statusLabel = computed(() => {
  const status = projectDetail.value.status;
  return status ? statusConfig[status]?.label || status : '-';
});

const statusColor = computed(() => {
  const status = projectDetail.value.status;
  return status ? statusConfig[status]?.color || 'default' : 'default';
});

const projectSourceLabel = computed(() => {
  const source = projectDetail.value.projectSource;
  return source ? projectSourceConfig[source]?.label || source : '-';
});

const projectSourceColor = computed(() => {
  const source = projectDetail.value.projectSource;
  return source ? projectSourceConfig[source]?.color || 'default' : 'default';
});

const budgetAmountDisplay = computed(() => formatCnyAmount(projectDetail.value.budgetAmount));
const budgetAmountScientific = computed(() => formatCnyScientific(projectDetail.value.budgetAmount));
const budgetAmountUppercase = computed(() => formatCnyUppercase(projectDetail.value.budgetAmount));
const publishDateDisplay = computed(() => formatDateOnly(projectDetail.value.publishDate));
const deadlineDisplay = computed(() => formatDateOnly(projectDetail.value.deadline));
const remainingDaysDisplay = computed(() =>
  formatRemainingDays(projectDetail.value.publishDate, projectDetail.value.deadline),
);



const aiAnalysisContent = ref('');
const scoringCriteriaContent = ref('');
const matchAnalysisContent = ref('');

// 投标进度（基于标书配置汇总展示）
const submissions = ref<BizBidSubmission[]>([]);
const submissionsLoading = ref(false);
const progressConfigs = ref<BizDocumentConfig[]>([]);

// 每个配置对应的章节统计（configId -> stats）
const chapterStatsMap = ref<Record<number, { totalArticles: number; completedArticles: number; generatingArticles: number; pendingArticles: number }>>({});

/** 从章节树中提取所有叶子节点 */
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

/** 异步加载所有配置的章节统计 */
async function loadAllConfigChapterStats() {
  const map: Record<number, { totalArticles: number; completedArticles: number; generatingArticles: number; pendingArticles: number }> = {};
  await Promise.all(
    progressConfigs.value.map(async (cfg) => {
      if (!cfg.id || !cfg.bidSubmissionId) return;
      try {
        const tree = await getChapterTree({ submissionId: String(cfg.bidSubmissionId), documentId: String(cfg.id) });
        const leaves = collectLeafNodes(tree || []);
        const completed = leaves.filter((l) => l.generationStatus === 'completed').length;
        const generating = leaves.filter((l) => l.generationStatus === 'generating').length;
        map[cfg.id] = { totalArticles: leaves.length, completedArticles: completed, generatingArticles: generating, pendingArticles: leaves.length - completed - generating };
      } catch {
        map[cfg.id!] = { totalArticles: 0, completedArticles: 0, generatingArticles: 0, pendingArticles: 0 };
      }
    }),
  );
  chapterStatsMap.value = map;
}

function getConfigChapterStats(configId?: number) {
  if (!configId) return { totalArticles: 0, completedArticles: 0, generatingArticles: 0, pendingArticles: 0 };
  return chapterStatsMap.value[configId] || { totalArticles: 0, completedArticles: 0, generatingArticles: 0, pendingArticles: 0 };
}


const statusLabelsForSubmission: Record<string, string> = {
  draft: '草稿',
  configured: '已配置',
  generating: '生成中',
  generated: '已生成',
  submitted: '已投标',
  won: '中标',
  lost: '未中标',
  abandoned: '废标/放弃',
  failed: '失败',
};

const statusColorsForSubmission: Record<string, string> = {
  draft: 'default',
  configured: 'blue',
  generating: 'processing',
  generated: 'success',
  submitted: 'warning',
  won: 'success',
  lost: 'error',
  abandoned: 'default',
  failed: 'error',
};

const documentTypeLabels: Record<string, string> = {
  commercial: '商务标',
  technical: '技术标',
  complete: '整本标书',
};

const configStatusLabels: Record<string, string> = {
  pending: '待生成',
  generating: '生成中',
  completed: '已完成',
  failed: '失败',
};

const configsBySubmission = computed<Record<string, BizDocumentConfig[]>>(() => {
  const map: Record<string, BizDocumentConfig[]> = {};
  for (const cfg of progressConfigs.value) {
    const key = String(cfg.bidSubmissionId ?? '');
    if (!key) continue;
    if (!map[key]) map[key] = [];
    map[key].push(cfg);
  }
  return map;
});

function getSubmissionConfigs(sub: BizBidSubmission) {
  return configsBySubmission.value[String(sub.id)] || [];
}

function getDisplayWorkflowStage(sub: BizBidSubmission) {
  // Use the unified status field directly
  return sub.status || 'draft';
}

function canConfigSubmission(sub: BizBidSubmission) {
  const status = sub.status || 'draft';
  return status === 'draft' || status === 'configured';
}

function getChapterCountText(cfg: BizDocumentConfig) {
  const total = cfg.totalChapters ?? 0;
  const done = cfg.completedChapters ?? 0;
  return `${done} / ${total}`;
}

function getConfigProgress(cfg: BizDocumentConfig) {
  if (cfg.generationStatus === 'completed') return 100;
  const total = cfg.totalChapters ?? 0;
  const done = cfg.completedChapters ?? 0;
  if (total > 0) {
    return Math.min(100, Math.floor((done / total) * 100));
  }
  return cfg.generationProgress ?? 0;
}

function getSubmissionStepIndex(sub: BizBidSubmission) {
  const stages = ['draft', 'configured', 'generating', 'generated', 'submitted', 'won'];
  const stage = sub.status || 'draft';
  if (stage === 'failed') return stages.indexOf('generating');
  if (stage === 'lost' || stage === 'abandoned') return stages.indexOf('submitted');
  const idx = stages.indexOf(stage);
  return idx >= 0 ? idx : 0;
}

function getSubmissionStepStatus(sub: BizBidSubmission) {
  const s = sub.status;
  if (s === 'failed' || s === 'lost' || s === 'abandoned') return 'error';
  if (s === 'won') return 'finish';
  return 'process';
}


async function loadSubmissions() {
  const projectId = route.params.id as string;
  if (!projectId) return;
  submissionsLoading.value = true;
  try {
    const res = await submissionList({ bidProjectId: projectId as any, pageNum: 1, pageSize: 100 });
    const list = (res as any).rows || [];
    submissions.value = list;

    const configList = await Promise.all(
      list.map((sub: BizBidSubmission) => getDocumentConfigList(sub.id as any).catch(() => [] as BizDocumentConfig[])),
    );
    progressConfigs.value = configList.flat();
    // 异步加载章节统计（不阻塞主渲染）
    loadAllConfigChapterStats();
  } catch {
    submissions.value = [];
    progressConfigs.value = [];
  } finally {
    submissionsLoading.value = false;
  }
}


function handleGoConfig(sub: BizBidSubmission) {
  router.push(`/bid/submission/config/${sub.id}`);
}

function handleViewSubmission(sub: BizBidSubmission) {
  router.push(`/bid/submission/detail/${sub.id}`);
}

// AI 分析全屏
const isFullscreen = ref(false);

// 评分标准全屏
const isScoringFullscreen = ref(false);

// 契合度分析全屏
const isMatchAnalysisFullscreen = ref(false);

// 全屏切换
function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value;
}

// 评分标准全屏切换
function toggleScoringFullscreen() {
  isScoringFullscreen.value = !isScoringFullscreen.value;
}

// 契合度分析全屏切换
function toggleMatchAnalysisFullscreen() {
  isMatchAnalysisFullscreen.value = !isMatchAnalysisFullscreen.value;
}

// 下载 PDF
async function downloadPdf() {
  // 获取 MarkdownPreviewer 渲染后的 HTML 内容
  const aiResultElement = document.querySelector('.ai-result');
  if (!aiResultElement) {
    return;
  }

  // 创建打印窗口
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    const htmlContent = aiResultElement.innerHTML;
    printWindow.document.write(`
      <html>
        <head>
          <meta charset="UTF-8">
          <title>AI 分析报告 - ${projectDetail.value.projectName || '招标项目'}</title>
          <style>
            * { margin: 0; padding: 0; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 40px;
              line-height: 1.6;
              color: rgba(0, 0, 0, 0.88);
            }
            h1, h2, h3, h4, h5, h6 { margin: 20px 0 10px; font-weight: 600; }
            h1 { font-size: 28px; }
            h2 { font-size: 24px; }
            h3 { font-size: 20px; }
            p { margin: 10px 0; }
            ul, ol { margin: 10px 0 10px 20px; }
            li { margin: 5px 0; }
            code {
              background: #f5f5f5;
              padding: 2px 6px;
              border-radius: 3px;
              font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            }
            pre {
              background: #f5f5f5;
              padding: 12px;
              border-radius: 4px;
              overflow-x: auto;
              margin: 10px 0;
            }
            pre code { background: none; padding: 0; }
            blockquote {
              border-left: 4px solid #d9d9d9;
              padding-left: 12px;
              margin: 10px 0;
              color: #666;
            }
            table {
              border-collapse: collapse;
              width: 100%;
              margin: 10px 0;
            }
            th, td {
              border: 1px solid #d9d9d9;
              padding: 8px 12px;
              text-align: left;
            }
            th { background: #fafafa; font-weight: 600; }
            a { color: #1890ff; text-decoration: none; }
            a:hover { text-decoration: underline; }
            @media print {
              body { padding: 20px; }
              h1 { page-break-after: avoid; }
              h2 { page-break-after: avoid; }
              pre { page-break-inside: avoid; }
              table { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }
}

// 清理 markdown 标记
function cleanMarkdownContent(content: string): string {
  if (!content) return '';
  // 移除开头的 ```markdown 和结尾的 ```
  return content
    .replace(/^```markdown\s*\n?/, '')
    .replace(/\n?```\s*$/, '')
    .trim();
}

// 加载项目详情
async function loadProjectDetail() {
  const id = route.params.id as string;

  if (!id) return;

  loading.value = true;
  try {
    const data = await bidProjectInfo(id as any);
    if (data) {
      // 如果 query 参数标记了 loading，但后端状态还未更新（pending或空），保留 loading 状态
      if (route.query.analyzing === '1' && (!data.aiAnalysisStatus || data.aiAnalysisStatus === 'pending')) {
        data.aiAnalysisStatus = 'analyzing';
      }
      if (route.query.extracting === '1' && (!data.scoringCriteriaStatus || data.scoringCriteriaStatus === 'pending')) {
        data.scoringCriteriaStatus = 'extracting';
      }
      if (route.query.processing === '1' && (!data.matchAnalysisStatus || data.matchAnalysisStatus === 'pending')) {
        data.matchAnalysisStatus = 'processing';
      }
      projectDetail.value = data;
      aiAnalysisContent.value = cleanMarkdownContent(data.aiAnalysisResult || '');
      scoringCriteriaContent.value = cleanMarkdownContent(data.scoringCriteria || '');
      matchAnalysisContent.value = cleanMarkdownContent(data.matchAnalysisResult || '');
      console.log('项目详情加载完成:', {
        aiAnalysisResult: data.aiAnalysisResult,
        scoringCriteria: data.scoringCriteria,
        matchAnalysisResult: data.matchAnalysisResult,
      });
    }
  } catch (error) {
    // 错误处理
    console.error('加载项目详情失败:', error);
  } finally {
    loading.value = false;
  }
}

// 启动自动刷新（当有任务在进行时）
function startAutoRefresh() {
  if (refreshTimer.value) return;

  refreshTimer.value = setInterval(async () => {
    // 检查是否有任务在进行
    const hasTask =
      projectDetail.value.aiAnalysisStatus === 'analyzing' ||
      projectDetail.value.scoringCriteriaStatus === 'extracting' ||
      projectDetail.value.matchAnalysisStatus === 'processing';

    if (hasTask && !isRefreshing.value) {
      isRefreshing.value = true;
      try {
        await loadProjectDetail();
      } finally {
        isRefreshing.value = false;
      }
    }

    // 如果没有任务了，停止刷新
    if (
      projectDetail.value.aiAnalysisStatus !== 'analyzing' &&
      projectDetail.value.scoringCriteriaStatus !== 'extracting' &&
      projectDetail.value.matchAnalysisStatus !== 'processing'
    ) {
      stopAutoRefresh();
    }
  }, 2000); // 每2秒刷新一次
}

// 停止自动刷新
function stopAutoRefresh() {
  if (refreshTimer.value) {
    clearInterval(refreshTimer.value);
    refreshTimer.value = null;
  }
}

onMounted(async () => {
  await loadProjectDetail();
  loadSubmissions();
  if (
    projectDetail.value.aiAnalysisStatus === 'analyzing' ||
    projectDetail.value.scoringCriteriaStatus === 'extracting' ||
    projectDetail.value.matchAnalysisStatus === 'processing'
  ) {
    startAutoRefresh();
  }

  // 页面重新可见时（如从抽屉返回），刷新数据并检查是否需要轮询
  document.addEventListener('visibilitychange', handleVisibilityChange);
});

onUnmounted(() => {
  stopAutoRefresh();
  document.removeEventListener('visibilitychange', handleVisibilityChange);
});

async function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    await loadProjectDetail();
    if (
      projectDetail.value.aiAnalysisStatus === 'analyzing' ||
      projectDetail.value.scoringCriteriaStatus === 'extracting' ||
      projectDetail.value.matchAnalysisStatus === 'processing'
    ) {
      startAutoRefresh();
    }
  }
}
</script>

<template>

  <div class="detail-page-layout">
    <!-- 侧边锚点导航（绝对定位，不随内容滚动） -->
    <div
      v-if="layoutPreference.showAnchorNav"
      class="side-nav-panel hide-scrollbar"
      :style="{
        width: `${layoutPreference.anchorNavWidth}px`,
        margin: `20px ${layoutPreference.anchorNavMarginRight}px 20px ${layoutPreference.anchorNavMarginLeft}px`,
      }"
    >
      <AnchorNav :items="anchorNavItems" :container="scrollContainer" />
    </div>

    <!-- 主内容滚动区域 -->
    <div
      class="main-scroll-area hide-scrollbar"
      :style="{ left: layoutPreference.showAnchorNav ? `${layoutPreference.anchorNavMarginLeft + layoutPreference.anchorNavWidth + layoutPreference.anchorNavMarginRight}px` : '0' }"
      ref="scrollContainer"
    >
      <div :style="containerStyle">
      <!-- 顶部基本信息卡片：白色背景 -->
      <div id="basic-info" class="header-card" :style="cardRadiusStyle">
        <!-- 第一行：项目名称 + 编号 + 状态 -->
        <div class="header-title-row">
          <span class="header-project-name">{{ projectDetail.projectName || '项目详情' }}</span>
          <span class="header-project-id"># {{ projectDetail.bidOrg }}</span>
          <Tag :color="statusColor">{{ statusLabel }}</Tag>
        </div>
        <!-- 第二行：关键指标 -->
        <div class="header-metrics-row">
          <div class="header-metric">
            <div class="header-metric-label">预算金额</div>
            <div class="header-metric-value">
              <span class="text-orange-500">{{ budgetAmountDisplay }}</span>
            </div>
          </div>
          <div class="header-metric header-metric-wide">
            <div class="header-metric-label">预算金额（人民币大写）</div>
            <div class="header-metric-value header-metric-value-wrap">{{ budgetAmountUppercase }}</div>
          </div>
          <div class="header-metric">
            <div class="header-metric-label">项目来源</div>
            <div class="header-metric-value">
              <Tag :color="projectSourceColor">{{ projectSourceLabel }}</Tag>
            </div>
          </div>
          <div class="header-metric">
            <div class="header-metric-label">发布日期</div>
            <div class="header-metric-value">{{ publishDateDisplay }}</div>
          </div>
          <div class="header-metric">
            <div class="header-metric-label">截止日期</div>
            <div class="header-metric-value">{{ deadlineDisplay }}</div>
          </div>
          <div class="header-metric">
            <div class="header-metric-label">剩余天数</div>
            <div class="header-metric-value">{{ remainingDaysDisplay }}</div>
          </div>
          <div class="header-metric">
            <div class="header-metric-label">招标方式</div>
            <div class="header-metric-value">{{ bidMethodLabel }}</div>
          </div>
          <div class="header-metric">
            <div class="header-metric-label">契合度</div>
            <div class="header-metric-value">
              <span v-if="projectDetail.matchDegree" class="text-blue-500 font-semibold">{{ projectDetail.matchDegree }}%</span>
              <span v-else class="text-gray-400">-</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 内容卡片 -->
      <div class="cards-wrapper">
          <!-- 卡片1：投标进度 -->
          <Card id="submission-progress" class="mb-4 detail-card" :style="cardRadiusStyle">
            <template #title>
              <span class="card-title">
                <RocketOutlined class="card-title-icon" />
                投标进度
              </span>
            </template>
            <Spin :spinning="submissionsLoading">
              <div v-if="submissions.length === 0 && !submissionsLoading" class="py-8 text-center text-gray-400">
                暂无投标项目
              </div>
              <div v-else class="submission-list">
                <div v-for="sub in submissions" :key="sub.id" class="submission-section">
                  <!-- 投标项目行：名称 + 阶段 + 操作 -->
                  <div class="submission-header">
                    <span class="submission-name">{{ sub.projectName || '-' }}</span>
                    <Tag :color="statusColorsForSubmission[getDisplayWorkflowStage(sub)] || 'default'">
                      {{ statusLabelsForSubmission[getDisplayWorkflowStage(sub)] || '草稿' }}
                    </Tag>
                    <span class="submission-actions">
                      <Button
                        v-if="canConfigSubmission(sub)"
                        type="link"
                        size="small"
                        @click="handleGoConfig(sub)"
                      >
                        配置
                      </Button>
                      <Button type="link" size="small" @click="handleViewSubmission(sub)">查看</Button>
                    </span>
                  </div>
                  <!-- 投标进度 Steps -->
                  <Steps
                    :current="getSubmissionStepIndex(sub)"
                    :status="getSubmissionStepStatus(sub)"
                    size="small"
                    class="mb-2"
                  >
                    <Steps.Step title="草稿" />
                    <Steps.Step title="已配置" />
                    <Steps.Step title="生成中" />
                    <Steps.Step title="已生成" />
                    <Steps.Step title="已投标" />
                    <Steps.Step title="中标" />
                  </Steps>
                  <!-- 整体进度条（生成中时显示） -->
                  <div v-if="sub.status === 'generating'" class="overall-progress mb-3">
                    <Progress
                      :percent="sub.generationProgress || 0"
                      status="active"
                      size="small"
                      :stroke-color="{ '0%': '#108ee9', '100%': '#87d068' }"
                    />
                  </div>
                </div>
              </div>
            </Spin>
          </Card>

          <!-- 卡片2：标书配置 -->
          <Card id="doc-config" class="mb-4 detail-card" :style="cardRadiusStyle">
            <template #title>
              <span class="card-title">
                <FileTextOutlined class="card-title-icon" />
                标书配置
              </span>
            </template>
            <Spin :spinning="submissionsLoading">
              <div v-if="submissions.length === 0 && !submissionsLoading" class="py-8 text-center text-gray-400">
                暂无标书配置
              </div>
              <div v-else class="submission-list">
                <div v-for="sub in submissions" :key="sub.id" class="submission-section">
                  <div class="submission-header">
                    <span class="submission-name">{{ sub.projectName || '-' }}</span>
                  </div>
                  <!-- 标书配置 table -->
                  <table
                    v-if="getSubmissionConfigs(sub).length > 0"
                    class="config-table"
                  >
                    <thead>
                      <tr>
                        <th>公司名称</th>
                        <th>标书类型</th>
                        <th>目录数</th>
                        <th class="th-right">章节状态</th>
                        <th>备注</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="cfg in getSubmissionConfigs(sub)"
                        :key="cfg.id"
                        class="config-row-clickable"
                        @click="handleViewSubmission(sub)"
                      >
                        <td>{{ cfg.companyName || '-' }}</td>
                        <td>
                          <Tag :color="cfg.documentType === 'commercial' ? 'blue' : cfg.documentType === 'technical' ? 'green' : 'orange'">
                            {{ documentTypeLabels[cfg.documentType || ''] || cfg.documentType }}
                          </Tag>
                        </td>
                        <td>{{ getConfigChapterStats(cfg.id).totalArticles || '-' }}</td>
                        <td class="chapter-cell chapter-cell-right">
                          <template v-if="getConfigChapterStats(cfg.id).totalArticles > 0">
                            <span class="chapter-status-completed">{{ getConfigChapterStats(cfg.id).completedArticles }}</span>
                            <span class="chapter-status-sep">/</span>
                            <span>{{ getConfigChapterStats(cfg.id).totalArticles }}</span>
                            <span class="chapter-status-label"> 篇</span>
                          </template>
                          <span v-else class="chapter-status-empty">未生成</span>
                        </td>
                        <td class="remark-cell">{{ cfg.remark || '-' }}</td>
                      </tr>
                    </tbody>
                  </table>
                  <div v-else class="submission-no-config">暂无标书配置</div>
                </div>
              </div>
            </Spin>
          </Card>

          <!-- 卡片2：招标信息 -->
          <Card id="bid-info" class="mb-4 detail-card" :style="cardRadiusStyle">
            <template #title>
              <span class="card-title">
                <FileTextOutlined class="card-title-icon" />
                招标信息
              </span>
            </template>
            <div class="field-grid" :style="contentFontStyle">
              <div class="field-item">
                <div class="field-label">招标单位</div>
                <div class="field-value">{{ projectDetail.bidOrg || '-' }}</div>
              </div>
              <div class="field-item">
                <div class="field-label">项目区域</div>
                <div class="field-value">{{ projectDetail.projectRegion || '-' }}</div>
              </div>
              <div class="field-item">
                <div class="field-label">项目类型</div>
                <div class="field-value">
                  <Tag :color="projectTypeColor">{{ projectTypeLabel }}</Tag>
                </div>
              </div>
              <div class="field-item field-item-full">
                <div class="field-label">项目描述</div>
                <div class="field-value field-value-block">{{ projectDetail.projectDesc || '-' }}</div>
              </div>
            </div>
          </Card>

          <!-- 卡片3：联系信息 -->
          <Card id="contact-info" class="mb-4 detail-card" :style="cardRadiusStyle">
            <template #title>
              <span class="card-title">
                <TeamOutlined class="card-title-icon" />
                联系信息
              </span>
            </template>
            <div class="field-grid" :style="contentFontStyle">
              <div class="field-item">
                <div class="field-label">联系人</div>
                <div class="field-value">{{ projectDetail.contactPerson || '-' }}</div>
              </div>
              <div class="field-item">
                <div class="field-label">联系电话</div>
                <div class="field-value">{{ projectDetail.contactPhone || '-' }}</div>
              </div>
              <div v-if="projectDetail.sourceUrl" class="field-item field-item-full">
                <div class="field-label">来源链接</div>
                <div class="field-value">
                  <a :href="projectDetail.sourceUrl" target="_blank" class="text-blue-500 hover:underline">
                    {{ projectDetail.sourceUrl }}
                  </a>
                </div>
              </div>
              <div v-if="projectDetail.remark" class="field-item field-item-full">
                <div class="field-label">备注</div>
                <div class="field-value field-value-block">{{ projectDetail.remark }}</div>
              </div>
            </div>
          </Card>

          <!-- 卡片4：契合度分析 -->
          <Card id="match-analysis" class="mb-4 detail-card" :style="cardRadiusStyle" :class="{ 'ai-fullscreen-card': isMatchAnalysisFullscreen }">
            <template #title>
              <span class="card-title">
                <TrophyOutlined class="card-title-icon" />
                契合度分析
              </span>
            </template>
            <template #extra>
              <Space v-if="matchAnalysisContent">
                <Button type="text" size="small" @click="toggleMatchAnalysisFullscreen">
                  <ExpandOutlined v-if="!isMatchAnalysisFullscreen" />
                  <FullscreenExitOutlined v-else />
                  {{ isMatchAnalysisFullscreen ? '退出' : '全屏' }}
                </Button>
                <Button type="text" size="small" @click="downloadPdf">
                  <DownloadOutlined />
                  下载PDF
                </Button>
              </Space>
            </template>

            <div v-if="projectDetail.matchAnalysisStatus === 'processing'" class="ai-loading">
              <Spin tip="正在分析契合度，请稍候..." />
            </div>

            <div v-else-if="matchAnalysisContent" class="ai-result">
              <MarkdownPreviewer :key="matchAnalysisContent" v-model:value="matchAnalysisContent" height="auto" />
            </div>

            <div v-else>
              <Empty description="暂无契合度分析结果" />
            </div>
          </Card>

          <!-- 卡片5：评分标准 -->
          <Card id="scoring-criteria" class="mb-4 detail-card" :style="cardRadiusStyle" :class="{ 'ai-fullscreen-card': isScoringFullscreen }">
            <template #title>
              <span class="card-title">
                <CheckCircleOutlined class="card-title-icon" />
                评分标准
              </span>
            </template>
            <template #extra>
              <Space v-if="scoringCriteriaContent">
                <Button type="text" size="small" @click="toggleScoringFullscreen">
                  <ExpandOutlined v-if="!isScoringFullscreen" />
                  <FullscreenExitOutlined v-else />
                  {{ isScoringFullscreen ? '退出' : '全屏' }}
                </Button>
                <Button type="text" size="small" @click="downloadPdf">
                  <DownloadOutlined />
                  下载PDF
                </Button>
              </Space>
            </template>

            <div v-if="projectDetail.scoringCriteriaStatus === 'extracting'" class="ai-loading">
              <Spin tip="正在提取评分标准，请稍候..." />
            </div>

            <div v-else-if="scoringCriteriaContent" class="ai-result">
              <MarkdownPreviewer :key="scoringCriteriaContent" v-model:value="scoringCriteriaContent" height="auto" />
            </div>

            <div v-else>
              <Empty description="暂无评分标准" />
            </div>
          </Card>

          <!-- 卡片6：AI 分析 -->
          <Card id="ai-analysis" class="detail-card mb-4" :style="cardRadiusStyle" :class="{ 'ai-fullscreen-card': isFullscreen }">
            <template #title>
              <span class="card-title">
                <RobotOutlined class="card-title-icon" />
                AI 智能分析
              </span>
            </template>
            <template #extra>
              <Space v-if="aiAnalysisContent">
                <Button type="text" size="small" @click="toggleFullscreen">
                  <ExpandOutlined v-if="!isFullscreen" />
                  <FullscreenExitOutlined v-else />
                  {{ isFullscreen ? '退出' : '全屏' }}
                </Button>
                <Button type="text" size="small" @click="downloadPdf">
                  <DownloadOutlined />
                  下载PDF
                </Button>
              </Space>
            </template>

            <div v-if="projectDetail.aiAnalysisStatus === 'analyzing'" class="ai-loading">
              <Spin tip="AI 正在分析中，请稍候..." />
            </div>

            <div v-else-if="aiAnalysisContent" class="ai-result">
              <MarkdownPreviewer v-model:value="aiAnalysisContent" height="auto" />
            </div>

            <div v-else>
              <Empty description="暂无分析结果" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  </div>

</template>

<style scoped>
/* 隐藏滚动条 */
.hide-scrollbar {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}

.hide-scrollbar::-webkit-scrollbar {
  display: none; /* Chrome/Safari/Opera */
}

/* ========== 顶部基本信息卡片 ========== */
.header-card {
  background: #fff;
  padding: 24px 32px;
  border: 1px solid #d8d8d8;
}

.header-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.header-project-name {
  font-size: 20px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.header-project-id {
  font-size: 14px;
  color: #909399;
}

/* 关键指标行 */
.header-metrics-row {
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
  column-gap: 32px;
  row-gap: 16px;
  padding: 16px 0;
  border-top: 1px solid #f0f0f0;
}

.header-metric {
  padding: 0;
  min-width: 140px;
}

.header-metric-wide {
  min-width: 280px;
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

.header-metric-value-small {
  font-size: 13px;
}

.header-metric-value-wrap {
  max-width: 520px;
  line-height: 1.6;
  word-break: break-all;
}

/* ========== 页面整体布局 ========== */
.detail-page-layout {
  position: relative;
  height: 100%;
  overflow: hidden;
}

/* 侧边导航面板 — 绝对定位，不随内容滚动 */
.side-nav-panel {
  position: absolute;
  left: 0;
  top: 0;
  /* width / margin 由内联样式动态控制 */
  height: 800px;
  background: #ffffff;
  z-index: 10;
  padding: 8px 10px;
  border-radius: 16px;
  border: 1px solid #f0f0f0;
}

/* 主内容滚动区 — 绝对定位，左侧偏移由 showAnchorNav 动态控制 */
.main-scroll-area {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  overflow-y: auto;
  /* background: #f5f7fa; */
  
}

/* ========== 内容卡片包装 ========== */
.cards-wrapper {
  padding: 16px 0 24px;
}

/* ========== 内容卡片 ========== */
.detail-card {
  overflow: hidden;
}

.detail-card :deep(.ant-card-head) {
  min-height: 46px;
  border-bottom: 1px solid #f0f0f0;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.card-title-icon {
  color: hsl(var(--primary));
  font-size: 16px;
  margin-right: 8px;
}

/* 字段网格：标签在上，值在下 */
.field-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px 24px;
  padding: 20px;
}

.field-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-item-full {
  grid-column: 1 / -1;
}

.field-label {
  color: #909399;
  font-size: 13px;
  line-height: 20px;
}

.field-value {
  color: rgba(0, 0, 0, 0.88);
  font-weight: 500;
  line-height: 1.6;
  word-break: break-all;
}

.field-value-block {
  background: #f5f7fa;
  padding: 10px 16px;
  border-radius: 4px;
  white-space: pre-wrap;
}

/* ========== AI 分析 ========== */
.ai-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px 0;
}

.ai-result {
  padding: 16px 20px;
  max-height: 600px;
  overflow-y: auto;
}

.ai-result :deep(.vditor-reset) {
  padding: 16px 20px !important;
}

/* AI 全屏卡片 */
.ai-fullscreen-card {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  margin: 0;
  border-radius: 0;
  overflow: auto;
  background: #fff;
}

.ai-fullscreen-card :deep(.ant-card-head) {
  padding: 16px 24px;
  background: #fff;
  position: sticky;
  top: 0;
  z-index: 10;
  border-bottom: 1px solid #f0f0f0;
}

.ai-fullscreen-card :deep(.ant-card-body) {
  padding: 0;
}

.ai-fullscreen-card .ai-result {
  padding: 0;
  max-height: none;
  height: calc(100vh - 120px);
  overflow-y: auto;
}

.ai-fullscreen-card :deep(.vditor-reset) {
  font-size: 16px !important;
  line-height: 1.8 !important;
}

.ai-fullscreen-card :deep(.vditor-reset table) {
  width: 100%;
}

/* ========== 投标进度 ========== */
.submission-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.submission-section {
  /* 多个投标项目之间分隔 */
}

.submission-section + .submission-section {
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;
}

.submission-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.submission-name {
  font-weight: 600;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.88);
}

.submission-actions {
  margin-left: auto;
  display: inline-flex;
  gap: 4px;
}

.submission-no-config {
  color: #909399;
  font-size: 13px;
  padding: 4px 0 2px;
}

/* 标书配置 table */
.config-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.config-table th {
  background: #fafafa;
  color: #909399;
  font-weight: 500;
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid #f0f0f0;
}

.config-table td {
  padding: 8px 12px;
  border-bottom: 1px solid #f5f5f5;
  color: rgba(0, 0, 0, 0.88);
}

.config-progress {
  margin-left: 8px;
  color: #909399;
  font-size: 12px;
}

.config-table tbody tr:last-child td {
  border-bottom: none;
}

.config-table tbody tr:hover td {
  background: #f5f7fa;
}

.config-row-clickable {
  cursor: pointer;
}

.remark-cell {
  color: #909399;
  font-size: 13px;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chapter-cell { white-space: nowrap; }

.chapter-cell-right { text-align: right; }

.th-right { text-align: right !important; }

.chapter-status-completed {
  color: #52c41a;
  font-weight: 600;
}

.chapter-status-sep {
  color: #d9d9d9;
  margin: 0 2px;
}

.chapter-status-label {
  color: #909399;
  font-size: 12px;
}

.chapter-status-empty {
  color: #909399;
  font-size: 13px;
}

.overall-progress {
  padding: 0 4px;
}

/* ========== 响应式 ========== */
@media (max-width: 1200px) {
  .field-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .header-metrics-row {
    flex-wrap: wrap;
    gap: 16px;
  }

  .field-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .submission-header {
    flex-wrap: wrap;
  }

  .submission-actions {
    margin-left: 0;
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
