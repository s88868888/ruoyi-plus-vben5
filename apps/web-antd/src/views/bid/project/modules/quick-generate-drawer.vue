<script setup lang="ts">
import { h, ref } from 'vue';
import { useVbenDrawer } from '@vben/common-ui';
import { message, Modal, Input, Button } from 'ant-design-vue';
import { InboxOutlined } from '@ant-design/icons-vue';
import type { UploadFile } from 'ant-design-vue';
import { Upload } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { quickGenerateFromPdf } from '#/api/bid/project';
import { promptTemplateListByType, promptTemplateAdd } from '#/api/bid/promptTemplate';
import SectionTitle from '#/views/resource/companyInfo/modules/section-title.vue';

const UploadDragger = Upload.Dragger;

type TemplateType = 'bid_analysis' | 'scoring_criteria' | 'match_analysis';

const emit = defineEmits<{
  success: [projectId: number];
}>();

const loading = ref(false);
const fileList = ref<UploadFile[]>([]);
const templateOptions = ref<Array<{ label: string; value: number; promptContent: string }>>([]);
const scoringTemplateOptions = ref<Array<{ label: string; value: number; promptContent: string }>>([]);
const matchAnalysisTemplateOptions = ref<Array<{ label: string; value: number; promptContent: string }>>([]);

const [BasicDrawer, drawerApi] = useVbenDrawer({
  title: '快速生成招标项目',
  width: 800,
  onOpenChange: async (visible) => {
    if (!visible) {
      resetForm();
      return;
    }
    await loadTemplateOptions();
    await step3FormApi.setValues({
      enableAnalysis: false,
      extractScoringCriteria: false,
      analyzeMatchDegree: false,
    });
  },
  onConfirm: async () => {
    await handleSubmit();
  },
});

