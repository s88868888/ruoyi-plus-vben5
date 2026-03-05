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
  ClockCircleOutlined,
} from '@ant-design/icons-vue';
import { Button, Card, Progress, Space, Spin, Steps, Tag } from 'ant-design-vue';

import { AnchorNav } from '#/components/anchor-nav';
import { submissionInfo } from '#/api/bid/submission';
import { getDocumentConfigList } from '#/api/bid/documentConfig';
import { useDetailPagePreference } from '#/preferences/userPreference';

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
  { key: 'generation-progress', title: '生成进度' },
  { key: 'doc-config', title: '标书配置' },
  { key: 'project-info', title: '项目信息' },
  { key: 'time-record', title: '时间记录' },
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
  generating: { label: '生成中', color: 'processing' },
  completed:  { label: '已完成', color: 'success' },
  failed:     { label: '失败',   color: 'error' },
};
const workflowStageLabels: Record<string, string> = {
  pending_config:     '待配置',
  configured:         '已配置',
  structure_generated:'结构已生成',
  generating:         '生成中',
  completed:          '已完成',
  failed:             '失败',
};
const documentTypeLabels: Record<string, string> = {
  commercial: '商务标', technical: '技术标', complete: '整本标书',
};
const documentTypeColors: Record<string, string> = {
  commercial: 'blue', technical: 'green', complete: 'orange',
};
const configStatusConfig: Record<string, { label: string; color: string }> = {
  pending:    { label: '待生成', color: 'default' },
  generating: { label: '生成中', color: 'processing' },
  completed:  { label: '已完成', color: 'success' },
  failed:     { label: '失败',   color: 'error' },
};

// ========== 计算属性 ==========
const statusLabel = computed(() => statusConfig[detailData.value?.submissionStatus || '']?.label || '未知');
const statusColor = computed(() => statusConfig[detailData.value?.submissionStatus || '']?.color || 'default');

const workflowStepIndex = computed(() => {
  const stages = ['pending_config', 'configured', 'structure_generated', 'generating', 'completed'];
  const stage = detailData.value?.workflowStage || 'pending_config';
  if (stage === 'failed') return stages.indexOf('generating');
  const idx = stages.indexOf(stage);
  return idx >= 0 ? idx : 0;
});

const workflowStepStatus = computed(() =>
  detailData.value?.workflowStage === 'failed' ? 'error' : 'process',
);

const isGenerating = computed(() => detailData.value?.submissionStatus === 'generating');

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

// 概览统计
const configStats = computed(() => {
  const total = configs.value.length;
  const completed = configs.value.filter(c => c.generationStatus === 'completed').length;
  const generating = configs.value.filter(c => c.generationStatus === 'generating').length;
  const failed = configs.value.filter(c => c.generationStatus === 'failed').length;
  const pending = total - completed - generating - failed;
  return { total, completed, generating, failed, pending };
});

function getConfigProgress(cfg: BizDocumentConfig) {
  if (cfg.generationStatus === 'completed') return 100;
  const total = cfg.totalChapters ?? 0;
  const done = cfg.completedChapters ?? 0;
  if (total > 0) return Math.min(100, Math.floor((done / total) * 100));
  return cfg.generationProgress ?? 0;
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
    if (!isGenerating.value) {
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
  if (isGenerating.value) startAutoRefresh();
});

onUnmounted(() => stopAutoRefresh());

