<script setup lang="ts">
import { ref, computed } from 'vue';

import { Page } from '@vben/common-ui';

import { Card, Tag, Button, Space, Select, Switch, Checkbox, Form, FormItem, Input, message } from 'ant-design-vue';
import {
  PlayCircleOutlined,
  RobotOutlined,
  UserOutlined,
  AuditOutlined,
  CheckCircleOutlined,
  SettingOutlined,
  SaveOutlined,
} from '@ant-design/icons-vue';

interface WorkflowNode {
  id: string;
  name: string;
  type: 'start' | 'ai-review' | 'first-review' | 'second-review' | 'end';
  icon: string;
  description: string;
  config: Record<string, any>;
}

const nodes = ref<WorkflowNode[]>([
  {
    id: 'start',
    name: '开始',
    type: 'start',
    icon: 'play',
    description: '流程发起，提交文档进入审核',
    config: { trigger: 'manual', docTypes: ['contract', 'finance', 'bid'] },
  },
  {
    id: 'ai-review',
    name: 'AI审核',
    type: 'ai-review',
    icon: 'robot',
    description: 'AI自动对照规范标准进行审核',
    config: { standardId: 1, autoPass: false, passCondition: 'no-critical', timeout: 60 },
  },
  {
    id: 'first-review',
    name: '一审',
    type: 'first-review',
    icon: 'user',
    description: '初审人员复核AI审核结果',
    config: { assignee: '部门主管', timeoutDays: 3, autoEscalate: true },
  },
  {
    id: 'second-review',
    name: '二审',
    type: 'second-review',
    icon: 'audit',
    description: '终审人员最终确认',
    config: { assignee: '分管领导', timeoutDays: 5, autoEscalate: false },
  },
  {
    id: 'end',
    name: '结束',
    type: 'end',
    icon: 'check',
    description: '审核完成，文档归档',
    config: { autoArchive: true, notifySubmitter: true },
  },
]);

const selectedNodeId = ref<string>('ai-review');

const selectedNode = computed(() => nodes.value.find(n => n.id === selectedNodeId.value));

function selectNode(id: string) {
  selectedNodeId.value = id;
}

function getNodeIcon(type: string) {
  const map: Record<string, any> = {
    start: PlayCircleOutlined,
    'ai-review': RobotOutlined,
    'first-review': UserOutlined,
    'second-review': AuditOutlined,
    end: CheckCircleOutlined,
  };
  return map[type] || SettingOutlined;
}

function getNodeColor(type: string) {
  const map: Record<string, string> = {
    start: '#52c41a',
    'ai-review': '#1677ff',
    'first-review': '#722ed1',
    'second-review': '#fa8c16',
    end: '#52c41a',
  };
  return map[type] || '#909399';
}

const standardOptions = [
  { label: '政府采购合同审核标准 v2.1', value: 1 },
  { label: '企业财务报销规范 v1.3', value: 2 },
  { label: '合同通用条款检查 v3.0', value: 3 },
  { label: '标书格式规范 v2.0', value: 4 },
];

const passConditionOptions = [
  { label: '无严重问题即通过', value: 'no-critical' },
  { label: '无严重+无一般问题', value: 'no-warning' },
  { label: '通过率 ≥ 80%', value: 'rate-80' },
  { label: '通过率 ≥ 90%', value: 'rate-90' },
  { label: '所有规则全部通过', value: 'all-pass' },
];

function handleSave() {
  message.success('流程配置已保存');
}
</script>

