<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { Card, Col, Row, Spin, Statistic } from 'ant-design-vue';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileSearchOutlined,
  WarningOutlined,
} from '@ant-design/icons-vue';

import {
  statisticsOverview,
  statisticsTrend,
  statisticsPassStatus,
  statisticsRuleHitTop,
  statisticsSeverityWeekly,
} from '#/api/review/statistics';

import TrendChart from './analytics-trends.vue';
import PieChart from './analytics-visits-source.vue';
import RuleHitChart from './analytics-visits.vue';
import SeverityChart from './analytics-visits-data.vue';

// 概览数据
const overview = ref({ total: 0, passRate: '0%', avgTime: '0s', issueRate: '0%' });
// 趋势数据
const trendData = ref<any[]>([]);
// 通过状态分布
const passStatusData = ref<any[]>([]);
// 规则命中排行
const ruleHitData = ref<any[]>([]);
// 严重程度分布
const severityData = ref<any[]>([]);

const loading = ref(true);

async function loadData() {
  loading.value = true;
  try {
    const [overviewRes, trendRes, passRes, ruleRes, severityRes] = await Promise.all([
      statisticsOverview(),
      statisticsTrend(30),
      statisticsPassStatus(),
      statisticsRuleHitTop(),
      statisticsSeverityWeekly(),
    ]);
    overview.value = overviewRes;
    trendData.value = trendRes;
    passStatusData.value = passRes;
    ruleHitData.value = ruleRes;
    severityData.value = severityRes;
  } catch (e) {
    console.error('加载统计数据失败', e);
  } finally {
    loading.value = false;
  }
}

onMounted(loadData);
</script>

<template>
  <div class="analytics-page">
    <Spin :spinning="loading">
      <!-- 概览指标卡片 -->
      <Row :gutter="16" class="overview-row">
        <Col :xs="12" :sm="12" :md="6">
          <Card class="stat-card">
            <Statistic title="审核总量" :value="overview.total" class="stat-item">
              <template #prefix>
                <FileSearchOutlined class="stat-icon stat-icon-primary" />
              </template>
            </Statistic>
          </Card>
        </Col>
        <Col :xs="12" :sm="12" :md="6">
          <Card class="stat-card">
            <Statistic title="通过率" :value="overview.passRate" class="stat-item">
              <template #prefix>
                <CheckCircleOutlined class="stat-icon stat-icon-success" />
              </template>
            </Statistic>
          </Card>
        </Col>
        <Col :xs="12" :sm="12" :md="6">
          <Card class="stat-card">
            <Statistic title="平均耗时" :value="overview.avgTime" class="stat-item">
              <template #prefix>
                <ClockCircleOutlined class="stat-icon stat-icon-warning" />
              </template>
            </Statistic>
          </Card>
        </Col>
        <Col :xs="12" :sm="12" :md="6">
          <Card class="stat-card">
            <Statistic title="问题发现率" :value="overview.issueRate" class="stat-item">
              <template #prefix>
                <WarningOutlined class="stat-icon stat-icon-danger" />
              </template>
            </Statistic>
          </Card>
        </Col>
      </Row>

      <!-- 趋势 + 饼图 -->
      <Row :gutter="16" class="chart-row">
        <Col :xs="24" :md="16">
          <Card title="审核趋势（近30天）" :bordered="false" class="chart-card">
            <TrendChart :data="trendData" />
          </Card>
        </Col>
        <Col :xs="24" :md="8">
          <Card title="通过状态分布" :bordered="false" class="chart-card">
            <PieChart :data="passStatusData" />
          </Card>
        </Col>
      </Row>

      <!-- 规则命中 + 严重程度 -->
      <Row :gutter="16" class="chart-row">
        <Col :xs="24" :md="12">
          <Card title="规则命中 Top10" :bordered="false" class="chart-card">
            <RuleHitChart :data="ruleHitData" />
          </Card>
        </Col>
        <Col :xs="24" :md="12">
          <Card title="严重程度分布（近4周）" :bordered="false" class="chart-card">
            <SeverityChart :data="severityData" />
          </Card>
        </Col>
      </Row>
    </Spin>
  </div>
</template>

<style scoped>
.analytics-page {
  padding: 20px;
}

.overview-row {
  margin-bottom: 16px;
}

.stat-card {
  border-radius: 8px;
  transition: box-shadow 0.3s;
}

.stat-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.stat-icon {
  font-size: 24px;
  margin-right: 8px;
}

.stat-icon-primary { color: #1677ff; }
.stat-icon-success { color: #52c41a; }
.stat-icon-warning { color: #faad14; }
.stat-icon-danger { color: #ff4d4f; }

.chart-row {
  margin-bottom: 16px;
}

.chart-card {
  border-radius: 8px;
  min-height: 380px;
}
</style>
