<script setup lang="ts">
import type { VxeGridProps } from '#/adapter/vxe-table';

import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useVbenDrawer } from '@vben/common-ui';

import {
  Badge, Button, Card, Dropdown, Menu, MenuItem, Modal, Space, Tag, Tabs, TabPane, message,
} from 'ant-design-vue';
import {
  ArrowLeftOutlined,
  PlusOutlined,
  EllipsisOutlined,
  BookOutlined,
  FieldNumberOutlined,
  BarChartOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  LinkOutlined,
  StopOutlined,
  SyncOutlined,
} from '@ant-design/icons-vue';

import { AnchorNav } from '#/components/anchor-nav';
import type { AnchorNavItem } from '#/components/anchor-nav';
import { useDetailPagePreference, useListTablePreference } from '#/preferences/userPreference';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import CommonFilter from '#/components/CommonFilter/index.vue';
import {
  reviewKnowledgeInfo,
  reviewKnowledgeStandards,
  reviewKnowledgeCases,
  reviewKnowledgePatterns,
  reviewKnowledgeMisjudgments,
  reviewKnowledgeSyncVector,
} from '#/api/review/knowledge';

const route = useRoute();
const router = useRouter();
const knowledgeId = computed(() => route.query.id as string);
const layoutPreference = useDetailPagePreference();
const tablePreference = useListTablePreference();
const scrollContainer = ref<HTMLElement | null>(null);

