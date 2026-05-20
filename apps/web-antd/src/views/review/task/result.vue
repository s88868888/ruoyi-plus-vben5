<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Card, Image, Tag, Button, Space, Modal, Input, Spin, message } from 'ant-design-vue';
import {
  ArrowLeftOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  SafetyCertificateOutlined,
  FileTextOutlined,
  UserOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
  AuditOutlined,
  HistoryOutlined,
  StopOutlined,
  UndoOutlined,
} from '@ant-design/icons-vue';

import { AnchorNav } from '#/components/anchor-nav';
import type { AnchorNavItem } from '#/components/anchor-nav';
import { Page } from '@vben/common-ui';
import { MarkdownPreviewer } from '@vben/common-ui';
import { useDetailPagePreference } from '#/preferences/userPreference';

import { reviewTaskInfo, reviewTaskMarkMisjudgment, reviewResultItemList } from '#/api/review/task';
import type { ReviewTask, ReviewResultItem } from '#/api/review/task/model';

import AttachmentPreview from './modules/AttachmentPreview.vue';

const route = useRoute();
const router = useRouter();
const layoutPreference = useDetailPagePreference();
const scrollContainer = ref<HTMLElement | null>(null);

// loading 状态
const pageLoading = ref(false);
const misjudgmentLoading = ref(false);

const anchorNavItems = computed<AnchorNavItem[]>(() => {
  return [
    { key: 'overview', title: '审核概览' },
    { key: 'data-overview', title: '数据概览' },
    { key: 'review-detail', title: '审核详情' },
  ];
});

const containerStyle = computed(() => {
  if (layoutPreference.contentWidth > 0) {
    return { maxWidth: `${layoutPreference.contentWidth}px`, margin: '0 auto', padding: '20px 24px' };
  }
  return { padding: '20px' };
});

const cardRadiusStyle = computed(() => ({
  borderRadius: `${layoutPreference.cardRadius}px`,
}));

// Mock 审核结果数据（作为 fallback）
const taskTypeMap: Record<string, string> = {
  company_info: '公司资料审核',
  contract: '合同审核',
  finance: '财务审核',
  bid: '标书审核',
  general: '通用审核',
};

const docInfo = ref({
  name: '暂无数据',
  type: '--',
  standard: '--',
  submitter: '--',
  submitTime: '--',
  reviewTime: '--',
  totalRules: 0,
  passCount: 0,
  errorCount: 0,
  warningCount: 0,
  infoCount: 0,
  reviewVersion: 1,
  aiSummary: '',
});

// 表单快照和附件
const formSnapshot = ref('');
const taskFiles = ref<any[]>([]);
const resultMarkdown = ref('');

// 解析表单数据为键值对（支持任意 JSON 结构）
const formDataEntries = computed(() => {
  if (!formSnapshot.value) return [];
  try {
    const obj = JSON.parse(formSnapshot.value);
    if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
      return Object.entries(obj).map(([key, value]) => ({ key, value: typeof value === 'object' ? JSON.stringify(value) : String(value ?? '') }));
    }
    return [{ key: '数据', value: JSON.stringify(obj, null, 2) }];
  } catch {
    return [{ key: '原始数据', value: formSnapshot.value }];
  }
});

// 附件渲染已抽到 AttachmentPreview.vue 组件，新增文件类型只动那个文件，本页不再分发类型

const issues = ref<any[]>([]);

const severityConfig: Record<string, { tagColor: string; label: string }> = {
  error: { tagColor: 'error', label: '严重' },
  warning: { tagColor: 'warning', label: '一般' },
  info: { tagColor: 'processing', label: '提示' },
  pass: { tagColor: 'success', label: '通过' },
};

// 当前选中的问题（高亮文档对应段落）
const activeIssueId = ref<number | null>(null);
const docPreviewRef = ref<HTMLElement | null>(null);

// 问题筛选
const issueFilter = ref<string>('all');
const filteredIssues = computed(() => {
  if (issueFilter.value === 'all') return issues.value;
  if (issueFilter.value === 'misjudged') return issues.value.filter(i => i.misjudged);
  if (issueFilter.value === 'pass') return issues.value.filter(i => i.passed);
  return issues.value.filter(i => i.severity === issueFilter.value);
});

const problemCount = computed(() => issues.value.filter(i => !i.passed).length);

// 误判矫正
const misjudgmentModalVisible = ref(false);
const misjudgmentReason = ref('');
const currentMisjudgmentId = ref<number | string | null>(null);

const misjudgedCount = computed(() => issues.value.filter(i => i.misjudged).length);

