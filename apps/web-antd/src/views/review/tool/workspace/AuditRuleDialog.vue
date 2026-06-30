<template>
  <Modal
    :open="open"
    :title="dialogTitle"
    :width="920"
    class="audit-rule-dialog"
    :confirm-loading="submitting"
    :ok-button-props="{ disabled: !canConfirmAudit }"
    :ok-text="okText"
    :cancel-text="cancelText"
    @cancel="handleCancel"
    @ok="handleOk"
  >
    <Steps v-if="!isRedactMode" :current="currentStep" class="audit-rule-steps" size="small">
      <Steps.Step title="选择规则" />
      <Steps.Step title="传参" />
    </Steps>

    <div v-show="currentStep === 0" class="rule-dialog">
      <aside class="standard-pane">
        <div class="pane-head">
          <Input.Search
            v-model:value="keyword"
            allow-clear
            class="standard-search"
            :placeholder="sourceSearchPlaceholder"
          />
          <Button class="standard-new-button" type="primary" ghost @click="openStandardForm()">新建</Button>
        </div>

        <div v-if="loadingStandards" class="pane-loading">
          <LoadingOutlined spin />
          <span>加载规则库...</span>
        </div>
        <Empty v-else-if="!filteredStandards.length" :description="sourceEmptyDescription">
          <Button type="primary" @click="openStandardForm()">{{ createSourceText }}</Button>
        </Empty>
        <div v-else class="standard-list">
          <button
            v-for="item in filteredStandards"
            :key="item.id"
            class="standard-item"
            :class="{ active: String(item.id) === String(selectedStandardId) }"
            type="button"
            @click="selectStandard(item.id)"
          >
            <span class="standard-name">{{ item.name }}</span>
            <span class="standard-meta">
              {{ item.promptTemplateName || (isRedactMode ? '关注点来源' : '未设置角色') }}
              <Tag v-if="standardItemCount(item)" class="standard-count">{{ standardItemCount(item) }}</Tag>
            </span>
          </button>
        </div>
      </aside>

      <section class="rule-pane">
        <div class="pane-toolbar">
          <div class="selected-title">
            <span>{{ selectedStandard?.name || selectedTitlePlaceholder }}</span>
            <Tag v-if="selectedStandard?.promptTemplateName" color="blue">{{ selectedStandard.promptTemplateName }}</Tag>
          </div>
        </div>
        <div class="toolbar-actions">
          <Button
            type="primary"
            :disabled="!selectedStandardId"
            size="small"
            @click="isRedactMode ? openFocusForm() : openRuleForm()"
          >
            {{ isRedactMode ? '新增关注点' : '新增规则' }}
          </Button>
        </div>

        <div v-if="selectedStandardId && !isRedactMode" class="knowledge-strip">
          <div class="knowledge-strip-head">
            <span class="knowledge-title">
              <BookOutlined />
              关联知识库
              <span class="knowledge-optional">可选</span>
            </span>
            <Button class="knowledge-link-button" type="link" size="small" @click="openKnowledgeModal">
              <LinkOutlined />
              关联
            </Button>
          </div>
          <div v-if="loadingKnowledges" class="knowledge-mini-loading">
            <LoadingOutlined spin />
            <span>加载知识库...</span>
          </div>
          <div v-else-if="currentKnowledges.length" class="knowledge-pills">
            <span v-for="kb in currentKnowledges" :key="kb.id" class="knowledge-pill">
              <span class="knowledge-pill-name">{{ kb.name }}</span>
              <Button danger type="link" size="small" @click="removeKnowledge(kb)">解除</Button>
            </span>
          </div>
          <div v-else class="knowledge-empty-text">
            暂未关联知识库，审核时将只使用当前规则库。
          </div>
        </div>

        <template v-if="isRedactMode">
          <div v-if="!selectedStandardId" class="rule-empty">
            <Empty description="请选择或创建一个关注点来源" />
          </div>
          <div v-else-if="loadingFocuses" class="pane-loading">
            <LoadingOutlined spin />
            <span>加载关注点...</span>
          </div>
          <div v-else-if="!currentFocuses.length" class="rule-empty">
            <Empty description="当前来源暂无关注点">
              <Button type="primary" @click="openFocusForm()">新增第一个关注点</Button>
            </Empty>
          </div>
          <div v-else class="rule-list">
            <div v-for="focus in currentFocuses" :key="focus.id" class="rule-item focus-item">
              <div class="rule-main">
                <div class="rule-line">
                  <Tag :color="focus.status === '1' ? 'default' : 'success'">
                    {{ focus.status === '1' ? '停用' : '启用' }}
                  </Tag>
                  <span class="rule-content">{{ focus.keyword }}</span>
                </div>
                <div class="rule-meta">
                  <span>关注要点</span>
                  <span v-if="focus.sortOrder != null">排序 {{ focus.sortOrder }}</span>
                </div>
              </div>
              <div class="rule-actions">
                <Button type="link" size="small" @click="openFocusForm(focus)">编辑</Button>
                <Button danger type="link" size="small" @click="removeFocus(focus)">删除</Button>
              </div>
            </div>
          </div>
        </template>
        <template v-else>
          <div v-if="!selectedStandardId" class="rule-empty">
            <Empty description="请选择或创建一个规则库" />
          </div>
          <div v-else-if="loadingRules" class="pane-loading">
            <LoadingOutlined spin />
            <span>加载规则...</span>
          </div>
          <div v-else-if="!currentRules.length" class="rule-empty">
            <Empty description="当前规则库暂无规则">
              <Button type="primary" @click="openRuleForm()">新增第一条规则</Button>
            </Empty>
          </div>
          <div v-else class="rule-list">
            <div v-for="rule in currentRules" :key="rule.id" class="rule-item">
              <div class="rule-main">
                <div class="rule-line">
                  <Tag :color="severityMeta(rule.severity).color">{{ severityMeta(rule.severity).label }}</Tag>
                  <span class="rule-content">{{ rule.content }}</span>
                </div>
                <div class="rule-meta">
                  <span>{{ categoryLabel(rule.category) }}</span>
                  <span>权重 {{ rule.weight ?? 80 }}</span>
                </div>
              </div>
              <div class="rule-actions">
                <Button type="link" size="small" @click="openRuleForm(rule)">编辑</Button>
                <Button danger type="link" size="small" @click="removeRule(rule)">删除</Button>
              </div>
            </div>
          </div>
        </template>
      </section>
    </div>

    <div v-if="!isRedactMode" v-show="currentStep === 1" class="param-step">
      <div class="param-summary">
        <div>
          <div class="param-summary-title">{{ selectedStandard?.name || '已选择规则库' }}</div>
          <div class="param-summary-meta">
            {{ selectedStandard?.promptTemplateName || '未设置角色' }} · {{ currentRules.length }} 条规则 ·
            {{ currentKnowledges.length }} 个知识库
          </div>
        </div>
        <Tag color="blue">传参</Tag>
      </div>

      <div class="param-card">
        <div class="param-card-title">审核参数</div>
        <div class="param-card-desc">
          填写文档应符合的标准值，AI 会结合规则库一起判断。没有固定参数时可以留空。
        </div>
        <ReferenceEditor
          :model-value="referenceDataDraft"
          @update:model-value="updateReferenceData"
        />
      </div>
    </div>
  </Modal>

  <Modal
    v-model:open="standardFormOpen"
    :title="editingStandard?.id ? '编辑规则库' : '新建规则库'"
    :confirm-loading="savingStandard"
    @ok="saveStandard"
  >
    <Form layout="vertical">
      <FormItem label="规则库名称" required>
        <Input v-model:value="standardForm.name" placeholder="如：合同内容审核规则" />
      </FormItem>
      <FormItem label="角色身份" required>
        <Select
          v-model:value="standardForm.promptTemplateId"
          :loading="loadingPrompts"
          :options="promptOptions"
          placeholder="请选择角色身份"
          show-search
          option-filter-prop="label"
        />
      </FormItem>
      <FormItem label="说明">
        <Input.TextArea v-model:value="standardForm.description" :rows="3" placeholder="适用范围、注意事项等" />
      </FormItem>
    </Form>
  </Modal>

  <Modal
    v-model:open="ruleFormOpen"
    :title="editingRule?.id ? '编辑规则' : '新增规则'"
    :confirm-loading="savingRule"
    @ok="saveRule"
  >
    <Form layout="vertical">
      <FormItem label="规则内容" required>
        <Input.TextArea v-model:value="ruleForm.content" :rows="4" :maxlength="500" show-count />
      </FormItem>
      <div class="rule-form-grid">
        <FormItem label="等级" required>
          <Select v-model:value="ruleForm.severity" :options="severityOptions" />
        </FormItem>
        <FormItem label="分类" required>
          <Select v-model:value="ruleForm.category" :options="categoryOptions" show-search option-filter-prop="label" />
        </FormItem>
      </div>
      <FormItem label="权重">
        <InputNumber v-model:value="ruleForm.weight" :min="0" :max="100" style="width: 100%" />
      </FormItem>
    </Form>
  </Modal>

  <Modal
    v-model:open="focusFormOpen"
    :title="editingFocus?.id ? '编辑关注点' : '新增关注点'"
    :confirm-loading="savingFocus"
    @ok="saveFocus"
  >
    <Form layout="vertical">
      <FormItem label="关注要点" required>
        <Input.TextArea
          v-model:value="focusForm.keyword"
          placeholder="输入一个关注要点，例如：项目总投资额 / 拆迁补偿标准 / 签约截止日期"
          :rows="3"
          :maxlength="500"
          show-count
        />
        <div class="focus-hint">每条关注项对应一个要点；多个要点请分别添加。</div>
      </FormItem>
      <FormItem label="启用">
        <Switch v-model:checked="focusForm.enabled" checked-children="启用" un-checked-children="停用" />
      </FormItem>
    </Form>
  </Modal>

  <Modal
    v-model:open="knowledgeModalOpen"
    title="关联知识库"
    :confirm-loading="linkingKnowledge"
    ok-text="确认关联"
    cancel-text="取消"
    :width="580"
    @ok="confirmLinkKnowledges"
  >
    <p class="knowledge-modal-tip">
      知识库关联在当前规则库上，审核时该规则库下的规则会共享这些知识库内容。
    </p>
    <div v-if="loadingAvailableKnowledges" class="knowledge-select-empty">
      <LoadingOutlined spin />
      <span>加载可关联知识库...</span>
    </div>
    <Empty v-else-if="!availableKnowledges.length" description="暂无可关联知识库" />
    <div v-else class="knowledge-select-list">
      <button
        v-for="kb in availableKnowledges"
        :key="kb.id"
        type="button"
        class="knowledge-select-item"
        :class="{ active: selectedKnowledgeIds.includes(String(kb.id)) }"
        @click="toggleKnowledgeSelect(kb.id)"
      >
        <span class="knowledge-select-main">
          <BookOutlined />
          <span>
            <span class="knowledge-select-name">{{ kb.name }}</span>
            <span class="knowledge-select-meta">
              {{ kb.caseCount ?? 0 }} 案例 · {{ kb.patternCount ?? 0 }} 模式
            </span>
          </span>
        </span>
        <span v-if="selectedKnowledgeIds.includes(String(kb.id))" class="knowledge-select-check">已选</span>
      </button>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';

