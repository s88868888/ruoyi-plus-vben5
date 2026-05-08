<script setup lang="ts">
import type { VxeGridProps } from '#/adapter/vxe-table';

import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';

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
} from '@ant-design/icons-vue';

import { AnchorNav } from '#/components/anchor-nav';
import type { AnchorNavItem } from '#/components/anchor-nav';
import { useDetailPagePreference, useListTablePreference } from '#/preferences/userPreference';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import CommonFilter from '#/components/CommonFilter/index.vue';

const router = useRouter();
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

const knowledgeInfo = ref({
  name: '政府采购合同案例库',
  type: '合同类',
  caseCount: 128,
  patternCount: 23,
  misjudgedCount: 15,
  accuracy: 95,
  updateTime: '2024-12-18',
  description: '政府采购服务、货物合同的历史审核案例及常见问题模式。包含多年积累的审核经验，覆盖合同要素、金额条款、期限条款、违约责任等核心审核维度。',
  status: 'active',
});

// 关联标准
const linkedStandards = ref([
  { id: 1, name: '政府采购合同审核标准', version: 'v2.1', type: '合同类', ruleCount: 38, status: 'active' },
  { id: 5, name: '租赁合同审核标准', version: 'v1.0', type: '合同类', ruleCount: 32, status: 'active' },
]);

const activeTab = ref('cases');

// 历史案例 mock 数据
const caseMockData = [
  { id: 1, docName: '某市采购合同审核', issue: '金额大写小写不一致', result: '确认问题', source: '审核反馈', time: '2024-12-20' },
  { id: 2, docName: '物业租赁合同', issue: '缺少违约责任条款', result: '确认问题', source: '审核反馈', time: '2024-12-19' },
  { id: 3, docName: '服务合同审核', issue: '服务期限表述模糊', result: '确认问题', source: '人工标注', time: '2024-12-18' },
  { id: 4, docName: '财务报销单', issue: '发票金额超出标准', result: '确认问题', source: '审核反馈', time: '2024-12-17' },
  { id: 5, docName: '项目立项表', issue: '缺少预算明细', result: '忽略（非必须）', source: '审核反馈', time: '2024-12-16' },
  { id: 6, docName: '设备采购合同', issue: '验收标准不明确', result: '确认问题', source: '审核反馈', time: '2024-12-15' },
  { id: 7, docName: '劳务派遣合同', issue: '缺少社保条款', result: '确认问题', source: '人工标注', time: '2024-12-14' },
  { id: 8, docName: '软件开发合同', issue: '知识产权归属不清', result: '确认问题', source: '审核反馈', time: '2024-12-13' },
  { id: 9, docName: '物流运输合同', issue: '保险责任未约定', result: '确认问题', source: '业务回传', time: '2024-12-12' },
  { id: 10, docName: '广告投放合同', issue: '效果评估标准缺失', result: '忽略（非必须）', source: '审核反馈', time: '2024-12-11' },
  { id: 11, docName: '房屋租赁合同', issue: '押金退还条件模糊', result: '确认问题', source: '审核反馈', time: '2024-12-10' },
  { id: 12, docName: '咨询服务合同', issue: '保密期限未约定', result: '确认问题', source: '人工标注', time: '2024-12-09' },
];

// 问题模式 mock 数据
const patternMockData = [
  { id: 1, name: '金额一致性问题', frequency: 38, accuracy: '98%', category: '金额类' },
  { id: 2, name: '期限表述不明确', frequency: 25, accuracy: '95%', category: '期限类' },
  { id: 3, name: '条款缺失', frequency: 20, accuracy: '90%', category: '完整性' },
  { id: 4, name: '格式不规范', frequency: 18, accuracy: '88%', category: '格式类' },
  { id: 5, name: '主体信息不完整', frequency: 15, accuracy: '96%', category: '主体类' },
  { id: 6, name: '签章位置错误', frequency: 12, accuracy: '92%', category: '格式类' },
  { id: 7, name: '付款条件不清晰', frequency: 10, accuracy: '87%', category: '金额类' },
  { id: 8, name: '违约责任不对等', frequency: 9, accuracy: '91%', category: '完整性' },
  { id: 9, name: '保密条款缺失', frequency: 8, accuracy: '94%', category: '完整性' },
  { id: 10, name: '争议解决方式未约定', frequency: 7, accuracy: '89%', category: '完整性' },
  { id: 11, name: '交付标准模糊', frequency: 6, accuracy: '85%', category: '期限类' },
];

