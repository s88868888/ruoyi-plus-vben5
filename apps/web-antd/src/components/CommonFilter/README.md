# CommonFilter 通用筛选组件

从 CSWG-PC-FrontEnd 项目迁移到 ruoyi-plus-vben5 的通用筛选条件组件。

## 功能特性

- 支持多种筛选条件类型（输入框、下拉选择、日期选择、数值范围等）
- 常用条件和其他条件分类展示
- 实时预览已选条件
- 支持条件的添加、删除和重置
- 响应式设计，适配不同屏幕尺寸

## 使用方法

### 基本用法

```vue
<template>
  <CommonFilter
    :filter-data="filterData"
    type="both"
    @handle-query="handleQuery"
    @change="handleChange"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import CommonFilter from '@/components/CommonFilter/index.vue'

const filterData = ref([
  {
    field: 'name',
    label: '名称',
    type: 'a-input',
    data: '',
    placeholder: '请输入名称',
    isCommon: true
  },
  {
    field: 'status',
    label: '状态',
    type: 'a-select',
    data: '',
    options: [
      { label: '启用', value: '1' },
      { label: '禁用', value: '0' }
    ],
    isCommon: true
  },
  {
    field: 'createTime',
    label: '创建时间',
    type: 'a-date-picker-start-end',
    data: [],
    format: 'YYYY-MM-DD',
    isCommon: false
  }
])

const handleQuery = (conditions) => {
  console.log('查询条件:', conditions)
  // 执行查询逻辑
}

const handleChange = ({ conditions }) => {
  console.log('条件变化:', conditions)
}
</script>
```

## Props

| 参数 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| filterData | 筛选条件配置数组 | FilterItem[] | [] |
| type | 筛选类型 | 'more' \| 'both' | 'both' |
| objectType | 对象类型（用于标签筛选） | string | '' |

## FilterItem 配置

```typescript
interface FilterItem {
  field: string          // 字段名
  label: string          // 显示标签
  type: string           // 控件类型
  data: any              // 数据值
  options?: Array<{      // 选项（用于下拉选择）
    label: string
    value: any
  }>
  placeholder?: string   // 占位符
  format?: string        // 日期格式
  isCommon?: boolean     // 是否为常用条件
}
```

## 支持的控件类型

### 输入类
- `a-input`: 单行文本输入框
- `a-input-range`: 数值范围输入

### 选择类
- `a-select`: 单选下拉框
- `a-select-multiple`: 多选下拉框

### 日期类
- `a-date-picker`: 单个日期选择
- `a-date-picker-start-end`: 日期范围选择

## Events

| 事件名 | 说明 | 回调参数 |
|--------|------|----------|
| handle-query | 应用筛选条件时触发 | conditions: Array<{key: string, value: any}> |
| change | 筛选条件变化时触发 | { conditions: Array } |

## 查询参数格式

组件会自动将筛选条件转换为查询参数格式：

- 文本/选择: `txtEqual_字段名`
- 多选: `txtMult_字段名`
- 日期范围: `dtS_字段名` (开始) 和 `dtE_字段名` (结束)
- 数值范围: `GreaterThanOrEqual_字段名` 和 `LessThanOrEqual_字段名`

## 示例

### 完整示例

```vue
<template>
  <div class="page-container">
    <div class="filter-bar">
      <CommonFilter
        :filter-data="filterConfig"
        type="both"
        @handle-query="handleFilterQuery"
      />
      <a-button type="primary" @click="handleSearch">搜索</a-button>
    </div>
    
    <a-table :dataSource="tableData" :columns="columns" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import CommonFilter from '@/components/CommonFilter/index.vue'

const filterConfig = ref([
  {
    field: 'projectName',
    label: '项目名称',
    type: 'a-input',
    data: '',
    placeholder: '请输入项目名称',
    isCommon: true
  },
  {
    field: 'projectType',
    label: '项目类型',
    type: 'a-select',
    data: '',
    options: [
      { label: '研发项目', value: '1' },
      { label: '运维项目', value: '2' },
      { label: '测试项目', value: '3' }
    ],
    isCommon: true
  },
  {
    field: 'priority',
    label: '优先级',
    type: 'a-select-multiple',
    data: [],
    options: [
      { label: '高', value: 'high' },
      { label: '中', value: 'medium' },
      { label: '低', value: 'low' }
    ],
    isCommon: false
  },
  {
    field: 'budget',
    label: '预算范围',
    type: 'a-input-range',
    data: { start: undefined, end: undefined },
    isCommon: false
  },
  {
    field: 'startDate',
    label: '开始日期',
    type: 'a-date-picker-start-end',
    data: [],
    format: 'YYYY-MM-DD',
    isCommon: false
  }
])

const queryParams = ref<any[]>([])
const tableData = ref([])

const handleFilterQuery = (conditions) => {
  queryParams.value = conditions
  console.log('筛选条件:', conditions)
}

const handleSearch = () => {
  // 使用 queryParams 执行搜索
  fetchTableData(queryParams.value)
}

const fetchTableData = async (params) => {
  // 调用 API 获取数据
  console.log('查询参数:', params)
}
</script>
```

## 注意事项

1. 确保 `filterData` 中的 `field` 字段唯一
2. 日期范围类型的 `data` 应初始化为空数组 `[]`
3. 数值范围类型的 `data` 应初始化为 `{ start: undefined, end: undefined }`
4. 多选类型的 `data` 应初始化为空数组 `[]`
5. 组件使用 Ant Design Vue，确保项目已安装相关依赖

## 迁移说明

本组件从 CSWG-PC-FrontEnd 项目迁移而来，主要变更：

1. UI 框架从 Element Plus 迁移到 Ant Design Vue
2. 组件类型前缀从 `el-` 改为 `a-`
3. 保留了原有的业务逻辑和数据处理方式
4. 简化了部分复杂功能，保留核心筛选能力

## 后续优化建议

1. 添加更多控件类型支持（时间选择器、级联选择等）
2. 支持自定义查询参数格式
3. 添加筛选条件的保存和加载功能
4. 优化移动端适配
5. 添加标签筛选功能（需要后端 API 支持）
