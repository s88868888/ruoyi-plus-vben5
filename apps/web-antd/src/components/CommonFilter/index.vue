<!-- 通用筛选条件组件 - 从 CSWG-PC-FrontEnd 迁移 -->
<template>
  <div class="common-filter">
    <!-- 左侧常用条件输入框 -->
    <template v-if="type === 'both'">
      <div class="left-sidebar-inputs">
        <div
          v-for="item in leftSidebarItems"
          :key="item.field"
          class="sidebar-input-item"
        >
          <span class="sidebar-item-label">{{ item.label }}</span>
          <Input
            v-if="item.type === 'a-input'"
            v-model:value="item.data"
            :placeholder="item.placeholder || `请输入${item.label}`"
            class="sidebar-input"
            allow-clear
            @pressEnter="handleLeftSearch"
            @change="handleLeftInputChange(item)"
          />
          <Select
            v-else-if="item.type === 'a-select'"
            v-model:value="item.data"
            :placeholder="item.placeholder || `请选择${item.label}`"
            class="sidebar-input"
            allow-clear
            @change="handleLeftSearch"
          >
            <SelectOption
              v-for="opt in item.options"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </SelectOption>
          </Select>
        </div>
      </div>
    </template>

    <!-- 筛选条件按钮 -->
    <Popover
      v-model:open="popoverVisible"
      trigger="click"
      placement="bottomLeft"
      overlay-class-name="common-filter-popover"
      :overlay-style="{ width: '800px' }"
      :overlay-inner-style="{ padding: 0 }"
    >
      <template #content>
        <div class="filter-container" :style="{ height: dynamicHeight + 'px' }">
          <!-- 主要内容区域 -->
          <div class="filter-main">
            <!-- 左侧分类 -->
            <div class="filter-sidebar">
              <div class="sidebar-title">筛选条件</div>
              <div class="filter-categories">
                <div
                  v-for="category in filterCategories"
                  :key="category.key"
                  :class="['category-item', { active: activeCategory === category.key }]"
                  @click="selectCategory(category)"
                >
                  <component :is="category.icon" class="category-icon" />
                  <span class="category-label">{{ category.label }}</span>
                  <span v-if="category.count" class="category-count">{{ category.count }}</span>
                </div>
              </div>
            </div>

            <!-- 右侧内容 -->
            <div class="filter-content">
              <!-- 筛选条件列 -->
              <div class="conditions-panel">
                <div class="panel-title">条件列表</div>
                <div class="conditions-list" v-if="!currentCategoryData.disabled">
                  <!-- 常用筛选 -->
                  <template v-if="activeCategory === 'common' || activeCategory === 'uncommon'">
                    <div
                      v-for="(item, index) in currentCategoryData.items"
                      :key="index"
                      class="condition-item-wrapper"
                    >
                      <div class="condition-label">{{ item.label }}</div>
                      <div class="condition-control">
                        <!-- 输入框 -->
                        <Input
                          v-if="item.type === 'a-input'"
                          v-model:value="item.data"
                          :placeholder="item.placeholder || '请输入'"
                          class="condition-input"
                          allow-clear
                        />
                        <!-- 下拉选择 -->
                        <Select
                          v-else-if="item.type === 'a-select'"
                          v-model:value="item.data"
                          placeholder="请选择"
                          class="condition-input"
                          allow-clear
                        >
                          <SelectOption
                            v-for="opt in item.options"
                            :key="opt.value"
                            :value="opt.value"
                          >
                            {{ opt.label }}
                          </SelectOption>
                        </Select>
                        <!-- 多选下拉 -->
                        <Select
                          v-else-if="item.type === 'a-select-multiple'"
                          v-model:value="item.data"
                          mode="multiple"
                          placeholder="请选择"
                          class="condition-input"
                          allow-clear
                        >
                          <SelectOption
                            v-for="opt in item.options"
                            :key="opt.value"
                            :value="opt.value"
                          >
                            {{ opt.label }}
                          </SelectOption>
                        </Select>
                        <!-- 日期选择 -->
                        <DatePicker
                          v-else-if="item.type === 'a-date-picker'"
                          v-model:value="item.data"
                          :format="item.format || 'YYYY-MM-DD'"
                          class="condition-input"
                          placeholder="请选择日期"
                        />
                        <!-- 日期范围 -->
                        <RangePicker
                          v-else-if="item.type === 'a-date-picker-start-end'"
                          v-model:value="item.data"
                          :format="item.format || 'YYYY-MM-DD'"
                          class="condition-input"
                        />
                        <!-- 数值范围 -->
                        <div
                          v-else-if="item.type === 'a-input-range'"
                          class="range-input condition-input"
                        >
                          <InputNumber
                            v-model:value="item.data.start"
                            placeholder="最小值"
                            style="flex: 1"
                          />
                          <span class="range-separator">至</span>
                          <InputNumber
                            v-model:value="item.data.end"
                            placeholder="最大值"
                            style="flex: 1"
                          />
                        </div>
                      </div>
                    </div>
                  </template>
                </div>
                <div v-else class="empty-state">
                  <FileTextOutlined class="empty-icon" />
                  <div class="empty-text">该类型暂无筛选条件</div>
                </div>
              </div>

              <!-- 已选条件列 -->
              <div class="selected-panel">
                <div class="panel-title">已选条件</div>
                <div class="selected-list">
                  <template v-if="previewConditions.length">
                    <div
                      v-for="condition in previewConditions"
                      :key="condition.field"
                      class="selected-item"
                    >
                      <Tooltip
                        :title="`${condition.label}: ${getConditionDisplayValue(condition)}`"
                        placement="top"
                      >
                        <span class="item-text">
                          {{ condition.label }}: {{ getConditionDisplayValue(condition) }}
                        </span>
                      </Tooltip>
                      <CloseOutlined class="remove-icon" @click.stop="removePreviewCondition(condition)" />
                    </div>
                  </template>
                  <div v-else class="empty-state">
                    <FilterOutlined class="empty-icon" />
                    <div class="empty-text">暂无已选条件</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 底部操作 -->
          <div class="filter-footer">
            <div class="footer-left">
              <Button type="link" @click="handlePreviewClear">重置条件</Button>
            </div>
            <div class="footer-right">
              <Button @click="handleCancel">取消</Button>
              <Button type="primary" @click="handleConfirm">应用条件</Button>
            </div>
          </div>
        </div>
      </template>

      <!-- 触发按钮 -->
      <Button :class="{ 'has-filter': hasActiveFilters }" @click="handleButtonClick">
        <template #icon>
          <FilterOutlined />
        </template>
        筛选条件
        <span v-if="totalFilterCount" class="filter-count">{{ totalFilterCount }}</span>
      </Button>
    </Popover>

    <!-- 已选条件标签 -->
    <div v-if="hasActiveFilters" class="selected-conditions">
      <div
        v-for="condition in selectedConditions"
        :key="condition.id"
        class="condition-item"
        @click="removeCondition(condition)"
      >
        <Tooltip
          :title="`${condition.label}: ${getConditionValue(condition)}`"
          placement="top"
        >
          <span class="condition-text">{{ condition.label }}: {{ getConditionValue(condition) }}</span>
        </Tooltip>
        <CloseOutlined class="close-icon" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import {
  Button,
  DatePicker,
  Input,
  InputNumber,
  Popover,
  RangePicker,
  Select,
  SelectOption,
  Tooltip,
} from 'ant-design-vue'
import { FilterOutlined, CloseOutlined, FileTextOutlined, StarOutlined } from '@ant-design/icons-vue'
import { nanoid } from 'nanoid'
import dayjs from 'dayjs'

