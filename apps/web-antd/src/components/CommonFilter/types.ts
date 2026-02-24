/**
 * CommonFilter 组件类型定义
 */

export interface FilterOption {
  label: string
  value: any
}

export interface FilterItem {
  /** 字段名 */
  field: string
  /** 显示标签 */
  label: string
  /** 控件类型 */
  type: FilterType
  /** 数据值 */
  data: any
  /** 选项列表（用于下拉选择） */
  options?: FilterOption[]
  /** 占位符 */
  placeholder?: string
  /** 日期格式 */
  format?: string
  /** 是否为常用条件 */
  isCommon?: boolean
  /** 搜索模式：fuzzy(模糊) 或 exact(精确) */
  searchMode?: 'fuzzy' | 'exact'
}

export type FilterType =
  | 'a-input'                    // 单行文本输入
  | 'a-select'                   // 单选下拉
  | 'a-select-multiple'          // 多选下拉
  | 'a-date-picker'              // 单个日期选择
  | 'a-date-picker-start-end'    // 日期范围选择
  | 'a-input-range'              // 数值范围输入

export interface FilterCategory {
  key: string
  label: string
  icon: any
  count: number
  disabled: boolean
}

export interface QueryCondition {
  key: string
  value: any
}

export interface FilterChangeEvent {
  conditions: QueryCondition[]
}

export interface CommonFilterProps {
  /** 筛选条件配置数组 */
  filterData: FilterItem[]
  /** 筛选类型 */
  type?: 'more' | 'both'
  /** 对象类型（用于标签筛选） */
  objectType?: string
}

export interface CommonFilterEmits {
  /** 应用筛选条件时触发 */
  (e: 'handle-query', conditions: QueryCondition[]): void
  /** 筛选条件变化时触发 */
  (e: 'change', event: FilterChangeEvent): void
}