import { BookOutlined, LinkOutlined, LoadingOutlined } from '@ant-design/icons-vue';
import { Button, Empty, Form, FormItem, Input, InputNumber, message, Modal, Select, Steps, Switch, Tag } from 'ant-design-vue';

import { reviewKnowledgeList } from '#/api/review/knowledge';
import type { ReviewKnowledge } from '#/api/review/knowledge/model';
import { reviewPromptList } from '#/api/review/prompt';
import type { ReviewPromptTemplate } from '#/api/review/prompt/model';
import {
  reviewStandardAdd,
  reviewStandardFocusAdd,
  reviewStandardFocusList,
  reviewStandardFocusRemove,
  reviewStandardFocusUpdate,
  reviewStandardKnowledges,
  reviewStandardLinkKnowledge,
  reviewStandardList,
  reviewStandardRuleAdd,
  reviewStandardRuleList,
  reviewStandardRuleRemove,
  reviewStandardRuleUpdate,
  reviewStandardUnlinkKnowledge,
  reviewStandardUpdate,
} from '#/api/review/standard';
import type { ReviewStandard, ReviewStandardFocus, ReviewStandardRule } from '#/api/review/standard/model';
import ReferenceEditor from '../components/ReferenceEditor.vue';

const props = defineProps<{
  mode?: 'audit' | 'redact';
  modelValue: any[];
  open: boolean;
  referenceData?: string;
  submitting?: boolean;
}>();

