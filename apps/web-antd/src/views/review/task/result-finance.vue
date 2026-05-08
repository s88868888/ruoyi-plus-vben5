<script setup lang="ts">
import type { VxeGridProps } from '#/adapter/vxe-table';

import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { Card, Tag, Button, Space, Select } from 'ant-design-vue';
import {
  ArrowLeftOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  DollarOutlined,
  FileExcelOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
  AuditOutlined,
  DatabaseOutlined,
  HistoryOutlined,
  SwapOutlined,
} from '@ant-design/icons-vue';

import { AnchorNav } from '#/components/anchor-nav';
import type { AnchorNavItem } from '#/components/anchor-nav';
import { useDetailPagePreference, useListTablePreference } from '#/preferences/userPreference';
import { useVbenVxeGrid } from '#/adapter/vxe-table';

const router = useRouter();
const layoutPreference = useDetailPagePreference();
const tablePreference = useListTablePreference();
const scrollContainer = ref<HTMLElement | null>(null);

const tableCssVars = computed(() => ({
  '--list-header-bg': tablePreference.headerBgColor,
  '--list-header-color': tablePreference.headerTextColor,
  '--list-header-padding-y': `${tablePreference.headerPaddingY}px`,
  '--list-cell-padding-y': `${tablePreference.cellPaddingY}px`,
}));

