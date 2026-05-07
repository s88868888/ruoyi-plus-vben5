<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Card, Tag, Button, Space, Select } from 'ant-design-vue';
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
  SwapOutlined,
  HistoryOutlined,
} from '@ant-design/icons-vue';

import { AnchorNav } from '#/components/anchor-nav';
import type { AnchorNavItem } from '#/components/anchor-nav';
import { useDetailPagePreference, useListTablePreference } from '#/preferences/userPreference';

const router = useRouter();
const layoutPreference = useDetailPagePreference();
const tablePreference = useListTablePreference();
const scrollContainer = ref<HTMLElement | null>(null);

const anchorNavItems = ref<AnchorNavItem[]>([
  { key: 'overview', title: '审核概览' },
  { key: 'data-overview', title: '数据概览' },
  { key: 'review-detail', title: '审核详情' },
  { key: 'version-compare', title: '版本对比' },
]);

const containerStyle = computed(() => {
  if (layoutPreference.contentWidth > 0) {
    return { maxWidth: `${layoutPreference.contentWidth}px`, margin: '0 auto', padding: '20px 24px' };
  }
  return { padding: '20px' };
});

const cardRadiusStyle = computed(() => ({
  borderRadius: `${layoutPreference.cardRadius}px`,
}));

const tableCssVars = computed(() => ({
  '--list-header-bg': tablePreference.headerBgColor,
  '--list-header-color': tablePreference.headerTextColor,
  '--list-header-padding-y': `${tablePreference.headerPaddingY}px`,
  '--list-cell-padding-y': `${tablePreference.cellPaddingY}px`,
}));

// Mock 审核结果数据
const docInfo = ref({
  name: 'XX市政府采购服务合同-2024.docx',
  type: '合同',
  standard: '政府采购合同审核标准 v2.1、合同通用条款检查 v3.0',
  submitter: '李四',
  submitTime: '2024-12-20 14:30:45',
  reviewTime: '18秒',
  totalRules: 38,
  passCount: 31,
  errorCount: 3,
  warningCount: 2,
  infoCount: 2,
  reviewVersion: 3,
});

// 版本历史数据
const versionHistory = ref([
  { version: 3, time: '2024-12-20 14:30:45', errorCount: 3, warningCount: 2, infoCount: 2, passCount: 31, totalRules: 38, submitter: '李四' },
  { version: 2, time: '2024-12-18 10:15:30', errorCount: 5, warningCount: 4, infoCount: 3, passCount: 26, totalRules: 38, submitter: '李四' },
  { version: 1, time: '2024-12-15 09:00:12', errorCount: 8, warningCount: 6, infoCount: 4, passCount: 20, totalRules: 38, submitter: '李四' },
]);

const compareVersionA = ref(3);
const compareVersionB = ref(2);

const versionAData = computed(() => versionHistory.value.find(v => v.version === compareVersionA.value));
const versionBData = computed(() => versionHistory.value.find(v => v.version === compareVersionB.value));

const versionOptions = computed(() => versionHistory.value.map(v => ({
  label: `第${v.version}次审核 (${v.time.split(' ')[0]})`,
  value: v.version,
})));

const issues = ref([
  { id: 1, severity: 'error', title: '大写金额与数字金额不一致', location: '第二章 · 采购金额', description: '大写"叁佰伍拾万元整"与数字¥3,500,000.00不一致，需确认是否笔误。', suggestion: '请核实金额，确保大写与小写完全一致', rule: '规则 R004 · 合同金额大写与小写必须完全一致' },
  { id: 2, severity: 'error', title: '服务期限缺少具体起止日期', location: '第三章 · 服务期限', description: '仅写"12个月"，未明确起止日期。', suggestion: '建议修改为"自2024年12月15日起至2025年12月14日止"', rule: '规则 R005 · 服务期限必须明确起止日期' },
  { id: 3, severity: 'error', title: '违约责任条款不完整', location: '第五章 · 违约责任', description: '仅约定了乙方违约责任，缺少甲方违约条款。', suggestion: '建议补充甲方违约条款', rule: '规则 R015 · 违约责任条款应双向约定' },
  { id: 4, severity: 'warning', title: '验收方式描述不够具体', location: '第四章 · 验收标准', description: '仅写"由甲方组织验收"，未明确验收时限和标准文件编号。', suggestion: '建议补充验收时限和验收依据文件', rule: '规则 R012 · 验收条款应明确验收方式、时限和标准文件' },
  { id: 5, severity: 'warning', title: '知识产权条款不完整', location: '第六章 · 知识产权', description: '未明确第三方开源组件的知识产权处理方式。', suggestion: '建议补充第三方组件清单及其许可证说明', rule: '规则 R018 · 知识产权条款应覆盖第三方组件' },
  { id: 6, severity: 'info', title: '建议补充仲裁作为争议解决备选', location: '第七章 · 争议解决', description: '当前仅约定诉讼方式，建议增加仲裁作为备选。', suggestion: '可补充"或提交XX仲裁委员会仲裁"', rule: '规则 R020 · 争议解决方式建议多元化' },
  { id: 7, severity: 'info', title: '合同份数建议增加备案份', location: '第八章 · 其他约定', description: '当前约定"一式肆份"，建议增加财政部门备案份数。', suggestion: '建议修改为"一式陆份，甲乙双方各执贰份，财政部门备案贰份"', rule: '规则 R022 · 政府采购合同应预留备案份数' },
]);

