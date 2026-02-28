<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Button, Card, Checkbox, Col, message, Row, Space, Table, Tag } from 'ant-design-vue';
import { DownloadOutlined, FileWordOutlined, FilePdfOutlined } from '@ant-design/icons-vue';

interface Props {
  submissionId: number;
  chapterTree: any[];
}

const props = defineProps<Props>();
const emit = defineEmits(['prev', 'back']);

const loading = ref(false);
const exporting = ref(false);

// 文档列表
const documentList = ref<any[]>([]);
const selectedDocuments = ref<string[]>([]);

// 导出格式
const exportFormat = ref<'docx' | 'pdf'>('docx');

// 表格列配置
const columns = [
  { title: '文档名称', dataIndex: 'documentName', key: 'documentName', width: 250 },
  { title: '公司名称', dataIndex: 'companyName', key: 'companyName', width: 150 },
  { title: '文档类型', dataIndex: 'documentType', key: 'documentType', width: 120 },
  { title: '章节数', dataIndex: 'chapterCount', key: 'chapterCount', width: 100 },
  { title: '字数', dataIndex: 'wordCount', key: 'wordCount', width: 100 },
  { title: '生成状态', dataIndex: 'generationStatus', key: 'generationStatus', width: 120 },
  { title: '操作', key: 'action', width: 150, fixed: 'right' },
];

onMounted(() => {
  loadDocumentList();
});

// 加载文档列表
async function loadDocumentList() {
  loading.value = true;
  try {
    // TODO: 调用后端接口获取文档列表
    // const res = await getSubmissionDocuments(props.submissionId);
    // documentList.value = res;

    // 模拟数据
    documentList.value = [
      {
        key: '1',
        documentId: 1,
        documentName: '某某项目商务标书_公司A',
        companyName: '公司A',
        documentType: 'commercial',
        chapterCount: 8,
        wordCount: 15000,
        generationStatus: 'completed',
        filePath: '/path/to/doc1.docx',
      },
      {
        key: '2',
        documentId: 2,
        documentName: '某某项目技术标书_公司A',
        companyName: '公司A',
        documentType: 'technical',
        chapterCount: 12,
        wordCount: 25000,
        generationStatus: 'completed',
        filePath: '/path/to/doc2.docx',
      },
      {
        key: '3',
        documentId: 3,
        documentName: '某某项目完整标书_公司A',
        companyName: '公司A',
        documentType: 'complete',
        chapterCount: 20,
        wordCount: 40000,
        generationStatus: 'completed',
        filePath: '/path/to/doc3.docx',
      },
    ];

    // 默认全选
    selectedDocuments.value = documentList.value.map((doc) => doc.key);
  } catch (error) {
    console.error('加载文档列表失败:', error);
    message.error('加载文档列表失败');
  } finally {
    loading.value = false;
  }
}

// 文档类型名称映射
function getDocumentTypeName(type: string) {
  const typeMap: Record<string, string> = {
    commercial: '商务标',
    technical: '技术标',
    complete: '整本标书',
  };
  return typeMap[type] || type;
}

// 状态标签颜色
function getStatusColor(status: string) {
  const colorMap: Record<string, string> = {
    pending: 'default',
    generating: 'processing',
    completed: 'success',
    failed: 'error',
  };
  return colorMap[status] || 'default';
}

// 状态文本
function getStatusText(status: string) {
  const textMap: Record<string, string> = {
    pending: '待生成',
    generating: '生成中',
    completed: '已完成',
    failed: '失败',
  };
  return textMap[status] || status;
}

// 单个文档导出
async function handleExportSingle(record: any) {
  exporting.value = true;
  try {
    // TODO: 调用后端接口导出单个文档
    // await exportDocument(record.documentId, exportFormat.value);
    message.success(`正在导出 ${record.documentName}`);

    // 模拟下载
    setTimeout(() => {
      message.success('导出成功');
      exporting.value = false;
    }, 2000);
  } catch (error) {
    console.error('导出文档失败:', error);
    message.error('导出文档失败');
    exporting.value = false;
  }
}