interface FilterItem {
  field: string
  label: string
  type: string
  data: any
  options?: Array<{ label: string; value: any }>
  placeholder?: string
  format?: string
  isCommon?: boolean
  isShowLeft?: boolean
}

interface FilterCategory {
  key: string
  label: string
  icon: any
  count: number
  disabled: boolean
}

const props = defineProps<{
  filterData: FilterItem[]
  type?: 'more' | 'both'
  objectType?: string
}>()

const emit = defineEmits(['handle-query', 'change'])

const popoverVisible = ref(false)
const activeCategory = ref('common')
const myFilterData = ref<FilterItem[]>([])
const selectedConditions = ref<any[]>([])

// 初始化数据
onMounted(() => {
  myFilterData.value = JSON.parse(JSON.stringify(props.filterData || []))
})

// 监听 props 变化
watch(
  () => props.filterData,
  (val) => {
    myFilterData.value = JSON.parse(JSON.stringify(val || []))
  },
  { deep: true, immediate: true }
)

// 左侧显示的筛选条件（isShowLeft 为 true 或者 isCommon 为 true 的字段）
const leftSidebarItems = computed(() => {
  return myFilterData.value.filter((item) => item.isShowLeft || item.isCommon)
})

// 分类筛选数据
const categorizedFilterData = computed(() => {
  const common: FilterItem[] = []
  const uncommon: FilterItem[] = []

  myFilterData.value.forEach((item: FilterItem) => {
    if (item.isCommon !== false) {
      common.push(item)
    } else {
      uncommon.push(item)
    }
  })

  return { common, uncommon }
})

