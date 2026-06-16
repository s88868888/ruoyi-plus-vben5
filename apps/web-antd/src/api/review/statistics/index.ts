import { requestClient } from '#/api/request';
import type {
  StatisticsOverview,
  TrendItem,
  PassStatusItem,
  RuleHitTopItem,
  SeverityWeeklyItem,
} from './model';

// 获取总览统计
export function statisticsOverview() {
  return requestClient.get<StatisticsOverview>('/review/statistics/overview');
}

// 获取趋势数据
export function statisticsTrend(days?: number) {
  return requestClient.get<TrendItem[]>('/review/statistics/trend', {
    params: { days },
  });
}

// 获取通过状态分布
export function statisticsPassStatus() {
  return requestClient.get<PassStatusItem[]>('/review/statistics/passStatus');
}

// 获取规则命中排行
export function statisticsRuleHitTop() {
  return requestClient.get<RuleHitTopItem[]>('/review/statistics/ruleHitTop');
}

// 获取严重程度周趋势
export function statisticsSeverityWeekly() {
  return requestClient.get<SeverityWeeklyItem[]>('/review/statistics/severityWeekly');
}
