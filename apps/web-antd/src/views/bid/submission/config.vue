<script setup lang="ts">
import type { BizDocumentConfigBo } from '#/api/bid/documentConfig';

import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { Button, Card, Divider, Empty, InputNumber, message, Modal, Select, Space, Table, Tag } from 'ant-design-vue';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons-vue';

import { batchSaveConfigs, getDocumentConfigList } from '#/api/bid/documentConfig';
import { submissionInfo } from '#/api/bid/submission';

const route = useRoute();
const router = useRouter();

const submissionId = computed(() => Number(route.params.id));
const projectName = ref('');
const loading = ref(false);
const saving = ref(false);

// 配置列表
const configList = ref<BizDocumentConfigBo[]>([]);

// 公司列表（从投标项目中获取）
const companyOptions = ref<Array<{ id: number; name: string }>>([]);

// 文档类型选项
const documentTypeOptions = [
  { label: '商务标', value: 'commercial' },
  { label: '技术标', value: 'technical' },
  { label: '整本标书', value: 'complete' },
];

// 表格列配置
const columns = [
  {
    title: '序号',
    width: 60,
    customRender: ({ index }: any) => index + 1,
  },
  {
    title: '公司名称',
    dataIndex: 'companyName',
    width: 200,
  },
  {
    title: '文档类型',
    dataIndex: 'documentType',
    width: 120,
    customRender: ({ text }: any) => {
      const typeMap: Record<string, string> = {
        commercial: '商务标',
        technical: '技术标',
        complete: '整本标书',
      };
      return typeMap[text] || text;
    },
  },
  {
    title: '同类型序号',
    dataIndex: 'documentNo',
    width: 120,
  },
  {
    title: '备注',
    dataIndex: 'remark',
    width: 200,
  },
  {
    title: '操作',
    key: 'action',
    width: 80,
    fixed: 'right',
  },
];

// 加载数据
async function loadData() {
  loading.value = true;
  try {
    // 获取投标项目信息
    const submissionData = await submissionInfo(submissionId.value);
    projectName.value = submissionData.projectName || '';

    // 解析关联公司
    if (submissionData.selectedCompanies) {
      try {
        const companies = JSON.parse(submissionData.selectedCompanies);
        companyOptions.value = companies.map((item: any) => ({
          id: item.id || item.companyId,
          name: item.name || item.companyName,
        }));
      } catch (e) {
        console.error('解析公司列表失败', e);
      }
    }

    // 获取配置列表
    const configs = await getDocumentConfigList(submissionId.value);
    configList.value = configs.map((item) => ({
      id: item.id,
      bidSubmissionId: item.bidSubmissionId,
      companyId: item.companyId!,
      companyName: item.companyName!,
      documentType: item.documentType!,
      documentNo: item.documentNo!,
      remark: item.remark,
    }));
  } catch (error) {
    console.error('加载数据失败', error);
    message.error('加载数据失败');
  } finally {
    loading.value = false;
  }
}

// 添加配置行
function handleAdd() {
  if (companyOptions.value.length === 0) {
    message.warning('该投标项目没有关联公司');
    return;
  }

  configList.value.push({
    companyId: companyOptions.value[0].id,
    companyName: companyOptions.value[0].name,
    documentType: 'commercial',
    documentNo: 1,
  });
}

// 删除配置行
function handleDelete(index: number) {
  configList.value.splice(index, 1);
}

// 公司变更
function handleCompanyChange(index: number, companyId: number) {
  const company = companyOptions.value.find((c) => c.id === companyId);
  if (company) {
    configList.value[index].companyName = company.name;
  }
}

// 保存配置
async function handleSave() {
  if (configList.value.length === 0) {
    message.warning('请至少添加一个配置');
    return;
  }

  // 校验数据
  for (let i = 0; i < configList.value.length; i++) {
    const config = configList.value[i];
    if (!config.companyId || !config.documentType || !config.documentNo) {
      message.error(`第 ${i + 1} 行数据不完整`);
      return;
    }
  }

  saving.value = true;
  try {
    await batchSaveConfigs(submissionId.value, configList.value);
    message.success('保存成功');
    await loadData();
  } catch (error) {
    console.error('保存失败', error);
    message.error('保存失败');
  } finally {
    saving.value = false;
  }
}