// 筛选分类
const filterCategories = computed<FilterCategory[]>(() => {
  const categories: FilterCategory[] = []
  if (categorizedFilterData.value.common.length) {
    categories.push({
      key: 'common',
      label: '常用条件',
      icon: StarOutlined,
      count: categorizedFilterData.value.common.length,
      disabled: false
    })
  }
  if (categorizedFilterData.value.uncommon.length) {
    categories.push({
      key: 'uncommon',
      label: '其他条件',
      icon: FilterOutlined,
      count: categorizedFilterData.value.uncommon.length,
      disabled: false
    })
  }
  return categories
})

// 当前分类数据
const currentCategoryData = computed(() => {
  const key = activeCategory.value as 'common' | 'uncommon'
  return {
    items: categorizedFilterData.value[key] || [],
    disabled: false
  }
})

// 预览条件
const previewConditions = computed(() => {
  return myFilterData.value.filter((item) => hasValue(item))
})

// 动态高度
const dynamicHeight = computed(() => {
  const items = currentCategoryData.value.items.length
  return Math.min(500, 200 + items * 60)
})

// 工具函数
const hasValue = (item: FilterItem) => {
  if (typeof item.data === 'string' && item.data) return true
  if (typeof item.data === 'number') return true
  if (Array.isArray(item.data) && item.data.length) return true
  if (item.type === 'a-input-range' && (item.data?.start || item.data?.end)) return true
  return false
}

const getConditionDisplayValue = (condition: FilterItem) => {
  if (condition.type === 'a-select') {
    return condition.options?.find((o) => o.value === condition.data)?.label || condition.data
  }
  if (condition.type === 'a-date-picker-start-end' && Array.isArray(condition.data)) {
    return `${dayjs(condition.data[0]).format('YYYY-MM-DD')} 至 ${dayjs(condition.data[1]).format('YYYY-MM-DD')}`
  }
  if (condition.type === 'a-input-range') {
    return `${condition.data.start || 'N/A'} 至 ${condition.data.end || 'N/A'}`
  }
  if (condition.type === 'a-select-multiple' && Array.isArray(condition.data)) {
    return condition.options
      ?.filter((opt) => condition.data.includes(opt.value))
      .map((opt) => opt.label)
      .join(',') || condition.data.join(',')
  }
  return condition.data
}

const getConditionValue = (condition: FilterItem) => getConditionDisplayValue(condition)

// 类别选择
const selectCategory = (category: FilterCategory) => {
  activeCategory.value = category.key
}

// 移除预览条件
const removePreviewCondition = (condition: FilterItem) => {
  const target = myFilterData.value.find((item) => item.field === condition.field)
  if (target) {
    if (Array.isArray(target.data)) {
      target.data = []
    } else if (target.type === 'a-input-range') {
      target.data = { start: undefined, end: undefined }
    } else {
      target.data = ''
    }
  }
}

// 移除已选条件
const removeCondition = (condition: any) => {
  selectedConditions.value = selectedConditions.value.filter((c) => c.id !== condition.id)
  const target = myFilterData.value.find((item) => item.field === condition.field)
  if (target) {
    if (Array.isArray(target.data)) {
      target.data = []
    } else if (target.type === 'a-input-range') {
      target.data = { start: undefined, end: undefined }
    } else {
      target.data = ''
    }
  }
  emitChange()
}

// 重置
const handlePreviewClear = () => {
  myFilterData.value = JSON.parse(JSON.stringify(props.filterData || []))
}

// 取消
const handleCancel = () => {
  myFilterData.value = JSON.parse(JSON.stringify(props.filterData || []))
  popoverVisible.value = false
}

// 确认
const handleConfirm = () => {
  const validConditions: any[] = []
  for (const item of myFilterData.value) {
    if (hasValue(item)) {
      validConditions.push({ ...item, id: nanoid() })
    }
  }
  selectedConditions.value = validConditions
  popoverVisible.value = false
  emitChange()
}