const anchorNavItems = ref<AnchorNavItem[]>([
  { key: 'overview', title: '基本信息' },
  { key: 'data-overview', title: '数据概览' },
  { key: 'detail-table', title: '报销明细' },
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

// Mock 数据
const docInfo = ref({
  name: '2024年Q4财务报销汇总表.xlsx',
  type: '财务账单',
  standard: '企业财务报销规范 v1.3',
  submitter: '王五（财务部）',
  submitTime: '2024-12-20 13:45:12',
  reviewTime: '12秒',
  totalRows: 45,
  passRows: 38,
  errorCount: 4,
  warningCount: 3,
  totalAmount: 287650,
  issueAmount: 18320,
  overLimitAmount: 5200,
  missingInvoiceAmount: 8500,
  reviewVersion: 1,
});

// 表格筛选
const showMode = ref<'all' | 'issues'>('all');

const tableData = ref([
  { key: 1, row: 1, date: '2024-10-05', person: '张三', type: '差旅-交通', amount: 1280, invoice: 'FP20241005001', approver: '李总', remark: '北京出差高铁', status: 'pass' },
  { key: 2, row: 2, date: '2024-10-05', person: '张三', type: '差旅-住宿', amount: 850, invoice: 'FP20241005002', approver: '李总', remark: '北京住宿2晚', status: 'pass' },
  { key: 3, row: 3, date: '2024-10-08', person: '李四', type: '差旅-住宿', amount: 2800, invoice: 'FP20241008003', approver: '王总', remark: '上海出差3晚', status: 'error', issue: '住宿费超出标准', issueDetail: '单晚金额 ¥933 超出标准上限 ¥800/晚（普通员工标准）', rule: '规则 R06 · 住宿费不得超过对应级别标准', suggestion: '超出部分 ¥400 需个人承担或提供特殊审批说明' },
  { key: 4, row: 4, date: '2024-10-12', person: '王五', type: '办公用品', amount: 3200, invoice: 'FP20241012004', approver: '李总', remark: '采购打印纸等', status: 'pass' },
  { key: 5, row: 5, date: '2024-10-15', person: '赵六', type: '招待费', amount: 5600, invoice: '', approver: '李总', remark: '客户晚宴', status: 'error', issue: '缺少发票附件', issueDetail: '金额 ¥5,600 的招待费未提供对应发票编号和扫描件', rule: '规则 R02 · 所有报销项必须附有效发票', suggestion: '补充发票或提供情况说明' },
  { key: 6, row: 6, date: '2024-10-18', person: '张三', type: '差旅-交通', amount: 680, invoice: 'FP20241018006', approver: '李总', remark: '打车费', status: 'warning', issue: '单次打车费异常偏高', issueDetail: '单次打车 ¥680，历史同类出差平均打车费为 ¥120-200', rule: '规则 R09 · 单笔交通费超出历史均值3倍需说明', suggestion: '请补充行程说明（如机场接送、跨城等）' },
  { key: 7, row: 7, date: '2024-10-20', person: '孙七', type: '招待费', amount: 2900, invoice: '', approver: '', remark: '部门聚餐', status: 'error', issue: '多项违规', issueDetail: '缺少发票附件；审批人为空；"部门聚餐"不属于招待费范畴', rule: '规则 R02、R01、R11', suggestion: '补充发票、填写审批人、修改费用类型为"团建费"' },
  { key: 8, row: 8, date: '2024-10-22', person: '李四', type: '办公用品', amount: 560, invoice: 'FP20241022008', approver: '王总', remark: '键盘鼠标', status: 'pass' },
  { key: 9, row: 9, date: '2024-10-25', person: '张三', type: '差旅-住宿', amount: 1800, invoice: 'FP20241025009', approver: '李总', remark: '深圳出差2晚', status: 'error', issue: '住宿费超出标准', issueDetail: '单晚 ¥900 超出标准上限 ¥800/晚', rule: '规则 R06 · 住宿费不得超过对应级别标准', suggestion: '超出部分需个人承担或提供特殊审批' },
  { key: 10, row: 10, date: '2024-10-28', person: '王五', type: '通讯费', amount: 450, invoice: 'FP20241028010', approver: '李总', remark: '10月话费', status: 'warning', issue: '通讯费超额', issueDetail: '月度通讯费 ¥450 超出标准 ¥300/月', rule: '规则 R08 · 通讯费不得超过岗位标准', suggestion: '超出部分 ¥150 需说明原因' },
]);

const displayData = computed(() => {
  if (showMode.value === 'issues') {
    return tableData.value.filter(r => r.status !== 'pass');
  }
  return tableData.value;
});

// 报销明细 vxe-table 配置
const detailGridOptions: VxeGridProps = {
  showOverflow: true,
  border: false,
  toolbarConfig: { enabled: false },
  pagerConfig: { enabled: false },
  expandConfig: {
    accordion: false,
    trigger: 'row',
    toggleMethod: ({ row }) => row.status !== 'pass',
  },
  rowConfig: { keyField: 'key', isHover: true },
  rowClassName: ({ row }: any) => {
    if (row.status === 'error') return 'row-error';
    if (row.status === 'warning') return 'row-warning';
    return '';
  },
  columns: [
    { type: 'expand', width: 1, resizable: false, slots: { content: 'expandContent' } },
    { field: 'row', title: '行号', width: 60, align: 'center' },
    { field: 'date', title: '报销日期', width: 110, align: 'center' },
    { field: 'person', title: '报销人', width: 80, align: 'center' },
    { field: 'type', title: '费用类型', width: 110, align: 'center' },
    { field: 'amount', title: '金额(元)', width: 110, align: 'right', slots: { default: 'amount' } },
    { field: 'invoice', title: '发票编号', width: 150, align: 'center', slots: { default: 'invoice' } },
    { field: 'approver', title: '审批人', width: 80, align: 'center', slots: { default: 'approver' } },
    { field: 'remark', title: '备注', minWidth: 140 },
    { field: 'status', title: '审核结果', width: 140, align: 'center', slots: { default: 'status' } },
  ],
  proxyConfig: {
    ajax: {
      query: async () => {
        return { rows: displayData.value, total: displayData.value.length };
      },
    },
  },
  id: 'review-finance-detail',
};

const [DetailTable, detailTableApi] = useVbenVxeGrid({ gridOptions: detailGridOptions } as any);

function reloadDetailTable() {
  detailTableApi?.grid?.commitProxy('query');
}

watch(showMode, () => {
  reloadDetailTable();
});

// 版本对比
const versionHistory = ref([
  { version: 1, time: '2024-12-20 13:45:12', errorCount: 4, warningCount: 3, passRows: 38, totalRows: 45, submitter: '王五' },
]);

const compareVersionA = ref(1);
const compareVersionB = ref(1);

const versionOptions = computed(() => versionHistory.value.map(v => ({
  label: `第${v.version}次审核 (${v.time.split(' ')[0]})`,
  value: v.version,
})));

const versionAData = computed(() => versionHistory.value.find(v => v.version === compareVersionA.value));
const versionBData = computed(() => versionHistory.value.find(v => v.version === compareVersionB.value));

const compareTableData = computed(() => {
  if (!versionAData.value || !versionBData.value) return [];
  const a = versionAData.value;
  const b = versionBData.value;
  return [
    { id: 1, metric: '严重问题', valueA: a.errorCount, valueB: b.errorCount, diff: a.errorCount - b.errorCount, type: 'less-better' },
    { id: 2, metric: '一般问题', valueA: a.warningCount, valueB: b.warningCount, diff: a.warningCount - b.warningCount, type: 'less-better' },
    { id: 3, metric: '通过率', valueA: Math.round(a.passRows / a.totalRows * 100), valueB: Math.round(b.passRows / b.totalRows * 100), diff: Math.round(a.passRows / a.totalRows * 100) - Math.round(b.passRows / b.totalRows * 100), type: 'more-better' },
  ];
});

const compareGridOptions: VxeGridProps = {
  showOverflow: true,
  border: true,
  toolbarConfig: { enabled: false },
  pagerConfig: { enabled: false },
  columns: [
    { field: 'metric', title: '指标', width: 100, align: 'left' },
    { field: 'valueA', title: '当前版本', minWidth: 100, align: 'center', slots: { default: 'valueA' } },
    { field: 'valueB', title: '对比版本', minWidth: 100, align: 'center', slots: { default: 'valueB' } },
    { field: 'diff', title: '变化', width: 100, align: 'center', slots: { default: 'diff' } },
  ],
  rowConfig: { keyField: 'id' },
  proxyConfig: {
    ajax: {
      query: async () => {
        return { rows: compareTableData.value, total: compareTableData.value.length };
      },
    },
  },
  id: 'review-finance-version-compare',
};

const [CompareTable] = useVbenVxeGrid({ gridOptions: compareGridOptions } as any);


// 横向导航
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
    <!-- 侧边导航 -->
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
        <!-- 顶部信息 -->
        <div id="overview" class="header-card" :style="cardRadiusStyle">
          <div class="header-title-row">
            <span class="header-project-name">
              {{ docInfo.name }}
              <Tag color="green" style="margin-left: 8px;">{{ docInfo.type }}</Tag>
            </span>
            <Space>
              <Button type="default" size="small" @click="router.push('/review/task')"><ArrowLeftOutlined /> 返回</Button>
              <Button type="default" size="small"><DownloadOutlined /> 导出报告</Button>
              <Button type="primary" size="small"><FileExcelOutlined /> 下载标注表格</Button>
            </Space>
          </div>
          <div class="header-metrics-row">
            <div class="header-metric">
              <div class="header-metric-icon-wrap header-metric-icon-blue"><AuditOutlined /></div>
              <div class="header-metric-body">
                <div class="header-metric-label">审核标准</div>
                <div class="header-metric-value">{{ docInfo.standard }}</div>
              </div>
            </div>
            <div class="header-metric-divider" />
            <div class="header-metric">
              <div class="header-metric-icon-wrap header-metric-icon-cyan"><UserOutlined /></div>
              <div class="header-metric-body">
                <div class="header-metric-label">提交人</div>
                <div class="header-metric-value">{{ docInfo.submitter }}</div>
              </div>
            </div>
            <div class="header-metric-divider" />
            <div class="header-metric">
              <div class="header-metric-icon-wrap header-metric-icon-purple"><ClockCircleOutlined /></div>
              <div class="header-metric-body">
                <div class="header-metric-label">审核时间</div>
                <div class="header-metric-value">{{ docInfo.submitTime }}</div>
              </div>
            </div>
            <div class="header-metric-divider" />
            <div class="header-metric">
              <div class="header-metric-icon-wrap header-metric-icon-blue"><DatabaseOutlined /></div>
              <div class="header-metric-body">
                <div class="header-metric-label">数据量</div>
                <div class="header-metric-value">{{ docInfo.totalRows }} 行</div>
              </div>
            </div>
            <div class="header-metric-divider" />
            <div class="header-metric">
              <div class="header-metric-icon-wrap header-metric-icon-green"><ThunderboltOutlined /></div>
              <div class="header-metric-body">
                <div class="header-metric-label">耗时</div>
                <div class="header-metric-value">{{ docInfo.reviewTime }}</div>
              </div>
            </div>
            <div class="header-metric-divider" />
            <div class="header-metric">
              <div class="header-metric-icon-wrap header-metric-icon-orange"><HistoryOutlined /></div>
              <div class="header-metric-body">
                <div class="header-metric-label">审核次数</div>
                <div class="header-metric-value">第{{ docInfo.reviewVersion }}次</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 横向菜单条 -->
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
      <Card id="data-overview" class="mb-4" :style="cardRadiusStyle">
        <template #title>
          <span class="card-title">
            <SafetyCertificateOutlined style="color: hsl(var(--primary)); margin-right: 8px;" />
            数据概览
          </span>
        </template>
        <div class="overview-row">
          <div class="overview-item" :style="cardRadiusStyle">
            <div class="overview-icon overview-icon-total"><SafetyCertificateOutlined /></div>
            <div class="overview-body">
              <div class="overview-label">总记录数</div>
              <div class="overview-value">{{ docInfo.totalRows }}</div>
            </div>
          </div>
          <div class="overview-item" :style="cardRadiusStyle">
            <div class="overview-icon overview-icon-pass"><CheckCircleOutlined /></div>
            <div class="overview-body">
              <div class="overview-label">通过</div>
              <div class="overview-value text-green-500">{{ docInfo.passRows }}</div>
            </div>
          </div>
          <div class="overview-item" :style="cardRadiusStyle">
            <div class="overview-icon overview-icon-error"><CloseCircleOutlined /></div>
            <div class="overview-body">
              <div class="overview-label">严重问题</div>
              <div class="overview-value text-red-500">{{ docInfo.errorCount }}</div>
            </div>
          </div>
          <div class="overview-item" :style="cardRadiusStyle">
            <div class="overview-icon overview-icon-warning"><ExclamationCircleOutlined /></div>
            <div class="overview-body">
              <div class="overview-label">一般问题</div>
              <div class="overview-value text-orange-500">{{ docInfo.warningCount }}</div>
            </div>
          </div>
          <div class="overview-item" :style="cardRadiusStyle">
            <div class="overview-icon overview-icon-amount"><DollarOutlined /></div>
            <div class="overview-body">
              <div class="overview-label">报销总金额</div>
              <div class="overview-value text-blue-500">¥{{ docInfo.totalAmount.toLocaleString() }}</div>
            </div>
          </div>
        </div>

        <!-- 金额汇总 -->
        <div class="amount-row">
          <div class="amount-card">
          <div class="amount-label">问题金额合计</div>
          <div class="amount-value text-red-500">¥{{ docInfo.issueAmount.toLocaleString() }}</div>
          <div class="amount-detail">占总金额 {{ (docInfo.issueAmount / docInfo.totalAmount * 100).toFixed(1) }}%，涉及 7 笔</div>
        </div>
        <div class="amount-card">
          <div class="amount-label">超标金额</div>
          <div class="amount-value text-orange-500">¥{{ docInfo.overLimitAmount.toLocaleString() }}</div>
          <div class="amount-detail">3 笔超出报销标准上限</div>
        </div>
        <div class="amount-card">
          <div class="amount-label">缺少发票金额</div>
          <div class="amount-value text-red-500">¥{{ docInfo.missingInvoiceAmount.toLocaleString() }}</div>
          <div class="amount-detail">2 笔无对应发票附件</div>
        </div>
        </div>
      </Card>

      <!-- 报销明细表格 -->
      <Card id="detail-table" class="mb-4" :style="cardRadiusStyle">
        <template #title>
          <span class="card-title">
            <FileExcelOutlined style="color: hsl(var(--primary)); margin-right: 8px;" />
            报销明细审核
          </span>
        </template>
        <template #extra>
          <Space>
            <Button
              :type="showMode === 'issues' ? 'primary' : 'default'"
              size="small"
              @click="showMode = 'issues'"
            >仅看问题行</Button>
            <Button
              :type="showMode === 'all' ? 'primary' : 'default'"
              size="small"
              @click="showMode = 'all'"
            >全部显示</Button>
          </Space>
        </template>

        <div class="finance-table-wrap" :style="tableCssVars">
          <DetailTable>
            <template #amount="{ row }">
              <span :class="{ 'cell-error': row.status === 'error', 'cell-warning': row.status === 'warning' }">
                ¥{{ row.amount.toLocaleString() }}
              </span>
            </template>
            <template #invoice="{ row }">
              <span :class="{ 'cell-missing': !row.invoice }">{{ row.invoice || '缺失' }}</span>
            </template>
            <template #approver="{ row }">
              <span :class="{ 'cell-missing': !row.approver }">{{ row.approver || '—' }}</span>
            </template>
            <template #status="{ row }">
              <Tag v-if="row.status === 'pass'" color="success">通过</Tag>
              <Tag v-else-if="row.status === 'error'" color="error">{{ row.issue }}</Tag>
              <Tag v-else color="warning">{{ row.issue }}</Tag>
            </template>
            <template #expandContent="{ row }">
              <div v-if="row.status !== 'pass'" :class="['issue-tooltip', row.status === 'warning' ? 'issue-tooltip-warning' : '']">
                <div class="issue-tooltip-title">{{ row.issue }}</div>
                <div class="issue-tooltip-desc">{{ row.issueDetail }}</div>
                <div class="issue-tooltip-suggest">
                  <CheckCircleOutlined class="issue-tooltip-suggest-icon" />
                  <span>{{ row.suggestion }}</span>
                </div>
                <div class="issue-tooltip-rule">{{ row.rule }}</div>
              </div>
              <div v-else class="issue-tooltip-empty">该行审核通过，无问题详情</div>
            </template>
          </DetailTable>
          <div v-if="showMode === 'all'" class="row-summary-footer">
            其余 {{ docInfo.totalRows - tableData.length }} 行均通过审核
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
          <Tag color="blue">当前第{{ docInfo.reviewVersion }}次审核</Tag>
        </template>

        <!-- 版本选择器 -->
        <div class="version-selector">
          <div class="version-select-item">
            <span class="version-select-label">对比版本</span>
            <Select v-model:value="compareVersionA" :options="versionOptions" style="width: 200px;" />
          </div>
          <SwapOutlined class="version-swap-icon" />
          <div class="version-select-item">
            <Select v-model:value="compareVersionB" :options="versionOptions" style="width: 200px;" />
          </div>
        </div>

        <!-- 对比结果 -->
        <div v-if="versionAData && versionBData" class="version-compare-table" :style="tableCssVars">
          <CompareTable>
            <template #valueA="{ row }">
              <span :class="row.metric === '通过率' ? 'text-green-500 font-semibold' : row.metric === '严重问题' ? 'text-red-500 font-semibold' : 'text-orange-500 font-semibold'">
                {{ row.valueA }}{{ row.metric === '通过率' ? '%' : '' }}
              </span>
            </template>
            <template #valueB="{ row }">
              <span :class="row.metric === '通过率' ? 'text-green-500 font-semibold' : row.metric === '严重问题' ? 'text-red-500 font-semibold' : 'text-orange-500 font-semibold'">
                {{ row.valueB }}{{ row.metric === '通过率' ? '%' : '' }}
              </span>
            </template>
            <template #diff="{ row }">
              <Tag v-if="row.diff !== 0" :color="(row.type === 'less-better' && row.diff < 0) || (row.type === 'more-better' && row.diff > 0) ? 'success' : 'error'">
                {{ row.diff > 0 ? '↑' : '↓' }} {{ Math.abs(row.diff) }}{{ row.metric === '通过率' ? '%' : '' }}
              </Tag>
              <span v-else class="text-gray-400">-</span>
            </template>
          </CompareTable>
        </div>
      </Card>
    </div>
    </div>
  </div>
</template>

<style scoped>
/* 页面布局 */
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

/* 横向菜单条 */
.horizontal-nav-bar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 0;
  padding: 0 4px;
  margin: 0 0 12px;
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

.horizontal-nav-item:hover { color: hsl(var(--primary)); }

.horizontal-nav-item-active {
  color: hsl(var(--primary));
  font-weight: 600;
  border-bottom-color: hsl(var(--primary));
}

.header-card {
  background: #fff;
  padding: 24px 28px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  border: 1px solid #f0f0f0;
  margin-bottom: 16px;
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
}

/* 数据概览 */
.overview-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.overview-item {
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
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

.overview-icon-total { background: #f9f0ff; color: #722ed1; }
.overview-icon-pass { background: #f6ffed; color: #52c41a; }
.overview-icon-error { background: #fff1f0; color: #f5222d; }
.overview-icon-warning { background: #fff7e6; color: #fa8c16; }
.overview-icon-amount { background: #e6f4ff; color: #1677ff; }

.overview-body { display: flex; flex-direction: column; }
.overview-label { font-size: 12px; color: #909399; }
.overview-value { font-size: 20px; font-weight: 700; line-height: 1.3; }

/* 金额汇总 */
.amount-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;

}

.amount-card {
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 16px 20px;
}

.amount-label { font-size: 13px; color: #909399; margin-bottom: 4px; }
.amount-value { font-size: 20px; font-weight: 700; }
.amount-detail { font-size: 12px; color: #909399; margin-top: 4px; }

/* 表格 */
.card-title { font-size: 15px; font-weight: 600; }
.card-title-icon { color: hsl(var(--primary)); font-size: 16px; margin-right: 8px; }

.finance-table-wrap { overflow-x: auto; border-radius: 8px; overflow: hidden; }

/* 表头样式 & 底部边框 */
.finance-table-wrap :deep(.vxe-table--header-wrapper),
.finance-table-wrap :deep(.vxe-header--column) {
  background-color: var(--list-header-bg, #fafafa) !important;
}

.finance-table-wrap :deep(.vxe-header--column .vxe-cell) {
  color: var(--list-header-color, #606266) !important;
}

.finance-table-wrap :deep(.vxe-header--column) {
  padding-top: var(--list-header-padding-y, 10px) !important;
  padding-bottom: var(--list-header-padding-y, 10px) !important;
  border-bottom: 2px solid #e8e8e8 !important;
}

.finance-table-wrap :deep(.vxe-body--column) {
  padding-top: var(--list-cell-padding-y, 10px) !important;
  padding-bottom: var(--list-cell-padding-y, 10px) !important;
}

/* 隐藏展开列的箭头图标和列宽 */
.finance-table-wrap :deep(.col--expand) {
  width: 0 !important;
  min-width: 0 !important;
  max-width: 0 !important;
  padding: 0 !important;
  border: none !important;
  overflow: hidden;
}

.finance-table-wrap :deep(.col--expand .vxe-cell) {
  display: none;
}

/* 行状态颜色 */
.finance-table-wrap :deep(.row-error) {
  background-color: #fff1f0 !important;
}

.finance-table-wrap :deep(.row-error:hover td) {
  background-color: #ffccc7 !important;
}

.finance-table-wrap :deep(.row-warning) {
  background-color: #fffbe6 !important;
}

.finance-table-wrap :deep(.row-warning:hover td) {
  background-color: #fff1b8 !important;
}

/* 问题行可点击 */
.finance-table-wrap :deep(.row-error),
.finance-table-wrap :deep(.row-warning) {
  cursor: pointer;
}

.cell-error { color: #f5222d; font-weight: 600; }
.cell-warning { color: #fa8c16; font-weight: 500; }
.cell-missing { color: #f5222d; font-weight: 600; }

.row-summary-footer {
  text-align: center;
  color: #909399;
  font-size: 13px;
  padding: 10px 0;
  border-top: 1px solid #f0f0f0;
  background: #fafafa;
}

/* 问题提示 */
.issue-tooltip {
  padding: 12px 16px;
  margin: 0 12px 8px;
  border-left: 3px solid #f5222d;
  background: #fff;
  border-radius: 0 6px 6px 0;
}

.issue-tooltip-warning { border-left-color: #fa8c16; }

.issue-tooltip-title {
  font-weight: 600;
  font-size: 13px;
  color: #f5222d;
  margin-bottom: 4px;
}

.issue-tooltip-warning .issue-tooltip-title { color: #fa8c16; }

.issue-tooltip-desc {
  font-size: 12px;
  color: #606266;
  line-height: 1.6;
  margin-bottom: 4px;
}

.issue-tooltip-suggest {
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

.issue-tooltip-suggest-icon {
  color: #52c41a;
  margin-top: 2px;
  flex-shrink: 0;
}

.issue-tooltip-rule {
  font-size: 11px;
  color: #8c8c8c;
  display: flex;
  align-items: center;
  gap: 4px;
}

.issue-tooltip-empty {
  padding: 12px 16px;
  margin: 0 12px 8px;
  font-size: 12px;
  color: #909399;
  text-align: center;
}

/* 版本对比 */
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

.version-compare-table :deep(.vxe-table--header-wrapper),
.version-compare-table :deep(.vxe-header--column) {
  background-color: var(--list-header-bg) !important;
}

.version-compare-table :deep(.vxe-header--column .vxe-cell) {
  color: var(--list-header-color) !important;
}

.version-compare-table :deep(.vxe-header--column) {
  padding-top: var(--list-header-padding-y) !important;
  padding-bottom: var(--list-header-padding-y) !important;
}

.version-compare-table :deep(.vxe-body--column) {
  padding-top: var(--list-cell-padding-y) !important;
  padding-bottom: var(--list-cell-padding-y) !important;
}

</style>