const emit = defineEmits([
  'confirm',
  'update:referenceData',
  'update:modelValue',
  'update:open',
]);

const currentStep = ref(0);
const keyword = ref('');
const standards = ref<ReviewStandard[]>([]);
const rulesMap = ref<Record<string, ReviewStandardRule[]>>({});
const focusMap = ref<Record<string, ReviewStandardFocus[]>>({});
const knowledgeMap = ref<Record<string, ReviewKnowledge[]>>({});
const selectedStandardId = ref<any>(props.modelValue?.[0]);
const loadingStandards = ref(false);
const loadingRules = ref(false);
const loadingFocuses = ref(false);
const loadingKnowledges = ref(false);

const standardFormOpen = ref(false);
const savingStandard = ref(false);
const editingStandard = ref<Partial<ReviewStandard> | null>(null);
const standardForm = reactive({
  description: '',
  name: '',
  promptTemplateId: undefined as any,
});

const ruleFormOpen = ref(false);
const savingRule = ref(false);
const editingRule = ref<Partial<ReviewStandardRule> | null>(null);
const ruleForm = reactive({
  category: 'compliance',
  content: '',
  severity: 'must',
  weight: 80,
});

const focusFormOpen = ref(false);
const savingFocus = ref(false);
const editingFocus = ref<Partial<ReviewStandardFocus> | null>(null);
const focusForm = reactive({
  enabled: true,
  keyword: '',
});

