<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useVbenDrawer } from '@vben/common-ui';
import { Form, FormItem, Input, Select, AutoComplete, Slider, InputNumber, Progress, Tooltip, Divider, message } from 'ant-design-vue';
import { InfoCircleOutlined } from '@ant-design/icons-vue';
import { reviewStandardRuleAdd, reviewStandardRuleUpdate } from '#/api/review/standard';

const emit = defineEmits<{ reload: [] }>();

const isEdit = ref(false);
const ruleId = ref<number | string | undefined>(undefined);
const standardId = ref<number | string | undefined>(undefined);

const formData = ref({
  content: '',
  severity: undefined as string | undefined,
  category: undefined as string | undefined,
  weight: 80,
  confidence: undefined as number | undefined,
  hitCount: undefined as number | undefined,
  missCount: undefined as number | undefined,
});

const severityWeightMap: Record<string, number> = {
  must: 90,
  should: 70,
  suggest: 40,
};

watch(() => formData.value.severity, (val) => {
  if (!isEdit.value && val && severityWeightMap[val]) {
    formData.value.weight = severityWeightMap[val]!;
  }
});

const severityOptions = [
  { label: '严重', value: 'must' },
  { label: '一般', value: 'should' },
  { label: '提示', value: 'suggest' },
];

const categoryOptions = [
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
];

const [BasicDrawer] = useVbenDrawer({
  title: computed(() => isEdit.value ? '编辑规则' : '添加规则'),
  onOpenChange: (visible) => {
    if (!visible) {
      isEdit.value = false;
      formData.value = { content: '', severity: undefined, category: undefined, weight: 80, confidence: undefined, hitCount: undefined, missCount: undefined };
    }
  },
  onData: (data: any) => {
    if (data && data.standardId) {
      standardId.value = data.standardId;
    }
    if (data && data.content) {
      isEdit.value = true;
      ruleId.value = data.id;
      standardId.value = data.standardId;
      formData.value = {
        content: data.content,
        severity: data.severity,
        category: data.category,
        weight: data.weight ?? 80,
        confidence: data.confidence,
        hitCount: data.hitCount,
        missCount: data.missCount,
      };
    }
  },
  onConfirm: async () => {
    if (!formData.value.content) {
      message.warning('请输入规则内容');
      return;
    }
    if (!formData.value.severity) {
      message.warning('请选择等级');
      return;
    }
    if (!formData.value.category) {
      message.warning('请选择或输入分类');
      return;
    }
    if (isEdit.value) {
      await reviewStandardRuleUpdate({
        id: ruleId.value as any,
        standardId: standardId.value as any,
        content: formData.value.content,
        severity: formData.value.severity,
        category: formData.value.category,
        weight: formData.value.weight,
      });
    } else {
      await reviewStandardRuleAdd({
        standardId: standardId.value as any,
        content: formData.value.content,
        severity: formData.value.severity,
        category: formData.value.category,
        weight: formData.value.weight,
      });
    }
    emit('reload');
  },
});
</script>

<template>
  <BasicDrawer>
    <Form layout="vertical">
      <Divider orientation="left" class="section-title-divider">
        <span class="section-title">规则信息</span>
      </Divider>
      <FormItem label="规则内容" required>
        <Input.TextArea
          v-model:value="formData.content"
          placeholder="请输入规则内容"
          :rows="4"
          show-count
          :maxlength="500"
        />
      </FormItem>
      <div class="form-grid">
        <FormItem label="等级" required>
          <Select
            v-model:value="formData.severity"
            placeholder="请选择等级"
            :options="severityOptions"
          />
        </FormItem>
        <FormItem label="分类" required>
          <AutoComplete
            v-model:value="formData.category"
            placeholder="请选择或输入分类"
            :options="categoryOptions"
            :filter-option="(input: string, option: any) => option.value.includes(input)"
          />
        </FormItem>
      </div>

      <Divider orientation="left" class="section-title-divider">
        <span class="section-title">权重配置</span>
      </Divider>
      <FormItem>
        <template #label>
          <span>
            权重
            <Tooltip title="权重决定该规则在审核评分中的占比，0~100，值越高该规则越重要">
              <InfoCircleOutlined style="color: #999; margin-left: 4px;" />
            </Tooltip>
          </span>
        </template>
        <div class="weight-input-row">
          <Slider
            v-model:value="formData.weight"
            :min="0"
            :max="100"
            :step="5"
            class="weight-slider"
          />
          <InputNumber
            v-model:value="formData.weight"
            :min="0"
            :max="100"
            size="small"
            class="weight-number"
          />
        </div>
        <div class="weight-hint">
          <span v-if="formData.weight >= 80" style="color: #cf1322;">高权重 — 不通过将直接标记为严重问题</span>
          <span v-else-if="formData.weight >= 50" style="color: #d46b08;">中权重 — 不通过将标记为一般问题</span>
          <span v-else style="color: #1677ff;">低权重 — 不通过将作为提示建议</span>
        </div>
      </FormItem>

      <template v-if="isEdit && formData.confidence !== undefined">
        <Divider orientation="left" class="section-title-divider">
          <span class="section-title">置信度</span>
        </Divider>
        <FormItem>
          <template #label>
            <span>
              AI置信度
              <Tooltip title="由 AI 审核结果自动计算，反映该规则被正确识别的概率">
                <InfoCircleOutlined style="color: #999; margin-left: 4px;" />
              </Tooltip>
            </span>
          </template>
          <div class="confidence-display">
            <Progress
              :percent="formData.confidence"
              :stroke-color="formData.confidence! >= 90 ? '#52c41a' : formData.confidence! >= 75 ? '#faad14' : '#ff4d4f'"
              :size="[220, 8]"
            />
            <div class="confidence-stats">
              <span>识别命中: <b>{{ formData.hitCount ?? 0 }}</b> 次</span>
              <span>误判: <b>{{ formData.missCount ?? 0 }}</b> 次</span>
            </div>
            <div v-if="formData.confidence! < 75" class="confidence-warn">
              置信度偏低，建议结合知识库增强学习或调整规则描述
            </div>
          </div>
        </FormItem>
      </template>
    </Form>
  </BasicDrawer>
</template>

<style scoped>
.section-title-divider {
  margin: 4px 0 12px;
}

.section-title-divider :deep(.ant-divider-inner-text) {
  padding-left: 0;
}

.section-title-divider::before {
  display: none !important;
}

.section-title {
  padding-left: 8px;
  border-left: 3px solid hsl(var(--primary));
  font-weight: 600;
  font-size: 16px;
  line-height: 1.5;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 24px;
}

.weight-input-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.weight-slider {
  flex: 1;
}

.weight-number {
  width: 72px;
  flex-shrink: 0;
}

.weight-hint {
  font-size: 12px;
  margin-top: 4px;
}

.confidence-display {
  padding: 12px 14px;
  background: #fafafa;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
}

.confidence-stats {
  display: flex;
  gap: 20px;
  margin-top: 8px;
  font-size: 13px;
  color: #666;
}

.confidence-warn {
  margin-top: 8px;
  padding: 6px 10px;
  background: #fff7e6;
  border: 1px solid #ffd591;
  border-radius: 4px;
  font-size: 12px;
  color: #d46b08;
}
</style>
