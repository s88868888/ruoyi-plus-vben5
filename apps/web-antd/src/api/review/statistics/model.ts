/** 总览统计 */
export interface StatisticsOverview {
  total: number;
  passRate: string;
  avgTime: string;
  issueRate: string;
}

/** 趋势数据项 */
export interface TrendItem {
  date: string;
  total: number;
  passCount: number;
  failCount: number;
}

/** 通过状态分布项 */
export interface PassStatusItem {
  name: string;
  value: number;
}

/** 规则命中排行项 */
export interface RuleHitTopItem {
  ruleName: string;
  hitCount: number;
}

/** 严重程度周趋势项 */
export interface SeverityWeeklyItem {
  week: string;
  errorCount: number;
  warningCount: number;
  infoCount: number;
}
