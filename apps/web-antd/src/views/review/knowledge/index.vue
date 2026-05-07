<script setup lang="ts">
import type { VxeGridProps } from '#/adapter/vxe-table';

import { computed, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { Button, Card, Col, Dropdown, Menu, MenuItem, Modal, Row, Space, Statistic, Tag, Tabs, TabPane, message } from 'ant-design-vue';
import { EllipsisOutlined, PlusOutlined } from '@ant-design/icons-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { useListTablePreference } from '#/preferences/userPreference';
import CommonFilter from '#/components/CommonFilter/index.vue';

const tablePreference = useListTablePreference();

const tableCssVars = computed(() => ({
  '--list-header-bg': tablePreference.headerBgColor,
  '--list-header-color': tablePreference.headerTextColor,
  '--list-header-padding-y': `${tablePreference.headerPaddingY}px`,
  '--list-cell-padding-y': `${tablePreference.cellPaddingY}px`,
}));

const activeTab = ref('cases');

const stats = ref({
  totalCases: 256,
  totalPatterns: 42,
  lastUpdate: '2024-12-20',
  accuracy: '92%',
});

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

// Mock 数据
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

// 历史案例表格配置
const caseGridOptions: VxeGridProps = {
  height: 'auto',
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
  id: 'knowledge-case-index',
};

// 问题模式表格配置
const patternGridOptions: VxeGridProps = {
  height: 'auto',
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
  id: 'knowledge-pattern-index',
};

const [CaseTable, caseTableApi] = useVbenVxeGrid({ gridOptions: caseGridOptions } as any);
const [PatternTable, patternTableApi] = useVbenVxeGrid({ gridOptions: patternGridOptions } as any);

const handleCaseFilterQuery = (_conditions: any[]) => {
  caseTableApi.query();
};

const handlePatternFilterQuery = (_conditions: any[]) => {
  patternTableApi.query();
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
</script>

<template>
  <Page :auto-content-height="true">
    <div class="flex h-full flex-col gap-4">
      <!-- 统计卡片 -->
      <Row :gutter="16" class="shrink-0">
        <Col :span="6">
          <Card><Statistic title="历史案例数" :value="stats.totalCases" /></Card>
        </Col>
        <Col :span="6">
          <Card><Statistic title="问题模式数" :value="stats.totalPatterns" /></Card>
        </Col>
        <Col :span="6">
          <Card><Statistic title="识别准确率" :value="stats.accuracy" :value-style="{ color: '#52c41a' }" /></Card>
        </Col>
        <Col :span="6">
          <Card><Statistic title="最近更新" :value="stats.lastUpdate" :value-style="{ fontSize: '20px' }" /></Card>
        </Col>
      </Row>

      <!-- Tab + 表格区域 -->
      <div class="flex-1 overflow-hidden bg-white rounded shadow-sm flex flex-col">
        <Tabs v-model:activeKey="activeTab" class="flex-1 overflow-hidden px-4 pt-2 knowledge-tabs">
          <TabPane key="cases" tab="历史案例" class="h-full">
            <div class="flex h-full flex-col gap-3">
              <div class="shrink-0 flex items-center justify-between">
                <CommonFilter
                  :filter-data="caseFilterData"
                  type="both"
                  @handle-query="handleCaseFilterQuery"
                />
                <Button type="primary">
                  <PlusOutlined />
                  新增案例
                </Button>
              </div>
              <div class="table-style-wrapper flex-1 overflow-hidden" :style="tableCssVars">
                <CaseTable class="h-full" table-title="历史案例">
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
          <TabPane key="patterns" tab="问题模式" class="h-full">
            <div class="flex h-full flex-col gap-3">
              <div class="shrink-0 flex items-center justify-between">
                <CommonFilter
                  :filter-data="patternFilterData"
                  type="both"
                  @handle-query="handlePatternFilterQuery"
                />
                <Button type="primary">
                  <PlusOutlined />
                  新增模式
                </Button>
              </div>
              <div class="table-style-wrapper flex-1 overflow-hidden" :style="tableCssVars">
                <PatternTable class="h-full" table-title="问题模式">
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
        </Tabs>
      </div>
    </div>
  </Page>
</template>

<style scoped>
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

.knowledge-tabs :deep(.ant-tabs-content) {
  height: 100%;
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