const prompts = ref<ReviewPromptTemplate[]>([]);
const loadingPrompts = ref(false);
const knowledgeModalOpen = ref(false);
const loadingAvailableKnowledges = ref(false);
const linkingKnowledge = ref(false);
const availableKnowledges = ref<ReviewKnowledge[]>([]);
const selectedKnowledgeIds = ref<string[]>([]);
const referenceDataDraft = ref(props.referenceData || '');

const severityOptions = [
  { label: '严重', value: 'must' },
  { label: '警告', value: 'should' },
  { label: '提示', value: 'suggest' },
];

const categoryOptions = [
  { label: '主体信息', value: 'subject_info' },
  { label: '合规性', value: 'compliance' },
  { label: '金额条款', value: 'amount' },
  { label: '期限条款', value: 'term' },
  { label: '验收条款', value: 'acceptance' },
  { label: '违约责任', value: 'liability' },
  { label: '知识产权', value: 'ip' },
  { label: '争议解决', value: 'dispute' },
  { label: '格式规范', value: 'format' },
  { label: '其他', value: 'other' },
];

const categoryMap = computed(() => Object.fromEntries(categoryOptions.map((item) => [item.value, item.label])));
const promptOptions = computed(() =>
  prompts.value
    .filter((item) => item.status === '0')
    .map((item) => ({
      label: `${item.name}（${item.type || '通用'}）`,
      value: item.id,
    })),
);
const filteredStandards = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  if (!kw) return standards.value;
  return standards.value.filter((item) =>
    `${item.name || ''} ${item.promptTemplateName || ''}`.toLowerCase().includes(kw),
  );
});
const selectedStandard = computed(() =>
  standards.value.find((item) => String(item.id) === String(selectedStandardId.value)),
);
const currentRules = computed(() => rulesMap.value[String(selectedStandardId.value)] || []);
const currentFocuses = computed(() => focusMap.value[String(selectedStandardId.value)] || []);
const enabledFocuses = computed(() => currentFocuses.value.filter((item) => item.status !== '1' && !!item.keyword?.trim()));
const currentKnowledges = computed(() => knowledgeMap.value[String(selectedStandardId.value)] || []);
const selectedHasPrompt = computed(() => Boolean(selectedStandard.value?.promptTemplateId || selectedStandard.value?.promptTemplateName));
const isRedactMode = computed(() => props.mode === 'redact');
const canConfirmAudit = computed(() => {
  if (!selectedStandardId.value) return false;
  if (isRedactMode.value) return enabledFocuses.value.length > 0;
  return Boolean(selectedHasPrompt.value && currentRules.value.length);
});
const dialogTitle = computed(() => (isRedactMode.value ? '选择脱敏关注点' : '选择审核规则'));
const okText = computed(() => {
  if (isRedactMode.value) return '开始脱敏';
  return currentStep.value === 0 ? '下一步' : '开始审核';
});
const cancelText = computed(() => {
  if (isRedactMode.value) return '取消';
  return currentStep.value === 0 ? '取消' : '上一步';
});
const sourceSearchPlaceholder = computed(() => (isRedactMode.value ? '搜索关注点来源' : '搜索规则库'));
const sourceEmptyDescription = computed(() => (isRedactMode.value ? '暂无关注点来源' : '暂无规则库'));
const createSourceText = computed(() => (isRedactMode.value ? '创建关注点来源' : '创建规则库'));
const selectedTitlePlaceholder = computed(() => (isRedactMode.value ? '请选择关注点来源' : '请选择规则库'));

