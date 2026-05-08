<script setup lang="ts">
import type { VxeGridProps } from '#/adapter/vxe-table';

import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { useVbenDrawer } from '@vben/common-ui';

import { Card, Tag, Button, Space, Dropdown, Menu, MenuItem, Progress, Tooltip, Modal, message } from 'ant-design-vue';
import {
  ArrowLeftOutlined,
  PlusOutlined,
  EditOutlined,
  EllipsisOutlined,
  FileTextOutlined,
  FieldNumberOutlined,
  BarChartOutlined,
  ClockCircleOutlined,
  ImportOutlined,
  BulbOutlined,
  BookOutlined,
  LinkOutlined,
  DeleteOutlined,
  DatabaseOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons-vue';
import { AnchorNav } from '#/components/anchor-nav';
import type { AnchorNavItem } from '#/components/anchor-nav';
import { useDetailPagePreference, useListTablePreference } from '#/preferences/userPreference';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import CommonFilter from '#/components/CommonFilter/index.vue';
import AddRuleDrawer from './modules/add-rule-drawer.vue';
import ImportRuleDrawer from './modules/import-rule-drawer.vue';
import SmartParseDrawer from './modules/smart-parse-drawer.vue';

const router = useRouter();
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

const standardInfo = ref({
  name: '政府采购合同审核标准',
  version: 'v2.1',
  type: '合同类',
  ruleCount: 38,
  usageCount: 56,
  updateTime: '2024-12-15',
  description: '适用于政府采购服务合同、货物合同的审核，涵盖合同要素完整性、金额一致性、条款合规性等检查项。',
});

// 关联知识库 mock 数据
const linkedKnowledgeBases = ref([
  { id: 1, name: '政府采购合同案例库', caseCount: 128, patternCount: 23, accuracy: 95, lastSync: '2024-12-18', status: 'synced' },
  { id: 2, name: '合同纠纷判例库', caseCount: 86, patternCount: 15, accuracy: 91, lastSync: '2024-12-15', status: 'synced' },
  { id: 3, name: '财政审计问题库', caseCount: 42, patternCount: 8, accuracy: 88, lastSync: '2024-12-10', status: 'outdated' },
]);

const availableKnowledgeBases = ref([
  { id: 4, name: '企业服务合同案例库', caseCount: 64, patternCount: 12 },
  { id: 5, name: '物业租赁合同案例库', caseCount: 53, patternCount: 9 },
  { id: 6, name: '劳动合同合规案例库', caseCount: 71, patternCount: 18 },
]);

const showKnowledgeSelectModal = ref(false);
const selectedKnowledgeIds = ref<number[]>([]);

function handleLinkKnowledge() {
  selectedKnowledgeIds.value = [];
  showKnowledgeSelectModal.value = true;
}

function handleConfirmLinkKnowledge() {
  if (selectedKnowledgeIds.value.length === 0) {
    message.warning('请选择至少一个知识库');
    return;
  }
  const newLinks = availableKnowledgeBases.value
    .filter(kb => selectedKnowledgeIds.value.includes(kb.id))
    .map(kb => ({ ...kb, accuracy: 0, lastSync: '-', status: 'pending' as const }));
  linkedKnowledgeBases.value.push(...newLinks);
  availableKnowledgeBases.value = availableKnowledgeBases.value.filter(
    kb => !selectedKnowledgeIds.value.includes(kb.id),
  );
  showKnowledgeSelectModal.value = false;
  message.success(`已关联 ${newLinks.length} 个知识库`);
}

function handleUnlinkKnowledge(kb: any) {
  Modal.confirm({
    title: `确认解除关联【${kb.name}】吗？`,
    content: '解除后该知识库将不再参与本标准的审核增强',
    okText: '解除',
    okType: 'danger',
    cancelText: '取消',
    onOk() {
      linkedKnowledgeBases.value = linkedKnowledgeBases.value.filter((k: any) => k.id !== kb.id);
      availableKnowledgeBases.value.push({ id: kb.id, name: kb.name, caseCount: kb.caseCount, patternCount: kb.patternCount });
      message.success('已解除关联');
    },
  });
}

function handleSyncKnowledge(kb: any) {
  kb.status = 'syncing';
  setTimeout(() => {
    kb.status = 'synced';
    kb.lastSync = new Date().toISOString().split('T')[0];
    message.success(`知识库【${kb.name}】同步完成`);
  }, 1500);
}

function toggleKnowledgeSelect(id: number) {
  const idx = selectedKnowledgeIds.value.indexOf(id);
  if (idx >= 0) {
    selectedKnowledgeIds.value.splice(idx, 1);
  } else {
    selectedKnowledgeIds.value.push(id);
  }
}

const mockRules = [
  { id: 1, content: '合同必须包含甲方（采购人）全称及统一社会信用代码', severity: 'must', category: '主体信息', weight: 95, confidence: 98, hitCount: 52, missCount: 1 },
  { id: 2, content: '合同必须包含乙方（供应商）全称及统一社会信用代码', severity: 'must', category: '主体信息', weight: 95, confidence: 97, hitCount: 50, missCount: 2 },
  { id: 3, content: '合同编号格式必须符合单位编号规范', severity: 'must', category: '基本信息', weight: 85, confidence: 92, hitCount: 45, missCount: 4 },
  { id: 4, content: '合同金额大写与小写必须完全一致', severity: 'must', category: '金额条款', weight: 100, confidence: 99, hitCount: 56, missCount: 0 },
  { id: 5, content: '服务期限必须明确起止日期，不得仅写"X个月"', severity: 'must', category: '期限条款', weight: 90, confidence: 88, hitCount: 40, missCount: 5 },
  { id: 6, content: '付款方式必须明确各期比例及触发条件', severity: 'must', category: '付款条款', weight: 88, confidence: 85, hitCount: 38, missCount: 7 },
  { id: 7, content: '必须包含验收条款', severity: 'must', category: '验收条款', weight: 90, confidence: 94, hitCount: 48, missCount: 3 },
  { id: 8, content: '必须包含违约责任条款', severity: 'must', category: '违约条款', weight: 92, confidence: 96, hitCount: 49, missCount: 2 },
  { id: 9, content: '合同签订日期不得晚于服务开始日期', severity: 'must', category: '期限条款', weight: 85, confidence: 90, hitCount: 42, missCount: 5 },
  { id: 10, content: '采购金额不得超过预算金额', severity: 'must', category: '金额条款', weight: 100, confidence: 99, hitCount: 55, missCount: 1 },
  { id: 11, content: '验收条款应明确验收方式、时限和标准文件', severity: 'should', category: '验收条款', weight: 70, confidence: 82, hitCount: 30, missCount: 7 },
  { id: 12, content: '违约责任条款应双向约定（甲方和乙方）', severity: 'should', category: '违约条款', weight: 72, confidence: 80, hitCount: 28, missCount: 7 },
  { id: 13, content: '应包含知识产权归属条款', severity: 'should', category: '知识产权', weight: 65, confidence: 78, hitCount: 22, missCount: 6 },
  { id: 14, content: '应包含保密条款', severity: 'should', category: '保密条款', weight: 68, confidence: 83, hitCount: 25, missCount: 5 },
  { id: 15, content: '应明确争议解决方式及管辖法院', severity: 'should', category: '争议解决', weight: 70, confidence: 85, hitCount: 32, missCount: 6 },
  { id: 16, content: '争议解决方式建议多元化（诉讼+仲裁）', severity: 'suggest', category: '争议解决', weight: 40, confidence: 72, hitCount: 15, missCount: 6 },
  { id: 17, content: '政府采购合同应预留财政部门备案份数', severity: 'suggest', category: '其他', weight: 35, confidence: 68, hitCount: 10, missCount: 5 },
  { id: 18, content: '建议附加合同变更和解除条件', severity: 'suggest', category: '其他', weight: 38, confidence: 70, hitCount: 12, missCount: 5 },
];

const severityMap: Record<string, { label: string; color: string }> = {
  must: { label: '严重', color: 'red' },
  should: { label: '一般', color: 'orange' },
  suggest: { label: '提示', color: 'blue' },
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
      { label: '一般', value: 'should' },
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
      { label: '主体信息', value: '主体信息' },
      { label: '基本信息', value: '基本信息' },
      { label: '金额条款', value: '金额条款' },
      { label: '期限条款', value: '期限条款' },
      { label: '付款条款', value: '付款条款' },
      { label: '验收条款', value: '验收条款' },
      { label: '违约条款', value: '违约条款' },
      { label: '知识产权', value: '知识产权' },
      { label: '保密条款', value: '保密条款' },
      { label: '争议解决', value: '争议解决' },
      { label: '其他', value: '其他' },
    ],
    isCommon: true,
  },
]);