const severityConfig: Record<string, { tagColor: string; label: string }> = {
  error: { tagColor: 'error', label: '严重' },
  warning: { tagColor: 'warning', label: '一般' },
  info: { tagColor: 'processing', label: '提示' },
};

// 当前选中的问题（高亮文档对应段落）
const activeIssueId = ref<number | null>(null);
const docPreviewRef = ref<HTMLElement | null>(null);

// 问题筛选
const issueFilter = ref<string>('all');
const filteredIssues = computed(() => {
  if (issueFilter.value === 'all') return issues.value;
  return issues.value.filter(i => i.severity === issueFilter.value);
});

function selectIssue(issueId: number) {
  activeIssueId.value = issueId;
  const para = docParagraphs.value.find(p => p.issueIds?.includes(issueId));
  if (para && docPreviewRef.value) {
    const el = docPreviewRef.value.querySelector(`#doc-${para.id}`) as HTMLElement | null;
    if (el) {
      const elTop = el.offsetTop - docPreviewRef.value.offsetTop;
      docPreviewRef.value.scrollTo({ top: elTop - 20, behavior: 'smooth' });
    }
  }
}

// 模拟文档段落内容
const docParagraphs = ref([
  { id: 'p1', chapter: '第一章', title: '合同基本信息', content: '甲方：XX市人民政府（统一社会信用代码：91440100...）\n乙方：XX科技有限公司（统一社会信用代码：91440300...）\n合同编号：GFCG-2024-0156\n签订日期：2024年12月10日' },
  { id: 'p2', chapter: '第二章', title: '采购金额', content: '本合同采购总金额为人民币叁佰伍拾万元整（¥3,500,000.00），包含服务费、技术支持费及相关税费。付款方式：分三期支付，首期30%，中期40%，验收后30%。', issueIds: [1] },
  { id: 'p3', chapter: '第三章', title: '服务期限', content: '服务期限为12个月。乙方应按照甲方要求，在服务期内完成全部约定工作内容。', issueIds: [2] },
  { id: 'p4', chapter: '第四章', title: '验收标准', content: '项目验收由甲方组织验收，乙方应配合提供相关验收材料。验收不合格的，乙方应在10个工作日内整改完毕。', issueIds: [4] },
  { id: 'p5', chapter: '第五章', title: '违约责任', content: '乙方未按合同约定时间交付的，每逾期一日，应向甲方支付合同总金额0.5‰的违约金。逾期超过30日的，甲方有权解除合同。', issueIds: [3] },
  { id: 'p6', chapter: '第六章', title: '知识产权', content: '乙方保证其提供的服务及成果不侵犯任何第三方的知识产权。项目成果的知识产权归甲方所有。', issueIds: [5] },
  { id: 'p7', chapter: '第七章', title: '争议解决', content: '双方因履行本合同发生争议的，应协商解决；协商不成的，向甲方所在地人民法院提起诉讼。', issueIds: [6] },
  { id: 'p8', chapter: '第八章', title: '其他约定', content: '本合同一式肆份，甲乙双方各执贰份，具有同等法律效力。本合同自双方签字盖章之日起生效。', issueIds: [7] },
]);

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

function goBack() { router.push('/review/task'); }

onMounted(() => {
  scrollContainer.value?.addEventListener('scroll', handleScroll, { passive: true });
});

onUnmounted(() => {
  scrollContainer.value?.removeEventListener('scroll', handleScroll);
});
</script>