watch(
  () => props.open,
  async (open) => {
    if (!open) return;
    currentStep.value = 0;
    selectedStandardId.value = props.modelValue?.[0];
    referenceDataDraft.value = props.referenceData || '';
    await Promise.all([loadStandards(), loadPrompts()]);
    if (!selectedStandardId.value && standards.value[0]) {
      selectStandard(standards.value[0].id);
    } else if (selectedStandardId.value) {
      loadStandardDetail(selectedStandardId.value);
    }
  },
);

watch(
  () => props.modelValue,
  (value) => {
    selectedStandardId.value = value?.[0];
  },
);

watch(
  () => props.referenceData,
  (value) => {
    if (!props.open) referenceDataDraft.value = value || '';
  },
);

async function loadStandards() {
  loadingStandards.value = true;
  try {
    const res = await reviewStandardList({ pageNum: 1, pageSize: 1000 });
    standards.value = res.rows || [];
  } catch (error: any) {
    message.error(`加载规则库失败：${error?.message || error}`);
  } finally {
    loadingStandards.value = false;
  }
}

async function loadPrompts() {
  if (prompts.value.length) return;
  loadingPrompts.value = true;
  try {
    prompts.value = await reviewPromptList();
  } catch (error: any) {
    message.error(`加载角色身份失败：${error?.message || error}`);
  } finally {
    loadingPrompts.value = false;
  }
}

async function loadRules(id: any) {
  if (!id) return;
  loadingRules.value = true;
  try {
    const res = await reviewStandardRuleList(id, { pageNum: 1, pageSize: 1000 });
    rulesMap.value = {
      ...rulesMap.value,
      [String(id)]: res.rows || [],
    };
  } catch (error: any) {
    message.error(`加载规则失败：${error?.message || error}`);
  } finally {
    loadingRules.value = false;
  }
}

async function loadFocuses(id: any) {
  if (!id) return;
  loadingFocuses.value = true;
  try {
    const data = await reviewStandardFocusList(id);
    focusMap.value = {
      ...focusMap.value,
      [String(id)]: data || [],
    };
  } catch (error: any) {
    message.error(`加载关注点失败：${error?.message || error}`);
  } finally {
    loadingFocuses.value = false;
  }
}

async function loadLinkedKnowledges(id: any) {
  if (!id) return;
  loadingKnowledges.value = true;
  try {
    const data = await reviewStandardKnowledges(id);
    knowledgeMap.value = {
      ...knowledgeMap.value,
      [String(id)]: data || [],
    };
  } catch (error: any) {
    message.error(`加载关联知识库失败：${error?.message || error}`);
  } finally {
    loadingKnowledges.value = false;
  }
}

async function loadAvailableKnowledges() {
  if (!selectedStandardId.value) return;
  loadingAvailableKnowledges.value = true;
  try {
    const linkedIds = new Set(currentKnowledges.value.map((item) => String(item.id)));
    const res = await reviewKnowledgeList({ pageNum: 1, pageSize: 1000 });
    availableKnowledges.value = (res.rows || []).filter((item) => item.status !== '1' && !linkedIds.has(String(item.id)));
  } catch (error: any) {
    availableKnowledges.value = [];
    message.error(`加载知识库失败：${error?.message || error}`);
  } finally {
    loadingAvailableKnowledges.value = false;
  }
}

function loadStandardDetail(id: any) {
  if (isRedactMode.value) {
    if (!focusMap.value[String(id)]) loadFocuses(id);
    return;
  }
  if (!rulesMap.value[String(id)]) loadRules(id);
  if (!knowledgeMap.value[String(id)]) loadLinkedKnowledges(id);
}

function selectStandard(id: any) {
  selectedStandardId.value = id;
  emit('update:modelValue', id ? [id] : []);
  loadStandardDetail(id);
}

async function openKnowledgeModal() {
  if (!selectedStandardId.value) {
    message.warning('请先选择规则库');
    return;
  }
  await loadLinkedKnowledges(selectedStandardId.value);
  selectedKnowledgeIds.value = [];
  knowledgeModalOpen.value = true;
  await loadAvailableKnowledges();
}

