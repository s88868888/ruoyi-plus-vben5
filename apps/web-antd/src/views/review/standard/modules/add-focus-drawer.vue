<script setup lang="ts">
import { ref, computed } from 'vue';
import { useVbenDrawer } from '@vben/common-ui';
import { Form, FormItem, Input, Switch, message } from 'ant-design-vue';
import { reviewStandardFocusAdd, reviewStandardFocusUpdate } from '#/api/review/standard';

const emit = defineEmits<{ reload: [] }>();

const isEdit = ref(false);
const focusId = ref<number | string | undefined>(undefined);
const standardId = ref<number | string | undefined>(undefined);

const formData = ref({
  keyword: '',
  enabled: true,
});

const [BasicDrawer, drawerApi] = useVbenDrawer({
  title: computed(() => (isEdit.value ? '编辑关注要点' : '添加关注要点')),
  onOpenChange: (visible) => {
    if (visible) {
      const data = drawerApi.getData() as any;
      standardId.value = data?.standardId;
      if (data && data.id) {
        isEdit.value = true;
        focusId.value = data.id;
        formData.value = {
          keyword: data.keyword ?? '',
          enabled: data.status !== '1',
        };
      }
    } else {
      isEdit.value = false;
      focusId.value = undefined;
      formData.value = { keyword: '', enabled: true };
    }
  },
  onConfirm: async () => {
    if (!formData.value.keyword.trim()) {
      message.warning('请输入关注要点');
      return;
    }
    const status = formData.value.enabled ? '0' : '1';
    if (isEdit.value) {
      await reviewStandardFocusUpdate({
        id: focusId.value as any,
        standardId: standardId.value as any,
        keyword: formData.value.keyword.trim(),
        status,
      });
    } else {
      await reviewStandardFocusAdd({
        standardId: standardId.value as any,
        keyword: formData.value.keyword.trim(),
        status,
      });
    }
    emit('reload');
    drawerApi.close();
  },
});
</script>

<template>
  <BasicDrawer>
    <Form layout="vertical">
      <FormItem label="关注要点" required>
        <Input.TextArea
          v-model:value="formData.keyword"
          placeholder="输入一个关注要点，AI 审核时会在文档中定位对应原文。例如：项目总投资额 / 拆迁补偿标准 / 签约截止日期"
          :rows="3"
          :maxlength="500"
          show-count
        />
        <div class="focus-hint">每条关注项对应一个要点；多个要点请分别添加</div>
      </FormItem>
      <FormItem label="启用">
        <Switch v-model:checked="formData.enabled" checked-children="启用" un-checked-children="停用" />
      </FormItem>
    </Form>
  </BasicDrawer>
</template>

<style scoped>
.focus-hint {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}
</style>