<template>
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
              <Tag color="blue" style="margin-left: 8px;">{{ docInfo.type }}</Tag>
            </span>
            <Space>
              <Button type="default" size="small" @click="goBack"><ArrowLeftOutlined /> 返回</Button>
              <Button type="primary" size="small"><DownloadOutlined /> 导出报告</Button>
            </Space>
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
                <div class="overview-value overview-value-rate">{{ Math.round(docInfo.passCount / docInfo.totalRules * 100) }}<span class="overview-unit">%</span></div>
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
                >严重 {{ docInfo.errorCount }}</Tag>
                <Tag
                  :color="issueFilter === 'warning' ? 'warning' : 'default'"
                  class="cursor-pointer"
                  @click="issueFilter = 'warning'"
                >一般 {{ docInfo.warningCount }}</Tag>
                <Tag
                  :color="issueFilter === 'info' ? 'processing' : 'default'"
                  class="cursor-pointer"
                  @click="issueFilter = 'info'"
                >提示 {{ docInfo.infoCount }}</Tag>
              </Space>
            </template>

            <div class="review-detail-split">
              <!-- 左侧：文档预览 -->
              <div class="doc-preview-panel">
                <div class="doc-preview-body" ref="docPreviewRef">
                  <div
                    v-for="para in docParagraphs"
                    :id="`doc-${para.id}`"
                    :key="para.id"
                    :class="['doc-paragraph', { 'doc-paragraph-highlight': isParaHighlighted(para), 'doc-paragraph-has-issue': para.issueIds && para.issueIds.length > 0 }]"
                  >
                    <div class="doc-para-chapter">{{ para.chapter }} · {{ para.title }}</div>
                    <div class="doc-para-content">{{ para.content }}</div>
                    <div v-if="para.issueIds && para.issueIds.length > 0" class="doc-para-markers">
                      <Tag
                        v-for="iid in para.issueIds"
                        :key="iid"
                        :color="severityConfig[issues.find(i => i.id === iid)?.severity || 'info']?.tagColor"
                        size="small"
                        class="cursor-pointer"
                        @click="selectIssue(iid)"
                      >
                        {{ issues.find(i => i.id === iid)?.title }}
                      </Tag>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 分隔线 -->
              <div class="review-detail-divider" />

              <!-- 右侧：问题清单 -->
              <div class="issue-panel">
                <div class="issue-panel-body">
                  <div
                    v-for="issue in filteredIssues"
                    :key="issue.id"
                    :class="['issue-card', { 'issue-card-active': activeIssueId === issue.id }]"
                    @click="selectIssue(issue.id)"
                  >
                    <div class="issue-card-top">
                      <Tag :color="severityConfig[issue.severity]?.tagColor" size="small">{{ severityConfig[issue.severity]?.label }}</Tag>
                      <span class="issue-card-title">{{ issue.title }}</span>
                    </div>
                    <div class="issue-card-location">{{ issue.location }}</div>
                    <p class="issue-card-desc">{{ issue.description }}</p>
                    <div class="issue-card-suggestion">
                      <CheckCircleOutlined /> {{ issue.suggestion }}
                    </div>
                    <span class="issue-card-rule">{{ issue.rule }}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <!-- 版本对比 -->
          <Card id="version-compare" class="mb-4 detail-card" :style="cardRadiusStyle">
            <template #title>
              <span class="card-title">
                <HistoryOutlined class="card-title-icon" />
                版本对比
              </span>
            </template>
            <template #extra>
              <Space>
                <Tag color="blue">当前第{{ docInfo.reviewVersion }}次审核</Tag>
              </Space>
            </template>

            <!-- 版本选择器 -->
            <div class="version-selector">
              <div class="version-select-item">
                <span class="version-select-label">对比版本</span>
                <Select v-model:value="compareVersionA" :options="versionOptions" style="width: 220px;" />
              </div>
              <SwapOutlined class="version-swap-icon" />
              <div class="version-select-item">
                <Select v-model:value="compareVersionB" :options="versionOptions" style="width: 220px;" />
              </div>
            </div>

            <!-- 对比结果 -->
            <div v-if="versionAData && versionBData" class="version-compare-table" :style="tableCssVars">
              <table class="compare-table">
                <thead>
                  <tr>
                    <th>指标</th>
                    <th>第{{ versionAData.version }}次审核</th>
                    <th>第{{ versionBData.version }}次审核</th>
                    <th>变化</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="font-bold">严重问题</td>
                    <td><span class="text-red-500 font-semibold">{{ versionAData.errorCount }}</span></td>
                    <td><span class="text-red-500 font-semibold">{{ versionBData.errorCount }}</span></td>
                    <td>
                      <Tag v-if="versionAData.errorCount !== versionBData.errorCount" :color="versionAData.errorCount < versionBData.errorCount ? 'success' : 'error'">
                        {{ versionAData.errorCount < versionBData.errorCount ? '↓' : '↑' }} {{ Math.abs(versionAData.errorCount - versionBData.errorCount) }}
                      </Tag>
                      <span v-else class="text-gray-400">-</span>
                    </td>
                  </tr>
                  <tr>
                    <td class="font-bold">一般问题</td>
                    <td><span class="text-orange-500 font-semibold">{{ versionAData.warningCount }}</span></td>
                    <td><span class="text-orange-500 font-semibold">{{ versionBData.warningCount }}</span></td>
                    <td>
                      <Tag v-if="versionAData.warningCount !== versionBData.warningCount" :color="versionAData.warningCount < versionBData.warningCount ? 'success' : 'error'">
                        {{ versionAData.warningCount < versionBData.warningCount ? '↓' : '↑' }} {{ Math.abs(versionAData.warningCount - versionBData.warningCount) }}
                      </Tag>
                      <span v-else class="text-gray-400">-</span>
                    </td>
                  </tr>
                  <tr>
                    <td class="font-bold">提示信息</td>
                    <td><span class="text-blue-500 font-semibold">{{ versionAData.infoCount }}</span></td>
                    <td><span class="text-blue-500 font-semibold">{{ versionBData.infoCount }}</span></td>
                    <td>
                      <Tag v-if="versionAData.infoCount !== versionBData.infoCount" :color="versionAData.infoCount < versionBData.infoCount ? 'success' : 'error'">
                        {{ versionAData.infoCount < versionBData.infoCount ? '↓' : '↑' }} {{ Math.abs(versionAData.infoCount - versionBData.infoCount) }}
                      </Tag>
                      <span v-else class="text-gray-400">-</span>
                    </td>
                  </tr>
                  <tr class="row-highlight">
                    <td class="font-bold">通过率</td>
                    <td><span class="text-green-500 font-semibold">{{ Math.round(versionAData.passCount / versionAData.totalRules * 100) }}%</span></td>
                    <td><span class="text-green-500 font-semibold">{{ Math.round(versionBData.passCount / versionBData.totalRules * 100) }}%</span></td>
                    <td>
                      <Tag v-if="versionAData.passCount !== versionBData.passCount" :color="versionAData.passCount > versionBData.passCount ? 'success' : 'error'">
                        {{ versionAData.passCount > versionBData.passCount ? '↑' : '↓' }} {{ Math.abs(Math.round(versionAData.passCount / versionAData.totalRules * 100) - Math.round(versionBData.passCount / versionBData.totalRules * 100)) }}%
                      </Tag>
                      <span v-else class="text-gray-400">-</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- 版本对比表格下方无审核历史 -->
          </Card>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
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

