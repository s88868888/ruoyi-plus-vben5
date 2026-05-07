<script setup lang="ts">
import type { VxeGridProps } from '#/adapter/vxe-table';

import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { useVbenDrawer } from '@vben/common-ui';

import { Card, Tag, Button, Space, Dropdown, Menu, MenuItem } from 'ant-design-vue';
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

const mockRules = [
  { id: 1, content: '合同必须包含甲方（采购人）全称及统一社会信用代码', severity: 'must', category: '主体信息' },
  { id: 2, content: '合同必须包含乙方（供应商）全称及统一社会信用代码', severity: 'must', category: '主体信息' },
  { id: 3, content: '合同编号格式必须符合单位编号规范', severity: 'must', category: '基本信息' },
  { id: 4, content: '合同金额大写与小写必须完全一致', severity: 'must', category: '金额条款' },
  { id: 5, content: '服务期限必须明确起止日期，不得仅写"X个月"', severity: 'must', category: '期限条款' },
  { id: 6, content: '付款方式必须明确各期比例及触发条件', severity: 'must', category: '付款条款' },
  { id: 7, content: '必须包含验收条款', severity: 'must', category: '验收条款' },
  { id: 8, content: '必须包含违约责任条款', severity: 'must', category: '违约条款' },
  { id: 9, content: '合同签订日期不得晚于服务开始日期', severity: 'must', category: '期限条款' },
  { id: 10, content: '采购金额不得超过预算金额', severity: 'must', category: '金额条款' },
  { id: 11, content: '验收条款应明确验收方式、时限和标准文件', severity: 'should', category: '验收条款' },
  { id: 12, content: '违约责任条款应双向约定（甲方和乙方）', severity: 'should', category: '违约条款' },
  { id: 13, content: '应包含知识产权归属条款', severity: 'should', category: '知识产权' },
  { id: 14, content: '应包含保密条款', severity: 'should', category: '保密条款' },
  { id: 15, content: '应明确争议解决方式及管辖法院', severity: 'should', category: '争议解决' },
  { id: 16, content: '争议解决方式建议多元化（诉讼+仲裁）', severity: 'suggest', category: '争议解决' },
  { id: 17, content: '政府采购合同应预留财政部门备案份数', severity: 'suggest', category: '其他' },
  { id: 18, content: '建议附加合同变更和解除条件', severity: 'suggest', category: '其他' },
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
                <Button type="primary" size="small" ghost @click="handleSmartParse"><BulbOutlined /> 智能解析</Button>
                <Button type="primary" size="small" @click="handleAddRule"><PlusOutlined /> 添加规则</Button>
              </Space>
            </div>

            <div class="table-style-wrapper" :style="tableCssVars">
              <BasicTable>
                <template #severity="{ row }">
                  <Tag :color="severityMap[row.severity]?.color">{{ severityMap[row.severity]?.label }}</Tag>
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