function openMisjudgmentModal(issueId: number | string) {
  currentMisjudgmentId.value = issueId;
  misjudgmentReason.value = '';
  misjudgmentModalVisible.value = true;
}

async function confirmMisjudgment() {
  if (!misjudgmentReason.value.trim()) {
    message.warning('请填写误判原因');
    return;
  }
  const taskId = route.query.id || route.params.id;
  if (taskId && currentMisjudgmentId.value !== null) {
    try {
      misjudgmentLoading.value = true;
      await reviewTaskMarkMisjudgment(taskId, currentMisjudgmentId.value, misjudgmentReason.value.trim());
      const issue = issues.value.find(i => i.id === currentMisjudgmentId.value);
      if (issue) {
        issue.misjudged = true;
        issue.misjudgmentReason = misjudgmentReason.value.trim();
      }
      message.success('已标记为误判，记录将沉淀到知识库');
    } catch (e) {
      message.error('标记误判失败，请重试');
    } finally {
      misjudgmentLoading.value = false;
    }
  }
  misjudgmentModalVisible.value = false;
}

function undoMisjudgment(issueId: number | string) {
  const issue = issues.value.find(i => i.id === issueId);
  if (issue) {
    issue.misjudged = false;
    issue.misjudgmentReason = '';
    message.info('已撤销误判标记');
  }
}

function selectIssue(issueId: number | string) {
  activeIssueId.value = issueId as number;
  const para = docParagraphs.value.find(p => p.issueIds?.includes(issueId as number));
  if (para && docPreviewRef.value) {
    const el = docPreviewRef.value.querySelector(`#doc-${para.id}`) as HTMLElement | null;
    if (el) {
      const elTop = el.offsetTop - docPreviewRef.value.offsetTop;
      docPreviewRef.value.scrollTo({ top: elTop - 20, behavior: 'smooth' });
    }
  }
}

// 模拟文档段落内容（fallback）
const docParagraphs = ref<any[]>([]);

// 横向导航：当前激活锚点
const activeAnchor = ref('overview');

function scrollToAnchor(key: string) {
  const el = scrollContainer.value?.querySelector(`#${key}`) as HTMLElement | null;
  if (el && scrollContainer.value) {
    const offset = el.offsetTop - 56;
    scrollContainer.value.scrollTo({ top: offset, behavior: 'smooth' });
  }
}

function handleScroll() {
  if (!scrollContainer.value) return;
  const scrollTop = scrollContainer.value.scrollTop + 80;
  let current = anchorNavItems.value[0]?.key || '';
  for (const item of anchorNavItems.value) {
    const el = scrollContainer.value.querySelector(`#${item.key}`) as HTMLElement | null;
    if (el && el.offsetTop <= scrollTop) {
      current = item.key;
    }
  }
  activeAnchor.value = current;
}

function isParaHighlighted(para: any) {
  if (!activeIssueId.value) return false;
  return para.issueIds?.includes(activeIssueId.value);
}

// 手工通过
const manualPassed = ref(false);

function handleManualPass() {
  Modal.confirm({
    title: '确认手工通过该文档？',
    content: 'AI审核结果将保留作为参考记录，文档将标记为"人工通过"并流转到下一环节。',
    okText: '确认通过',
    cancelText: '取消',
    onOk() {
      manualPassed.value = true;
      message.success('已手工通过，文档将流转到下一审核环节');
    },
  });
}

function goBack() { router.push('/review/task'); }

/** 将 ReviewResultItem 转换为页面 issue 展示结构 */
function mapResultItemToIssue(item: ReviewResultItem) {
  const passed = item.matchStatus === 'matched';
  return {
    id: item.id,
    severity: passed ? 'pass' : (item.severity || 'info'),
    title: item.fieldLabel || item.fieldName || '未命名字段',
    location: item.location || (item.fieldName ? `字段: ${item.fieldName}` : '--'),
    description: item.description || '--',
    suggestion: item.suggestion || '--',
    rule: item.ruleId ? `规则 R${item.ruleId}` : '--',
    formValue: item.formValue || '--',
    extractedValue: item.extractedValue || '--',
    matchStatus: item.matchStatus || '--',
    confidence: item.confidence,
    misjudged: item.misjudged === 'Y' || item.misjudged === '1',
    misjudgmentReason: item.misjudgmentReason || '',
    passed,
  };
}