// ========== 操作 ==========
function handleGoConfig() {
  router.push(`/bid/submission/config/${submissionId.value}`);
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
                  v-if="detailData?.workflowStage === 'pending_config' || detailData?.workflowStage === 'configured'"
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
              <div class="header-metric-value text-orange-500">
                {{ detailData?.budgetAmount ? `¥${Number(detailData.budgetAmount).toLocaleString('zh-CN')} 万元` : '-' }}
              </div>
            </div>
            <div class="header-metric">
              <div class="header-metric-label">项目地区</div>
              <div class="header-metric-value">{{ detailData?.projectRegion || '-' }}</div>
            </div>
            <div class="header-metric">
              <div class="header-metric-label">招标方式</div>
              <div class="header-metric-value">{{ bidMethodLabels[detailData?.bidMethod || ''] || detailData?.bidMethod || '-' }}</div>
            </div>
            <div class="header-metric">
              <div class="header-metric-label">创建时间</div>
              <div class="header-metric-value">{{ detailData?.createTime?.split(' ')[0] || '-' }}</div>
            </div>
          </div>
        </div>

        <!-- 卡片区域 -->
        <div class="cards-wrapper">
          <!-- 生成进度卡片 -->
          <Card id="generation-progress" class="mb-4 detail-card" :style="cardRadiusStyle">
            <template #title>
              <span class="card-title">
                <RocketOutlined class="card-title-icon" />
                生成进度
              </span>
            </template>
            <!-- 工作流步骤 -->
            <Steps
              :current="workflowStepIndex"
              :status="workflowStepStatus"
              size="small"
              class="mb-6"
            >
              <Steps.Step title="待配置" description="配置标书参数" />
              <Steps.Step title="已配置" description="参数配置完成" />
              <Steps.Step title="结构生成" description="章节结构已生成" />
              <Steps.Step title="内容生成中" description="AI正在生成内容" />
              <Steps.Step title="已完成" description="标书生成完成" />
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

            <!-- 概览统计 -->
            <div v-if="configs.length > 0" class="config-stats">
              <div class="stat-item">
                <div class="stat-num">{{ configStats.total }}</div>
                <div class="stat-label">标书总数</div>
              </div>
              <div class="stat-item stat-item-completed">
                <div class="stat-num">{{ configStats.completed }}</div>
                <div class="stat-label">已完成</div>
              </div>
              <div class="stat-item stat-item-generating">
                <div class="stat-num">{{ configStats.generating }}</div>
                <div class="stat-label">生成中</div>
              </div>
              <div class="stat-item stat-item-pending">
                <div class="stat-num">{{ configStats.pending }}</div>
                <div class="stat-label">待生成</div>
              </div>
              <div v-if="configStats.failed > 0" class="stat-item stat-item-failed">
                <div class="stat-num">{{ configStats.failed }}</div>
                <div class="stat-label">失败</div>
              </div>
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
                        <th>生成状态</th>
                        <th>章节进度</th>
                        <th style="width: 200px">生成进度</th>
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
                        <td>
                          <Tag :color="configStatusConfig[cfg.generationStatus || 'pending']?.color || 'default'">
                            {{ configStatusConfig[cfg.generationStatus || 'pending']?.label || '待生成' }}
                          </Tag>
                        </td>
                        <td class="chapter-cell">
                          <span v-if="(cfg.totalChapters ?? 0) > 0">
                            {{ cfg.completedChapters ?? 0 }} / {{ cfg.totalChapters }}章
                          </span>
                          <span v-else class="text-gray-400">-</span>
                        </td>
                        <td>
                          <Progress
                            :percent="getConfigProgress(cfg)"
                            :status="cfg.generationStatus === 'completed' ? 'success' : cfg.generationStatus === 'failed' ? 'exception' : cfg.generationStatus === 'generating' ? 'active' : 'normal'"
                            size="small"
                          />
                          <div v-if="cfg.errorMessage" class="cfg-error-tip">{{ cfg.errorMessage }}</div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </Spin>
          </Card>

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
                <div class="field-label">项目名称</div>
                <div class="field-value">{{ detailData?.projectName || '-' }}</div>
              </div>
              <div class="field-item">
                <div class="field-label">招标单位</div>
                <div class="field-value">{{ detailData?.bidOrg || '-' }}</div>
              </div>
              <div class="field-item">
                <div class="field-label">项目类型</div>
                <div class="field-value">
                  <Tag v-if="detailData?.projectType" :color="projectTypeColors[detailData.projectType] || 'default'">
                    {{ projectTypeLabels[detailData.projectType] || detailData.projectType }}
                  </Tag>
                  <span v-else>-</span>
                </div>
              </div>
              <div class="field-item">
                <div class="field-label">招标方式</div>
                <div class="field-value">{{ bidMethodLabels[detailData?.bidMethod || ''] || detailData?.bidMethod || '-' }}</div>
              </div>
              <div class="field-item">
                <div class="field-label">预算金额</div>
                <div class="field-value text-orange-500">
                  {{ detailData?.budgetAmount ? `¥${Number(detailData.budgetAmount).toLocaleString('zh-CN')} 万元` : '-' }}
                </div>
              </div>
              <div class="field-item">
                <div class="field-label">项目地区</div>
                <div class="field-value">{{ detailData?.projectRegion || '-' }}</div>
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

          <!-- 时间信息卡片 -->
          <Card id="time-record" class="mb-4 detail-card" :style="cardRadiusStyle">
            <template #title>
              <span class="card-title">
                <ClockCircleOutlined class="card-title-icon" />
                时间记录
              </span>
            </template>
            <div class="field-grid">
              <div class="field-item">
                <div class="field-label">创建时间</div>
                <div class="field-value">{{ detailData?.createTime || '-' }}</div>
              </div>
              <div class="field-item">
                <div class="field-label">更新时间</div>
                <div class="field-value">{{ detailData?.updateTime || '-' }}</div>
              </div>
              <div class="field-item">
                <div class="field-label">开始生成时间</div>
                <div class="field-value">{{ detailData?.startTime || '-' }}</div>
              </div>
              <div class="field-item">
                <div class="field-label">完成时间</div>
                <div class="field-value">{{ detailData?.endTime || '-' }}</div>
              </div>
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

.cfg-error-tip {
  font-size: 11px;
  color: #ff4d4f;
  margin-top: 4px;
  white-space: pre-wrap;
  word-break: break-all;
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
</style>
