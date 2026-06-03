<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useVbenDrawer } from '@vben/common-ui';
import {
  message, Switch, Input, Form, FormItem, Textarea, Divider, Alert,
} from 'ant-design-vue';
import { reviewStandardAdd } from '#/api/review/standard';

const emit = defineEmits<{ reload: [] }>();

const router = useRouter();

const defaultForm = () => ({
  name: '',
  isSystem: '0',
  version: 'v1.0',
  description: '',
});

const formData = ref(defaultForm());

const [BasicDrawer, drawerApi] = useVbenDrawer({
  title: '手动新增审核标准',
  onOpenChange: (visible) => {
    if (!visible) formData.value = defaultForm();
  },
  onConfirm: async () => {
    if (!formData.value.name.trim()) {
      message.warning('请输入规范名称');
      return;
    }
    const createdId = await reviewStandardAdd({
      name: formData.value.name,
      type: '1',
      isSystem: formData.value.isSystem,
      version: formData.value.version || 'v1.0',
      description: formData.value.description,
      status: '0',
    } as any);
    drawerApi.close();
    emit('reload');
    if (createdId) {
      message.success('创建成功，请继续添加审核规则');
      router.push(`/review/standard/detail?id=${createdId}`);
    }
  },
  confirmText: '创建并添加规则',
});
</script>

<template>
  <BasicDrawer class="w-[600px]">
    <Form layout="vertical">
      <Alert
        class="mb-4"
        type="info"
        show-icon
        message="手动创建空白审核标准"
        description="先填写规范基本信息，创建后将进入详情页，您可以手动逐条添加审核规则，或再使用导入 / 智能解析补充规则。"
      />
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
            @change="(val: boolean) => (formData.isSystem = val ? '1' : '0')"
          />
        </FormItem>
        <FormItem label="版本号">
          <Input v-model:value="formData.version" placeholder="如：v1.0" />
        </FormItem>
        <FormItem label="补充说明（可选）" class="col-span-2">
          <Textarea
            v-model:value="formData.description"
            placeholder="适用范围、特殊注意事项等..."
            :rows="3"
          />
        </FormItem>
      </div>
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

.col-span-2 {
  grid-column: span 2;
}
</style>