// 发射变化
const emitChange = () => {
  const conditions: any[] = []
  for (const item of selectedConditions.value) {
    conditions.push(...makeQueryKey(item))
  }
  emit('handle-query', conditions)
  emit('change', { conditions })
}

// 生成查询参数
const makeQueryKey = (item: FilterItem) => {
  const objs: any[] = []

  if (item.type === 'a-select' || item.type === 'a-input') {
    objs.push({ key: item.field, value: item.data })
  } else if (item.type === 'a-select-multiple' && Array.isArray(item.data)) {
    objs.push({ key: item.field, value: item.data.join(',') })
  } else if (item.type === 'a-date-picker-start-end' && item.data?.length === 2) {
    objs.push(
      { key: item.field + 'Start', value: dayjs(item.data[0]).format('YYYY-MM-DD 00:00:00') },
      { key: item.field + 'End', value: dayjs(item.data[1]).format('YYYY-MM-DD 23:59:59') }
    )
  } else if (item.type === 'a-input-range') {
    if (item.data?.start) {
      objs.push({ key: item.field + 'Start', value: item.data.start })
    }
    if (item.data?.end) {
      objs.push({ key: item.field + 'End', value: item.data.end })
    }
  }

  return objs
}

// 计算属性
const hasActiveFilters = computed(() => selectedConditions.value.length > 0)
const totalFilterCount = computed(() => selectedConditions.value.length)

// 按钮点击处理
const handleButtonClick = (e: Event) => {
  e.stopPropagation()
  popoverVisible.value = !popoverVisible.value
}

// 左侧输入框内容变化（不触发搜索，值已通过 v-model 同步）
const handleLeftInputChange = (_item: FilterItem) => {
  // 值已通过 v-model 实时绑定，回车时触发 handleLeftSearch 执行查询
}

// 左侧输入框回车搜索
const handleLeftSearch = () => {
  // 将左侧输入框的值同步到已选条件
  const validConditions: any[] = []
  for (const item of leftSidebarItems.value) {
    if (hasValue(item)) {
      validConditions.push({ ...item, id: nanoid() })
    }
  }
  selectedConditions.value = validConditions
  emitChange()
}
</script>

<style scoped>
.common-filter {
  display: flex;
  gap: 12px;
  align-items: center;
  border-radius: 16px;
}

/* 左侧常用条件输入框 */
.left-sidebar-inputs {
  display: flex;
  gap: 12px;
  align-items: center;
}

.sidebar-input-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  margin-bottom: 0;
}

.sidebar-item-label {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.65);
  white-space: nowrap;
  flex-shrink: 0;
  font-weight: 600;
}

.sidebar-input {
  width: 160px !important;
}

/* 筛选弹出框 */
.filter-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 300px;
  max-height: 520px;
  position: relative;
}

/* 主要内容区域 */
.filter-main {
  display: flex;
  flex: 1;
  height: 100%;
  overflow: hidden;
}

/* 左侧筛选类型选择器 */
.filter-sidebar {
  width: 200px;
  background: #fafafa;
  border-right: 1px solid #f0f0f0;
  padding-bottom: 16px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.sidebar-title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 8px;
  margin-top: 10px;
  margin-right: 10px;
  padding: 7px 10px;
  flex-shrink: 0;
}

.sidebar-category-title {
  font-size: 13px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.65);
  padding: 8px 12px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.filter-categories {
  flex: 1;
  overflow-y: auto;
  min-height: 80px;
}

.category-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  margin: 2px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
  position: relative;
}

.category-item:hover {
  background: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
}

.category-item.active {
  background: hsl(var(--primary) / 0.2);
  color: hsl(var(--primary));
  font-weight: 500;
}

