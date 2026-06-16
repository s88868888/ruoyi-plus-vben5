<script setup lang="ts">
import { ref } from 'vue';
import { useVbenDrawer } from '@vben/common-ui';
import {
  message, Select, Input, Form, FormItem, Textarea, Divider,
} from 'ant-design-vue';
import { reviewKnowledgeAdd } from '#/api/review/knowledge';

const emit = defineEmits<{ reload: [] }>();

const formData = ref({
  name: '',
  type: undefined as string | undefined,
  description: '',
});

const typeOptions = [
  { label: '合同类', value: 'contract' },
  { label: '财务类', value: 'finance' },
  { label: '表单类', value: 'form' },
  { label: '标书类', value: 'bid' },
  { label: '综合类', value: 'general' },
];

const [BasicDrawer, drawerApi] = useVbenDrawer({
  title: '新建知识库',
  onOpenChange: (visible) => {
    if (!visible) {
      formData.value = { name: '', type: undefined, description: '' };
    }
  },
  onConfirm: async () => {
    if (!formData.value.name) {
      message.warning('请输入知识库名称');
      return;
    }
    if (!formData.value.type) {
      message.warning('请选择知识库类型');
      return;
    }
    await reviewKnowledgeAdd({
      name: formData.value.name,
      type: formData.value.type,
      description: formData.value.description,
      status: '0',
    });
    drawerApi.close();
    emit('reload');
  },
});
</script>

<template>
  <BasicDrawer class="w-[560px]">
    <Form layout="vertical">
      <Divider orientation="left" class="section-title-divider">
        <span class="section-title">基本信息</span>
      </Divider>
      <div class="form-grid">
        <FormItem label="知识库名称" required>
          <Input v-model:value="formData.name" placeholder="如：政府采购合同案例库" />
        </FormItem>
        <FormItem label="类型" required>
          <Select
            v-model:value="formData.type"
            placeholder="请选择"
            style="width: 100%;"
            :options="typeOptions"
          />
        </FormItem>
        <FormItem label="描述说明" class="col-span-2">
          <Textarea v-model:value="formData.description" placeholder="描述该知识库的用途、数据来源、适用场景等..." :rows="3" />
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
