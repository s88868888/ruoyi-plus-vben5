<script setup lang="ts">
import type { BizBidSubmission } from '#/api/bid/submission';
import type { BizDocumentConfig } from '#/api/bid/documentConfig';
import type { AnchorNavItem } from '#/components/anchor-nav';

import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
  FileTextOutlined,
  RocketOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons-vue';
import { Button, Card, Empty, Progress, Space, Spin, Steps, Tag, message } from 'ant-design-vue';

import { MarkdownPreviewer } from '@vben/common-ui';
import { AnchorNav } from '#/components/anchor-nav';
import { submissionInfo, analyzeCompetitors } from '#/api/bid/submission';
import { getDocumentConfigList } from '#/api/bid/documentConfig';
import { getChapterTree } from '#/api/bid/chapter';
import type { BizSubmissionChapter } from '#/api/bid/chapter';
import { useDetailPagePreference } from '#/preferences/userPreference';
import {
  formatCnyAmount,
  formatCnyUppercase,
  formatRemainingDays,
} from '../project/utils/format';

const route = useRoute();
const router = useRouter();

// 保持字符串类型，避免大数字精度丢失
const submissionId = ref<string>(route.params.id as string);
const loading = ref(false);
const detailData = ref<BizBidSubmission>();
const configs = ref<BizDocumentConfig[]>([]);
const configsLoading = ref(false);

// 布局偏好
const layoutPreference = useDetailPagePreference();

// 锚点导航项
const anchorNavItems = ref<AnchorNavItem[]>([
  { key: 'project-info', title: '项目信息' },
  { key: 'bid-progress', title: '投标进度' },
  { key: 'doc-config', title: '标书配置' },
  { key: 'competitor-analysis', title: '竞争对手分析' },
]);

// 滚动容器引用
const scrollContainer = ref<HTMLElement | null>(null);

const containerStyle = computed(() => {
  if (layoutPreference.contentWidth > 0) {
    return { maxWidth: `${layoutPreference.contentWidth}px`, margin: '0 auto', padding: '20px 24px' };
  }
  return { padding: '20px' };
});

const cardRadiusStyle = computed(() => ({ borderRadius: `${layoutPreference.cardRadius}px` }));

// ========== 字典映射 ==========
const projectTypeLabels: Record<string, string> = {
  engineering: '工程', goods: '货物', service: '服务',
};
const projectTypeColors: Record<string, string> = {
  engineering: 'blue', goods: 'green', service: 'orange',
};
const bidMethodLabels: Record<string, string> = {
  public: '公开招标', invite: '邀请招标', competitive: '竞争性谈判', inquiry: '询价采购', single: '单一来源',
};
const statusConfig: Record<string, { label: string; color: string }> = {
  draft:      { label: '草稿',   color: 'default' },
  configured: { label: '已配置', color: 'blue' },
  generating: { label: '生成中', color: 'processing' },
  generated:  { label: '已生成', color: 'success' },
  submitted:  { label: '已投标', color: 'warning' },
  won:        { label: '中标',   color: 'success' },
  lost:       { label: '未中标', color: 'error' },
  abandoned:  { label: '废标/放弃', color: 'default' },
  failed:     { label: '失败',   color: 'error' },
};
const documentTypeLabels: Record<string, string> = {
  commercial: '商务标', technical: '技术标', complete: '整本标书',
};
const documentTypeColors: Record<string, string> = {
  commercial: 'blue', technical: 'green', complete: 'orange',
};

// ========== 计算属性 ==========
const statusLabel = computed(() => statusConfig[detailData.value?.status || '']?.label || '未知');
const statusColor = computed(() => statusConfig[detailData.value?.status || '']?.color || 'default');

const workflowStepIndex = computed(() => {
  const stages = ['draft', 'configured', 'generating', 'generated', 'submitted', 'won'];
  const stage = detailData.value?.status || 'draft';
  if (stage === 'failed') return stages.indexOf('generating');
  if (stage === 'lost' || stage === 'abandoned') return stages.indexOf('submitted');
  const idx = stages.indexOf(stage);
  return idx >= 0 ? idx : 0;
});