/** 计算审核耗时的友好显示 */
function formatDuration(ms?: number): string {
  if (!ms && ms !== 0) return '--';
  if (ms < 1000) return `${ms}毫秒`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}秒`;
  const minutes = Math.floor(seconds / 60);
  const remainSec = seconds % 60;
  return remainSec > 0 ? `${minutes}分${remainSec}秒` : `${minutes}分`;
}

/** 加载任务详情及审核结果明细 */
async function loadTaskData() {
  const taskId = route.query.id || route.params.id;
  if (!taskId) {
    message.warning('未获取到任务ID');
    return;
  }
  pageLoading.value = true;
  try {
    // 1. 获取任务详情
    const taskData: ReviewTask = await reviewTaskInfo(taskId);

    // 用 API 数据覆盖 docInfo
    docInfo.value = {
      name: taskData.taskName || docInfo.value.name,
      type: taskData.taskType || docInfo.value.type,
      standard: taskData.standardNames || docInfo.value.standard,
      submitter: taskData.createByName || docInfo.value.submitter,
      submitTime: taskData.createTime || docInfo.value.submitTime,
      reviewTime: formatDuration(taskData.reviewDuration),
      totalRules: taskData.totalRules ?? docInfo.value.totalRules,
      passCount: taskData.passCount ?? docInfo.value.passCount,
      errorCount: taskData.errorCount ?? docInfo.value.errorCount,
      warningCount: taskData.warningCount ?? docInfo.value.warningCount,
      infoCount: taskData.infoCount ?? docInfo.value.infoCount,
      reviewVersion: taskData.version ?? docInfo.value.reviewVersion,
      aiSummary: taskData.aiSummary || '',
    };

    // 保存表单快照和附件信息
    formSnapshot.value = taskData.formSnapshot || '';
    taskFiles.value = taskData.files || [];
    resultMarkdown.value = (taskData as any).resultMarkdown || '';

    // 2. 获取审核结果明细
    try {
      const resultItems: ReviewResultItem[] = await reviewResultItemList(taskId);
      issues.value = (resultItems && resultItems.length > 0)
        ? resultItems.map(mapResultItemToIssue)
        : [];
    } catch {
      issues.value = [];
      console.warn('审核结果明细获取失败');
    }
  } catch (e) {
    message.error('获取任务详情失败');
    console.error('loadTaskData error:', e);
  } finally {
    pageLoading.value = false;
  }
}

onMounted(() => {
  scrollContainer.value?.addEventListener('scroll', handleScroll, { passive: true });
  loadTaskData();
});

onUnmounted(() => {
  scrollContainer.value?.removeEventListener('scroll', handleScroll);
});
</script>

<template>
  <Page :auto-content-height="true">
  <Spin :spinning="pageLoading" tip="加载中..." style="height: 100%;">
  <div class="detail-page-layout">
    <div
      v-if="layoutPreference.showAnchorNav && layoutPreference.navMode === 'side'"
      class="side-nav-panel hide-scrollbar"
      :style="{
        width: `${layoutPreference.anchorNavWidth}px`,
        margin: `20px ${layoutPreference.anchorNavMarginRight}px 20px ${layoutPreference.anchorNavMarginLeft}px`,
      }"
    >
      <AnchorNav :items="anchorNavItems" :container="scrollContainer" />
    </div>

    <div
      class="main-scroll-area hide-scrollbar"
      :style="{ left: layoutPreference.showAnchorNav && layoutPreference.navMode === 'side' ? `${layoutPreference.anchorNavMarginLeft + layoutPreference.anchorNavWidth + layoutPreference.anchorNavMarginRight}px` : '0' }"
      ref="scrollContainer"
    >
      <div :style="containerStyle">
        <!-- 顶部概览 -->
        <div id="overview" class="header-card" :style="cardRadiusStyle">
          <!-- 标题行 -->
          <div class="header-title-row">
            <span class="header-project-name">
              {{ docInfo.name }}
              <Tag color="blue" style="margin-left: 8px;">{{ taskTypeMap[docInfo.type] || docInfo.type }}</Tag>
            </span>
            <Space>
              <Button type="default" size="small" @click="goBack"><ArrowLeftOutlined /> 返回</Button>
              <Button type="default" size="small"><DownloadOutlined /> 导出报告</Button>
              <Button
                v-if="!manualPassed"
                type="primary"
                size="small"
                @click="handleManualPass"
              >
                <CheckCircleOutlined /> 通过
              </Button>
              <Tag v-else color="success" style="margin: 0; line-height: 24px;">
                <CheckCircleOutlined /> 已人工通过
              </Tag>
            </Space>
          </div>
          <!-- AI 总结 -->
          <div v-if="docInfo.aiSummary" class="header-ai-summary">
            <ThunderboltOutlined class="ai-summary-icon" />
            <span>{{ docInfo.aiSummary }}</span>
          </div>
          <!-- 指标行 -->
          <div class="header-metrics-row">
            <div class="header-metric">
              <div class="header-metric-icon-wrap header-metric-icon-blue">
                <AuditOutlined />
              </div>
              <div class="header-metric-body">
                <div class="header-metric-label">审核标准</div>
                <div class="header-metric-value">{{ docInfo.standard }}</div>
              </div>
            </div>
            <div class="header-metric-divider" />
            <div class="header-metric">
              <div class="header-metric-icon-wrap header-metric-icon-cyan">
                <UserOutlined />
              </div>
              <div class="header-metric-body">
                <div class="header-metric-label">提交人</div>
                <div class="header-metric-value">{{ docInfo.submitter }}</div>
              </div>
            </div>
            <div class="header-metric-divider" />
            <div class="header-metric">
              <div class="header-metric-icon-wrap header-metric-icon-purple">
                <ClockCircleOutlined />
              </div>
              <div class="header-metric-body">
                <div class="header-metric-label">审核时间</div>
                <div class="header-metric-value">{{ docInfo.submitTime }}</div>
              </div>
            </div>
            <div class="header-metric-divider" />
            <div class="header-metric">
              <div class="header-metric-icon-wrap header-metric-icon-green">
                <ThunderboltOutlined />
              </div>
              <div class="header-metric-body">
                <div class="header-metric-label">耗时</div>
                <div class="header-metric-value">{{ docInfo.reviewTime }}</div>
              </div>
            </div>
            <div class="header-metric-divider" />
            <div class="header-metric">
              <div class="header-metric-icon-wrap header-metric-icon-orange">
                <HistoryOutlined />
              </div>
              <div class="header-metric-body">
                <div class="header-metric-label">审核次数</div>
                <div class="header-metric-value">第{{ docInfo.reviewVersion }}次</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 横向锚点菜单条 -->
        <div
          v-if="layoutPreference.showAnchorNav && layoutPreference.navMode === 'horizontal'"
          class="horizontal-nav-bar"
          :style="{ borderRadius: `${layoutPreference.cardRadius}px` }"
        >
          <a
            v-for="item in anchorNavItems"
            :key="item.key"
            :class="['horizontal-nav-item', { 'horizontal-nav-item-active': activeAnchor === item.key }]"
            @click="scrollToAnchor(item.key)"
          >
            {{ item.title }}
          </a>
        </div>

        <!-- 数据概览 -->
        <div class="cards-wrapper">
        <Card id="data-overview" class="mb-4 detail-card" :style="cardRadiusStyle">
          <template #title>
            <span class="card-title">
              <SafetyCertificateOutlined class="card-title-icon" />
              数据概览
            </span>
          </template>
          <div class="overview-grid">
            <div class="overview-item">
              <div class="overview-icon overview-icon-error">
                <CloseCircleOutlined />
              </div>
              <div class="overview-content">
                <div class="overview-label">严重问题</div>
                <div class="overview-value overview-value-error">{{ docInfo.errorCount }}<span class="overview-unit">个</span></div>
              </div>
            </div>
            <div class="overview-item">
              <div class="overview-icon overview-icon-warning">
                <ExclamationCircleOutlined />
              </div>
              <div class="overview-content">
                <div class="overview-label">一般问题</div>
                <div class="overview-value overview-value-warning">{{ docInfo.warningCount }}<span class="overview-unit">个</span></div>
              </div>
            </div>
            <div class="overview-item">
              <div class="overview-icon overview-icon-info">
                <InfoCircleOutlined />
              </div>
              <div class="overview-content">
                <div class="overview-label">提示信息</div>
                <div class="overview-value overview-value-info">{{ docInfo.infoCount }}<span class="overview-unit">个</span></div>
              </div>
            </div>
            <div class="overview-item">
              <div class="overview-icon overview-icon-success">
                <CheckCircleOutlined />
              </div>
              <div class="overview-content">
                <div class="overview-label">规则通过</div>
                <div class="overview-value overview-value-success">{{ docInfo.passCount }}<span class="overview-unit">/{{ docInfo.totalRules }}</span></div>
              </div>
            </div>
            <div class="overview-item">
              <div class="overview-icon overview-icon-rate">
                <SafetyCertificateOutlined />
              </div>
              <div class="overview-content">
                <div class="overview-label">通过率</div>
                <div class="overview-value overview-value-rate">{{ docInfo.totalRules > 0 ? Math.round(docInfo.passCount / docInfo.totalRules * 100) : 0 }}<span class="overview-unit">%</span></div>
              </div>
            </div>
            <div v-if="misjudgedCount > 0" class="overview-item">
              <div class="overview-icon overview-icon-misjudged">
                <StopOutlined />
              </div>
              <div class="overview-content">
                <div class="overview-label">已标记误判</div>
                <div class="overview-value overview-value-misjudged">{{ misjudgedCount }}<span class="overview-unit">个</span></div>
              </div>
            </div>
          </div>
        </Card>

          <!-- 审核详情：左右分栏 -->
          <Card id="review-detail" class="mb-4 detail-card review-detail-card" :style="cardRadiusStyle">
            <template #title>
              <span class="card-title">
                <FileTextOutlined class="card-title-icon" />
                审核详情
              </span>
            </template>
            <template #extra>
              <Space>
                <Tag
                  :color="issueFilter === 'all' ? 'purple' : 'default'"
                  class="cursor-pointer"
                  @click="issueFilter = 'all'"
                >全部 {{ issues.length }}</Tag>
                <Tag
                  :color="issueFilter === 'error' ? 'error' : 'default'"
                  class="cursor-pointer"
                  @click="issueFilter = 'error'"
                >严重 {{ issues.filter(i => i.severity === 'error').length }}</Tag>
                <Tag
                  :color="issueFilter === 'warning' ? 'warning' : 'default'"
                  class="cursor-pointer"
                  @click="issueFilter = 'warning'"
                >一般 {{ issues.filter(i => i.severity === 'warning').length }}</Tag>
                <Tag
                  :color="issueFilter === 'info' ? 'processing' : 'default'"
                  class="cursor-pointer"
                  @click="issueFilter = 'info'"
                >提示 {{ issues.filter(i => i.severity === 'info').length }}</Tag>
                <Tag
                  :color="issueFilter === 'pass' ? 'success' : 'default'"
                  class="cursor-pointer"
                  @click="issueFilter = 'pass'"
                >通过 {{ issues.filter(i => i.passed).length }}</Tag>
                <Tag
                  v-if="misjudgedCount > 0"
                  :color="issueFilter === 'misjudged' ? 'default' : 'default'"
                  :class="['cursor-pointer', { 'misjudged-filter-active': issueFilter === 'misjudged' }]"
                  @click="issueFilter = 'misjudged'"
                >误判 {{ misjudgedCount }}</Tag>
              </Space>
            </template>

            <div class="review-detail-split">
              <!-- 左侧：审核报告 / 提交资料预览 -->
              <div class="doc-preview-panel">
                <div class="doc-preview-body" ref="docPreviewRef">
                  <!-- 优先展示 Markdown 审核报告 -->
                  <div v-if="resultMarkdown" class="markdown-report-section">
                    <MarkdownPreviewer v-model:value="resultMarkdown" height="auto" />
                  </div>

                  <!-- 无 Markdown 时展示表单数据 + 附件 -->
                  <template v-else>
                    <!-- 表单数据 -->
                    <div v-if="formDataEntries.length > 0" class="form-preview-section">
                      <div class="form-preview-title">提交表单数据</div>
                      <div class="form-preview-table">
                        <div v-for="entry in formDataEntries" :key="entry.key" class="form-preview-row">
                          <span class="form-preview-label">{{ entry.key }}</span>
                          <span class="form-preview-value">{{ entry.value || '-' }}</span>
                        </div>
                      </div>
                    </div>

                    <!-- 审核附件（图片/PDF/Office/视频/音频等由 AttachmentPreview 按类型分发） -->
                    <div v-if="taskFiles.length > 0" class="form-preview-section" style="margin-top: 16px;">
                      <div class="form-preview-title">审核附件</div>
                      <AttachmentPreview
                        v-for="file in taskFiles"
                        :key="file.id || file.fileName"
                        :file="file"
                      />
                    </div>

                    <!-- 无内容时的空状态 -->
                    <div v-if="formDataEntries.length === 0 && taskFiles.length === 0" class="doc-preview-empty">
                      <AuditOutlined style="font-size: 32px; color: #d9d9d9; margin-bottom: 8px;" />
                      <div style="color: #999;">暂无提交资料预览</div>
                    </div>
                  </template>
                </div>
              </div>

              <!-- 分隔线（有问题列表时显示） -->
              <div v-if="issues.length > 0" class="review-detail-divider" />

              <!-- 右侧：问题清单（有 items 时显示） -->
              <div v-if="issues.length > 0" class="issue-panel">
                <div class="issue-panel-body">
                  <div v-if="filteredIssues.length === 0" class="issue-empty">
                    <CheckCircleOutlined style="font-size: 32px; color: #52c41a; margin-bottom: 8px;" />
                    <div>暂无问题</div>
                  </div>
                  <div
                    v-for="issue in filteredIssues"
                    :key="issue.id"
                    :class="['issue-card', { 'issue-card-active': activeIssueId === issue.id, 'issue-card-misjudged': issue.misjudged, 'issue-card-passed': issue.passed }]"
                    @click="selectIssue(issue.id)"
                  >
                    <div class="issue-card-top">
                      <Tag :color="severityConfig[issue.severity]?.tagColor" size="small">{{ severityConfig[issue.severity]?.label }}</Tag>
                      <span :class="['issue-card-title', { 'issue-title-misjudged': issue.misjudged }]">{{ issue.title }}</span>
                      <Tag v-if="issue.confidence && issue.confidence < 80" color="orange" size="small">AI不确定 {{ issue.confidence }}%</Tag>
                      <Tag v-if="issue.misjudged" color="default" size="small" class="misjudged-tag">误判</Tag>
                    </div>
                    <div v-if="issue.formValue && issue.formValue !== '--'" class="issue-card-compare">
                      <div class="compare-row">
                        <span class="compare-label">表单值：</span>
                        <span class="compare-value">{{ issue.formValue }}</span>
                      </div>
                      <div class="compare-row">
                        <span class="compare-label">提取值：</span>
                        <span :class="['compare-value', { 'compare-value-mismatch': issue.matchStatus === 'mismatched' }]">{{ issue.extractedValue }}</span>
                      </div>
                    </div>
                    <p :class="['issue-card-desc', { 'issue-desc-misjudged': issue.misjudged }]">{{ issue.description }}</p>
                    <div v-if="issue.passed" class="issue-card-passed-result">
                      <CheckCircleOutlined class="issue-card-passed-icon" /> {{ issue.suggestion }}
                    </div>
                    <div v-else-if="issue.misjudged" class="issue-card-misjudgment-reason">
                      <StopOutlined class="misjudgment-reason-icon" /> 误判原因：{{ issue.misjudgmentReason }}
                    </div>
                    <div v-else class="issue-card-suggestion">
                      <CheckCircleOutlined class="issue-card-suggestion-icon" /> {{ issue.suggestion }}
                    </div>
                    <div class="issue-card-bottom">
                      <div class="issue-card-rule">
                        <FileTextOutlined class="issue-card-rule-icon" /> {{ issue.rule }}
                      </div>
                      <div class="issue-card-actions" @click.stop>
                        <Button
                          v-if="!issue.passed && !issue.misjudged"
                          type="text"
                          size="small"
                          danger
                          @click="openMisjudgmentModal(issue.id)"
                        >
                          <StopOutlined /> 标记误判
                        </Button>
                        <Button
                          v-else-if="issue.misjudged"
                          type="text"
                          size="small"
                          @click="undoMisjudgment(issue.id)"
                        >
                          <UndoOutlined /> 撤销
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

    </div>

    <!-- 误判原因弹窗 -->
    <Modal
      v-model:open="misjudgmentModalVisible"
      title="标记为误判"
      ok-text="确认标记"
      cancel-text="取消"
      @ok="confirmMisjudgment"
      :confirm-loading="misjudgmentLoading"
      :width="480"
    >
      <div class="misjudgment-modal-body">
        <p class="misjudgment-modal-tip">请说明该条问题为何属于误判，原因将记录到知识库用于优化AI审核规则。</p>
        <Input.TextArea
          v-model:value="misjudgmentReason"
          placeholder="例如：该条款已在附件中体现 / 此处为行业惯例无需修改 / 金额已经过特殊审批..."
          :rows="3"
          :maxlength="200"
          show-count
        />
      </div>
    </Modal>
  </div>
  </Spin>
  </Page>
</template>

<style scoped>
/* Spin 容器高度 */
:deep(.ant-spin-nested-loading),
:deep(.ant-spin-container) {
  height: 100%;
}

/* ===== 页面布局（与招标详情一致） ===== */
.detail-page-layout {
  position: relative;
  height: 100%;
  overflow: hidden;
}

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

.main-scroll-area {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  overflow-y: auto;
}

.hide-scrollbar::-webkit-scrollbar { display: none; }
.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

/* ===== 顶部卡片 ===== */
.header-card {
  background: #fff;
  padding: 24px 28px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  border: 1px solid #f0f0f0;
}

.header-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-project-name {
  font-size: 18px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  display: flex;
  align-items: center;
}

/* ===== AI 总结 ===== */
.header-ai-summary {
  margin-top: 12px;
  padding: 10px 14px;
  background: #f0f5ff;
  border-radius: 6px;
  font-size: 13px;
  color: #1d39c4;
  line-height: 1.6;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.ai-summary-icon {
  color: #1677ff;
  font-size: 15px;
  margin-top: 2px;
  flex-shrink: 0;
}

.header-metrics-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0;
  padding: 16px 0 0;
  border-top: 1px solid #f0f0f0;
  margin-top: 16px;
}

.header-metric {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
}

.header-metric-divider {
  width: 1px;
  height: 36px;
  background: #f0f0f0;
  margin: 0 20px;
  flex-shrink: 0;
}

.header-metric-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.header-metric-icon-blue   { background: #e6f4ff; color: #1677ff; }
.header-metric-icon-cyan   { background: #e6fffb; color: #13c2c2; }
.header-metric-icon-purple { background: #f9f0ff; color: #722ed1; }
.header-metric-icon-green  { background: #f6ffed; color: #52c41a; }
.header-metric-icon-orange { background: #fff7e6; color: #fa8c16; }

.header-metric-body {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.header-metric-label {
  color: #909399;
  font-size: 12px;
  line-height: 18px;
  white-space: nowrap;
}

.header-metric-value {
  color: rgba(0, 0, 0, 0.88);
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
  word-break: break-all;
}

/* ===== 横向锚点菜单条 ===== */
.horizontal-nav-bar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 0;
  padding: 0 4px;
  margin: 12px 0 0;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
}

.horizontal-nav-item {
  padding: 12px 20px;
  font-size: 14px;
  color: #606266;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: color 0.2s, border-color 0.2s;
  white-space: nowrap;
}

.horizontal-nav-item:hover {
  color: hsl(var(--primary));
}

.horizontal-nav-item-active {
  color: hsl(var(--primary));
  font-weight: 600;
  border-bottom-color: hsl(var(--primary));
}

/* ===== 内容卡片 ===== */
.cards-wrapper { padding: 16px 0 24px; }

/* ===== 数据概览 ===== */
.overview-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 20px;
  padding: 8px 0;
}

.overview-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #f0f0f0;
}

.overview-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.overview-icon-error { background: #fff1f0; color: #f5222d; }
.overview-icon-warning { background: #fff7e6; color: #fa8c16; }
.overview-icon-info { background: #e6f7ff; color: #1890ff; }
.overview-icon-success { background: #f6ffed; color: #52c41a; }
.overview-icon-rate { background: #f9f0ff; color: #722ed1; }

.overview-content {
  display: flex;
  flex-direction: column;
}

.overview-label {
  font-size: 12px;
  color: #909399;
  line-height: 18px;
}

.overview-value {
  font-size: 22px;
  font-weight: 700;
  line-height: 1.2;
}

.overview-unit {
  font-size: 13px;
  font-weight: 400;
  color: #909399;
  margin-left: 2px;
}

.overview-value-error { color: #1f2937; }
.overview-value-warning { color: #1f2937; }
.overview-value-info { color: #1f2937; }
.overview-value-success { color: #1f2937; }
.overview-value-rate { color: #1f2937; }

.detail-card { overflow: hidden; }
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

/* ===== 审核详情：左右分栏（同一卡片内） ===== */
.review-detail-card :deep(.ant-card-body) {
  padding: 0;
  display: flex;
  flex-direction: column;
}

.review-detail-split {
  display: grid;
  grid-template-columns: 1fr auto 360px;
  height: calc(100vh - 340px);
  min-height: 420px;
}

.doc-preview-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.doc-preview-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.markdown-report-section {
  font-size: 14px;
  line-height: 1.8;
}

.markdown-report-section :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
  font-size: 13px;
}

.markdown-report-section :deep(th),
.markdown-report-section :deep(td) {
  border: 1px solid #e8e8e8;
  padding: 8px 12px;
  text-align: left;
}

.markdown-report-section :deep(th) {
  background: #fafafa;
  font-weight: 600;
}

.doc-preview-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
}

.form-preview-section {
  margin-bottom: 12px;
}

.form-preview-title {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 10px;
  padding-left: 8px;
  border-left: 3px solid #1677ff;
}

.form-preview-table {
  background: #fafafa;
  border-radius: 6px;
  padding: 8px 12px;
}

.form-preview-row {
  display: flex;
  align-items: baseline;
  padding: 5px 0;
  border-bottom: 1px dashed #f0f0f0;
  font-size: 13px;
  line-height: 1.6;
}

.form-preview-row:last-child {
  border-bottom: none;
}

.form-preview-label {
  color: #909399;
  width: 100px;
  flex-shrink: 0;
}

.form-preview-value {
  color: #303133;
  word-break: break-all;
}

.image-preview-item {
  margin-top: 8px;
}

.image-preview-img {
  width: 100%;
  max-height: 400px;
  object-fit: contain;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
}

.image-preview-name {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  text-align: center;
}

.review-detail-divider {
  width: 1px;
  background: #f0f0f0;
}

/* 右侧问题面板 */
.issue-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.issue-panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.issue-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #909399;
  font-size: 14px;
}

.doc-paragraph {
  padding: 14px 16px;
  margin-bottom: 12px;
  border-radius: 6px;
  border-left: 3px solid transparent;
  transition: all 0.2s;
}

.doc-paragraph-has-issue {
  border-left-color: #faad14;
  background: #fffbe6;
}

.doc-paragraph-highlight {
  border-left-color: #f5222d;
  background: #fff1f0;
  box-shadow: 0 0 0 1px #ffccc7;
}

.doc-para-chapter {
  font-size: 13px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.65);
  margin-bottom: 6px;
}

.doc-para-content {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.88);
  line-height: 1.8;
  white-space: pre-wrap;
}

.doc-para-markers {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.issue-card {
  padding: 12px 14px;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
  margin-bottom: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.issue-card:hover {
  border-color: #d9d9d9;
  background: #fafafa;
}

.issue-card-active {
  border-color: hsl(var(--primary));
  background: #f0f5ff;
  box-shadow: 0 0 0 1px hsl(var(--primary) / 0.2);
}

.issue-card-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.issue-card-title {
  font-weight: 600;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.88);
}

.issue-card-location {
  font-size: 11px;
  color: #909399;
  margin-bottom: 6px;
}

.issue-card-compare {
  background: #f9fafb;
  border-radius: 4px;
  padding: 6px 10px;
  margin: 6px 0 8px;
  font-size: 12px;
}

.compare-row {
  display: flex;
  align-items: baseline;
  gap: 4px;
  line-height: 1.8;
}

.compare-label {
  color: #909399;
  flex-shrink: 0;
}

.compare-value {
  color: #303133;
  word-break: break-all;
}

.compare-value-mismatch {
  color: #f56c6c;
  font-weight: 600;
}

.issue-card-desc {
  font-size: 12px;
  color: #606266;
  line-height: 1.6;
  margin: 0 0 8px;
}

.issue-card-suggestion {
  font-size: 12px;
  color: #515a6e;
  background: #f7f8fa;
  padding: 6px 10px;
  border-radius: 4px;
  margin-bottom: 6px;
  line-height: 1.4;
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

.issue-card-suggestion-icon {
  color: #52c41a;
  margin-top: 2px;
  flex-shrink: 0;
}

.issue-card-rule {
  font-size: 11px;
  color: #8c8c8c;
  padding: 0;
  display: flex;
  align-items: center;
  gap: 4px;
}

.issue-card-rule-icon {
  font-size: 12px;
  color: #bfbfbf;
}

/* ===== 误判矫正相关样式 ===== */
.overview-icon-misjudged { background: #f5f5f5; color: #8c8c8c; }
.overview-value-misjudged { color: #8c8c8c; }

.issue-card-misjudged {
  opacity: 0.6;
  border-color: #d9d9d9;
  background: #fafafa;
}

.issue-card-misjudged:hover {
  background: #f5f5f5;
}

.issue-title-misjudged {
  text-decoration: line-through;
  color: #8c8c8c;
}

.issue-desc-misjudged {
  text-decoration: line-through;
  color: #bfbfbf;
}

.issue-card-misjudgment-reason {
  font-size: 12px;
  color: #8c8c8c;
  background: #f5f5f5;
  padding: 6px 10px;
  border-radius: 4px;
  margin-bottom: 6px;
  line-height: 1.4;
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

.misjudgment-reason-icon {
  color: #8c8c8c;
  margin-top: 2px;
  flex-shrink: 0;
}

.misjudged-tag {
  background: #f5f5f5;
  color: #8c8c8c;
  border-color: #d9d9d9;
}

.issue-card-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.issue-card-actions {
  flex-shrink: 0;
}

.misjudged-filter-active {
  background: #f5f5f5 !important;
  color: #8c8c8c !important;
  border-color: #8c8c8c !important;
}

.misjudgment-modal-body {
  padding: 8px 0;
}

.misjudgment-modal-tip {
  font-size: 13px;
  color: #606266;
  margin-bottom: 12px;
  line-height: 1.6;
}

.issue-card-passed {
  border-color: #b7eb8f;
  background: #f6ffed;
}

.issue-card-passed:hover {
  background: #f0ffe6;
}

.issue-card-passed-result {
  font-size: 12px;
  color: #52c41a;
  background: #f6ffed;
  padding: 6px 10px;
  border-radius: 4px;
  margin-bottom: 6px;
  line-height: 1.4;
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-weight: 500;
}

.issue-card-passed-icon {
  color: #52c41a;
  margin-top: 2px;
  flex-shrink: 0;
}

</style>