const [Step3Form, step3FormApi] = useVbenForm({
  commonConfig: {
    componentProps: {
      class: 'w-full',
      allowClear: true,
    },
    labelWidth: 130,
  },
  schema: [
    {
      component: 'Divider',
      fieldName: '_divider_ai',
      label: '',
      hideLabel: true,
      componentProps: { orientation: 'left', class: 'section-title-divider', style: { margin: '4px 0 12px' } },
      renderComponentContent: () => ({
        default: () => h(SectionTitle, { title: 'AI 分析配置' }),
      }),
      formItemClass: 'col-span-2',
    },
    {
      fieldName: 'enableAnalysis',
      component: 'Switch',
      label: '执行 AI 分析总结',
      defaultValue: false,
      formItemClass: 'col-span-2',
      componentProps: {
        class: '',
        checkedChildren: '是',
        unCheckedChildren: '否',
      },
      help: '关闭后将直接保存项目，不执行 AI 分析',
    },
    {
      fieldName: 'templateId',
      component: 'Select',
      label: '提示词模板',
      formItemClass: 'col-span-2',
      suffix: () => h(
        Button,
        { type: 'link', size: 'small', class: 'text-xs', onClick: () => handleSaveAsTemplate('bid_analysis') },
        { default: () => '另存为模板' },
      ),
      componentProps: {
        placeholder: '请选择提示词模板',
        options: templateOptions,
        class: '!w-[260px]',
        onChange: (value: number) => {
          const template = templateOptions.value.find(t => t.value === value);
          if (template) {
            step3FormApi.setFieldValue('aiPrompt', template.promptContent);
          }
        },
      },
      help: '选择模板后会自动填充提示词内容',
      dependencies: {
        triggerFields: ['enableAnalysis'],
        if(values) {
          return values.enableAnalysis;
        },
      },
    },
    {
      fieldName: 'aiPrompt',
      component: 'Textarea',
      label: 'AI 分析提示词',
      formItemClass: 'col-span-2',
      componentProps: {
        rows: 10,
        placeholder: '请输入自定义的 AI 分析提示词，留空则使用默认提示词。\n\n默认提示词会分析：\n1. 项目概况总结\n2. 项目规模和预算评估\n3. 技术要求分析\n4. 竞争态势预判\n5. 投标建议和注意事项\n6. 风险点提示',
      },
      help: '不填写则使用系统默认的分析提示词',
      dependencies: {
        triggerFields: ['enableAnalysis'],
        if(values) {
          return values.enableAnalysis;
        },
      },
    },
    {
      component: 'Divider',
      fieldName: '_divider_scoring',
      label: '',
      hideLabel: true,
      componentProps: { orientation: 'left', class: 'section-title-divider', style: { margin: '4px 0 12px' } },
      renderComponentContent: () => ({
        default: () => h(SectionTitle, { title: '评分标准提取' }),
      }),
      formItemClass: 'col-span-2',
    },
    {
      fieldName: 'extractScoringCriteria',
      component: 'Switch',
      label: '自动提取评分标准',
      defaultValue: false,
      formItemClass: 'col-span-2',
      componentProps: {
        class: '',
        checkedChildren: '是',
        unCheckedChildren: '否',
      },
      help: '启用后将使用 AI 从招标文档中自动提取评分标准',
    },
    {
      fieldName: 'scoringTemplateId',
      component: 'Select',
      label: '提示词模板',
      formItemClass: 'col-span-2',
      suffix: () => h(
        Button,
        { type: 'link', size: 'small', class: 'text-xs', onClick: () => handleSaveAsTemplate('scoring_criteria') },
        { default: () => '另存为模板' },
      ),
      componentProps: {
        placeholder: '请选择评分标准提示词模板',
        options: scoringTemplateOptions,
        class: '!w-[260px]',
        onChange: (value: number) => {
          const template = scoringTemplateOptions.value.find(t => t.value === value);
          if (template) {
            step3FormApi.setFieldValue('scoringPrompt', template.promptContent);
          }
        },
      },
      help: '选择模板后会自动填充提示词内容',
      dependencies: {
        triggerFields: ['extractScoringCriteria'],
        if(values) {
          return values.extractScoringCriteria;
        },
      },
    },
    {
      fieldName: 'scoringPrompt',
      component: 'Textarea',
      label: '评分标准提示词',
      formItemClass: 'col-span-2',
      componentProps: {
        rows: 6,
        placeholder: '请输入自定义的评分标准提取提示词，留空则使用默认提示词。',
      },
      help: '不填写则使用系统默认的评分标准提取提示词',
      dependencies: {
        triggerFields: ['extractScoringCriteria'],
        if(values) {
          return values.extractScoringCriteria;
        },
      },
    },
    {
      component: 'Divider',
      fieldName: '_divider_match',
      label: '',
      hideLabel: true,
      componentProps: { orientation: 'left', class: 'section-title-divider', style: { margin: '4px 0 12px' } },
      renderComponentContent: () => ({
        default: () => h(SectionTitle, { title: '契合度分析' }),
      }),
      formItemClass: 'col-span-2',
    },
    {
      fieldName: 'analyzeMatchDegree',
      component: 'Switch',
      label: '执行契合度分析',
      defaultValue: false,
      formItemClass: 'col-span-2',
      componentProps: {
        class: '',
        checkedChildren: '是',
        unCheckedChildren: '否',
      },
      help: '启用后将使用 AI 分析项目契合度并更新分数',
    },
    {
      fieldName: 'matchAnalysisTemplateId',
      component: 'Select',
      label: '提示词模板',
      formItemClass: 'col-span-2',
      suffix: () => h(
        Button,
        { type: 'link', size: 'small', class: 'text-xs', onClick: () => handleSaveAsTemplate('match_analysis') },
        { default: () => '另存为模板' },
      ),
      componentProps: {
        placeholder: '请选择契合度分析提示词模板',
        options: matchAnalysisTemplateOptions,
        class: '!w-[260px]',
        onChange: (value: number) => {
          const template = matchAnalysisTemplateOptions.value.find(t => t.value === value);
          if (template) {
            step3FormApi.setFieldValue('matchAnalysisPrompt', template.promptContent);
          }
        },
      },
      help: '选择模板后会自动填充提示词内容',
      dependencies: {
        triggerFields: ['analyzeMatchDegree'],
        if(values) {
          return values.analyzeMatchDegree;
        },
      },
    },
    {
      fieldName: 'matchAnalysisPrompt',
      component: 'Textarea',
      label: '契合度分析提示词',
      formItemClass: 'col-span-2',
      componentProps: {
        rows: 6,
        placeholder: '请输入自定义的契合度分析提示词，留空则使用默认提示词。',
      },
      help: '不填写则使用系统默认的契合度分析提示词',
      dependencies: {
        triggerFields: ['analyzeMatchDegree'],
        if(values) {
          return values.analyzeMatchDegree;
        },
      },
    },
  ],
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1',
});

function resetForm() {
  fileList.value = [];
  templateOptions.value = [];
  scoringTemplateOptions.value = [];
  matchAnalysisTemplateOptions.value = [];
  step3FormApi.resetForm();
}