const workflowStepStatus = computed(() => {
  const s = detailData.value?.status;
  if (s === 'failed' || s === 'lost' || s === 'abandoned') return 'error';
  if (s === 'won') return 'finish';
  return 'process';
});

const isGenerating = computed(() => detailData.value?.status === 'generating');
const isCompetitorAnalyzing = computed(() => detailData.value?.competitorAnalysisStatus === 'analyzing');
const needsAutoRefresh = computed(() => isGenerating.value || isCompetitorAnalyzing.value);

// 解析关联公司
const parsedCompanies = computed(() => {
  try {
    const json = detailData.value?.selectedCompanies;
    if (!json) return [];
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) {
      return parsed.map((item: any) => typeof item === 'object' ? (item.companyName || item.name || String(item.id)) : String(item));
    }
    return [];
  } catch {
    return [];
  }
});

// 按公司分组配置
const configsByCompany = computed(() => {
  const map: Record<string, BizDocumentConfig[]> = {};
  for (const cfg of configs.value) {
    const key = cfg.companyName || String(cfg.companyId ?? '未知公司');
    if (!map[key]) map[key] = [];
    map[key].push(cfg);
  }
  return map;
});

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

/** 加载所有配置的章节统计 */
async function loadAllChapterStats() {
  const map: Record<number, { totalArticles: number; completedArticles: number; generatingArticles: number; pendingArticles: number }> = {};
  await Promise.all(
    configs.value.map(async (config) => {
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

function getConfigChapterStats(configId?: number) {
  if (!configId) return { totalArticles: 0, completedArticles: 0, generatingArticles: 0, pendingArticles: 0 };
  return chapterStatsMap.value[configId] || { totalArticles: 0, completedArticles: 0, generatingArticles: 0, pendingArticles: 0 };
}

// 概览统计 - 基于叶子章节（文章）
const configStats = computed(() => {
  let totalArticles = 0;
  let completed = 0;
  let generating = 0;
  Object.values(chapterStatsMap.value).forEach((s) => {
    totalArticles += s.totalArticles;
    completed += s.completedArticles;
    generating += s.generatingArticles;
  });
  const pending = totalArticles - completed - generating;
  return { total: configs.value.length, completed, generating, pending, totalArticles };
});

function getConfigProgress(cfg: BizDocumentConfig) {
  const stats = getConfigChapterStats(cfg.id);
  if (stats.totalArticles === 0) return 0;
  return Math.min(100, Math.floor((stats.completedArticles / stats.totalArticles) * 100));
}

// ========== 数据加载 ==========
async function loadDetail() {
  loading.value = true;
  try {
    detailData.value = await submissionInfo(submissionId.value);
  } catch {
    // ignore
  } finally {
    loading.value = false;
  }
}

async function loadConfigs() {
  configsLoading.value = true;
  try {
    configs.value = await getDocumentConfigList(submissionId.value);
    // 加载章节统计
    await loadAllChapterStats();
  } catch {
    configs.value = [];
  } finally {
    configsLoading.value = false;
  }
}

// ========== 自动刷新 ==========
const refreshTimer = ref<ReturnType<typeof setInterval> | null>(null);

function startAutoRefresh() {
  if (refreshTimer.value) return;
  refreshTimer.value = setInterval(async () => {
    if (!needsAutoRefresh.value) {
      stopAutoRefresh();
      return;
    }
    await loadDetail();
    await loadConfigs();
  }, 3000);
}

function stopAutoRefresh() {
  if (refreshTimer.value) {
    clearInterval(refreshTimer.value);
    refreshTimer.value = null;
  }
}

onMounted(async () => {
  await loadDetail();
  await loadConfigs();
  if (needsAutoRefresh.value) startAutoRefresh();
});

onUnmounted(() => stopAutoRefresh());

// ========== 操作 ==========
function handleGoConfig() {
  router.push(`/bid/submission/config/${submissionId.value}`);
}

// 竞争对手分析状态配置
const competitorStatusConfig: Record<string, { label: string; color: string }> = {
  none:      { label: '未分析', color: 'default' },
  analyzing: { label: '分析中', color: 'processing' },
  completed: { label: '已完成', color: 'success' },
  failed:    { label: '分析失败', color: 'error' },
};

const competitorAnalysisLoading = ref(false);

async function handleStartCompetitorAnalysis() {
  competitorAnalysisLoading.value = true;
  try {
    await analyzeCompetitors(submissionId.value);
    message.success('竞争对手分析已开始，请稍候...');
    await loadDetail();
    if (needsAutoRefresh.value) startAutoRefresh();
  } catch (error) {
    message.error('触发竞争对手分析失败');
  } finally {
    competitorAnalysisLoading.value = false;
  }
}
</script>

<template>
  <div class="detail-page-layout">
    <!-- 侧边锚点导航 -->
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
      ref="scrollContainer"
      class="main-scroll-area hide-scrollbar"
      :style="{ left: layoutPreference.showAnchorNav ? `${layoutPreference.anchorNavMarginLeft + layoutPreference.anchorNavWidth + layoutPreference.anchorNavMarginRight}px` : '0' }"
    >
    <Spin :spinning="loading">
      <div :style="containerStyle">
        <!-- 顶部标题卡片 -->
        <div id="basic-info" class="header-card" :style="cardRadiusStyle">
          <div class="header-title-row">
            <span class="header-project-name">{{ detailData?.projectName || '投标项目详情' }}</span>
            <Tag :color="statusColor" class="ml-2">{{ statusLabel }}</Tag>
            <div class="header-actions">
              <Space>
                <Button
                  v-if="detailData?.status === 'draft' || detailData?.status === 'configured'"
                  type="primary"
                  size="small"
                  @click="handleGoConfig"
                >
                  <SettingOutlined />
                  配置标书
                </Button>
              </Space>
            </div>
          </div>

          <!-- 关键指标行 -->
          <div class="header-metrics-row">
            <div class="header-metric">
              <div class="header-metric-label">招标单位</div>
              <div class="header-metric-value">{{ detailData?.bidOrg || '-' }}</div>
            </div>
            <div class="header-metric">
              <div class="header-metric-label">项目类型</div>
              <div class="header-metric-value">
                <Tag v-if="detailData?.projectType" :color="projectTypeColors[detailData.projectType] || 'default'">
                  {{ projectTypeLabels[detailData.projectType] || detailData.projectType }}
                </Tag>
                <span v-else class="text-gray-400">-</span>
              </div>
            </div>
            <div class="header-metric">
              <div class="header-metric-label">预算金额</div>
              <div class="header-metric-value text-orange-500">{{ formatCnyAmount(detailData?.budgetAmount) }}</div>
            </div>
            <div class="header-metric header-metric-wide">
              <div class="header-metric-label">预算金额（人民币大写）</div>
              <div class="header-metric-value">{{ formatCnyUppercase(detailData?.budgetAmount) }}</div>
            </div>
            <div class="header-metric">
              <div class="header-metric-label">项目地区</div>
              <div class="header-metric-value">{{ detailData?.projectRegion || '-' }}</div>
            </div>
            <div class="header-metric">
              <div class="header-metric-label">招标方式</div>
              <div class="header-metric-value">{{ bidMethodLabels[detailData?.bidMethod || ''] || detailData?.bidMethod || '-' }}</div>
            </div>
          </div>
        </div>

        <!-- 卡片区域 -->
        <div class="cards-wrapper">
          <!-- 项目信息卡片 -->
          <Card id="project-info" class="mb-4 detail-card" :style="cardRadiusStyle">
            <template #title>
              <span class="card-title">
                <CheckCircleOutlined class="card-title-icon" />
                项目信息
              </span>
            </template>
            <div class="field-grid">
              <div class="field-item">
                <div class="field-label">关联公司</div>
                <div class="field-value">
                  <Space v-if="parsedCompanies.length > 0" :size="4" wrap>
                    <Tag v-for="company in parsedCompanies" :key="company" color="blue">{{ company }}</Tag>
                  </Space>
                  <span v-else class="text-gray-400">未关联</span>
                </div>
              </div>
              <div class="field-item">
                <div class="field-label">发布日期</div>
                <div class="field-value">{{ detailData?.publishDate?.split(' ')[0] || '-' }}</div>
              </div>
              <div class="field-item">
                <div class="field-label">截止日期</div>
                <div class="field-value">{{ detailData?.deadline?.split(' ')[0] || '-' }}</div>
              </div>
              <div class="field-item">
                <div class="field-label">剩余天数</div>
                <div class="field-value">{{ formatRemainingDays(detailData?.publishDate, detailData?.deadline) }}</div>
              </div>
              <div v-if="detailData?.projectDesc" class="field-item field-item-full">
                <div class="field-label">项目描述</div>
                <div class="field-value field-value-block">{{ detailData.projectDesc }}</div>
              </div>
              <div v-if="detailData?.remark" class="field-item field-item-full">
                <div class="field-label">备注</div>
                <div class="field-value field-value-block">{{ detailData.remark }}</div>
              </div>
            </div>
          </Card>

          <!-- 投标进度卡片 -->
          <Card id="bid-progress" class="mb-4 detail-card" :style="cardRadiusStyle">
            <template #title>
              <span class="card-title">
                <RocketOutlined class="card-title-icon" />
                投标进度
              </span>
            </template>
            <!-- 工作流步骤 -->
            <Steps
              :current="workflowStepIndex"
              :status="workflowStepStatus"
              size="small"
              class="mb-6"
            >
              <Steps.Step title="草稿" description="项目创建" />
              <Steps.Step title="已配置" description="参数配置完成" />
              <Steps.Step title="生成中" description="AI正在生成内容" />
              <Steps.Step title="已生成" description="标书生成完成" />
              <Steps.Step title="已投标" description="已提交投标" />
              <Steps.Step title="中标" description="中标结果" />
            </Steps>

            <!-- 整体进度条（生成中时显示） -->
            <div v-if="isGenerating" class="overall-progress">
              <div class="field-label mb-1">整体生成进度</div>
              <Progress
                :percent="detailData?.generationProgress || 0"
                status="active"
                :stroke-color="{ '0%': '#108ee9', '100%': '#87d068' }"
              />
            </div>

            <!-- 错误信息 -->
            <div v-if="detailData?.errorMessage" class="error-box">
              <div class="error-label">错误信息</div>
              <div class="error-content">{{ detailData.errorMessage }}</div>
            </div>
          </Card>

          <!-- 标书配置卡片 -->
          <Card id="doc-config" class="mb-4 detail-card" :style="cardRadiusStyle">
            <template #title>
              <span class="card-title">
                <FileTextOutlined class="card-title-icon" />
                标书配置
              </span>
            </template>
            <Spin :spinning="configsLoading">
              <div v-if="configs.length === 0 && !configsLoading" class="empty-tip">
                暂无标书配置，请先前往配置页面添加
              </div>
              <div v-else>
                <!-- 按公司分组展示 -->
                <div
                  v-for="(cfgList, companyName) in configsByCompany"
                  :key="companyName"
                  class="company-section"
                >
                  <div class="company-header">
                    <span class="company-name">{{ companyName }}</span>
                    <span class="company-count">{{ cfgList.length }} 份标书</span>
                  </div>
                  <table class="config-table">
                    <thead>
                      <tr>
                        <th>标书类型</th>
                        <th>目录数</th>
                        <th class="th-right">章节状态</th>
                        <th style="width: 200px">生成进度</th>
                        <th>备注</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="cfg in cfgList" :key="cfg.id">
                        <td>
                          <Tag :color="documentTypeColors[cfg.documentType || ''] || 'default'">
                            {{ documentTypeLabels[cfg.documentType || ''] || cfg.documentType }}
                            <span v-if="(cfg.documentNo ?? 1) > 1"> {{ cfg.documentNo }}</span>
                          </Tag>
                        </td>
                        <td class="chapter-cell">
                          {{ getConfigChapterStats(cfg.id).totalArticles || '-' }}
                        </td>
                        <td class="chapter-cell chapter-cell-right">
                          <template v-if="getConfigChapterStats(cfg.id).totalArticles > 0">
                            <span class="chapter-status-completed">{{ getConfigChapterStats(cfg.id).completedArticles }}</span>
                            <span class="chapter-status-sep">/</span>
                            <span>{{ getConfigChapterStats(cfg.id).totalArticles }}</span>
                            <span class="chapter-status-label"> 篇</span>
                          </template>
                          <span v-else class="chapter-status-empty">未生成</span>
                        </td>
                        <td>
                          <Progress
                            :percent="getConfigProgress(cfg)"
                            :status="getConfigProgress(cfg) >= 100 ? 'success' : getConfigChapterStats(cfg.id).generatingArticles > 0 ? 'active' : 'normal'"
                            size="small"
                          />
                          <div v-if="cfg.errorMessage" class="cfg-error-tip">{{ cfg.errorMessage }}</div>
                        </td>
                        <td class="remark-cell">{{ cfg.remark || '-' }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </Spin>
          </Card>

          <!-- 竞争对手分析卡片 -->
          <Card id="competitor-analysis" class="mb-4 detail-card" :style="cardRadiusStyle">
            <template #title>
              <span class="card-title">
                <ThunderboltOutlined class="card-title-icon" />
                竞争对手分析
              </span>
            </template>
            <template #extra>
              <Tag
                v-if="detailData?.competitorAnalysisStatus && detailData.competitorAnalysisStatus !== 'none'"
                :color="competitorStatusConfig[detailData.competitorAnalysisStatus]?.color || 'default'"
              >
                {{ competitorStatusConfig[detailData.competitorAnalysisStatus]?.label || detailData.competitorAnalysisStatus }}
              </Tag>
            </template>

            <!-- 已完成：评分 + Markdown 结果 -->
            <div v-if="detailData?.competitorAnalysisStatus === 'completed'">
              <!-- 竞争力评分 -->
              <div v-if="detailData.competitorScore != null" class="competitor-score-section">
                <div class="competitor-score-box">
                  <Progress
                    type="circle"
                    :percent="detailData.competitorScore"
                    :size="80"
                    :stroke-color="
                      detailData.competitorScore >= 70
                        ? '#52c41a'
                        : detailData.competitorScore >= 40
                          ? '#faad14'
                          : '#ff4d4f'
                    "
                  >
                    <template #format="{ percent }">
                      <span class="score-text">{{ percent }}</span>
                    </template>
                  </Progress>
                  <div class="competitor-score-label">竞争力评分</div>
                </div>
                <div class="competitor-score-actions">
                  <Button size="small" @click="handleStartCompetitorAnalysis" :loading="competitorAnalysisLoading">
                    重新分析
                  </Button>
                </div>
              </div>
              <!-- Markdown 分析结果 -->
              <div class="competitor-result-content">
                <MarkdownPreviewer
                  :model-value="detailData.competitorAnalysisResult || ''"
                />
              </div>
            </div>

            <!-- 分析中：加载状态 -->
            <div v-else-if="detailData?.competitorAnalysisStatus === 'analyzing'" class="competitor-loading">
              <Spin tip="AI 正在分析竞争对手，请稍候...">
                <div class="competitor-loading-placeholder" />
              </Spin>
            </div>

            <!-- 分析失败：错误提示 + 重新分析 -->
            <div v-else-if="detailData?.competitorAnalysisStatus === 'failed'" class="competitor-failed">
              <div class="error-box">
                <div class="error-label">分析失败</div>
                <div class="error-content">{{ detailData?.competitorAnalysisResult || '竞争对手分析过程中出现错误' }}</div>
              </div>
              <div class="mt-4">
                <Button type="primary" @click="handleStartCompetitorAnalysis" :loading="competitorAnalysisLoading">
                  重新分析
                </Button>
              </div>
            </div>

            <!-- 未分析：空状态 + 开始分析按钮 -->
            <div v-else class="competitor-empty">
              <Empty description="暂未进行竞争对手分析">
                <Button type="primary" @click="handleStartCompetitorAnalysis" :loading="competitorAnalysisLoading">
                  <ThunderboltOutlined />
                  开始分析
                </Button>
              </Empty>
            </div>
          </Card>
        </div>
      </div>
    </Spin>
    </div>
  </div>
</template>

<style scoped>
.hide-scrollbar {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.hide-scrollbar::-webkit-scrollbar { display: none; }

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
}

/* ===== 顶部卡片 ===== */
.header-card {
  background: #fff;
  padding: 20px 28px;
  border: 1px solid #d8d8d8;
  margin-bottom: 16px;
}

.header-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.header-project-name {
  font-size: 18px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  flex: 1;
  min-width: 0;
}

.header-actions {
  margin-left: auto;
  flex-shrink: 0;
}

.header-metrics-row {
  display: flex;
  flex-wrap: wrap;
  column-gap: 32px;
  row-gap: 14px;
  padding-top: 14px;
  border-top: 1px solid #f0f0f0;
}

.header-metric { min-width: 120px; }

.header-metric-wide { min-width: 280px; }

.header-metric-label {
  color: #909399;
  font-size: 12px;
  line-height: 18px;
  margin-bottom: 3px;
}

.header-metric-value {
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  line-height: 22px;
}

/* ===== 卡片 ===== */
.cards-wrapper { padding-bottom: 24px; }

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

/* ===== 工作流进度 ===== */
.overall-progress {
  margin-bottom: 20px;
}

/* ===== 概览统计 ===== */
.config-stats {
  display: flex;
  gap: 24px;
  padding: 16px 0;
  border-top: 1px solid #f0f0f0;
  flex-wrap: wrap;
}

.stat-item {
  text-align: center;
  min-width: 60px;
}

.stat-num {
  font-size: 24px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.88);
  line-height: 1.2;
}

.stat-item-completed .stat-num { color: #52c41a; }
.stat-item-generating .stat-num { color: #1890ff; }
.stat-item-pending .stat-num { color: #909399; }
.stat-item-failed .stat-num { color: #ff4d4f; }

.stat-label {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

/* ===== 错误信息 ===== */
.error-box {
  margin-top: 16px;
  padding: 12px 16px;
  background: #fff2f0;
  border: 1px solid #ffccc7;
  border-radius: 6px;
}

.error-label {
  font-size: 13px;
  font-weight: 600;
  color: #ff4d4f;
  margin-bottom: 6px;
}

.error-content {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
  white-space: pre-wrap;
  word-break: break-all;
}

/* ===== 空状态 ===== */
.empty-tip {
  padding: 32px 0;
  text-align: center;
  color: #909399;
  font-size: 14px;
}

/* ===== 公司分组 ===== */
.company-section + .company-section {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;
}

.company-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.company-name {
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.company-count {
  font-size: 12px;
  color: #909399;
}

/* ===== 标书配置表格 ===== */
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
  padding: 10px 12px;
  border-bottom: 1px solid #f5f5f5;
  color: rgba(0, 0, 0, 0.88);
  vertical-align: middle;
}

.config-table tbody tr:last-child td { border-bottom: none; }
.config-table tbody tr:hover td { background: #f5f7fa; }

.chapter-cell { white-space: nowrap; }

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

.chapter-cell-right {
  text-align: right;
}

.th-right {
  text-align: right !important;
}

.cfg-error-tip {
  font-size: 11px;
  color: #ff4d4f;
  margin-top: 4px;
  white-space: pre-wrap;
  word-break: break-all;
}

.remark-cell {
  color: #909399;
  font-size: 13px;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ===== 字段网格 ===== */
.field-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px 24px;
  padding: 20px;
}

.field-item { display: flex; flex-direction: column; gap: 4px; }
.field-item-full { grid-column: 1 / -1; }

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
  font-weight: 400;
}

/* ===== 响应式 ===== */
@media (max-width: 1200px) {
  .field-grid { grid-template-columns: repeat(3, 1fr); }
}

@media (max-width: 768px) {
  .header-metrics-row { gap: 12px; }
  .field-grid { grid-template-columns: repeat(2, 1fr); }
  .config-stats { gap: 16px; }
}

/* ===== 竞争对手分析 ===== */
.competitor-score-section {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 16px 20px;
  background: #fafafa;
  border-radius: 8px;
  margin-bottom: 16px;
}

.competitor-score-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.competitor-score-label {
  font-size: 13px;
  color: #909399;
  font-weight: 500;
}

.score-text {
  font-size: 22px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.88);
}

.competitor-score-actions {
  margin-left: auto;
}

.competitor-result-content {
  padding: 0 4px;
}

.competitor-loading {
  padding: 60px 0;
  text-align: center;
}

.competitor-loading-placeholder {
  min-height: 120px;
}

.competitor-failed {
  padding: 20px;
}

.competitor-empty {
  padding: 40px 0;
}
</style>
