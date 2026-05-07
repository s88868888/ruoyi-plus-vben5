<script setup lang="ts">
import { ref } from 'vue';

import { Page } from '@vben/common-ui';

import { Card, Col, Row, Select, Space, Statistic } from 'ant-design-vue';

const timeRange = ref('month');

const stats = ref({
  total: 148,
  passRate: '68%',
  avgTime: '18s',
  issueRate: '32%',
});

const docTypeData = [
  { type: '合同', count: 56, percent: 75 },
  { type: '财务账单', count: 42, percent: 55 },
  { type: '表单', count: 28, percent: 35 },
  { type: '标书', count: 22, percent: 25 },
];

const issueTypeData = [
  { type: '缺少必备条款', count: 38, percent: 65, color: '#f5222d' },
  { type: '格式不规范', count: 29, percent: 50, color: '#fa8c16' },
  { type: '金额/数值错误', count: 18, percent: 30, color: '#1890ff' },
  { type: '表述模糊', count: 12, percent: 20, color: '#52c41a' },
];

const standardRank = [
  { name: '企业财务报销规范 v1.3', count: 134 },
  { name: '合同通用条款检查 v3.0', count: 89 },
  { name: '内部审批表单规范 v3.0', count: 67 },
  { name: '政府采购合同审核标准 v2.1', count: 56 },
  { name: '租赁合同审核标准 v1.0', count: 42 },
];

const submitterRank = [
  { name: '李四（合同管理部）', count: 32 },
  { name: '王五（财务部）', count: 28 },
  { name: '赵六（征地办）', count: 24 },
  { name: '张三（综合部）', count: 18 },
  { name: '钱七（采购部）', count: 15 },
];
</script>

<template>
  <Page :auto-content-height="true">
    <div class="flex h-full flex-col gap-4 overflow-y-auto">
      <!-- 顶部筛选 -->
      <div class="flex shrink-0 items-center justify-between">
        <span class="text-lg font-semibold text-gray-800">审核统计</span>
        <Space>
          <Select
            v-model:value="timeRange"
            style="width: 120px"
            :options="[
              { label: '本月', value: 'month' },
              { label: '本周', value: 'week' },
              { label: '近三个月', value: 'quarter' },
              { label: '本年度', value: 'year' },
            ]"
          />
        </Space>
      </div>

      <!-- 统计卡片 -->
      <Row :gutter="16" class="shrink-0">
        <Col :span="6">
          <Card><Statistic title="本月审核总数" :value="stats.total" suffix="份" /></Card>
        </Col>
        <Col :span="6">
          <Card><Statistic title="AI通过率" :value="stats.passRate" :value-style="{ color: '#52c41a' }" /></Card>
        </Col>
        <Col :span="6">
          <Card><Statistic title="平均审核耗时" :value="stats.avgTime" :value-style="{ color: '#1890ff' }" /></Card>
        </Col>
        <Col :span="6">
          <Card><Statistic title="问题检出率" :value="stats.issueRate" :value-style="{ color: '#fa8c16' }" /></Card>
        </Col>
      </Row>

      <!-- 图表区域 -->
      <Row :gutter="16" class="shrink-0">
        <Col :span="12">
          <Card title="各类型文档审核量">
            <div
              v-for="item in docTypeData"
              :key="item.type"
              class="mb-3 flex items-center gap-3"
            >
              <span class="w-20 text-right text-sm text-gray-500">{{ item.type }}</span>
              <div class="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
                <div
                  class="h-full rounded flex items-center pl-2 text-white text-xs"
                  :style="{ width: item.percent + '%', background: '#1890ff' }"
                >
                  {{ item.count }}份
                </div>
              </div>
            </div>
          </Card>
        </Col>
        <Col :span="12">
          <Card title="问题类型分布">
            <div
              v-for="item in issueTypeData"
              :key="item.type"
              class="mb-3 flex items-center gap-3"
            >
              <span class="w-24 text-right text-sm text-gray-500">{{ item.type }}</span>
              <div class="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
                <div
                  class="h-full rounded flex items-center pl-2 text-white text-xs"
                  :style="{ width: item.percent + '%', background: item.color }"
                >
                  {{ item.count }}次
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <!-- 排行区域 -->
      <Row :gutter="16" class="shrink-0">
        <Col :span="12">
          <Card title="审核标准使用排行">
            <div
              v-for="(item, index) in standardRank"
              :key="item.name"
              class="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-b-0"
            >
              <span
                class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold"
                :class="[
                  index === 0 ? 'bg-amber-100 text-amber-600' :
                  index === 1 ? 'bg-gray-100 text-gray-600' :
                  index === 2 ? 'bg-orange-50 text-orange-500' :
                  'bg-gray-50 text-gray-500'
                ]"
              >{{ index + 1 }}</span>
              <span class="flex-1 text-sm">{{ item.name }}</span>
              <span class="font-semibold text-blue-500">{{ item.count }}次</span>
            </div>
          </Card>
        </Col>
        <Col :span="12">
          <Card title="提交人审核量排行">
            <div
              v-for="(item, index) in submitterRank"
              :key="item.name"
              class="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-b-0"
            >
              <span
                class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold"
                :class="[
                  index === 0 ? 'bg-amber-100 text-amber-600' :
                  index === 1 ? 'bg-gray-100 text-gray-600' :
                  index === 2 ? 'bg-orange-50 text-orange-500' :
                  'bg-gray-50 text-gray-500'
                ]"
              >{{ index + 1 }}</span>
              <span class="flex-1 text-sm">{{ item.name }}</span>
              <span class="font-semibold text-blue-500">{{ item.count }}份</span>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  </Page>
</template>
