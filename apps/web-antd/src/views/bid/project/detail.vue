<script setup lang="ts">
import type { BizBidProject } from '#/api/bid/project';
import type { AnchorNavItem } from '#/components/anchor-nav';

import { computed, onMounted, ref, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';

import { MarkdownPreviewer } from '@vben/common-ui';
import { Card, Empty, Space, Spin, Tag, Button } from 'ant-design-vue';
import {
  DownloadOutlined,
  ExpandOutlined,
  FileTextOutlined,
  FullscreenExitOutlined,
  RobotOutlined,
  TeamOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons-vue';

import { AnchorNav } from '#/components/anchor-nav';
import { bidProjectInfo } from '#/api/bid/project';
import { useDetailPagePreference } from '#/preferences/userPreference';

const route = useRoute();

// 项目详情数据
const projectDetail = ref<BizBidProject>({});
const loading = ref(false);

// 自动刷新相关
const refreshTimer = ref<NodeJS.Timeout | null>(null);
const isRefreshing = ref(false);

// 布局偏好设置（响应式单例，设置面板修改后立即生效）
const layoutPreference = useDetailPagePreference();

// 锚点导航项配置
const anchorNavItems = ref<AnchorNavItem[]>([
  { key: 'basic-info', title: '基本信息' },
  { key: 'bid-info', title: '招标信息' },
  { key: 'contact-info', title: '联系信息' },
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



const aiAnalysisContent = ref('');
const scoringCriteriaContent = ref('');

// AI 分析全屏
const isFullscreen = ref(false);

// 评分标准全屏
const isScoringFullscreen = ref(false);

// 全屏切换
function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value;
}

// 评分标准全屏切换
function toggleScoringFullscreen() {
  isScoringFullscreen.value = !isScoringFullscreen.value;
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
      projectDetail.value = data;
      aiAnalysisContent.value = cleanMarkdownContent(data.aiAnalysisResult || '');
      scoringCriteriaContent.value = cleanMarkdownContent(data.scoringCriteria || '');
      console.log('项目详情加载完成:', {
        aiAnalysisResult: data.aiAnalysisResult,
        scoringCriteria: data.scoringCriteria,
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
      projectDetail.value.scoringCriteriaStatus === 'extracting';

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
      projectDetail.value.scoringCriteriaStatus !== 'extracting'
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

onMounted(() => {
  loadProjectDetail();
  // 初始加载后检查是否需要启动自动刷新
  setTimeout(() => {
    if (
      projectDetail.value.aiAnalysisStatus === 'analyzing' ||
      projectDetail.value.scoringCriteriaStatus === 'extracting'
    ) {
      startAutoRefresh();
    }
  }, 500);
});

onUnmounted(() => {
  stopAutoRefresh();
});
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
            <div class="header-metric-label">预算金额（万元）</div>
            <div class="header-metric-value">
              <span v-if="projectDetail.budgetAmount" class="text-orange-500">
                ¥{{ projectDetail.budgetAmount }}
              </span>
              <span v-else>¥0.00</span>
            </div>
          </div>
          <div class="header-metric">
            <div class="header-metric-label">项目类型</div>
            <div class="header-metric-value">
              <Tag :color="projectTypeColor">{{ projectTypeLabel }}</Tag>
            </div>
          </div>
          <div class="header-metric">
            <div class="header-metric-label">发布日期</div>
            <div class="header-metric-value">{{ projectDetail.publishDate?.split(' ')[0] || '-' }}</div>
          </div>
          <div class="header-metric">
            <div class="header-metric-label">截止日期</div>
            <div class="header-metric-value">{{ projectDetail.deadline?.split(' ')[0] || '-' }}</div>
          </div>
          <div class="header-metric">
            <div class="header-metric-label">招标方式</div>
            <div class="header-metric-value">{{ bidMethodLabel }}</div>
          </div>
          <div class="header-metric">
            <div class="header-metric-label">契合度</div>
            <div class="header-metric-value">{{ projectDetail.matchDegree ? `${projectDetail.matchDegree}%` : '-' }}</div>
          </div>
        </div>
      </div>

      <!-- 内容卡片 -->
      <div class="cards-wrapper">
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
                <div class="field-label">项目来源</div>
                <div class="field-value">{{ projectDetail.projectSource || '-' }}</div>
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

          <!-- 卡片4：评分标准 -->
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

          <!-- 卡片5：AI 分析 -->
          <Card id="ai-analysis" class="detail-card" :style="cardRadiusStyle" :class="{ 'ai-fullscreen-card': isFullscreen }">
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
  align-items: center;
  gap: 32px;
  padding: 16px 0;
  border-top: 1px solid #f0f0f0;
}

.header-metric {
  padding: 0;
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
}
</style>