// 误判记录 mock 数据
const misjudgedMockData = [
  { id: 1, rule: '规则 R005 · 服务期限必须明确起止日期', reason: '合同附件中已有补充协议明确了起止日期', docName: 'XX市政府采购服务合同-2024.docx', marker: '李四', time: '2024-12-20', ruleId: 'R005', totalTriggered: 32, misjudgedTimes: 5 },
  { id: 2, rule: '规则 R022 · 政府采购合同应预留备案份数', reason: '本合同为内部协议，无需财政部门备案', docName: 'XX市政府采购服务合同-2024.docx', marker: '李四', time: '2024-12-20', ruleId: 'R022', totalTriggered: 18, misjudgedTimes: 8 },
  { id: 3, rule: '规则 R018 · 知识产权条款应覆盖第三方组件', reason: '该项目为纯咨询服务，不涉及软件交付和第三方组件', docName: '咨询服务合同-XX项目.docx', marker: '张三', time: '2024-12-19', ruleId: 'R018', totalTriggered: 24, misjudgedTimes: 6 },
  { id: 4, rule: '规则 R012 · 验收条款应明确验收方式、时限和标准文件', reason: '验收标准已在招标文件中详细约定，合同引用即可', docName: 'XX物业租赁合同-商铺A区.docx', marker: '张三', time: '2024-12-19', ruleId: 'R012', totalTriggered: 28, misjudgedTimes: 3 },
  { id: 5, rule: '规则 R020 · 争议解决方式建议多元化', reason: '政府采购合同按规定只能走诉讼途径，不适用仲裁', docName: 'XX市政府采购服务合同-2024.docx', marker: '王五', time: '2024-12-18', ruleId: 'R020', totalTriggered: 20, misjudgedTimes: 12 },
  { id: 6, rule: '规则 R006 · 住宿费不得超过对应级别标准', reason: '该员工已有总经理特批的住宿标准上浮审批', docName: '2024年Q4财务报销汇总表.xlsx', marker: '王五', time: '2024-12-18', ruleId: 'R006', totalTriggered: 45, misjudgedTimes: 4 },
  { id: 7, rule: '规则 R009 · 单笔交通费超出历史均值3倍需说明', reason: '当天为机场接送往返，距离远属正常费用', docName: '2024年Q4财务报销汇总表.xlsx', marker: '王五', time: '2024-12-17', ruleId: 'R009', totalTriggered: 15, misjudgedTimes: 7 },
  { id: 8, rule: '规则 R015 · 违约责任条款应双向约定', reason: '此为政府采购格式合同，甲方违约责任由上位法规定，合同中不重复约定', docName: '设备采购合同-XX学校.docx', marker: '赵六', time: '2024-12-16', ruleId: 'R015', totalTriggered: 30, misjudgedTimes: 9 },
];

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
      field: 'docName',
      title: '文档',
      minWidth: 220,
      headerAlign: 'left',
      align: 'left',
      slots: { default: 'docName' },
    },
    {
      field: 'issue',
      title: '问题',
      minWidth: 200,
      headerAlign: 'left',
      align: 'left',
    },
    {
      field: 'result',
      title: '最终结论',
      width: 130,
      slots: { default: 'result' },
    },
    {
      field: 'time',
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
        const start = (page.currentPage - 1) * page.pageSize;
        const end = start + page.pageSize;
        return {
          rows: caseMockData.slice(start, end),
          total: caseMockData.length,
        };
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
        const start = (page.currentPage - 1) * page.pageSize;
        const end = start + page.pageSize;
        return {
          rows: patternMockData.slice(start, end),
          total: patternMockData.length,
        };
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
      field: 'rule',
      title: '触发规则',
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
      field: 'totalTriggered',
      title: '触发次数',
      width: 90,
      align: 'center',
    },
    {
      field: 'misjudgedTimes',
      title: '误判次数',
      width: 90,
      align: 'center',
      slots: { default: 'misjudgedTimes' },
    },
    {
      field: 'misjudgedRate',
      title: '误判率',
      width: 100,
      align: 'center',
      slots: { default: 'misjudgedRate' },
    },
    {
      field: 'docName',
      title: '来源文档',
      width: 200,
      headerAlign: 'left',
      align: 'left',
    },
    {
      field: 'marker',
      title: '标记人',
      width: 80,
      align: 'center',
    },
    {
      field: 'time',
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
        const start = (page.currentPage - 1) * page.pageSize;
        const end = start + page.pageSize;
        return {
          rows: misjudgedMockData.slice(start, end),
          total: misjudgedMockData.length,
        };
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
          <div class="header-title-row">
            <span class="header-project-name">
              <BookOutlined style="color: #1677ff; margin-right: 8px;" />
              {{ knowledgeInfo.name }}
              <Tag color="cyan" style="margin-left: 8px;">{{ knowledgeInfo.type }}</Tag>
              <Badge v-if="knowledgeInfo.status === 'active'" status="success" text="启用中" style="margin-left: 8px;" />
            </span>
            <Space>
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
                <div class="header-metric-value">{{ knowledgeInfo.caseCount }} 条</div>
              </div>
            </div>
            <div class="header-metric-divider" />
            <div class="header-metric">
              <div class="header-metric-icon-wrap header-metric-icon-purple">
                <BarChartOutlined />
              </div>
              <div class="header-metric-body">
                <div class="header-metric-label">问题模式</div>
                <div class="header-metric-value">{{ knowledgeInfo.patternCount }} 个</div>
              </div>
            </div>
            <div class="header-metric-divider" />
            <div class="header-metric">
              <div class="header-metric-icon-wrap header-metric-icon-orange">
                <StopOutlined />
              </div>
              <div class="header-metric-body">
                <div class="header-metric-label">误判记录</div>
                <div class="header-metric-value">{{ knowledgeInfo.misjudgedCount }} 条</div>
              </div>
            </div>
            <div class="header-metric-divider" />
            <div class="header-metric">
              <div class="header-metric-icon-wrap header-metric-icon-green">
                <CheckCircleOutlined />
              </div>
              <div class="header-metric-body">
                <div class="header-metric-label">识别准确率</div>
                <div class="header-metric-value" style="color: #52c41a;">{{ knowledgeInfo.accuracy }}%</div>
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
                  <span class="text-gray-400 text-xs">{{ std.ruleCount }} 条规则</span>
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
                      <template #docName="{ row }">
                        <div class="flex flex-col gap-1">
                          <span class="doc-name-text">{{ row.docName }}</span>
                          <div class="flex items-center gap-1">
                            <Tag :color="row.source === '审核反馈' ? 'blue' : row.source === '人工标注' ? 'orange' : 'cyan'" :bordered="false" class="tag-sm">
                              {{ row.source }}
                            </Tag>
                          </div>
                        </div>
                      </template>
                      <template #result="{ row }">
                        <Tag :color="row.result.includes('确认') ? 'green' : 'default'">{{ row.result }}</Tag>
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
                        <span class="font-semibold text-green-500">{{ row.accuracy }}</span>
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
                  <Tag v-if="knowledgeInfo.misjudgedCount > 0" color="default" :bordered="false" class="tag-sm" style="margin-left: 6px;">{{ knowledgeInfo.misjudgedCount }}</Tag>
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
                        <div class="flex flex-col gap-1">
                          <span class="doc-name-text">{{ row.ruleId }}</span>
                          <span class="text-xs text-gray-500">{{ row.rule.replace(`${row.ruleId} · `, '').replace(`规则 ${row.ruleId} · `, '') }}</span>
                        </div>
                      </template>
                      <template #misjudgedReason="{ row }">
                        <span class="misjudged-reason-text">{{ row.reason }}</span>
                      </template>
                      <template #misjudgedTimes="{ row }">
                        <span class="font-semibold" style="color: #8c8c8c;">{{ row.misjudgedTimes }}</span>
                      </template>
                      <template #misjudgedRate="{ row }">
                        <Tag
                          :color="(row.misjudgedTimes / row.totalTriggered) >= 0.4 ? 'error' : (row.misjudgedTimes / row.totalTriggered) >= 0.2 ? 'warning' : 'default'"
                          size="small"
                        >
                          {{ Math.round(row.misjudgedTimes / row.totalTriggered * 100) }}%
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