function toggleKnowledgeSelect(id: number | string) {
  const strId = String(id);
  const index = selectedKnowledgeIds.value.indexOf(strId);
  if (index >= 0) {
    selectedKnowledgeIds.value.splice(index, 1);
    return;
  }
  selectedKnowledgeIds.value.push(strId);
}

async function confirmLinkKnowledges() {
  if (!selectedStandardId.value) return;
  if (!selectedKnowledgeIds.value.length) {
    message.warning('请选择至少一个知识库');
    return;
  }
  const standardId = selectedStandardId.value;
  linkingKnowledge.value = true;
  try {
    for (const knowledgeId of selectedKnowledgeIds.value) {
      await reviewStandardLinkKnowledge(standardId, knowledgeId);
    }
    knowledgeModalOpen.value = false;
    await loadLinkedKnowledges(standardId);
  } finally {
    linkingKnowledge.value = false;
  }
}

function removeKnowledge(kb: ReviewKnowledge) {
  if (!selectedStandardId.value) return;
  const standardId = selectedStandardId.value;
  Modal.confirm({
    title: `解除关联【${kb.name}】吗？`,
    content: '解除后该知识库将不再参与当前规则库的审核增强。',
    okText: '解除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      await reviewStandardUnlinkKnowledge(standardId, kb.id);
      await loadLinkedKnowledges(standardId);
    },
  });
}

function openStandardForm(row?: Partial<ReviewStandard>) {
  editingStandard.value = row || null;
  standardForm.name = row?.name || '';
  standardForm.promptTemplateId = row?.promptTemplateId || undefined;
  standardForm.description = row?.description || '';
  standardFormOpen.value = true;
  loadPrompts();
}

async function saveStandard() {
  if (!standardForm.name.trim()) {
    message.warning('请输入规则库名称');
    return;
  }
  if (!standardForm.promptTemplateId) {
    message.warning('请选择角色身份');
    return;
  }
  savingStandard.value = true;
  try {
    let nextSelectedId = editingStandard.value?.id;
    if (editingStandard.value?.id) {
      await reviewStandardUpdate({
        id: editingStandard.value.id,
        description: standardForm.description,
        isSystem: editingStandard.value.isSystem || '0',
        name: standardForm.name,
        promptTemplateId: standardForm.promptTemplateId,
        status: '0',
        type: editingStandard.value.type || '1',
      } as any);
    } else {
      nextSelectedId = await reviewStandardAdd({
        description: standardForm.description,
        isSystem: '0',
        name: standardForm.name,
        promptTemplateId: standardForm.promptTemplateId,
        status: '0',
        type: '1',
      } as any);
    }
    standardFormOpen.value = false;
    await loadStandards();
    if (!nextSelectedId) {
      nextSelectedId = standards.value.find((item) =>
        item.name === standardForm.name && String(item.promptTemplateId || '') === String(standardForm.promptTemplateId || ''),
      )?.id;
    }
    if (nextSelectedId) selectStandard(nextSelectedId);
  } finally {
    savingStandard.value = false;
  }
}

function openRuleForm(row?: Partial<ReviewStandardRule>) {
  if (!selectedStandardId.value) {
    message.warning('请先选择或创建规则库');
    return;
  }
  editingRule.value = row || null;
  ruleForm.content = row?.content || '';
  ruleForm.severity = row?.severity || 'must';
  ruleForm.category = row?.category || 'compliance';
  ruleForm.weight = row?.weight ?? 80;
  ruleFormOpen.value = true;
}

function openFocusForm(row?: Partial<ReviewStandardFocus>) {
  if (!selectedStandardId.value) {
    message.warning('请先选择或创建关注点来源');
    return;
  }
  editingFocus.value = row || null;
  focusForm.keyword = row?.keyword || '';
  focusForm.enabled = row?.status !== '1';
  focusFormOpen.value = true;
}

async function saveFocus() {
  if (!selectedStandardId.value) {
    message.warning('请先选择关注点来源');
    return;
  }
  if (!focusForm.keyword.trim()) {
    message.warning('请输入关注要点');
    return;
  }
  savingFocus.value = true;
  try {
    const payload = {
      keyword: focusForm.keyword.trim(),
      standardId: selectedStandardId.value,
      status: focusForm.enabled ? '0' : '1',
    };
    if (editingFocus.value?.id) {
      await reviewStandardFocusUpdate({ ...payload, id: editingFocus.value.id } as any);
    } else {
      await reviewStandardFocusAdd(payload as any);
    }
    focusFormOpen.value = false;
    await loadFocuses(selectedStandardId.value);
  } finally {
    savingFocus.value = false;
  }
}

