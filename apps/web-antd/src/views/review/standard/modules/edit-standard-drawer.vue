<script setup lang="ts">
import { ref } from 'vue';
import { useVbenDrawer } from '@vben/common-ui';
import {
  message, Select, Switch, Input, Form, FormItem, Textarea, Divider,
} from 'ant-design-vue';
import { reviewStandardInfo, reviewStandardUpdate } from '#/api/review/standard';

const emit = defineEmits<{ reload: [] }>();

const formData = ref({
  id: '' as number | string,
  name: '',
  isSystem: '0',
  version: '',
  description: '',
  status: '',
});

const [BasicDrawer, drawerApi] = useVbenDrawer({
  title: '编辑审核标准',
  onOpenChange: async (visible) => {
    if (visible) {
      const data = drawerApi.getData<{ id: number | string }>();
      if (data?.id) {
        const info = await reviewStandardInfo(data.id);
        formData.value = {
          id: info.id,
          name: info.name,
          isSystem: info.isSystem || '0',
          version: info.version || '',
          description: info.description || '',
          status: info.status || '',
        };
      }
    }
  },
  onConfirm: async () => {
    if (!formData.value.name) {
      message.warning('请输入规范名称');
      return;
    }
    await reviewStandardUpdate({
      id: formData.value.id,
      name: formData.value.name,
      isSystem: formData.value.isSystem,
      version: formData.value.version,
      description: formData.value.description,
      status: formData.value.status,
    });
    drawerApi.close();
    emit('reload');
  },
});
</script>

<template>
  <BasicDrawer class="w-[600px]">
    <Form layout="vertical">
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
        <FormItem label="版本号">
          <Input v-model:value="formData.version" placeholder="如：v1.0" />
        </FormItem>
        <FormItem label="状态">
          <Select
            v-model:value="formData.status"
            placeholder="请选择"
            style="width: 100%;"
            :options="[
              { label: '启用中', value: '0' },
              { label: '已废止', value: '1' },
            ]"
          />
        </FormItem>
        <FormItem label="补充说明" class="col-span-2">
          <Textarea v-model:value="formData.description" placeholder="对规范的额外说明，如适用范围、特殊注意事项等..." :rows="3" />
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
