<script setup lang="ts">
import type { CompanyListVo } from '#/api/resource/companyInfo';

import { ref, computed, h } from 'vue';
import { useVbenDrawer } from '@vben/common-ui';
import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { companyList } from '#/api/resource/companyInfo';
import { createSubmissionFromProject } from '#/api/bid/submission';
import SectionTitle from '#/views/resource/companyInfo/modules/section-title.vue';
import { useEditPageStyle } from '#/preferences/useEditPageStyle';

interface GenerationConfig {
  companyId: number;
  companyName: string;
  commercial: number;
  technical: number;
  complete: number;
}

const emit = defineEmits<{
  reload: [];
  success: [id: number];
}>();

const { formContainerStyle, drawerWidthStyle } = useEditPageStyle();

const projectId = ref<number>();
const projectName = ref<string>();
const selectedCompanies = ref<number[]>([]);
const generationConfigs = ref<GenerationConfig[]>([]);
const companyOptions = ref<Array<{ label: string; value: number }>>([]);
const remark = ref<string>();

// 加载公司列表
async function loadCompanies() {
  try {
    const res = await companyList({ pageNum: 1, pageSize: 100 });
    companyOptions.value = (res.rows || []).map((item: CompanyListVo) => ({
      label: item.deptName || `公司-${item.deptId}`,
      value: item.deptId!,
    }));
  } catch (error) {
    console.error('加载公司列表失败:', error);
  }
}

const [BasicDrawer, drawerApi] = useVbenDrawer({
  title: computed(() => `转为投标项目 - ${projectName.value}`),
  onOpenChange: async (visible) => {
    if (!visible) {
      await formApi.resetForm();
      selectedCompanies.value = [];
      generationConfigs.value = [];
      remark.value = '';
      return;
    }

    // 加载公司列表
    await loadCompanies();

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

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: {
      class: 'w-full',
      allowClear: true,
    },
    labelWidth: 120,
  },
  schema: [
    {
      component: 'Divider',
      fieldName: '_divider_company',
      label: '',
      hideLabel: true,
      componentProps: {
        orientation: 'left',
        class: 'section-title-divider',
        style: { margin: '4px 0 12px' },
      },
      renderComponentContent: () => ({
        default: () => h(SectionTitle, { title: '选择投标公司' }),
      }),
      formItemClass: 'col-span-1',
    },
    {
      fieldName: 'selectedCompanies',
      component: 'Select',
      label: '投标公司',
      rules: 'required',
      formItemClass: 'col-span-1',
      componentProps: {
        mode: 'multiple',
        placeholder: '请选择投标公司',
        options: companyOptions,
        maxTagCount: 2,
        onChange: (values: number[]) => {
          selectedCompanies.value = values;
          // 根据选择的公司生成配置项
          generationConfigs.value = values.map((companyId) => {
            const existing = generationConfigs.value.find((c) => c.companyId === companyId);
            const company = companyOptions.value.find((c) => c.value === companyId);
            return existing || {
              companyId,
              companyName: company?.label || `公司-${companyId}`,
              commercial: 1,
              technical: 1,
              complete: 0,
            };
          });
        },
      },
    },
  ],
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1',
});

// 生成配置表格的列
const configColumns = [
  {
    title: '公司名称',
    dataIndex: 'companyName',
    key: 'companyName',
    width: 150,
  },
  {
    title: '商务标数量',
    dataIndex: 'commercial',
    key: 'commercial',
    width: 120,
  },
  {
    title: '技术标数量',
    dataIndex: 'technical',
    key: 'technical',
    width: 120,
  },
  {
    title: '整本标书数量',
    dataIndex: 'complete',
    key: 'complete',
    width: 120,
  },
];

// 更新配置
function updateConfig(companyId: number, field: keyof GenerationConfig, value: number) {
  const config = generationConfigs.value.find((c) => c.companyId === companyId);
  if (config) {
    (config as any)[field] = value;
  }
}

// 提交
async function handleSubmit() {
  if (!projectId.value) {
    message.error('项目ID不存在');
    return;
  }

  if (selectedCompanies.value.length === 0) {
    message.error('请选择至少一个投标公司');
    return;
  }

  // 校验配置
  for (const config of generationConfigs.value) {
    if ((config.commercial || 0) + (config.technical || 0) + (config.complete || 0) === 0) {
      message.error(`请为公司【${config.companyName}】配置至少一个文档类型`);
      return;
    }
  }

  try {
    drawerApi.lock(true);

    const submissionId = await createSubmissionFromProject({
      bidProjectId: projectId.value,
      selectedCompanies: selectedCompanies.value,
      generationConfig: generationConfigs.value,
      remark: remark.value,
    });

    message.success('创建投标项目成功');
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
  <BasicDrawer class="w-[800px]" :style="drawerWidthStyle">
    <div :style="formContainerStyle">
      <Form />

      <!-- 生成配置表格 -->
      <div v-if="selectedCompanies.length > 0" class="mt-6">
        <div class="section-title-divider-standalone">
          <SectionTitle title="生成方案配置" />
        </div>
        <div class="text-sm text-gray-500 mb-4">
          请为每个公司配置生成的文档类型数量
        </div>
        <a-table
          :columns="configColumns"
          :data-source="generationConfigs"
          :pagination="false"
          size="small"
          bordered
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'commercial'">
              <a-input-number
                :value="record.commercial"
                :min="0"
                :max="10"
                size="small"
                style="width: 80px"
                @change="(value: number | null) => updateConfig(record.companyId, 'commercial', value || 0)"
              />
            </template>
            <template v-if="column.key === 'technical'">
              <a-input-number
                :value="record.technical"
                :min="0"
                :max="10"
                size="small"
                style="width: 80px"
                @change="(value: number | null) => updateConfig(record.companyId, 'technical', value || 0)"
              />
            </template>
            <template v-if="column.key === 'complete'">
              <a-input-number
                :value="record.complete"
                :min="0"
                :max="10"
                size="small"
                style="width: 80px"
                @change="(value: number | null) => updateConfig(record.companyId, 'complete', value || 0)"
              />
            </template>
          </template>
        </a-table>
      </div>

      <!-- 备注 -->
      <div class="mt-6">
        <a-textarea
          v-model:value="remark"
          placeholder="请输入备注（选填）"
          :rows="3"
        />
      </div>
    </div>
  </BasicDrawer>
</template>

<style scoped>
:deep(.section-title-divider.ant-divider-horizontal.ant-divider-with-text)::before,
:deep(.section-title-divider.ant-divider-horizontal.ant-divider-with-text)::after {
  display: none;
}

:deep(.section-title-divider .ant-divider-inner-text) {
  padding-left: 0;
}

.section-title-divider-standalone {
  margin: 4px 0 12px;
}
</style>