function removeFocus(focus: ReviewStandardFocus) {
  Modal.confirm({
    title: '删除关注点',
    content: `确认删除关注点「${focus.keyword}」？`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      await reviewStandardFocusRemove([focus.id]);
      await loadFocuses(selectedStandardId.value);
    },
  });
}

async function saveRule() {
  if (!selectedStandardId.value) {
    message.warning('请先选择规则库');
    return;
  }
  if (!ruleForm.content.trim()) {
    message.warning('请输入规则内容');
    return;
  }
  savingRule.value = true;
  try {
    const payload = {
      category: ruleForm.category,
      content: ruleForm.content,
      severity: ruleForm.severity,
      standardId: selectedStandardId.value,
      status: '0',
      weight: ruleForm.weight,
    };
    if (editingRule.value?.id) {
      await reviewStandardRuleUpdate({ ...payload, id: editingRule.value.id } as any);
    } else {
      await reviewStandardRuleAdd(payload as any);
    }
    ruleFormOpen.value = false;
    selectStandard(selectedStandardId.value);
    await loadRules(selectedStandardId.value);
  } finally {
    savingRule.value = false;
  }
}

function removeRule(rule: ReviewStandardRule) {
  Modal.confirm({
    title: '删除规则',
    content: '确认删除这条审核规则？',
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      await reviewStandardRuleRemove([rule.id]);
      await loadRules(selectedStandardId.value);
    },
  });
}

function validateRuleStep() {
  if (!selectedStandardId.value) {
    message.warning(isRedactMode.value ? '请选择关注点来源' : '请选择规则库');
    return false;
  }
  if (isRedactMode.value) {
    if (!enabledFocuses.value.length) {
      message.warning('请至少新增一个启用的关注点');
      return false;
    }
    return true;
  }
  if (!selectedHasPrompt.value) {
    message.warning('请先为规则库选择角色身份');
    return false;
  }
  if (!currentRules.value.length) {
    message.warning('请至少新增一条规则');
    return false;
  }
  return true;
}

function handleCancel() {
  if (!isRedactMode.value && currentStep.value === 1) {
    currentStep.value = 0;
    return;
  }
  emit('update:open', false);
}

function handleOk() {
  if (!validateRuleStep()) return;
  if (!isRedactMode.value && currentStep.value === 0) {
    emit('update:modelValue', [selectedStandardId.value]);
    currentStep.value = 1;
    return;
  }
  confirmStart();
}

function updateReferenceData(value: string) {
  referenceDataDraft.value = value;
}

function confirmStart() {
  emit('update:modelValue', [selectedStandardId.value]);
  emit('update:referenceData', isRedactMode.value ? '' : referenceDataDraft.value || '');
  emit('confirm', [selectedStandardId.value], isRedactMode.value ? enabledFocuses.value.map((item) => item.keyword.trim()) : undefined);
}

function standardItemCount(item: ReviewStandard) {
  if (isRedactMode.value) {
    const focuses = focusMap.value[String(item.id)];
    if (focuses) return `${focuses.filter((focus) => focus.status !== '1').length} 个`;
    return '';
  }
  return item.ruleCount != null ? `${item.ruleCount} 条` : '';
}

function severityMeta(value?: string) {
  const v = String(value || '').toLowerCase();
  if (v === 'must' || v === 'error') return { color: 'error', label: '严重' };
  if (v === 'should' || v === 'warning') return { color: 'warning', label: '警告' };
  return { color: 'processing', label: '提示' };
}

function categoryLabel(value?: string) {
  return categoryMap.value[value || ''] || value || '其他';
}
</script>

<style scoped>
:deep(.audit-rule-dialog .ant-modal-body) {
  max-height: calc(100vh - 180px);
  overflow: hidden;
}

.audit-rule-steps {
  margin-bottom: 12px;
  padding: 0 4px;
}

.rule-dialog {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  height: min(520px, calc(100vh - 260px));
  min-height: 360px;
  overflow: hidden;
  border: 1px solid #edf0f5;
}

.param-step {
  height: min(520px, calc(100vh - 260px));
  min-height: 360px;
  overflow: auto;
  padding: 14px;
  background: #fbfcff;
  border: 1px solid #edf0f5;
}

.param-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  margin-bottom: 12px;
  background: #fff;
  border: 1px solid #edf0f5;
  border-radius: 6px;
}