const anchorNavItems = ref<AnchorNavItem[]>([
  { key: 'overview', title: '基本信息' },
  { key: 'linked-standards', title: '关联标准' },
  { key: 'data-content', title: '数据内容' },
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

const knowledgeInfo = ref<Record<string, any>>({});
const linkedStandards = ref<any[]>([]);
const caseList = ref<any[]>([]);
const patternList = ref<any[]>([]);
const misjudgmentList = ref<any[]>([]);

const activeTab = ref('cases');

async function loadKnowledgeInfo() {
  if (!knowledgeId.value) return;
  try {
    knowledgeInfo.value = await reviewKnowledgeInfo(knowledgeId.value);
  } catch { /* empty */ }
}

async function loadLinkedStandards() {
  if (!knowledgeId.value) return;
  try {
    linkedStandards.value = await reviewKnowledgeStandards(knowledgeId.value) || [];
  } catch {
    linkedStandards.value = [];
  }
}

// 筛选条件
const caseFilterData = ref([
  {
    field: 'docName',
    label: '文档名称',
    type: 'a-input',
    data: '',
    isCommon: true,
  },
  {
    field: 'source',
    label: '来源',
    type: 'a-select',
    data: '',
    options: [
      { label: '审核反馈', value: 'feedback' },
      { label: '人工标注', value: 'manual' },
      { label: '业务回传', value: 'business' },
    ],
    isCommon: true,
  },
  {
    field: 'result',
    label: '结论',
    type: 'a-select',
    data: '',
    options: [
      { label: '确认问题', value: 'confirmed' },
      { label: '忽略', value: 'ignored' },
    ],
    isCommon: true,
  },
]);

const patternFilterData = ref([
  {
    field: 'name',
    label: '模式名称',
    type: 'a-input',
    data: '',
    isCommon: true,
  },
  {
    field: 'category',
    label: '分类',
    type: 'a-select',
    data: '',
    options: [
      { label: '金额类', value: '金额类' },
      { label: '期限类', value: '期限类' },
      { label: '完整性', value: '完整性' },
      { label: '格式类', value: '格式类' },
      { label: '主体类', value: '主体类' },
    ],
    isCommon: true,
  },
]);

const misjudgedFilterData = ref([
  {
    field: 'rule',
    label: '规则',
    type: 'a-input',
    data: '',
    isCommon: true,
  },
  {
    field: 'docName',
    label: '来源文档',
    type: 'a-input',
    data: '',
    isCommon: true,
  },
]);

// 历史案例表格
const caseGridOptions: VxeGridProps = {
  columns: [
    { type: 'checkbox', width: 50 },
    {
      field: 'title',
      title: '案例标题',
      minWidth: 220,
      headerAlign: 'left',
      align: 'left',
      slots: { default: 'caseTitle' },
    },
    {
      field: 'scenario',
      title: '场景描述',
      minWidth: 200,
      headerAlign: 'left',
      align: 'left',
    },
    {
      field: 'reviewConclusion',
      title: '审核结论',
      width: 160,
      slots: { default: 'result' },
    },
    {
      field: 'createTime',
      title: '时间',
      width: 120,
      headerAlign: 'left',
      align: 'left',
    },
    {
      field: 'action',
      title: '操作',
      width: 100,
      fixed: 'right',
      slots: { default: 'caseAction' },
    },
  ],
  keepSource: true,
  pagerConfig: {},
  proxyConfig: {
    ajax: {
      query: async ({ page }) => {
        if (!knowledgeId.value) return { rows: [], total: 0 };
        try {
          const data = await reviewKnowledgeCases(knowledgeId.value);
          caseList.value = data || [];
          const start = (page.currentPage - 1) * page.pageSize;
          const end = start + page.pageSize;
          return { rows: caseList.value.slice(start, end), total: caseList.value.length };
        } catch {
          return { rows: [], total: 0 };
        }
      },
    },
  },
  rowConfig: { keyField: 'id' },
  id: 'knowledge-detail-case',
};

// 问题模式表格
const patternGridOptions: VxeGridProps = {
  columns: [
    { type: 'checkbox', width: 50 },
    {
      field: 'name',
      title: '模式名称',
      minWidth: 220,
      headerAlign: 'left',
      align: 'left',
      slots: { default: 'patternName' },
    },
    {
      field: 'frequency',
      title: '出现频次',
      width: 100,
      align: 'center',
      slots: { default: 'frequency' },
    },
    {
      field: 'accuracy',
      title: '识别准确率',
      width: 120,
      align: 'center',
      slots: { default: 'accuracy' },
    },
    {
      field: 'action',
      title: '操作',
      width: 100,
      fixed: 'right',
      slots: { default: 'patternAction' },
    },
  ],
  keepSource: true,
  pagerConfig: {},
  proxyConfig: {
    ajax: {
      query: async ({ page }) => {
        if (!knowledgeId.value) return { rows: [], total: 0 };
        try {
          const data = await reviewKnowledgePatterns(knowledgeId.value);
          patternList.value = (data || []).map((r: any) => ({
            ...r,
            name: r.patternName,
            frequency: r.frequency ?? 0,
            accuracy: r.accuracy ?? 0,
          }));
          const start = (page.currentPage - 1) * page.pageSize;
          const end = start + page.pageSize;
          return { rows: patternList.value.slice(start, end), total: patternList.value.length };
        } catch {
          return { rows: [], total: 0 };
        }
      },
    },
  },
  rowConfig: { keyField: 'id' },
  id: 'knowledge-detail-pattern',
};

// 误判记录表格
const misjudgedGridOptions: VxeGridProps = {
  columns: [
    {
      field: 'aiJudgment',
      title: 'AI判断',
      minWidth: 240,
      headerAlign: 'left',
      align: 'left',
      slots: { default: 'misjudgedRule' },
    },
    {
      field: 'reason',
      title: '误判原因',
      minWidth: 200,
      headerAlign: 'left',
      align: 'left',
      slots: { default: 'misjudgedReason' },
    },
    {
      field: 'fieldName',
      title: '字段',
      width: 120,
      align: 'center',
    },
    {
      field: 'correctJudgment',
      title: '人工纠正',
      width: 130,
      align: 'center',
    },
    {
      field: 'isLearned',
      title: '已学习',
      width: 80,
      align: 'center',
      slots: { default: 'isLearned' },
    },
    {
      field: 'createTime',
      title: '时间',
      width: 110,
      headerAlign: 'left',
      align: 'left',
    },
    {
      field: 'action',
      title: '操作',
      width: 100,
      fixed: 'right',
      slots: { default: 'misjudgedAction' },
    },
  ],
  keepSource: true,
  pagerConfig: {},
  proxyConfig: {
    ajax: {
      query: async ({ page }) => {
        if (!knowledgeId.value) return { rows: [], total: 0 };
        try {
          const data = await reviewKnowledgeMisjudgments(knowledgeId.value);
          misjudgmentList.value = data || [];
          const start = (page.currentPage - 1) * page.pageSize;
          const end = start + page.pageSize;
          return { rows: misjudgmentList.value.slice(start, end), total: misjudgmentList.value.length };
        } catch {
          return { rows: [], total: 0 };
        }
      },
    },
  },
  rowConfig: { keyField: 'id' },
  id: 'knowledge-detail-misjudged',
};

const [CaseTable, caseTableApi] = useVbenVxeGrid({ gridOptions: caseGridOptions } as any);
const [PatternTable, patternTableApi] = useVbenVxeGrid({ gridOptions: patternGridOptions } as any);
const [MisjudgedTable, misjudgedTableApi] = useVbenVxeGrid({ gridOptions: misjudgedGridOptions } as any);

const handleCaseFilterQuery = (_conditions: any[]) => {
  caseTableApi.query();
};

const handlePatternFilterQuery = (_conditions: any[]) => {
  patternTableApi.query();
};

const handleMisjudgedFilterQuery = (_conditions: any[]) => {
  misjudgedTableApi.query();
};

function handleDeleteCase(row: any) {
  Modal.confirm({
    title: `确认删除案例【${row.docName}】吗？`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    onOk() {
      message.success('删除成功');
      caseTableApi.query();
    },
  });
}

function handleDeletePattern(row: any) {
  Modal.confirm({
    title: `确认删除模式【${row.name}】吗？`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    onOk() {
      message.success('删除成功');
      patternTableApi.query();
    },
  });
}

function handleDeleteMisjudged(row: any) {
  Modal.confirm({
    title: '确认删除该条误判记录吗？',
    content: `规则：${row.ruleId}，来源：${row.docName}`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    onOk() {
      message.success('删除成功');
      misjudgedTableApi.query();
    },
  });
}

const syncing = ref(false);

async function handleSyncVector() {
  if (!knowledgeId.value) return;
  syncing.value = true;
  try {
    await reviewKnowledgeSyncVector(knowledgeId.value);
    message.success('同步任务已提交，知识库正在向量化中...');
  } catch {
    message.error('同步失败，请检查向量库服务是否正常');
  } finally {
    syncing.value = false;
  }
}

function goBack() {
  router.push('/review/knowledge');
}

function handleViewStandard(row: any) {
  router.push(`/review/standard/detail?id=${row.id}`);
}

// 锚点导航
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

onMounted(async () => {
  scrollContainer.value?.addEventListener('scroll', handleScroll, { passive: true });
  await Promise.all([loadKnowledgeInfo(), loadLinkedStandards()]);
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
          <div class="header-title-row">
            <span class="header-project-name">
              <BookOutlined style="color: #1677ff; margin-right: 8px;" />
              {{ knowledgeInfo.name }}
              <Tag color="cyan" style="margin-left: 8px;">{{ knowledgeInfo.type }}</Tag>
              <Badge v-if="knowledgeInfo.status === '0'" status="success" text="启用中" style="margin-left: 8px;" />
            </span>
            <Space>
              <Button type="primary" size="small" :loading="syncing" @click="handleSyncVector">
                <SyncOutlined /> 同步
              </Button>
              <Button type="default" size="small" @click="goBack"><ArrowLeftOutlined /> 返回</Button>
            </Space>
          </div>
          <div class="header-desc">{{ knowledgeInfo.description }}</div>
          <div class="header-metrics-row">
            <div class="header-metric">
              <div class="header-metric-icon-wrap header-metric-icon-blue">
                <FieldNumberOutlined />
              </div>
              <div class="header-metric-body">
                <div class="header-metric-label">历史案例</div>
                <div class="header-metric-value">{{ knowledgeInfo.caseCount ?? 0 }} 条</div>
              </div>
            </div>
            <div class="header-metric-divider" />
            <div class="header-metric">
              <div class="header-metric-icon-wrap header-metric-icon-purple">
                <BarChartOutlined />
              </div>
              <div class="header-metric-body">
                <div class="header-metric-label">问题模式</div>
                <div class="header-metric-value">{{ knowledgeInfo.patternCount ?? 0 }} 个</div>
              </div>
            </div>
            <div class="header-metric-divider" />
            <div class="header-metric">
              <div class="header-metric-icon-wrap header-metric-icon-orange">
                <StopOutlined />
              </div>
              <div class="header-metric-body">
                <div class="header-metric-label">误判记录</div>
                <div class="header-metric-value">{{ misjudgmentList.length }} 条</div>
              </div>
            </div>
            <div class="header-metric-divider" />
            <div class="header-metric">
              <div class="header-metric-icon-wrap header-metric-icon-green">
                <CheckCircleOutlined />
              </div>
              <div class="header-metric-body">
                <div class="header-metric-label">识别准确率</div>
                <div class="header-metric-value" style="color: #52c41a;">{{ knowledgeInfo.accuracy ?? 0 }}%</div>
              </div>
            </div>
            <div class="header-metric-divider" />
            <div class="header-metric">
              <div class="header-metric-icon-wrap header-metric-icon-cyan">
                <ClockCircleOutlined />
              </div>
              <div class="header-metric-body">
                <div class="header-metric-label">最近更新</div>
                <div class="header-metric-value">{{ knowledgeInfo.updateTime }}</div>
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

        <!-- 关联标准 -->
        <div class="cards-wrapper" style="padding-bottom: 0;">
          <Card id="linked-standards" class="mb-4 detail-card" :style="cardRadiusStyle">
            <template #title>
              <span class="card-title">
                <LinkOutlined class="card-title-icon" />
                关联标准
              </span>
            </template>
            <template #extra>
              <span class="text-gray-400 text-xs">本知识库被以下审核标准引用</span>
            </template>

            <div v-if="linkedStandards.length === 0" style="text-align: center; padding: 24px; color: #999;">
              暂无标准引用此知识库
            </div>
            <div v-else class="linked-standards-grid">
              <div
                v-for="std in linkedStandards"
                :key="std.id"
                class="linked-standard-card"
                @click="handleViewStandard(std)"
              >
                <div class="linked-standard-name">
                  {{ std.name }}
                  <Tag color="blue" :bordered="false" class="tag-sm" style="margin-left: 6px;">{{ std.version }}</Tag>
                </div>
                <div class="linked-standard-meta">
                  <Tag :bordered="false" class="tag-sm">{{ std.type }}</Tag>
                  <span class="text-gray-400 text-xs">{{ std.ruleCount ?? 0 }} 条规则</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <!-- 数据内容：案例 + 模式 -->
        <div class="cards-wrapper">
          <Card id="data-content" class="detail-card" :style="cardRadiusStyle">
            <template #title>
              <span class="card-title">
                <BarChartOutlined class="card-title-icon" />
                数据内容
              </span>
            </template>

            <Tabs v-model:activeKey="activeTab" class="knowledge-tabs">
              <TabPane key="cases" tab="历史案例" class="tab-pane-content">
                <div class="flex flex-col gap-3">
                  <div class="shrink-0 flex items-center justify-between">
                    <CommonFilter
                      :filter-data="caseFilterData"
                      type="both"
                      @handle-query="handleCaseFilterQuery"
                    />
                    <Button type="primary" size="small">
                      <PlusOutlined />
                      新增案例
                    </Button>
                  </div>
                  <div class="table-style-wrapper" :style="tableCssVars">
                    <CaseTable table-title="历史案例">
                      <template #caseTitle="{ row }">
                        <div class="flex flex-col gap-1">
                          <span class="doc-name-text">{{ row.title }}</span>
                          <div class="flex items-center gap-1">
                            <Tag :color="row.caseType === 'positive' ? 'green' : 'red'" :bordered="false" class="tag-sm">
                              {{ row.caseType === 'positive' ? '正例' : '反例' }}
                            </Tag>
                          </div>
                        </div>
                      </template>
                      <template #result="{ row }">
                        <span class="text-xs">{{ row.reviewConclusion || '-' }}</span>
                      </template>
                      <template #caseAction="{ row }">
                        <Space>
                          <ghost-button @click.stop>查看</ghost-button>
                          <Dropdown placement="bottomRight">
                            <template #overlay>
                              <Menu @click="({ key }: any) => { if (key === 'delete') handleDeleteCase(row); }">
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
                    </CaseTable>
                  </div>
                </div>
              </TabPane>
              <TabPane key="patterns" tab="问题模式" class="tab-pane-content">
                <div class="flex flex-col gap-3">
                  <div class="shrink-0 flex items-center justify-between">
                    <CommonFilter
                      :filter-data="patternFilterData"
                      type="both"
                      @handle-query="handlePatternFilterQuery"
                    />
                    <Button type="primary" size="small">
                      <PlusOutlined />
                      新增模式
                    </Button>
                  </div>
                  <div class="table-style-wrapper" :style="tableCssVars">
                    <PatternTable table-title="问题模式">
                      <template #patternName="{ row }">
                        <div class="flex flex-col gap-1">
                          <span class="doc-name-text">{{ row.name }}</span>
                          <div class="flex items-center gap-1">
                            <Tag :color="row.category === '金额类' ? 'red' : row.category === '期限类' ? 'orange' : row.category === '完整性' ? 'blue' : row.category === '格式类' ? 'purple' : 'cyan'" :bordered="false" class="tag-sm">{{ row.category }}</Tag>
                          </div>
                        </div>
                      </template>
                      <template #frequency="{ row }">
                        <span v-if="row.frequency > 1" class="font-bold text-black">{{ row.frequency }}</span>
                        <span v-else class="text-gray-400">{{ row.frequency }}</span>
                      </template>
                      <template #accuracy="{ row }">
                        <span class="font-semibold text-green-500">{{ row.accuracy }}%</span>
                      </template>
                      <template #patternAction="{ row }">
                        <Space>
                          <ghost-button @click.stop>查看</ghost-button>
                          <Dropdown placement="bottomRight">
                            <template #overlay>
                              <Menu @click="({ key }: any) => { if (key === 'delete') handleDeletePattern(row); }">
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
                    </PatternTable>
                  </div>
                </div>
              </TabPane>

              <TabPane key="misjudged" class="tab-pane-content">
                <template #tab>
                  <span>误判记录</span>
                  <Tag v-if="misjudgmentList.length > 0" color="default" :bordered="false" class="tag-sm" style="margin-left: 6px;">{{ misjudgmentList.length }}</Tag>
                </template>
                <div class="flex flex-col gap-3">
                  <div class="shrink-0 flex items-center justify-between">
                    <CommonFilter
                      :filter-data="misjudgedFilterData"
                      type="both"
                      @handle-query="handleMisjudgedFilterQuery"
                    />
                  </div>
                  <div class="table-style-wrapper" :style="tableCssVars">
                    <MisjudgedTable table-title="误判记录明细">
                      <template #misjudgedRule="{ row }">
                        <span class="text-xs">{{ row.aiJudgment || '-' }}</span>
                      </template>
                      <template #misjudgedReason="{ row }">
                        <span class="misjudged-reason-text">{{ row.reason || '-' }}</span>
                      </template>
                      <template #isLearned="{ row }">
                        <Tag :color="row.isLearned === '1' ? 'green' : 'default'" :bordered="false">
                          {{ row.isLearned === '1' ? '是' : '否' }}
                        </Tag>
                      </template>
                      <template #misjudgedAction="{ row }">
                        <Space>
                          <Dropdown placement="bottomRight">
                            <template #overlay>
                              <Menu @click="({ key }: any) => { if (key === 'delete') handleDeleteMisjudged(row); }">
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
                    </MisjudgedTable>
                  </div>
                </div>
              </TabPane>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
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
.header-metric-icon-purple { background: #f9f0ff; color: #722ed1; }
.header-metric-icon-green  { background: #f6ffed; color: #52c41a; }
.header-metric-icon-cyan   { background: #e6fffb; color: #13c2c2; }

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

/* 关联标准 */
.linked-standards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 10px;
}

.linked-standard-card {
  padding: 12px 14px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.linked-standard-card:hover {
  border-color: #d9d9d9;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.linked-standard-name {
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  display: flex;
  align-items: center;
  margin-bottom: 6px;
}

.linked-standard-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Tabs */
.knowledge-tabs :deep(.ant-tabs-content) {
  height: 100%;
}

.tab-pane-content {
  min-height: 480px;
  padding-bottom: 16px;
}

/* 表格 */
.doc-name-text {
  font-size: 14px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.88);
}

.tag-sm {
  font-size: 11px !important;
  padding: 0 4px !important;
  line-height: 18px !important;
  margin-inline-end: 0 !important;
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

/* 误判 */
.header-metric-icon-orange { background: #fff7e6; color: #fa8c16; }

.misjudged-reason-text {
  font-size: 13px;
  color: #606266;
  line-height: 1.5;
}
</style>