const handleRuleFilterQuery = (_conditions: any[]) => {
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
        const data = mockRules;
        const start = (page.currentPage - 1) * page.pageSize;
        const end = start + page.pageSize;
        return {
          rows: data.slice(start, end),
          total: data.length,
        };
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
  smartParseDrawerApi.open();
}

async function handleSmartParseReload() {
  await tableApi.query();
}

function handleAddRule() {
  addRuleDrawerApi.open();
}

function handleEditRule(row: any) {
  addRuleDrawerApi.setData(row);
  addRuleDrawerApi.open();
}

function handleImportRule() {
  importRuleDrawerApi.open();
}

function handleExportRule() {
  message.success('规则导出中...');
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
              {{ standardInfo.name }}
              <Tag color="blue" style="margin-left: 8px;">{{ standardInfo.version }}</Tag>
              <Tag color="cyan" style="margin-left: 4px;">{{ standardInfo.type }}</Tag>
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
                <div class="header-metric-value">{{ standardInfo.ruleCount }} 条</div>
              </div>
            </div>
            <div class="header-metric-divider" />
            <div class="header-metric">
              <div class="header-metric-icon-wrap header-metric-icon-cyan">
                <BarChartOutlined />
              </div>
              <div class="header-metric-body">
                <div class="header-metric-label">使用次数</div>
                <div class="header-metric-value">{{ standardInfo.usageCount }} 次</div>
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

        <!-- 关联知识库 -->
        <div class="cards-wrapper" style="padding-bottom: 0;">
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
                  <Dropdown placement="bottomRight">
                    <template #overlay>
                      <Menu>
                        <MenuItem key="sync" @click="handleSyncKnowledge(kb)">
                          同步数据
                        </MenuItem>
                        <MenuItem key="unlink" @click="handleUnlinkKnowledge(kb)">
                          <span class="text-red-500">解除关联</span>
                        </MenuItem>
                      </Menu>
                    </template>
                    <a-button size="small" type="text">
                      <EllipsisOutlined />
                    </a-button>
                  </Dropdown>
                </div>
                <div class="knowledge-card-stats">
                  <div class="knowledge-stat-item">
                    <span class="knowledge-stat-label">案例数</span>
                    <span class="knowledge-stat-value">{{ kb.caseCount }}</span>
                  </div>
                  <div class="knowledge-stat-item">
                    <span class="knowledge-stat-label">模式数</span>
                    <span class="knowledge-stat-value">{{ kb.patternCount }}</span>
                  </div>
                  <div class="knowledge-stat-item">
                    <span class="knowledge-stat-label">准确率</span>
                    <span class="knowledge-stat-value" :style="{ color: kb.accuracy >= 90 ? '#52c41a' : kb.accuracy >= 80 ? '#faad14' : '#ff4d4f' }">
                      {{ kb.accuracy }}%
                    </span>
                  </div>
                </div>
                <div class="knowledge-card-footer">
                  <span class="knowledge-sync-info">
                    <ClockCircleOutlined style="margin-right: 4px;" />
                    {{ kb.lastSync === '-' ? '待同步' : `同步于 ${kb.lastSync}` }}
                  </span>
                  <Tag
                    v-if="kb.status === 'synced'" color="green" :bordered="false"
                  >已同步</Tag>
                  <Tag
                    v-else-if="kb.status === 'syncing'" color="blue" :bordered="false"
                  >同步中...</Tag>
                  <Tag
                    v-else-if="kb.status === 'outdated'" color="orange" :bordered="false"
                  >待更新</Tag>
                  <Tag
                    v-else color="default" :bordered="false"
                  >待同步</Tag>
                </div>
              </div>
            </div>
          </Card>
        </div>

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
              :class="['knowledge-select-item', { 'knowledge-select-item-active': selectedKnowledgeIds.includes(kb.id) }]"
              @click="toggleKnowledgeSelect(kb.id)"
            >
              <div class="knowledge-select-item-left">
                <BookOutlined style="color: #1677ff; margin-right: 8px; font-size: 16px;" />
                <div>
                  <div class="knowledge-select-item-name">{{ kb.name }}</div>
                  <div class="knowledge-select-item-meta">{{ kb.caseCount }} 案例 · {{ kb.patternCount }} 模式</div>
                </div>
              </div>
              <div class="knowledge-select-check" v-if="selectedKnowledgeIds.includes(kb.id)">✓</div>
            </div>
          </div>
        </Modal>

        <!-- 规则列表 -->
        <div class="cards-wrapper">
          <Card id="rule-list" class="mb-4 detail-card" :style="cardRadiusStyle">
            <template #title>
              <span class="card-title">
                <FileTextOutlined class="card-title-icon" />
                规则列表
              </span>
            </template>
            <template #extra>
              <Space>
                <Tag color="red">严重 {{ mockRules.filter(r => r.severity === 'must').length }}</Tag>
                <Tag color="orange">一般 {{ mockRules.filter(r => r.severity === 'should').length }}</Tag>
                <Tag color="blue">提示 {{ mockRules.filter(r => r.severity === 'suggest').length }}</Tag>
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
                      <Progress
                        :percent="row.confidence"
                        :size="[80, 6]"
                        :stroke-color="row.confidence >= 90 ? '#52c41a' : row.confidence >= 75 ? '#faad14' : '#ff4d4f'"
                        :show-info="false"
                      />
                      <span
                        class="confidence-text"
                        :style="{ color: row.confidence >= 90 ? '#52c41a' : row.confidence >= 75 ? '#faad14' : '#ff4d4f' }"
                      >{{ row.confidence }}%</span>
                    </div>
                  </Tooltip>
                </template>
                <template #action="{ row }">
                  <Space>
                    <ghost-button @click.stop="handleEditRule(row)">编辑</ghost-button>
                    <Dropdown placement="bottomRight">
                      <template #overlay>
                        <Menu>
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