.param-summary-title {
  color: #1f2937;
  font-weight: 700;
}

.param-summary-meta {
  margin-top: 4px;
  color: #667085;
  font-size: 12px;
}

.param-card {
  padding: 14px;
  background: #fff;
  border: 1px solid #edf0f5;
  border-radius: 6px;
}

.param-card-title {
  color: #1f2937;
  font-weight: 700;
}

.param-card-desc {
  margin: 4px 0 12px;
  color: #667085;
  font-size: 12px;
}

.standard-pane,
.rule-pane {
  min-width: 0;
  min-height: 0;
  background: #fff;
}

.rule-pane {
  display: flex;
  flex-direction: column;
}

.standard-pane {
  display: flex;
  flex-direction: column;
  border-right: 1px solid #edf0f5;
}

.pane-head,
.pane-toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid #edf0f5;
}

.pane-head {
  flex: 0 0 auto;
}

.standard-search {
  min-width: 0;
  flex: 1;
}

.standard-new-button {
  flex: 0 0 auto;
}

.pane-toolbar {
  min-height: 46px;
  justify-content: space-between;
}

.pane-loading,
.rule-empty {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: #667085;
}

.standard-list {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 8px;
}

.standard-item {
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  text-align: left;
  cursor: pointer;
  background: #fff;
  border: 1px solid transparent;
  border-radius: 6px;
}

.standard-item:hover,
.standard-item.active {
  background: #f4f8ff;
  border-color: #8bb7ff;
}

.standard-name {
  color: #1f2937;
  font-weight: 700;
}

.standard-meta,
.rule-meta {
  display: flex;
  gap: 8px;
  align-items: center;
  color: #667085;
  font-size: 12px;
}

.standard-count {
  margin-left: auto;
}

.selected-title {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  color: #1f2937;
  font-weight: 700;
}

.selected-title > span:first-child {
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toolbar-actions {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  justify-content: flex-end;
  padding: 8px 10px;
  background: #fff;
  border-bottom: 1px solid #edf0f5;
}

.knowledge-strip {
  padding: 10px 12px;
  background: #fbfcff;
  border-bottom: 1px solid #edf0f5;
}

.knowledge-strip-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.knowledge-title {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  color: #344054;
  font-size: 13px;
  font-weight: 700;
}

.knowledge-optional {
  color: #98a2b3;
  font-size: 12px;
  font-weight: 400;
}

.knowledge-link-button {
  flex: 0 0 auto;
}

.knowledge-mini-loading,
.knowledge-select-empty {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: #667085;
}

.knowledge-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.knowledge-pill {
  display: inline-flex;
  max-width: 100%;
  align-items: center;
  gap: 4px;
  padding: 2px 2px 2px 8px;
  background: #fff;
  border: 1px solid #d6e4ff;
  border-radius: 6px;
}

.knowledge-pill-name {
  max-width: 220px;
  overflow: hidden;
  color: #175cd3;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.knowledge-empty-text {
  margin-top: 8px;
  color: #98a2b3;
  font-size: 12px;
}

.knowledge-modal-tip {
  margin-bottom: 12px;
  color: #667085;
  font-size: 13px;
}

.knowledge-select-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 420px;
  overflow: auto;
}

.knowledge-select-item {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;
  background: #fff;
  border: 1px solid #edf0f5;
  border-radius: 6px;
}

.knowledge-select-item:hover,
.knowledge-select-item.active {
  background: #f4f8ff;
  border-color: #8bb7ff;
}

.knowledge-select-main {
  display: flex;
  min-width: 0;
  gap: 8px;
  align-items: center;
}

.knowledge-select-name,
.knowledge-select-meta {
  display: block;
}

.knowledge-select-name {
  color: #1f2937;
  font-weight: 700;
}

.knowledge-select-meta {
  margin-top: 2px;
  color: #667085;
  font-size: 12px;
}

.knowledge-select-check {
  flex: 0 0 auto;
  color: #1677ff;
  font-size: 12px;
  font-weight: 700;
}

.rule-list {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 12px;
}

.rule-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 12px;
  border: 1px solid #edf0f5;
  border-radius: 6px;
}

.rule-item + .rule-item {
  margin-top: 8px;
}

.rule-main {
  flex: 1;
  min-width: 0;
}

.rule-line {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.rule-content {
  min-width: 0;
  color: #344054;
  line-height: 1.6;
}

.rule-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 4px;
}

.rule-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
</style>
