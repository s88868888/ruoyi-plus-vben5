<script setup lang="ts">
import { ref, computed } from 'vue';
import { useVbenDrawer } from '@vben/common-ui';
import {
  message, Steps, Upload, Switch, Input, Form, FormItem, Alert, Tag, Card, Textarea, Button, Divider,
} from 'ant-design-vue';
import { InboxOutlined, DownloadOutlined } from '@ant-design/icons-vue';
import { reviewStandardAdd } from '#/api/review/standard';

const emit = defineEmits<{ reload: [] }>();

const currentStep = ref(0);
const fileList = ref<any[]>([]);
const formData = ref({
  name: '',
  isSystem: '0' as string,
  description: '',
});

const parsedRules = ref<any[]>([]);

const severityMap: Record<string, { label: string; color: string }> = {
  must: { label: '必须', color: 'red' },
  should: { label: '应当', color: 'orange' },
  suggest: { label: '建议', color: 'blue' },
};

function handleDownloadTemplate() {
  message.success('模板下载中...');
}

const [BasicDrawer, drawerApi] = useVbenDrawer({
  title: computed(() => {
    const stepNames = ['填写信息并上传规范', 'AI解析确认'];
    return `新增审核标准 - ${stepNames[currentStep.value]}`;
  }),
  onOpenChange: (visible) => {
    if (!visible) {
      currentStep.value = 0;
      fileList.value = [];
      formData.value = { name: '', isSystem: '0', description: '' };
      parsedRules.value = [];
    }
  },
  onConfirm: async () => {
    if (currentStep.value === 0) {
      if (!formData.value.name) {
        message.warning('请输入规范名称');
        return;
      }
      // 先创建标准（文件解析功能后续接入AI）
      currentStep.value = 1;
      return;
    }
    await reviewStandardAdd({
      name: formData.value.name,
      isSystem: formData.value.isSystem,
      description: formData.value.description,
      version: 'v1.0',
      status: '0',
    });
    drawerApi.close();
    emit('reload');
  },
  confirmText: computed(() => {
    if (currentStep.value === 0) return '下一步';
    return '确认创建';
  }),
  cancelText: computed(() => currentStep.value === 0 ? '取消' : '上一步'),
  onCancel: () => {
    if (currentStep.value > 0) {
      currentStep.value--;
      return false;
    }
    return true;
  },
});
</script>

<template>
  <BasicDrawer class="w-[860px]">
    <Steps :current="currentStep" size="small" style="margin-bottom: 24px;">
      <Steps.Step title="填写信息并上传规范" />
      <Steps.Step title="AI解析确认" />
    </Steps>

    <!-- Step 1: 基本信息 + 上传规范文件 -->
    <div v-show="currentStep === 0">
      <Form layout="vertical">
        <!-- 基本信息分区 -->
        <Divider orientation="left" class="section-title-divider">
          <span class="section-title">基本信息</span>
        </Divider>
        <div class="form-grid">
          <FormItem label="规范名称" required>
            <Input v-model:value="formData.name" placeholder="如：政府采购合同审核标准" />
          </FormItem>
          <FormItem label="是否通用">
            <Switch
              :checked="formData.isSystem === '1'"
              checked-children="是"
              un-checked-children="否"
              @change="(val: boolean) => formData.isSystem = val ? '1' : '0'"
            />
          </FormItem>
          <FormItem label="补充说明（可选）" class="col-span-2">
            <Textarea v-model:value="formData.description" placeholder="对规范的额外说明，如适用范围、特殊注意事项等..." :rows="3" />
          </FormItem>
        </div>

        <!-- 上传规范分区 -->
        <Divider orientation="left" class="section-title-divider">
          <span class="section-title">上传规范文件</span>
        </Divider>
        <div class="form-grid">
          <FormItem required class="col-span-2" style="margin-bottom: 0;">
            <Upload.Dragger
              v-model:file-list="fileList"
              :multiple="false"
              :before-upload="() => false"
            >
              <p class="ant-upload-drag-icon"><InboxOutlined /></p>
              <p class="ant-upload-text">点击或拖拽规范文件到此区域</p>
              <p class="ant-upload-hint">支持 Word、PDF、TXT 格式</p>
            </Upload.Dragger>
            <div style="margin-top: 8px;">
              <Button type="link" size="small" style="padding: 0;" @click="handleDownloadTemplate">
                <DownloadOutlined /> 下载模板
              </Button>
            </div>
            <Alert
              message="上传后 AI 将自动提取审核要点并生成结构化规则"
              type="info"
              show-icon
              style="margin-top: 12px;"
            />
          </FormItem>
        </div>
      </Form>
    </div>

    <!-- Step 2: AI解析确认 -->
    <div v-show="currentStep === 1">
      <Alert
        message="以下规则由AI自动提取，请确认或调整后发布"
        type="success"
        show-icon
        style="margin-bottom: 16px;"
      />
      <div style="margin-bottom: 12px; display: flex; gap: 8px;">
        <Tag color="red">必须 {{ parsedRules.filter(r => r.severity === 'must').length }}</Tag>
        <Tag color="orange">应当 {{ parsedRules.filter(r => r.severity === 'should').length }}</Tag>
        <Tag color="blue">建议 {{ parsedRules.filter(r => r.severity === 'suggest').length }}</Tag>
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <Card v-for="(rule, index) in parsedRules" :key="rule.id" size="small" :body-style="{ padding: '12px 16px' }">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="width: 24px; height: 24px; border-radius: 50%; background: #1890ff; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0;">
              {{ index + 1 }}
            </span>
            <span style="flex: 1; font-size: 13px;">{{ rule.content }}</span>
            <Tag :color="severityMap[rule.severity]?.color" style="flex-shrink: 0;">
              {{ severityMap[rule.severity]?.label }}
            </Tag>
          </div>
        </Card>
      </div>
    </div>
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

.col-span-2 {
  grid-column: span 2;
}
</style>
