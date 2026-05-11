<script setup lang="ts">
import { ref, computed } from 'vue';
import { useVbenDrawer } from '@vben/common-ui';
import {
  message, Form, FormItem, Input, Textarea, Select, InputNumber, Alert, Divider, Tag,
} from 'ant-design-vue';
import { reviewPromptAdd, reviewPromptUpdate } from '#/api/review/prompt';

const emit = defineEmits<{ reload: [] }>();

const mode = ref<'add' | 'edit'>('add');
const formData = ref({
  id: undefined as number | string | undefined,
  name: '',
  type: '',
  systemPrompt: '',
  userPrompt: '',
  outputFormat: '',
  modelName: undefined as string | undefined,
  temperature: 0.3,
  status: '0',
  remark: '',
});

const availableVars = [
  { key: '{rules}', desc: '审核规则列表（自动从关联标准中提取）' },
  { key: '{knowledge_context}', desc: 'RAG知识上下文（案例+模式+误判记录）' },
  { key: '{form_data}', desc: '用户提交的表单/业务数据' },
];

function resetForm() {
  formData.value = {
    id: undefined,
    name: '',
    type: '',
    systemPrompt: '',
    userPrompt: '',
    outputFormat: '',
    modelName: undefined,
    temperature: 0.3,
    status: '0',
    remark: '',
  };
}

const [BasicDrawer, drawerApi] = useVbenDrawer({
  title: computed(() => mode.value === 'add' ? '新增提示词模板' : '编辑提示词模板'),
  onOpenChange: (visible) => {
    if (visible) {
      const data = drawerApi.getData<{ mode: 'add' | 'edit'; record?: any }>();
      mode.value = data?.mode || 'add';
      if (data?.mode === 'edit' && data.record) {
        formData.value = {
          id: data.record.id,
          name: data.record.name || '',
          type: data.record.type || '',
          systemPrompt: data.record.systemPrompt || '',
          userPrompt: data.record.userPrompt || '',
          outputFormat: data.record.outputFormat || '',
          modelName: data.record.modelName || undefined,
          temperature: data.record.temperature ?? 0.3,
          status: data.record.status || '0',
          remark: data.record.remark || '',
        };
      } else {
        resetForm();
      }
    }
  },
  onConfirm: async () => {
    if (!formData.value.name) {
      message.warning('请输入模板名称');
      return;
    }
    if (!formData.value.type) {
      message.warning('请输入类型编码（唯一标识）');
      return;
    }
    if (!formData.value.systemPrompt) {
      message.warning('请输入系统提示词');
      return;
    }
    if (!formData.value.userPrompt) {
      message.warning('请输入用户提示词');
      return;
    }

    drawerApi.setState({ confirmLoading: true });
    try {
      if (mode.value === 'edit') {
        await reviewPromptUpdate(formData.value);
        message.success('更新成功');
      } else {
        await reviewPromptAdd(formData.value);
        message.success('创建成功');
      }
      drawerApi.close();
      emit('reload');
    } catch {
      message.error('操作失败，请重试');
    } finally {
      drawerApi.setState({ confirmLoading: false });
    }
  },
});
</script>

<template>
  <BasicDrawer class="w-[860px]">
    <Form layout="vertical">
      <!-- 基本信息 -->
      <Divider orientation="left" class="section-title-divider">
        <span class="section-title">基本信息</span>
      </Divider>
      <div class="form-grid">
        <FormItem label="模板名称" required>
          <Input v-model:value="formData.name" placeholder="如：公司入会资料审核" />
        </FormItem>
        <FormItem label="类型编码（唯一标识）" required>
          <Input
            v-model:value="formData.type"
            placeholder="如：company_info"
            :disabled="mode === 'edit'"
          />
        </FormItem>
        <FormItem label="AI模型">
          <Select
            v-model:value="formData.modelName"
            placeholder="留空则由系统根据附件类型自动选择"
            style="width: 100%;"
            allow-clear
            :options="[
              { label: 'qwen-plus（文本）', value: 'qwen-plus' },
              { label: 'qwen3-vl-plus（图片/视觉）', value: 'qwen3-vl-plus' },
              { label: 'qwen-long（文档）', value: 'qwen-long' },
            ]"
          />
        </FormItem>
        <FormItem label="温度">
          <InputNumber
            v-model:value="formData.temperature"
            :min="0"
            :max="1"
            :step="0.1"
            style="width: 100%;"
          />
        </FormItem>
        <FormItem label="状态">
          <Select
            v-model:value="formData.status"
            style="width: 100%;"
            :options="[
              { label: '启用', value: '0' },
              { label: '停用', value: '1' },
            ]"
          />
        </FormItem>
        <FormItem label="备注">
          <Input v-model:value="formData.remark" placeholder="可选，对模板的补充说明" />
        </FormItem>
      </div>

      <!-- 可用变量说明 -->
      <Divider orientation="left" class="section-title-divider">
        <span class="section-title">可用占位变量</span>
      </Divider>
      <Alert type="info" show-icon style="margin-bottom: 16px;">
        <template #message>
          <div>在提示词中使用以下占位符，系统会在审核时自动替换为实际内容：</div>
        </template>
        <template #description>
          <div class="var-list">
            <div v-for="v in availableVars" :key="v.key" class="var-item">
              <Tag color="blue">{{ v.key }}</Tag>
              <span class="text-gray-600">{{ v.desc }}</span>
            </div>
          </div>
        </template>
      </Alert>

      <!-- 系统提示词 -->
      <Divider orientation="left" class="section-title-divider">
        <span class="section-title">系统提示词</span>
      </Divider>
      <FormItem required>
        <Textarea
          v-model:value="formData.systemPrompt"
          placeholder="定义AI的角色和审核行为，可使用上方占位变量。例如：&#10;你是一个专业的审核员，请根据以下规则审核提交的资料：&#10;{rules}&#10;&#10;参考知识：&#10;{knowledge_context}"
          :rows="10"
          style="font-family: 'SFMono-Regular', Consolas, monospace; font-size: 13px;"
        />
      </FormItem>

      <!-- 用户提示词 -->
      <Divider orientation="left" class="section-title-divider">
        <span class="section-title">用户提示词</span>
      </Divider>
      <FormItem required>
        <Textarea
          v-model:value="formData.userPrompt"
          placeholder="定义每次审核时发送给AI的用户消息。例如：&#10;请审核以下表单数据：&#10;{form_data}"
          :rows="6"
          style="font-family: 'SFMono-Regular', Consolas, monospace; font-size: 13px;"
        />
      </FormItem>

      <!-- 输出格式 -->
      <Divider orientation="left" class="section-title-divider">
        <span class="section-title">输出格式要求（可选）</span>
      </Divider>
      <FormItem>
        <Textarea
          v-model:value="formData.outputFormat"
          placeholder="定义AI返回结果的JSON格式要求（可选，留空使用系统默认格式）"
          :rows="4"
          style="font-family: 'SFMono-Regular', Consolas, monospace; font-size: 13px;"
        />
      </FormItem>
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

.var-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
}

.var-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>