async function loadTemplateOptions() {
  try {
    const [templates, scoringTemplates, matchAnalysisTemplates] = await Promise.all([
      promptTemplateListByType('bid_analysis'),
      promptTemplateListByType('scoring_criteria'),
      promptTemplateListByType('match_analysis'),
    ]);
    templateOptions.value = templates.map(t => ({
      label: `${t.templateName}`,
      value: t.id!,
      promptContent: t.promptContent || '',
    }));
    scoringTemplateOptions.value = scoringTemplates.map(t => ({
      label: `${t.templateName}`,
      value: t.id!,
      promptContent: t.promptContent || '',
    }));
    matchAnalysisTemplateOptions.value = matchAnalysisTemplates.map(t => ({
      label: `${t.templateName}`,
      value: t.id!,
      promptContent: t.promptContent || '',
    }));
  } catch (error) {
    console.error('加载模板列表失败:', error);
    message.warning('加载提示词模板失败，可直接填写自定义提示词');
  }
}

async function handleSaveAsTemplate(templateType: TemplateType) {
  const promptFieldMap = {
    bid_analysis: 'aiPrompt',
    scoring_criteria: 'scoringPrompt',
    match_analysis: 'matchAnalysisPrompt',
  };
  const promptField = promptFieldMap[templateType];
  const values = await step3FormApi.getValues();
  const promptContent = values[promptField];

  if (!promptContent || promptContent.trim() === '') {
    message.warning('提示词内容不能为空');
    return;
  }

  const inputId = `templateNameInput-${templateType}`;
  Modal.confirm({
    title: '另存为模板',
    content: h('div', [
      h('div', { class: 'mb-2' }, '请输入模板名称：'),
      h(Input, {
        id: inputId,
        placeholder: '请输入模板名称',
        maxlength: 50,
      }),
    ]),
    okText: '保存',
    cancelText: '取消',
    onOk: async () => {
      const input = document.getElementById(inputId) as HTMLInputElement;
      const templateName = input?.value?.trim();

      if (!templateName) {
        message.warning('模板名称不能为空');
        return Promise.reject();
      }

      try {
        await promptTemplateAdd({
          templateName,
          templateType,
          promptContent,
          isSystem: '0',
          status: '0',
          sortOrder: 0,
        });
        await loadTemplateOptions();
        message.success('模板保存成功');
      } catch (error) {
        message.error('模板保存失败');
        return Promise.reject();
      }
    },
  });
}

function beforeUpload(file: File) {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!isPdf) {
    message.error('只能上传 PDF 文件');
    return false;
  }
  const isLt50M = file.size / 1024 / 1024 < 50;
  if (!isLt50M) {
    message.error('文件大小不能超过 50MB');
    return false;
  }
  fileList.value = [];
  return false;
}

async function handleSubmit() {
  if (fileList.value.length === 0 || !fileList.value[0]?.originFileObj) {
    message.warning('请先上传招标文件');
    return;
  }

  const file = fileList.value[0].originFileObj;
  if (!file) {
    message.warning('文件无效');
    return;
  }

  loading.value = true;
  try {
    const values = await step3FormApi.getValues();
    const projectId = await quickGenerateFromPdf(
      {
        enableAiAnalysis: !!values.enableAnalysis,
        enableExtractScoringCriteria: !!values.extractScoringCriteria,
        analyzeMatchDegree: !!values.analyzeMatchDegree,
        aiPrompt: values.aiPrompt || undefined,
        scoringPrompt: values.scoringPrompt || undefined,
        matchAnalysisPrompt: values.matchAnalysisPrompt || undefined,
      },
      file,
    );

    message.success('招标项目创建成功');
    drawerApi.close();
    emit('success', projectId);
  } catch (error) {
    console.error('创建失败:', error);
    message.error('创建失败，请重试');
  } finally {
    loading.value = false;
  }
}

function open() {
  drawerApi.open();
}

defineExpose({
  BasicDrawer,
  open,
});
</script>

<template>
  <BasicDrawer class="w-[800px]" :loading="loading">
    <div class="quick-generate-form">
      <div class="upload-section">
        <p class="section-title">上传招标文件 (PDF)</p>
        <UploadDragger
          v-model:file-list="fileList"
          :before-upload="beforeUpload"
          :max-count="1"
          accept=".pdf"
        >
          <p class="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p class="ant-upload-text">点击或拖拽招标文件到此处上传</p>
          <p class="ant-upload-hint">支持 PDF 格式，文件大小不超过 50MB</p>
        </UploadDragger>
      </div>

      <Step3Form />
    </div>
  </BasicDrawer>
</template>

<style scoped>
.quick-generate-form {
  padding: 0 10px;
}

.section-title {
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.85);
}

.upload-section {
  margin-bottom: 24px;
}

:deep(.section-title-divider.ant-divider-horizontal.ant-divider-with-text)::before,
:deep(.section-title-divider.ant-divider-horizontal.ant-divider-with-text)::after {
  display: none;
}

:deep(.section-title-divider .ant-divider-inner-text) {
  padding-left: 0;
}

:deep(.ant-upload-drag) {
  padding: 20px;
}
</style>