// 开始生成
function handleStartGenerate() {
  if (configList.value.length === 0) {
    message.warning('请先配置文档');
    return;
  }

  Modal.confirm({
    title: '确认开始生成',
    content: `确定要开始生成"${projectName.value}"的标书吗？`,
    async onOk() {
      // 先保存配置
      await handleSave();
      // 跳转到生成页面
      router.push(`/bid/submission/generate/${submissionId.value}`);
    },
  });
}

// 返回列表
function handleBack() {
  router.push('/bid/submission');
}

onMounted(() => {
  loadData();
});
</script>

<template>
  <Page :auto-content-height="true">
    <div class="flex h-full flex-col gap-4">
      <!-- 头部信息 -->
      <Card :loading="loading">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-bold mb-2">{{ projectName }}</h2>
            <div class="text-sm text-gray-500">
              配置该投标项目需要生成的标书文档
            </div>
          </div>
          <Space>
            <Button @click="handleBack">返回列表</Button>
            <Button type="primary" :loading="saving" @click="handleSave">
              保存配置
            </Button>
            <Button type="primary" @click="handleStartGenerate">
              开始生成
            </Button>
          </Space>
        </div>
      </Card>

      <!-- 配置表格 -->
      <Card title="文档配置" :loading="loading">
        <template #extra>
          <Button type="primary" size="small" @click="handleAdd">
            <PlusOutlined />
            添加配置
          </Button>
        </template>

        <Table
          v-if="configList.length > 0"
          :columns="columns"
          :data-source="configList"
          :pagination="false"
          :scroll="{ x: 800 }"
          row-key="index"
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.dataIndex === 'companyName'">
              <Select
                v-model:value="record.companyId"
                style="width: 100%"
                @change="(val: number) => handleCompanyChange(index, val)"
              >
                <Select.Option
                  v-for="company in companyOptions"
                  :key="company.id"
                  :value="company.id"
                >
                  {{ company.name }}
                </Select.Option>
              </Select>
            </template>

            <template v-else-if="column.dataIndex === 'documentType'">
              <Select v-model:value="record.documentType" style="width: 100%">
                <Select.Option
                  v-for="type in documentTypeOptions"
                  :key="type.value"
                  :value="type.value"
                >
                  {{ type.label }}
                </Select.Option>
              </Select>
            </template>

            <template v-else-if="column.dataIndex === 'documentNo'">
              <InputNumber
                v-model:value="record.documentNo"
                :min="1"
                :max="99"
                style="width: 100%"
              />
            </template>

            <template v-else-if="column.dataIndex === 'remark'">
              <a-input
                v-model:value="record.remark"
                placeholder="备注"
                allow-clear
              />
            </template>

            <template v-else-if="column.key === 'action'">
              <Button
                type="link"
                danger
                size="small"
                @click="handleDelete(index)"
              >
                <DeleteOutlined />
              </Button>
            </template>
          </template>
        </Table>

        <Empty v-else description="暂无配置，请点击上方"添加配置"按钮" />
      </Card>

      <!-- 说明 -->
      <Card title="配置说明">
        <div class="text-sm text-gray-600 space-y-2">
          <p>1. 每一行配置代表一个需要生成的标书文档</p>
          <p>2. 同类型序号：如果同一公司需要生成多份相同类型的标书，可以通过序号区分（如商务标1、商务标2）</p>
          <p>3. 配置保存后，点击"开始生成"按钮即可开始生成标书</p>
          <p>4. 示例：公司A需要生成2份商务标和1份整本标书，则需要添加3行配置</p>
        </div>
      </Card>
    </div>
  </Page>
</template>

<style scoped>
:deep(.ant-card-head) {
  background-color: #fafafa;
}
</style>
