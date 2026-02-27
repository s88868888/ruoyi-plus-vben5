<script setup lang="ts">
import { ref, computed } from 'vue';
import { useVbenDrawer } from '@vben/common-ui';
import { message } from 'ant-design-vue';

import { createSubmissionFromProject } from '#/api/bid/submission';
import { useEditPageStyle } from '#/preferences/useEditPageStyle';

const emit = defineEmits<{
  reload: [];
  success: [id: number];
}>();

const { formContainerStyle, drawerWidthStyle } = useEditPageStyle();

const projectId = ref<number>();
const projectName = ref<string>();

const [BasicDrawer, drawerApi] = useVbenDrawer({
  title: computed(() => `转为投标项目 - ${projectName.value}`),
  onOpenChange: async (visible) => {
    if (!visible) {
      return;
    }

    const data = drawerApi.getData<{ id: number; projectName: string }>();
    if (data) {
      projectId.value = data.id;
      projectName.value = data.projectName;
    }
  },
  onConfirm: async () => {
    await handleSubmit();
  },
});

// 提交
async function handleSubmit() {
  if (!projectId.value) {
    message.error('项目ID不存在');
    return;
  }

  try {
    drawerApi.lock(true);

    const submissionId = await createSubmissionFromProject({
      bidProjectId: projectId.value,
      selectedCompanies: [],
      generationConfig: [],
    });

    message.success('创建投标项目成功，请在投标项目中补充公司和标书配置');
    emit('success', submissionId as number);
    emit('reload');
    drawerApi.close();
  } catch (error) {
    console.error('创建投标项目失败:', error);
    message.error('创建投标项目失败');
  } finally {
    drawerApi.lock(false);
  }
}
</script>

<template>
  <BasicDrawer class="w-[600px]" :style="drawerWidthStyle">
    <div :style="formContainerStyle">
      <div class="text-center py-8">
        <p class="text-lg mb-4">确认将招标项目转为投标项目？</p>
        <p class="text-gray-500 text-sm">转换后可在投标项目中补充公司和标书配置信息</p>
      </div>
    </div>
  </BasicDrawer>
</template>
