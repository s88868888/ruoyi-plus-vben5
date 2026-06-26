<script setup lang="ts">
import { computed, ref } from 'vue';
import { useVbenDrawer } from '@vben/common-ui';
import {
  Divider, Form, FormItem, Input, message, Select, Switch, Textarea,
} from 'ant-design-vue';
import { reviewStandardInfo, reviewStandardUpdate } from '#/api/review/standard';
import { reviewPromptList } from '#/api/review/prompt';
import type { ReviewPromptTemplate } from '#/api/review/prompt/model';

const emit = defineEmits<{ reload: [] }>();

const formData = ref({
  id: '' as number | string,
  name: '',
  isSystem: '0',
  promptTemplateId: undefined as number | string | undefined,
  description: '',
  status: '',
});
const promptTemplates = ref<ReviewPromptTemplate[]>([]);
const promptLoading = ref(false);

const roleOptions = computed(() => promptTemplates.value
  .filter((item) => item.status === '0')
  .map((item) => ({
    value: item.id,
    label: `${item.name}（${item.type}）`,
  })));

async function loadRoleOptions() {
  promptLoading.value = true;
  try {
    promptTemplates.value = await reviewPromptList();
  } finally {
    promptLoading.value = false;
  }
}

const [BasicDrawer, drawerApi] = useVbenDrawer({
  title: '编辑审核标准',
  onOpenChange: async (visible) => {
    if (visible) {
      await loadRoleOptions();
      const data = drawerApi.getData<{ id: number | string }>();
      if (data?.id) {
        const info = await reviewStandardInfo(data.id);
        formData.value = {
          id: info.id,
          name: info.name,
          isSystem: info.isSystem || '0',
          promptTemplateId: info.promptTemplateId ?? undefined,
          description: info.description || '',
          status: info.status || '',
        };
      }
    } else {
      promptTemplates.value = [];
    }
  },
  onConfirm: async () => {
    if (!formData.value.name) {
      message.warning('请输入规范名称');
      return;
    }
    if (!formData.value.promptTemplateId) {
      message.warning('请选择角色身份');
      return;
    }
    await reviewStandardUpdate({
      id: formData.value.id,
      name: formData.value.name,
      isSystem: formData.value.isSystem,
      promptTemplateId: formData.value.promptTemplateId,
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
            @change="(val: any) => formData.isSystem = val ? '1' : '0'"
          />
        </FormItem>
        <FormItem label="角色身份" required>
          <Select
            v-model:value="formData.promptTemplateId"
            show-search
            placeholder="请选择角色身份"
            :filter-option="(input: string, option: any) => String(option?.label || '').toLowerCase().includes(input.toLowerCase())"
            :loading="promptLoading"
            :options="roleOptions"
          />
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