.overview-value-error { color: #f5222d; }
.overview-value-warning { color: #fa8c16; }
.overview-value-info { color: #1890ff; }
.overview-value-success { color: #52c41a; }
.overview-value-rate { color: #722ed1; }

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

.issue-card-desc {
  font-size: 12px;
  color: #606266;
  line-height: 1.6;
  margin: 0 0 8px;
}

.issue-card-suggestion {
  font-size: 12px;
  color: #389e0d;
  background: #f6ffed;
  padding: 6px 10px;
  border-radius: 4px;
  margin-bottom: 6px;
  line-height: 1.4;
}

.issue-card-rule {
  font-size: 11px;
  color: #1890ff;
  background: #e6f7ff;
  padding: 2px 8px;
  border-radius: 3px;
  display: inline-block;
}

/* ===== 版本对比 ===== */
.version-selector {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #fafafa;
  border-radius: 8px;
  margin-bottom: 16px;
}

.version-select-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.version-select-label {
  font-size: 13px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.65);
  white-space: nowrap;
}

.version-swap-icon {
  font-size: 16px;
  color: #909399;
}

.version-compare-table {
  border-radius: 8px;
  overflow: hidden;
}

.compare-table {
  width: 100%;
  border-collapse: collapse;
}

.compare-table thead tr {
  background-color: var(--list-header-bg, #1e1e2d);
}

.compare-table thead th {
  padding: var(--list-header-padding-y, 10px) 16px;
  font-size: 13px;
  font-weight: 600;
  color: var(--list-header-color, #fff);
  text-align: center;
}

.compare-table thead th:first-child {
  text-align: left;
}

.compare-table tbody tr {
  border-bottom: 1px solid #f5f5f5;
  transition: background 0.2s;
}

.compare-table tbody tr:last-child {
  border-bottom: none;
}

.compare-table tbody tr:hover {
  background: #fafafa;
}

.compare-table tbody tr.row-highlight {
  background: #f6ffed;
}

.compare-table tbody tr.row-highlight:hover {
  background: #f0ffe6;
}

.compare-table tbody td {
  padding: var(--list-cell-padding-y, 12px) 16px;
  font-size: 13px;
  text-align: center;
}

.compare-table tbody td:first-child {
  text-align: left;
}

</style>