.category-icon {
  font-size: 16px;
  margin-right: 8px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.category-label {
  flex: 1;
  font-size: 13px;
}

.category-count {
  font-size: 11px;
  background: rgba(0, 0, 0, 0.06);
  color: rgba(0, 0, 0, 0.45);
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 16px;
  text-align: center;
  line-height: 1.2;
}

.category-item.active .category-count {
  background: hsl(var(--primary));
  color: white;
}

/* 右侧内容区域 */
.filter-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* 筛选条件面板 */
.conditions-panel {
  flex: 1;
  padding: 16px;
  background: #fff;
  border-right: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.conditions-list {
  flex: 1;
  overflow-y: auto;
  padding-right: 8px;
  min-height: 0;
}

.condition-item-wrapper {
  margin-bottom: 16px;
}

.condition-label {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
  margin-bottom: 6px;
  font-weight: 500;
}

.condition-control {
  width: 100%;
}

.condition-input {
  width: 100% !important;
}

/* 范围输入特殊样式 */
.range-input {
  display: flex;
  align-items: center;
  gap: 8px;
}

.range-separator {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
  padding: 0 4px;
  flex-shrink: 0;
}

/* 已选条件面板 */
.selected-panel {
  width: 280px;
  padding: 16px;
  background: #fff;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.selected-list {
  flex: 1;
  overflow-y: auto;
  padding-right: 8px;
  min-height: 0;
}

.selected-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 12px;
  margin-bottom: 6px;
  transition: all 0.2s ease;
}

.selected-item:hover {
  border-color: #ffccc7;
  background: #fff2f0;
}

.item-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 6px;
  color: rgba(0, 0, 0, 0.65);
}

.remove-icon {
  font-size: 14px;
  cursor: pointer;
  color: rgba(0, 0, 0, 0.45);
  transition: color 0.2s ease;
}

.remove-icon:hover {
  color: #ff4d4f;
}

/* 空状态样式 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  height: 200px;
  color: rgba(0, 0, 0, 0.25);
}

.empty-icon {
  font-size: 48px;
  color: rgba(0, 0, 0, 0.25);
  margin-bottom: 12px;
}

.empty-text {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.45);
  margin-bottom: 4px;
}

/* 底部操作区 */
.filter-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-top: 1px solid #f0f0f0;
  background: #fff;
  flex-shrink: 0;
}

.footer-left,
.footer-right {
  display: flex;
  gap: 8px;
}

.footer-left :deep(.ant-btn) {
  border: none;
  background: transparent;
  color: hsl(var(--primary));
  padding: 8px 0;
  font-weight: 500;
  box-shadow: none;
}

.footer-left :deep(.ant-btn:hover) {
  background: transparent;
  color: hsl(var(--primary) / 0.8);
}

/* 已选条件展示区域（弹窗外部） */
.selected-conditions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.condition-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 10px;
  height: 30px;
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
  cursor: pointer;
  transition: all 0.3s;
  user-select: none;
}

.condition-item:hover {
  border-color: hsl(var(--primary));
  color: hsl(var(--primary));
  background-color: hsl(var(--primary) / 0.1);
}

.condition-text {
  line-height: 1;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.close-icon {
  font-size: 14px;
  margin-left: 2px;
}

.has-filter {
  background-color: hsl(var(--primary) / 0.1);
  border-color: hsl(var(--primary) / 0.5);
  color: hsl(var(--primary));
}

.filter-count {
  margin-left: 4px;
  font-size: 12px;
  color: #fff;
  background-color: hsl(var(--primary));
  border-radius: 50%;
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* 深度选择器 - Ant Design 组件宽度控制 */
:deep(.ant-popover-inner) {
  padding: 0;
}

:deep(.ant-popover-inner-content) {
  padding: 0;
}

/* 弹窗内部的下拉和日期选择器：撑满容器 */
.filter-content :deep(.ant-select),
.filter-content :deep(.ant-picker) {
  width: 100% !important;
}

/* 左侧常用条件的下拉：固定宽度 */
.left-sidebar-inputs :deep(.ant-select) {
  width: 160px !important;
}

/* 滚动条样式 */
.conditions-list::-webkit-scrollbar,
.selected-list::-webkit-scrollbar,
.filter-categories::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.conditions-list::-webkit-scrollbar-thumb,
.selected-list::-webkit-scrollbar-thumb,
.filter-categories::-webkit-scrollbar-thumb {
  border-radius: 3px;
  background-color: rgba(144, 147, 153, 0.3);
}

.conditions-list::-webkit-scrollbar-track,
.selected-list::-webkit-scrollbar-track,
.filter-categories::-webkit-scrollbar-track {
  border-radius: 3px;
  background-color: transparent;
}

/* 响应式适配 */
@media screen and (max-width: 768px) {
  .filter-container {
    min-height: 250px;
    max-height: 400px;
  }

  .filter-sidebar {
    width: 120px;
  }

  .selected-panel {
    width: 240px;
  }

  .category-label {
    font-size: 12px;
  }
}
</style>
