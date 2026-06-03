<script setup lang="ts">
import type { VxeGridProps } from '#/adapter/vxe-table';

import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useVbenDrawer } from '@vben/common-ui';

import { Card, Tag, Button, Space, Switch, Dropdown, Menu, MenuItem, Progress, Tooltip, Modal, message } from 'ant-design-vue';
import {
  ArrowLeftOutlined,
  PlusOutlined,
  EllipsisOutlined,
  FileTextOutlined,
  FieldNumberOutlined,
  BarChartOutlined,
  ClockCircleOutlined,
  ImportOutlined,
  BookOutlined,
  LinkOutlined,
  DatabaseOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons-vue';
import { AnchorNav } from '#/components/anchor-nav';
import type { AnchorNavItem } from '#/components/anchor-nav';
import { useDetailPagePreference, useListTablePreference } from '#/preferences/userPreference';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import CommonFilter from '#/components/CommonFilter/index.vue';
import {
  reviewStandardInfo,
  reviewStandardRuleList,
  reviewStandardRuleUpdate,
  reviewStandardRuleRemove,
  reviewStandardKnowledges,
  reviewStandardLinkKnowledge,
  reviewStandardUnlinkKnowledge,
} from '#/api/review/standard';
import { reviewKnowledgeList, reviewKnowledgeSyncVector } from '#/api/review/knowledge';
import type { ReviewStandard, ReviewStandardRule } from '#/api/review/standard/model';
import type { ReviewKnowledge } from '#/api/review/knowledge/model';
import AddRuleDrawer from './modules/add-rule-drawer.vue';
import ImportRuleDrawer from './modules/import-rule-drawer.vue';
import SmartParseDrawer from './modules/smart-parse-drawer.vue';

const route = useRoute();
const router = useRouter();
const standardId = computed(() => route.query.id as string);
const layoutPreference = useDetailPagePreference();
const tablePreference = useListTablePreference();
const scrollContainer = ref<HTMLElement | null>(null);

const anchorNavItems = ref<AnchorNavItem[]>([
  { key: 'overview', title: '基本信息' },
  { key: 'knowledge-link', title: '关联知识库' },
  { key: 'rule-list', title: '规则列表' },
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

const standardInfo = ref<Partial<ReviewStandard>>({});
const ruleList = ref<ReviewStandardRule[]>([]);
const linkedKnowledgeBases = ref<ReviewKnowledge[]>([]);
const availableKnowledgeBases = ref<ReviewKnowledge[]>([]);

const showKnowledgeSelectModal = ref(false);
const selectedKnowledgeIds = ref<number[]>([]);

function handleLinkKnowledge() {
  selectedKnowledgeIds.value = [];
  loadAvailableKnowledges();
  showKnowledgeSelectModal.value = true;
}

async function loadAvailableKnowledges() {
  try {
    const res = await reviewKnowledgeList({ pageNum: 1, pageSize: 100 });
    const linkedIds = new Set(linkedKnowledgeBases.value.map((kb: any) => Number(kb.id)));
    availableKnowledgeBases.value = (res.rows || []).filter((kb: any) => !linkedIds.has(Number(kb.id)));
  } catch {
    availableKnowledgeBases.value = [];
  }
}

async function handleConfirmLinkKnowledge() {
  if (selectedKnowledgeIds.value.length === 0) {
    message.warning('请选择至少一个知识库');
    return;
  }
  for (const kid of selectedKnowledgeIds.value) {
    await reviewStandardLinkKnowledge(standardId.value, kid);
  }
  showKnowledgeSelectModal.value = false;
  message.success(`已关联 ${selectedKnowledgeIds.value.length} 个知识库`);
  await loadKnowledges();
}

function handleUnlinkKnowledge(kb: any) {
  Modal.confirm({
    title: `确认解除关联【${kb.name}】吗？`,
    content: '解除后该知识库将不再参与本标准的审核增强',
    okText: '解除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      await reviewStandardUnlinkKnowledge(standardId.value, kb.id);
      message.success('已解除关联');
      await loadKnowledges();
    },
  });
}

async function handleSyncKnowledge(kb: any) {
  try {
    await reviewKnowledgeSyncVector(kb.id);
    message.success(`知识库【${kb.name}】同步完成`);
  } catch {
    message.error('同步失败，请检查向量库服务是否正常');
  }
}

function toggleKnowledgeSelect(id: number | string) {
  const numId = Number(id);
  const idx = selectedKnowledgeIds.value.indexOf(numId);
  if (idx >= 0) {
    selectedKnowledgeIds.value.splice(idx, 1);
  } else {
    selectedKnowledgeIds.value.push(numId);
  }
}

async function loadStandardInfo() {
  if (!standardId.value) return;
  try {
    const data = await reviewStandardInfo(standardId.value);
    standardInfo.value = data;
  } catch {
    message.error('加载标准信息失败');
  }
}

async function loadRules() {
  if (!standardId.value) return;
  try {
    const data = await reviewStandardRuleList(standardId.value, { pageNum: 1, pageSize: 9999 });
    ruleList.value = data?.rows || [];
  } catch {
    ruleList.value = [];
  }
}

async function loadKnowledges() {
  if (!standardId.value) return;
  try {
    const data = await reviewStandardKnowledges(standardId.value);
    linkedKnowledgeBases.value = data || [];
  } catch {
    linkedKnowledgeBases.value = [];
  }
}

const severityMap: Record<string, { label: string; color: string }> = {
  must: { label: '严重', color: 'red' },
  should: { label: '警告', color: 'orange' },
  suggest: { label: '提示', color: 'blue' },
};

const categoryMap: Record<string, string> = {
  subject_info: '主体信息',
  compliance: '合规性',
  amount: '金额条款',
  term: '期限条款',
  acceptance: '验收条款',
  liability: '违约责任',
  ip: '知识产权',
  dispute: '争议解决',
  format: '格式规范',
  other: '其他',
};

const ruleFilterData = ref([
  {
    field: 'content',
    label: '规则内容',
    type: 'a-input',
    data: '',
    isCommon: true,
  },
  {
    field: 'severity',
    label: '等级',
    type: 'a-select',
    data: '',
    options: [
      { label: '严重', value: 'must' },
      { label: '警告', value: 'should' },
      { label: '提示', value: 'suggest' },
    ],
    isCommon: true,
  },
  {
    field: 'category',
    label: '分类',
    type: 'a-select',
    data: '',
    options: [
      { label: '主体信息', value: 'subject_info' },
      { label: '合规性', value: 'compliance' },
      { label: '金额条款', value: 'amount' },
      { label: '期限条款', value: 'term' },
      { label: '验收条款', value: 'acceptance' },
      { label: '违约责任', value: 'liability' },
      { label: '知识产权', value: 'ip' },
      { label: '争议解决', value: 'dispute' },
      { label: '格式规范', value: 'format' },
      { label: '其他', value: 'other' },
    ],
    isCommon: true,
  },
]);

const ruleSearchParams = ref<Record<string, any>>({});

const handleRuleFilterQuery = (conditions: any[]) => {
  const queryParams: Record<string, any> = {};
  conditions.forEach((item) => {
    queryParams[item.key] = item.value;
  });
  ruleSearchParams.value = queryParams;
  tableApi.query();
};

const gridOptions: VxeGridProps = {
  columns: [
    { type: 'seq', title: '序号', width: 60, align: 'center' },
    {
      field: 'content',
      title: '规则内容',
      minWidth: 300,
      headerAlign: 'left',
      align: 'left',
    },
    {
      field: 'severity',
      title: '等级',
      width: 80,
      align: 'center',
      slots: { default: 'severity' },
    },
    {
      field: 'category',
      title: '分类',
      width: 100,
      align: 'center',
      slots: { default: 'category' },
    },
    {
      field: 'weight',
      title: '权重',
      width: 90,
      align: 'center',
      slots: { default: 'weight', header: 'weightHeader' },
    },
    {
      field: 'confidence',
      title: '置信度',
      width: 130,
      align: 'center',
      slots: { default: 'confidence', header: 'confidenceHeader' },
    },
    {
      field: 'status',
      title: '状态',
      width: 80,
      align: 'center',
      slots: { default: 'status' },
    },
    {
      field: 'action',
      title: '操作',
      width: 120,
      fixed: 'right',
      align: 'center',
      slots: { default: 'action' },
    },
  ],
  keepSource: true,
  pagerConfig: {},
  proxyConfig: {
    ajax: {
      query: async ({ page }) => {
        if (!standardId.value) return { rows: [], total: 0 };
        try {
          const params = {
            pageNum: page.currentPage,
            pageSize: page.pageSize,
            ...ruleSearchParams.value,
          };
          return await reviewStandardRuleList(standardId.value, params);
        } catch {
          return { rows: [], total: 0 };
        }
      },
    },
  },
  rowConfig: {
    keyField: 'id',
  },
  id: 'review-standard-detail-rules',
};

const [BasicTable, tableApi] = useVbenVxeGrid({
  gridOptions,
} as any);

// 添加规则抽屉
const [AddRuleDrawerComp, addRuleDrawerApi] = useVbenDrawer({
  connectedComponent: AddRuleDrawer,
});

// 导入规则抽屉
const [ImportRuleDrawerComp, importRuleDrawerApi] = useVbenDrawer({
  connectedComponent: ImportRuleDrawer,
});

// 智能解析抽屉
const [SmartParseDrawerComp, smartParseDrawerApi] = useVbenDrawer({
  connectedComponent: SmartParseDrawer,
});

function handleSmartParse() {
  smartParseDrawerApi.setData({ standardId: standardId.value });
  smartParseDrawerApi.open();
}

async function handleSmartParseReload() {
  await tableApi.query();
}

function handleAddRule() {
  addRuleDrawerApi.setData({ standardId: standardId.value });
  addRuleDrawerApi.open();
}

function handleEditRule(row: any) {
  addRuleDrawerApi.setData({ ...row, standardId: standardId.value });
  addRuleDrawerApi.open();
}

function handleDeleteRule(row: any) {
  Modal.confirm({
    title: `确认删除规则吗？`,
    content: row.content,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      await reviewStandardRuleRemove([row.id]);
      message.success('删除成功');
      await tableApi.query();
    },
  });
}

async function handleToggleRuleStatus(row: any, enabled: boolean) {
  // 后端 editRule 使用 EditGroup 校验，standardId/content 均为必填，切换状态时需一并回传
  await reviewStandardRuleUpdate({
    id: row.id,
    standardId: row.standardId ?? standardId.value,
    content: row.content,
    status: enabled ? '0' : '1',
  });
  message.success(enabled ? '已启用' : '已停用');
  await tableApi.query();
}

function handleImportRule() {
  importRuleDrawerApi.setData({ standardId: standardId.value });
  importRuleDrawerApi.open();
}

async function handleExportRule() {
  if (ruleList.value.length === 0) {
    message.warning('暂无规则可导出');
    return;
  }
  try {
    const { exportStandardRules } = await import('#/api/review/standard');
    const blob = await exportStandardRules(standardId.value);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${standardInfo.value.name || '规则'}_规则列表.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    message.error('导出失败');
  }
}

async function handleReloadRules() {
  await tableApi.query();
}

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

function goBack() { router.push('/review/standard'); }

onMounted(async () => {
  scrollContainer.value?.addEventListener('scroll', handleScroll, { passive: true });
  await Promise.all([loadStandardInfo(), loadKnowledges(), loadRules()]);
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
              {{ standardInfo.name }}
              <Tag color="blue" style="margin-left: 8px;">{{ standardInfo.version }}</Tag>
              <Tag v-if="standardInfo.isSystem === '1'" color="purple" style="margin-left: 4px;">通用</Tag>
              <Tag v-else color="default" style="margin-left: 4px;">专用</Tag>
            </span>
            <Space>
              <Button type="default" size="small" @click="goBack"><ArrowLeftOutlined /> 返回</Button>
            </Space>
          </div>
          <!-- 描述 -->
          <div class="header-desc">{{ standardInfo.description }}</div>
          <!-- 指标行 -->
          <div class="header-metrics-row">
            <div class="header-metric">
              <div class="header-metric-icon-wrap header-metric-icon-blue">
                <FieldNumberOutlined />
              </div>
              <div class="header-metric-body">
                <div class="header-metric-label">规则总数</div>
                <div class="header-metric-value">{{ standardInfo.ruleCount ?? 0 }} 条</div>
              </div>
            </div>
            <div class="header-metric-divider" />
            <div class="header-metric">
              <div class="header-metric-icon-wrap header-metric-icon-cyan">
                <BarChartOutlined />
              </div>
              <div class="header-metric-body">
                <div class="header-metric-label">使用次数</div>
                <div class="header-metric-value">{{ standardInfo.useCount ?? 0 }} 次</div>
              </div>
            </div>
            <div class="header-metric-divider" />
            <div class="header-metric">
              <div class="header-metric-icon-wrap header-metric-icon-purple">
                <ClockCircleOutlined />
              </div>
              <div class="header-metric-body">
                <div class="header-metric-label">更新时间</div>
                <div class="header-metric-value">{{ standardInfo.updateTime }}</div>
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

        <!-- 关联知识库 + 规则列表 -->
        <div class="cards-wrapper">
          <Card id="knowledge-link" class="mb-4 detail-card" :style="cardRadiusStyle">
            <template #title>
              <span class="card-title">
                <BookOutlined class="card-title-icon" />
                关联知识库
              </span>
            </template>
            <template #extra>
              <Button type="primary" size="small" @click="handleLinkKnowledge">
                <LinkOutlined /> 关联知识库
              </Button>
            </template>

            <div v-if="linkedKnowledgeBases.length === 0" class="empty-knowledge">
              <DatabaseOutlined style="font-size: 32px; color: #d9d9d9;" />
              <p style="color: #999; margin-top: 8px;">暂无关联知识库，关联后可在审核时增强识别准确率</p>
              <Button type="primary" size="small" ghost @click="handleLinkKnowledge">
                <LinkOutlined /> 立即关联
              </Button>
            </div>

            <div v-else class="knowledge-grid">
              <div
                v-for="kb in linkedKnowledgeBases"
                :key="kb.id"
                class="knowledge-card"
              >
                <div class="knowledge-card-header">
                  <div class="knowledge-card-name">
                    <BookOutlined style="color: #1677ff; margin-right: 6px;" />
                    {{ kb.name }}
                  </div>
                  <Button size="small" type="link" @click="handleSyncKnowledge(kb)">
                    同步
                  </Button>
                </div>
                <div class="knowledge-card-stats">
                  <div class="knowledge-stat-item">
                    <span class="knowledge-stat-label">案例数</span>
                    <span class="knowledge-stat-value">{{ kb.caseCount ?? 0 }}</span>
                  </div>
                  <div class="knowledge-stat-item">
                    <span class="knowledge-stat-label">模式数</span>
                    <span class="knowledge-stat-value">{{ kb.patternCount ?? 0 }}</span>
                  </div>
                  <div class="knowledge-stat-item">
                    <span class="knowledge-stat-label">准确率</span>
                    <span class="knowledge-stat-value" :style="{ color: (kb.accuracy ?? 0) >= 90 ? '#52c41a' : (kb.accuracy ?? 0) >= 80 ? '#faad14' : '#ff4d4f' }">
                      {{ kb.accuracy ?? 0 }}%
                    </span>
                  </div>
                </div>
                <div class="knowledge-card-footer">
                  <span class="knowledge-sync-info">
                    <ClockCircleOutlined style="margin-right: 4px;" />
                    {{ kb.updateTime ? `更新于 ${kb.updateTime}` : '未更新' }}
                  </span>
                  <Button size="small" type="link" danger @click="handleUnlinkKnowledge(kb)">
                    解除关联
                  </Button>
                </div>
              </div>
            </div>
          </Card>

        <!-- 选择知识库弹窗 -->
        <Modal
          v-model:open="showKnowledgeSelectModal"
          title="选择知识库"
          ok-text="确认关联"
          cancel-text="取消"
          :width="560"
          @ok="handleConfirmLinkKnowledge"
        >
          <p style="color: #666; margin-bottom: 12px;">选择需要关联到本标准的知识库，关联后每次审核将结合知识库经验增强识别效果。</p>
          <div v-if="availableKnowledgeBases.length === 0" style="text-align: center; padding: 24px; color: #999;">
            暂无可关联的知识库
          </div>
          <div v-else class="knowledge-select-list">
            <div
              v-for="kb in availableKnowledgeBases"
              :key="kb.id"
              :class="['knowledge-select-item', { 'knowledge-select-item-active': selectedKnowledgeIds.includes(Number(kb.id)) }]"
              @click="toggleKnowledgeSelect(kb.id)"
            >
              <div class="knowledge-select-item-left">
                <BookOutlined style="color: #1677ff; margin-right: 8px; font-size: 16px;" />
                <div>
                  <div class="knowledge-select-item-name">{{ kb.name }}</div>
                  <div class="knowledge-select-item-meta">{{ kb.caseCount ?? 0 }} 案例 · {{ kb.patternCount ?? 0 }} 模式</div>
                </div>
              </div>
              <div class="knowledge-select-check" v-if="selectedKnowledgeIds.includes(Number(kb.id))">✓</div>
            </div>
          </div>
        </Modal>

        <!-- 规则列表 -->
          <Card id="rule-list" class="mb-4 detail-card" :style="cardRadiusStyle">
            <template #title>
              <span class="card-title">
                <FileTextOutlined class="card-title-icon" />
                规则列表
              </span>
            </template>
            <template #extra>
              <Space>
                <Tag color="red">严重 {{ ruleList.filter(r => r.severity === 'must').length }}</Tag>
                <Tag color="orange">警告 {{ ruleList.filter(r => r.severity === 'should').length }}</Tag>
                <Tag color="blue">提示 {{ ruleList.filter(r => r.severity === 'suggest').length }}</Tag>
              </Space>
            </template>

            <div class="mb-3 flex items-center justify-between">
              <CommonFilter
                :filter-data="ruleFilterData"
                type="both"
                @handle-query="handleRuleFilterQuery"
              />
              <Space>
                <Button size="small" @click="handleExportRule">导出规则</Button>
                <Button size="small" @click="handleImportRule"><ImportOutlined /> 导入规则</Button>
                <Button type="primary" size="small" @click="handleAddRule"><PlusOutlined /> 添加规则</Button>
              </Space>
            </div>

            <div class="table-style-wrapper" :style="tableCssVars">
              <BasicTable>
                <template #weightHeader>
                  <span class="header-with-info">
                    权重
                    <Tooltip title="权重决定规则在审核评分中的占比（0~100）。权重越高，该规则不通过时对审核结果影响越大。">
                      <InfoCircleOutlined class="header-info-icon" />
                    </Tooltip>
                  </span>
                </template>
                <template #confidenceHeader>
                  <span class="header-with-info">
                    置信度
                    <Tooltip title="由 AI 审核历史自动计算，反映该规则被正确识别的概率。置信度低的规则会自动标记为「需人工确认」。">
                      <InfoCircleOutlined class="header-info-icon" />
                    </Tooltip>
                  </span>
                </template>
                <template #severity="{ row }">
                  <Tag :color="severityMap[row.severity]?.color">{{ severityMap[row.severity]?.label }}</Tag>
                </template>
                <template #category="{ row }">
                  <span>{{ categoryMap[row.category] || row.category || '-' }}</span>
                </template>
                <template #weight="{ row }">
                  <Tooltip :title="`权重 ${row.weight}%：该规则在审核评分中的占比`">
                    <span
                      class="weight-badge"
                      :class="{
                        'weight-high': row.weight >= 80,
                        'weight-medium': row.weight >= 50 && row.weight < 80,
                        'weight-low': row.weight < 50,
                      }"
                    >{{ row.weight }}</span>
                  </Tooltip>
                </template>
                <template #confidence="{ row }">
                  <Tooltip :title="`识别 ${row.hitCount} 次，误判 ${row.missCount} 次`">
                    <div class="confidence-cell">
                      <template v-if="row.hitCount > 0">
                        <Progress
                          :percent="Math.round((1 - row.missCount / row.hitCount) * 100)"
                          :size="[80, 6]"
                          :stroke-color="Math.round((1 - row.missCount / row.hitCount) * 100) >= 90 ? '#52c41a' : Math.round((1 - row.missCount / row.hitCount) * 100) >= 75 ? '#faad14' : '#ff4d4f'"
                          :show-info="false"
                        />
                        <span
                          class="confidence-text"
                          :style="{ color: Math.round((1 - row.missCount / row.hitCount) * 100) >= 90 ? '#52c41a' : Math.round((1 - row.missCount / row.hitCount) * 100) >= 75 ? '#faad14' : '#ff4d4f' }"
                        >{{ Math.round((1 - row.missCount / row.hitCount) * 100) }}%</span>
                      </template>
                      <span v-else class="confidence-text" style="color: #999;">暂无数据</span>
                    </div>
                  </Tooltip>
                </template>
                <template #status="{ row }">
                  <Switch
                    :checked="row.status !== '1'"
                    checked-children="启用"
                    un-checked-children="停用"
                    size="small"
                    @change="(val: boolean) => handleToggleRuleStatus(row, val)"
                  />
                </template>
                <template #action="{ row }">
                  <Space>
                    <ghost-button @click.stop="handleEditRule(row)">编辑</ghost-button>
                    <Dropdown placement="bottomRight">
                      <template #overlay>
                        <Menu>
                          <MenuItem key="delete" @click="handleDeleteRule(row)">
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
          </Card>
        </div>
      </div>
    </div>
    <AddRuleDrawerComp @reload="handleReloadRules" />
    <ImportRuleDrawerComp @reload="handleReloadRules" />
    <SmartParseDrawerComp @reload="handleSmartParseReload" />
  </div>
</template>

<style scoped>
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

.header-desc {
  margin-top: 12px;
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
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
}

/* 横向锚点菜单条 */
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

.cards-wrapper { padding: 16px 0 24px; }

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

/* 表格样式 */
/* 关联知识库 */
.empty-knowledge {
  text-align: center;
  padding: 32px 0;
}

.knowledge-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.knowledge-card {
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 14px 16px;
  transition: box-shadow 0.2s;
}

.knowledge-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.knowledge-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.knowledge-card-name {
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  display: flex;
  align-items: center;
}

.knowledge-card-stats {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 10px;
}

.knowledge-stat-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.knowledge-stat-label {
  font-size: 12px;
  color: #909399;
}

.knowledge-stat-value {
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.knowledge-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8px;
  border-top: 1px solid #f5f5f5;
}

.knowledge-sync-info {
  font-size: 12px;
  color: #999;
  display: flex;
  align-items: center;
}

/* 选择知识库弹窗 */
.knowledge-select-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.knowledge-select-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.knowledge-select-item:hover {
  border-color: #d9d9d9;
  background: #fafafa;
}

.knowledge-select-item-active {
  border-color: #1677ff !important;
  background: #e6f4ff !important;
}

.knowledge-select-item-left {
  display: flex;
  align-items: center;
}

.knowledge-select-item-name {
  font-size: 14px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.88);
}

.knowledge-select-item-meta {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}

.knowledge-select-check {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #1677ff;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
}

/* 列头 info icon */
.header-with-info {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.header-info-icon {
  font-size: 13px;
  color: #bbb;
  cursor: help;
  transition: color 0.2s;
}

.header-info-icon:hover {
  color: #666;
}

/* 权重 badge */
.weight-badge {
  display: inline-block;
  min-width: 32px;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
}

.weight-high {
  background: #fff1f0;
  color: #cf1322;
}

.weight-medium {
  background: #fff7e6;
  color: #d46b08;
}

.weight-low {
  background: #e6f4ff;
  color: #1677ff;
}

/* 置信度 cell */
.confidence-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.confidence-text {
  font-size: 12px;
  font-weight: 600;
  min-width: 36px;
  text-align: right;
}

.table-style-wrapper :deep(.vxe-table--header-wrapper),
.table-style-wrapper :deep(.vxe-header--column) {
  background-color: var(--list-header-bg) !important;
}

.table-style-wrapper :deep(.vxe-header--column .vxe-cell) {
  color: var(--list-header-color) !important;
}

.table-style-wrapper :deep(.vxe-header--column) {
  padding-top: var(--list-header-padding-y) !important;
  padding-bottom: var(--list-header-padding-y) !important;
}

.table-style-wrapper :deep(.vxe-body--column) {
  padding-top: var(--list-cell-padding-y) !important;
  padding-bottom: var(--list-cell-padding-y) !important;
}
</style>