// 批量导出
async function handleBatchExport() {
  if (selectedDocuments.value.length === 0) {
    message.warning('请至少选择一个文档');
    return;
  }

  exporting.value = true;
  try {
    // TODO: 调用后端接口批量导出
    // await batchExportDocuments(selectedDocuments.value, exportFormat.value);
    message.success(`正在导出 ${selectedDocuments.value.length} 个文档`);

    // 模拟下载
    setTimeout(() => {
      message.success('批量导出成功');
      exporting.value = false;
    }, 3000);
  } catch (error) {
    console.error('批量导出失败:', error);
    message.error('批量导出失败');
    exporting.value = false;
  }
}

// 全部导出
async function handleExportAll() {
  exporting.value = true;
  try {
    // TODO: 调用后端接口导出所有文档
    // await exportAllDocuments(props.submissionId, exportFormat.value);
    message.success('正在导出所有文档');

    // 模拟下载
    setTimeout(() => {
      message.success('导出成功');
      exporting.value = false;
    }, 3000);
  } catch (error) {
    console.error('导出失败:', error);
    message.error('导出失败');
    exporting.value = false;
  }
}

// 上一步
function handlePrev() {
  emit('prev');
}

// 完成并返回
function handleFinish() {
  message.success('标书生成完成');
  emit('back');
}
</script>

<template>
  <div class="step3-export">
    <Card title="第三步：导出标书文件">
      <!-- 导出选项 -->
      <div class="export-options">
        <Row :gutter="24">
          <Col :span="12">
            <Card title="导出格式" size="small">
              <Space direction="vertical">
                <Checkbox
                  :checked="exportFormat === 'docx'"
                  @change="exportFormat = 'docx'"
                >
                  <FileWordOutlined style="color: #2b579a" />
                  Word 文档 (.docx)
                </Checkbox>
                <Checkbox
                  :checked="exportFormat === 'pdf'"
                  @change="exportFormat = 'pdf'"
                >
                  <FilePdfOutlined style="color: #e74c3c" />
                  PDF 文档 (.pdf)
                </Checkbox>
              </Space>
            </Card>
          </Col>
          <Col :span="12">
            <Card title="快捷操作" size="small">
              <Space direction="vertical" style="width: 100%">
                <Button
                  type="primary"
                  block
                  :loading="exporting"
                  @click="handleExportAll"
                >
                  <DownloadOutlined />
                  导出所有文档
                </Button>
                <Button
                  block
                  :loading="exporting"
                  :disabled="selectedDocuments.length === 0"
                  @click="handleBatchExport"
                >
                  <DownloadOutlined />
                  导出选中文档 ({{ selectedDocuments.length }})
                </Button>
              </Space>
            </Card>
          </Col>
        </Row>
      </div>

      <!-- 文档列表 -->
      <div class="document-list">
        <h3 class="section-title">标书文档列表</h3>
        <Table
          v-model:selectedRowKeys="selectedDocuments"
          :columns="columns"
          :data-source="documentList"
          :loading="loading"
          :pagination="false"
          :row-selection="{
            type: 'checkbox',
            selectedRowKeys: selectedDocuments,
            onChange: (keys) => (selectedDocuments = keys),
          }"
          row-key="key"
          bordered
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'documentType'">
              <Tag color="blue">{{ getDocumentTypeName(record.documentType) }}</Tag>
            </template>
            <template v-if="column.key === 'generationStatus'">
              <Tag :color="getStatusColor(record.generationStatus)">
                {{ getStatusText(record.generationStatus) }}
              </Tag>
            </template>
            <template v-if="column.key === 'action'">
              <Space>
                <Button
                  type="link"
                  size="small"
                  :loading="exporting"
                  @click="handleExportSingle(record)"
                >
                  <DownloadOutlined />
                  导出
                </Button>
              </Space>
            </template>
          </template>
        </Table>
      </div>

      <!-- 底部操作按钮 -->
      <div class="action-buttons">
        <Space>
          <Button @click="handlePrev">上一步</Button>
          <Button type="primary" @click="handleFinish">完成</Button>
        </Space>
      </div>
    </Card>
  </div>
</template>

<style scoped lang="less">
.step3-export {
  .export-options {
    margin-bottom: 32px;
  }

  .document-list {
    margin-top: 24px;

    .section-title {
      margin-bottom: 16px;
      font-size: 16px;
      font-weight: 600;
      color: #1a1a1a;
    }
  }

  .action-buttons {
    margin-top: 32px;
    padding-top: 24px;
    border-top: 1px solid #f0f0f0;
    text-align: right;
  }
}
</style>