<template>
  <Page title="审核流程配置" description="配置AI审核在业务工作流中的节点和规则">
    <template #extra>
      <Button type="primary" @click="handleSave"><SaveOutlined /> 保存配置</Button>
    </template>

    <!-- 流程图 -->
    <Card class="mb-4">
      <template #title>
        <span class="card-title">流程节点</span>
      </template>
      <div class="workflow-diagram">
        <template v-for="(node, index) in nodes" :key="node.id">
          <div
            :class="['workflow-node', { 'workflow-node-active': selectedNodeId === node.id }]"
            @click="selectNode(node.id)"
          >
            <div class="workflow-node-icon" :style="{ background: getNodeColor(node.type) + '15', color: getNodeColor(node.type) }">
              <component :is="getNodeIcon(node.type)" />
            </div>
            <div class="workflow-node-name">{{ node.name }}</div>
            <div class="workflow-node-desc">{{ node.description }}</div>
          </div>
          <div v-if="index < nodes.length - 1" class="workflow-arrow">
            <div class="workflow-arrow-line" />
            <div class="workflow-arrow-head" />
          </div>
        </template>
      </div>
    </Card>

    <!-- 节点配置 -->
    <Card v-if="selectedNode">
      <template #title>
        <Space>
          <component :is="getNodeIcon(selectedNode.type)" :style="{ color: getNodeColor(selectedNode.type) }" />
          <span class="card-title">{{ selectedNode.name }} - 节点配置</span>
        </Space>
      </template>
      <template #extra>
        <Tag :color="getNodeColor(selectedNode.type)">{{ selectedNode.type === 'ai-review' ? '自动节点' : '人工节点' }}</Tag>
      </template>

      <!-- AI审核节点配置 -->
      <div v-if="selectedNode.type === 'ai-review'" class="node-config">
        <Form layout="vertical">
          <FormItem label="审核标准">
            <Select
              v-model:value="selectedNode.config.standardId"
              :options="standardOptions"
              placeholder="选择审核标准"
              style="width: 100%; max-width: 400px;"
            />
            <div class="form-tip">AI将按照所选标准中的规则逐条检查文档</div>
          </FormItem>
          <FormItem label="自动通过条件">
            <Select
              v-model:value="selectedNode.config.passCondition"
              :options="passConditionOptions"
              placeholder="选择自动通过条件"
              style="width: 100%; max-width: 400px;"
            />
            <div class="form-tip">满足条件时文档自动流转至下一环节，无需人工干预</div>
          </FormItem>
          <FormItem label="启用自动通过">
            <Switch v-model:checked="selectedNode.config.autoPass" />
            <span class="ml-2 text-gray-500 text-sm">{{ selectedNode.config.autoPass ? '满足条件自动流转' : '所有文档需人工确认' }}</span>
          </FormItem>
          <FormItem label="超时时间（秒）">
            <Input
              v-model:value="selectedNode.config.timeout"
              type="number"
              style="width: 200px;"
              addon-after="秒"
            />
            <div class="form-tip">AI审核超过此时间未完成，将自动转人工处理</div>
          </FormItem>
        </Form>
      </div>

      <!-- 一审/二审节点配置 -->
      <div v-if="selectedNode.type === 'first-review' || selectedNode.type === 'second-review'" class="node-config">
        <Form layout="vertical">
          <FormItem label="审核人">
            <Select
              v-model:value="selectedNode.config.assignee"
              placeholder="选择审核人"
              style="width: 100%; max-width: 400px;"
            >
              <Select.Option value="部门主管">部门主管（按提交人所属部门）</Select.Option>
              <Select.Option value="分管领导">分管领导</Select.Option>
              <Select.Option value="指定人员">指定人员</Select.Option>
            </Select>
            <div class="form-tip">审核人将收到待办通知，可查看AI审核结果作为参考</div>
          </FormItem>
          <FormItem label="处理时限（天）">
            <Input
              v-model:value="selectedNode.config.timeoutDays"
              type="number"
              style="width: 200px;"
              addon-after="天"
            />
            <div class="form-tip">超过时限未处理将触发催办提醒</div>
          </FormItem>
          <FormItem label="超时自动升级">
            <Switch v-model:checked="selectedNode.config.autoEscalate" />
            <span class="ml-2 text-gray-500 text-sm">{{ selectedNode.config.autoEscalate ? '超时后自动通知上级' : '仅发送催办提醒' }}</span>
          </FormItem>
        </Form>
      </div>

      <!-- 开始节点配置 -->
      <div v-if="selectedNode.type === 'start'" class="node-config">
        <Form layout="vertical">
          <FormItem label="触发方式">
            <Select
              v-model:value="selectedNode.config.trigger"
              style="width: 100%; max-width: 400px;"
            >
              <Select.Option value="manual">手动提交</Select.Option>
              <Select.Option value="auto">自动触发（文档上传后自动进入审核）</Select.Option>
            </Select>
          </FormItem>
          <FormItem label="支持的文档类型">
            <Checkbox.Group v-model:value="selectedNode.config.docTypes">
              <Checkbox value="contract">合同</Checkbox>
              <Checkbox value="finance">财务账单</Checkbox>
              <Checkbox value="bid">标书</Checkbox>
              <Checkbox value="form">表单</Checkbox>
              <Checkbox value="report">报告</Checkbox>
            </Checkbox.Group>
          </FormItem>
        </Form>
      </div>

      <!-- 结束节点配置 -->
      <div v-if="selectedNode.type === 'end'" class="node-config">
        <Form layout="vertical">
          <FormItem label="自动归档">
            <Switch v-model:checked="selectedNode.config.autoArchive" />
            <span class="ml-2 text-gray-500 text-sm">审核通过后自动归档至知识库</span>
          </FormItem>
          <FormItem label="通知提交人">
            <Switch v-model:checked="selectedNode.config.notifySubmitter" />
            <span class="ml-2 text-gray-500 text-sm">审核完成后自动通知文档提交人</span>
          </FormItem>
        </Form>
      </div>
    </Card>
  </Page>
</template>

<style scoped>
.card-title {
  font-size: 15px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.workflow-diagram {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 24px 0;
  gap: 0;
  overflow-x: auto;
}

.workflow-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 20px;
  border-radius: 12px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 120px;
}

.workflow-node:hover {
  background: #f5f5f5;
}

.workflow-node-active {
  border-color: #1677ff;
  background: #e6f4ff;
}

.workflow-node-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}

.workflow-node-name {
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.workflow-node-desc {
  font-size: 11px;
  color: #909399;
  text-align: center;
  max-width: 100px;
  line-height: 1.4;
}

.workflow-arrow {
  display: flex;
  align-items: center;
  padding-top: 24px;
  min-width: 40px;
}

.workflow-arrow-line {
  width: 30px;
  height: 2px;
  background: #d9d9d9;
}

.workflow-arrow-head {
  width: 0;
  height: 0;
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  border-left: 8px solid #d9d9d9;
}

.node-config {
  padding: 8px 0;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
</style>
