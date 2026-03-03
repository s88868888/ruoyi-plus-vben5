<script setup lang="ts">
import { h, onMounted, onUnmounted, ref, watch } from 'vue';
import { Button, message, Progress, Tree, Dropdown, Menu, MenuItem, Modal, Input, Form, FormItem, TreeSelect, Tooltip, Popconfirm } from 'ant-design-vue';
import {
  FileTextOutlined,
  ThunderboltOutlined,
  ReloadOutlined,
  EllipsisOutlined,
  InfoCircleOutlined,
  EditOutlined,
  SyncOutlined,
  PlusOutlined,
  CaretRightOutlined,
  DeleteOutlined,
} from '@ant-design/icons-vue';
import {
  getChapterTree,
  generateChapterStructure,
  regenerateChapterStructure,
  updateChapterSort,
  addChapter,
  deleteChapter,
  clearChapters,
  type BizSubmissionChapter
} from '#/api/bid/chapter';
import { submissionInfo } from '#/api/bid/submission';
import { useSseMessage } from '#/utils/message';

interface Props {
  submissionId: string;
  documentConfigId?: string;
  submissionData?: {
    projectName?: string;
    bidOrg?: string;
  };
  documentConfig?: {
    companyName?: string;
    documentType?: string;
    documentNo?: string | number;
  };
}

const props = defineProps<Props>();
const emit = defineEmits(['structure-generated', 'next', 'back']);

const documentTypeMap: Record<string, string> = {
  commercial: '商务标',
  technical: '技术标',
  complete: '整本标书',
};

const loading = ref(false);
const generating = ref(false);
const generatingProgress = ref(0);
const generatingMessage = ref('');

// 章节树数据
const chapterTree = ref<BizSubmissionChapter[]>([]);
const expandedKeys = ref<string[]>([]);
const selectedKeys = ref<string[]>([]);

// 当前选中的章节
const currentChapter = ref<BizSubmissionChapter | null>(null);

// 新建/编辑章节弹窗（共用）
const showChapterModal = ref(false);
const chapterModalMode = ref<'add' | 'edit'>('add');
const chapterModalSubmitting = ref(false);
const chapterModalForm = ref({
  chapterTitle: '',
  reasonDescription: '',
  parentId: null as number | null,  // null 表示根级别
});
const editingChapter = ref<BizSubmissionChapter | null>(null);

// 轮询定时器（刷新页面后恢复生成中状态用）
let pollTimer: ReturnType<typeof setInterval> | null = null;

function startPolling() {
  if (pollTimer) return;
  pollTimer = setInterval(async () => {
    try {
      const info = await submissionInfo(props.submissionId);
      const progress = info?.generationProgress ?? 0;
      const status = Number(info?.chapterStructureGenerated ?? 0);
      generatingProgress.value = progress;
      if (status === 1) {
        // 已完成
        stopPolling();
        generating.value = false;
        generatingMessage.value = '章节结构生成完成';
        loadChapterTree();
      } else if (status === 0) {
        // 出错或未开始
        stopPolling();
        generating.value = false;
      }
    } catch (e) {
      // 忽略轮询错误
    }
  }, 3000);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

onMounted(async () => {
  // 先检查后端状态，判断是否有正在进行的生成任务（刷新页面后恢复）
  try {
    const info = await submissionInfo(props.submissionId);
    const status = Number(info?.chapterStructureGenerated ?? 0);
    if (status === 2) {
      // 生成中：恢复进度条状态并开始轮询
      generating.value = true;
      generatingProgress.value = info?.generationProgress ?? 0;
      generatingMessage.value = '正在生成章节结构，请稍候...';
      startPolling();
    } else {
      loadChapterTree();
    }
  } catch (e) {
    loadChapterTree();
  }

  // 监听全局 SSE 消息
  const sseReturnData = useSseMessage();
  if (sseReturnData) {
    const { data } = sseReturnData;
    watch(data, (message) => {
      if (!message) return;
      try {
        const parsedMessage = JSON.parse(message);
        // 只处理章节生成相关的消息
        if (parsedMessage.type === 'start' || parsedMessage.type === 'progress' ||
            parsedMessage.type === 'success' || parsedMessage.type === 'error') {
          handleSseMessage(parsedMessage);
        }
      } catch (e) {
        // 忽略非 JSON 消息
      }
    });
  }
});

onUnmounted(() => {
  stopPolling();
});

// 处理SSE消息
function handleSseMessage(data: any) {
  const { type, message: msg, progress, data: resultData } = data;

  switch (type) {
    case 'start':
      generating.value = true;
      generatingProgress.value = 0;
      generatingMessage.value = msg;
      break;
    case 'progress':
      generatingProgress.value = progress;
      generatingMessage.value = msg;
      break;
    case 'success':
      stopPolling();
      generating.value = false;
      generatingProgress.value = 100;
      generatingMessage.value = '章节结构生成完成';
      // 只显示一次成功消息，不显示JSON数据
      message.success('章节结构生成完成');
      // 延迟1s重新加载章节树，确保后端事务已完全提交
      setTimeout(() => { loadChapterTree(); }, 1000);
      break;
    case 'error':
      stopPolling();
      generating.value = false;
      generatingMessage.value = msg;
      message.error(msg);
      break;
  }
}

// 加载章节树
async function loadChapterTree() {
  loading.value = true;
  try {
    console.log('加载章节树参数:', {
      submissionId: props.submissionId,
      documentId: props.documentConfigId
    });
    const res = await getChapterTree({
      submissionId: props.submissionId,
      documentId: props.documentConfigId
    });
    console.log('章节树查询结果:', res);
    chapterTree.value = res || [];

    // 通知父组件章节结构已生成
    if (chapterTree.value.length > 0) {
      emit('structure-generated', chapterTree.value);
    }
  } catch (error) {
    console.error('加载章节树失败:', error);
    message.error('加载章节树失败');
  } finally {
    loading.value = false;
  }
}

// AI 生成章节结构
async function handleAIGenerate() {
  if (!props.documentConfigId) {
    message.warning('缺少文档配置信息，无法生成章节');
    return;
  }

  generating.value = true;
  generatingProgress.value = 0;
  generatingMessage.value = '正在启动AI生成...';

  try {
    await generateChapterStructure({
      submissionId: props.submissionId,
      documentConfigId: props.documentConfigId
    });

    // SSE 会推送进度，无需轮询
    generatingMessage.value = 'AI正在生成章节结构，请稍候...';
  } catch (error) {
    console.error('AI 生成失败:', error);
    message.error('AI 生成失败');
    generating.value = false;
  }
}

// 重新生成章节结构
async function handleRegenerate() {
  if (!props.documentConfigId) {
    message.warning('缺少文档配置信息，无法重新生成章节');
    return;
  }

  generating.value = true;
  generatingProgress.value = 0;
  generatingMessage.value = '正在启动AI重新生成...';

  try {
    await regenerateChapterStructure({
      submissionId: props.submissionId,
      documentConfigId: props.documentConfigId
    });

    // SSE 会推送进度，无需轮询
    generatingMessage.value = 'AI正在重新生成章节结构，请稍候...';
  } catch (error) {
    console.error('重新生成失败:', error);
    message.error('重新生成失败');
    generating.value = false;
  }
}

// 清空章节目录
function handleClearChapters() {
  Modal.confirm({
    title: '确认清空',
    content: '确定要清空该文档的所有章节吗？此操作不可恢复。',
    okText: '清空',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      try {
        await clearChapters({
          submissionId: props.submissionId,
          documentId: props.documentConfigId!,
        });
        message.success('章节目录已清空');
        chapterTree.value = [];
        currentChapter.value = null;
        selectedKeys.value = [];
        expandedKeys.value = [];
      } catch (e) {
        message.error('清空失败，请重试');
      }
    },
  });
}

// 手动新建章节
function handleAddChapter() {
  chapterModalMode.value = 'add';
  chapterModalForm.value = { chapterTitle: '', reasonDescription: '', parentId: null };
  editingChapter.value = null;
  showChapterModal.value = true;
}

// 确认新建/编辑章节
async function handleChapterModalOk() {
  if (!chapterModalForm.value.chapterTitle.trim()) {
    message.warning('请输入章节标题');
    return;
  }
  chapterModalSubmitting.value = true;
  try {
    if (chapterModalMode.value === 'add') {
      await addChapter({
        submissionDocumentId: props.documentConfigId!,
        parentId: String(chapterModalForm.value.parentId ?? 0),
        chapterTitle: chapterModalForm.value.chapterTitle.trim(),
        chapterType: 'generate',
        reasonDescription: chapterModalForm.value.reasonDescription.trim(),
      });
      message.success('章节创建成功');
      showChapterModal.value = false;
      loadChapterTree();
    } else {
      // TODO: 调用后端接口编辑章节标题
      message.success('章节修改成功');
      showChapterModal.value = false;
    }
  } finally {
    chapterModalSubmitting.value = false;
  }
}

// 取消新建/编辑章节
function handleChapterModalCancel() {
  showChapterModal.value = false;
}

// 树节点选择
function handleTreeSelect(keys: string[], info: any) {
  if (keys.length > 0) {
    selectedKeys.value = keys;
    currentChapter.value = info.node;
  }
}

// 下一步
function handleNext() {
  if (chapterTree.value.length === 0) {
    message.warning('请先生成章节结构');
    return;
  }
  emit('next');
}

// 返回
function handleBack() {
  emit('back');
}

// 中文数字转换（用于根章节编号：第一章、第二章…）
function toChineseNumber(n: number): string {
  const digits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  if (n <= 0) return '';
  if (n <= 10) return digits[n]!;
  if (n < 20) return `十${digits[n - 10]}`;
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return `${digits[tens]}十${ones === 0 ? '' : digits[ones]}`;
}

// 重新计算所有章节编号
function recalculateChapterNo(list: BizSubmissionChapter[], parentPrefix?: string) {
  list.forEach((item, index) => {
    if (!parentPrefix) {
      // 根级：第X章
      item.chapterNo = `第${toChineseNumber(index + 1)}章`;
      if (item.children?.length) {
        recalculateChapterNo(item.children, `${index + 1}`);
      }
    } else {
      // 子级：parentPrefix.index
      const currentNo = `${parentPrefix}.${index + 1}`;
      item.chapterNo = currentNo;
      if (item.children?.length) {
        recalculateChapterNo(item.children, currentNo);
      }
    }
  });
}

// 树节点拖拽 - 实时更新树结构并保存到后端
async function handleTreeDrop(info: any) {
  const { node, dragNode, dropPosition: absDropPosition, dropToGap } = info;

  // 从原始树数据中查找节点在兄弟中的索引（不依赖 node.pos，更可靠）
  function getNodeSiblingIndex(list: BizSubmissionChapter[], id: any): number {
    for (let i = 0; i < list.length; i++) {
      // eslint-disable-next-line eqeqeq
      if (list[i].id == id) return i;
      if (list[i].children?.length) {
        const found = getNodeSiblingIndex(list[i].children!, id);
        if (found >= 0) return found;
      }
    }
    return -1;
  }

  // 从原始树数据中查找节点是否有子节点
  function nodeHasChildren(id: any): boolean {
    function find(list: BizSubmissionChapter[]): boolean {
      for (const item of list) {
        // eslint-disable-next-line eqeqeq
        if (item.id == id) return !!(item.children && item.children.length > 0);
        if (item.children?.length) {
          const found = find(item.children);
          if (found) return true;
        }
      }
      return false;
    }
    return find(chapterTree.value);
  }

  // 计算相对拖放位置: -1=节点前, 0=放入节点, 1=节点后
  const nodeKey = node.id ?? node.key;
  const dragKey = dragNode.id ?? dragNode.key;
  const nodeIndex = getNodeSiblingIndex(chapterTree.value, nodeKey);
  const dropPosition = absDropPosition - (nodeIndex >= 0 ? nodeIndex : 0);

  // 判断目标节点是否展开（从 expandedKeys 判断，比 node.expanded 更可靠）
  const isNodeExpanded = expandedKeys.value.some((k: any) => String(k) === String(nodeKey));
  const hasChildren = nodeHasChildren(nodeKey);

  console.log('[TreeDrop]', {
    nodeKey, dragKey, absDropPosition, dropPosition, dropToGap,
    nodeIndex, isNodeExpanded, hasChildren,
    nodePos: node.pos, nodeExpanded: node.expanded,
  });

  // 从树中移除拖拽节点（宽松比较兼容 number/string）
  function removeNode(list: BizSubmissionChapter[], id: any): BizSubmissionChapter | null {
    for (let i = 0; i < list.length; i++) {
      // eslint-disable-next-line eqeqeq
      if (list[i].id == id) return list.splice(i, 1)[0]!;
      if (list[i].children?.length) {
        const found = removeNode(list[i].children!, id);
        if (found) return found;
      }
    }
    return null;
  }

  // 找到目标节点所在列表和索引
  function findNodeList(list: BizSubmissionChapter[], id: any): { list: BizSubmissionChapter[]; index: number } | null {
    for (let i = 0; i < list.length; i++) {
      // eslint-disable-next-line eqeqeq
      if (list[i].id == id) return { list, index: i };
      if (list[i].children?.length) {
        const found = findNodeList(list[i].children!, id);
        if (found) return found;
      }
    }
    return null;
  }

  // 递归更新节点及其子节点的 chapterLevel
  function updateLevels(item: BizSubmissionChapter, level: number) {
    item.chapterLevel = level;
    if (item.children?.length) {
      item.children.forEach(child => updateLevels(child, level + 1));
    }
  }

  const data = JSON.parse(JSON.stringify(chapterTree.value)) as BizSubmissionChapter[];
  const dragItem = removeNode(data, dragKey);
  if (!dragItem) return;

  // 判断是否为自身 gap drop（拖到自身相邻 gap，通常发生在节点是父节点最后一项时）
  const isSelfGap = dropToGap && String(nodeKey) === String(dragKey);

  if (isSelfGap) {
    // 拖到自身下方 gap = 用户意图提升到父级之后
    const parentId = dragItem.parentId;
    if (!parentId || parentId === 0) {
      chapterTree.value = JSON.parse(JSON.stringify(chapterTree.value));
      return;
    }
    const parentResult = findNodeList(data, parentId);
    if (!parentResult) return;
    const parentNode = parentResult.list[parentResult.index]!;
    dragItem.parentId = parentNode.parentId ?? 0;
    updateLevels(dragItem, parentNode.chapterLevel ?? 1);
    parentResult.list.splice(parentResult.index + 1, 0, dragItem);
  } else if (!dropToGap) {
    // 放到节点上 → 作为第一个子节点插入
    const result = findNodeList(data, nodeKey);
    if (!result) return;
    const targetNode = result.list[result.index]!;
    if (!targetNode.children) targetNode.children = [];
    dragItem.parentId = targetNode.id;
    updateLevels(dragItem, (targetNode.chapterLevel ?? 1) + 1);
    targetNode.children.unshift(dragItem);
  } else if (hasChildren && isNodeExpanded && dropPosition === 1) {
    // 放到展开的有子节点的节点下方 → 作为第一个子节点插入
    const result = findNodeList(data, nodeKey);
    if (!result) return;
    const targetNode = result.list[result.index]!;
    if (!targetNode.children) targetNode.children = [];
    dragItem.parentId = targetNode.id;
    updateLevels(dragItem, (targetNode.chapterLevel ?? 1) + 1);
    targetNode.children.unshift(dragItem);
  } else {
    // Gap drop: 插入到目标节点的同级（前后）
    const result = findNodeList(data, nodeKey);
    if (!result) return;
    const targetNode = result.list[result.index]!;
    const insertIndex = dropPosition === -1 ? result.index : result.index + 1;
    dragItem.parentId = targetNode.parentId ?? 0;
    updateLevels(dragItem, targetNode.chapterLevel ?? 1);
    result.list.splice(insertIndex, 0, dragItem);
  }

  // 重新计算所有章节编号
  recalculateChapterNo(data);

  // 立即更新视图
  chapterTree.value = data;

  // 收集所有节点的新排序并提交后端
  const sortItems: { id: number; parentId: number; sortOrder: number; chapterLevel: number; chapterNo: string }[] = [];
  function collectSort(list: BizSubmissionChapter[], parentId: number) {
    list.forEach((item, index) => {
      sortItems.push({
        id: item.id!,
        parentId,
        sortOrder: index + 1,
        chapterLevel: item.chapterLevel ?? 1,
        chapterNo: item.chapterNo ?? '',
      });
      if (item.children?.length) collectSort(item.children, item.id!);
    });
  }
  collectSort(data, 0);

  console.log('[TreeDrop] 准备提交的排序数据:', JSON.stringify(sortItems.slice(0, 10), null, 2));

  try {
    await updateChapterSort(sortItems);
    console.log('[TreeDrop] 排序保存成功');
  } catch (e) {
    console.error('[TreeDrop] 排序保存失败:', e);
    message.error('保存排序失败，请重试');
    loadChapterTree();
  }
}

// 编辑章节
function editChapterContent(chapter: BizSubmissionChapter) {
  chapterModalMode.value = 'edit';
  chapterModalForm.value = { chapterTitle: chapter.chapterTitle || '' };
  editingChapter.value = chapter;
  showChapterModal.value = true;
}

// 删除章节
async function handleDeleteChapter(chapter: BizSubmissionChapter) {
  try {
    await deleteChapter(String(chapter.id));
    message.success('删除成功');
    if (currentChapter.value?.id === chapter.id) {
      currentChapter.value = null;
      selectedKeys.value = [];
    }
    loadChapterTree();
  } catch (e) {
    message.error('删除失败，请重试');
  }
}

// 生成章节内容
function generateChapterContent(chapter: BizSubmissionChapter) {
  message.info(`开始生成章节: ${chapter.chapterTitle}`);
  // TODO: 调用后端接口生成章节内容
}

</script>

<template>
  <div class="step2-generate">
    <!-- 左侧章节树 -->
    <div class="chapter-sidebar">
      <div class="sidebar-header">
        <span class="sidebar-title">章节目录</span>
        <div class="sidebar-actions">
          <Button type="text" size="small" :icon="h(PlusOutlined)" @click="handleAddChapter" title="新建章节" />
          <Dropdown placement="bottomRight">
            <Button type="text" size="small" :icon="h(EllipsisOutlined)" />
            <template #overlay>
              <Menu>
                <MenuItem key="regenerate" @click="handleRegenerate">
                  <ReloadOutlined />
                  重新生成
                </MenuItem>
                <MenuItem key="clear" class="menu-item-danger" @click="handleClearChapters">
                  <DeleteOutlined />
                  清空数据
                </MenuItem>
              </Menu>
            </template>
          </Dropdown>
        </div>
      </div>

      <div class="sidebar-content">
        <div v-if="loading" class="loading-state">
          <span>加载中...</span>
        </div>
        <div v-else-if="generating" class="generating-state">
          <ThunderboltOutlined class="generating-icon" />
          <p class="generating-text">{{ generatingMessage }}</p>
          <Progress :percent="generatingProgress" :show-info="true" />
        </div>
        <div v-else-if="chapterTree.length === 0" class="empty-state">
          <FileTextOutlined class="empty-icon" />
          <p class="empty-text">暂无章节</p>
          <Button type="primary" size="small" @click="handleAIGenerate">
            <ThunderboltOutlined />
            AI 生成章节
          </Button>
        </div>
        <Tree
          v-else
          v-model:expanded-keys="expandedKeys"
          v-model:selected-keys="selectedKeys"
          :tree-data="chapterTree"
          :field-names="{ title: 'chapterTitle', key: 'id', children: 'children' }"
          :expand-action="'click'"
          draggable
          @select="handleTreeSelect"
          @drop="handleTreeDrop"
        >
          <template #switcherIcon="{ expanded }">
            <CaretRightOutlined :class="['switcher-icon', { 'switcher-icon-open': expanded }]" />
          </template>
          <template #title="node">
            <div class="tree-node-wrapper">
              <span class="tree-node-title">
                <span class="chapter-no">{{ node.chapterNo }}</span>
                {{ node.chapterTitle }}
              </span>
              <div class="tree-node-actions" @click.stop>
                <Button
                  v-if="node.generationStatus === 'pending' || !node.generationStatus"
                  type="text"
                  size="small"
                  :icon="h(SyncOutlined)"
                  title="生成状态"
                  @click="generateChapterContent(node)"
                />
                <Tooltip
                  v-if="node.reasonDescription"
                  :title="node.reasonDescription"
                  placement="right"
                  :overlay-style="{ maxWidth: '320px' }"
                >
                  <Button
                    type="text"
                    size="small"
                    :icon="h(InfoCircleOutlined)"
                  />
                </Tooltip>
                <Button
                  type="text"
                  size="small"
                  :icon="h(EditOutlined)"
                  title="编辑章节"
                  @click="editChapterContent(node)"
                />
                <Popconfirm
                  title="确认删除该章节？"
                  description="若有子章节也会一并删除。"
                  ok-text="删除"
                  ok-type="danger"
                  cancel-text="取消"
                  placement="right"
                  @confirm="handleDeleteChapter(node)"
                >
                  <Button
                    type="text"
                    size="small"
                    :icon="h(DeleteOutlined)"
                    class="btn-danger"
                  />
                </Popconfirm>
              </div>
            </div>
          </template>
        </Tree>
      </div>
    </div>

    <!-- 右侧内容区 -->
    <div class="content-main">
      <div class="content-header">
        <div class="header-left">
          <div class="project-info">
            <h3>{{ props.submissionData?.projectName || '标书内容生成' }}</h3>
            <div class="project-meta">
              <span v-if="props.documentConfig" class="document-tag">
                {{ props.documentConfig.companyName }} -
                {{ documentTypeMap[props.documentConfig.documentType || ''] }}
                (第{{ props.documentConfig.documentNo }}份)
              </span>
            </div>
          </div>
        </div>
        <div class="header-actions">
          <Button @click="handleBack">返回</Button>
          <Button type="primary" @click="handleNext">下一步</Button>
        </div>
      </div>

      <div class="content-body">
        <div v-if="currentChapter" class="chapter-detail">
          <div class="chapter-meta">
            <span>章节编号: {{ currentChapter.chapterNo }}</span>
            <span>层级: {{ currentChapter.chapterLevel }}</span>
            <span>状态: {{ currentChapter.generationStatus || '待生成' }}</span>
          </div>

          <!-- 显示生成说明 -->
          <div v-if="currentChapter.reasonDescription" class="chapter-reason">
            <div class="reason-title">生成说明</div>
            <div class="reason-content">{{ currentChapter.reasonDescription }}</div>
          </div>

          <div class="chapter-content">
            <div v-if="currentChapter.chapterContent" class="content-preview">
              {{ currentChapter.chapterContent }}
            </div>
            <div v-else class="content-empty">
              <p>该章节内容尚未生成</p>
              <Button type="primary">生成此章节</Button>
            </div>
          </div>
        </div>
        <div v-else class="welcome-state">
          <FileTextOutlined class="welcome-icon" />
          <p class="welcome-text">请从左侧选择章节查看内容</p>
          <p class="welcome-hint">或使用 AI 一键生成章节结构</p>
        </div>
      </div>
    </div>

    <!-- 新建/编辑章节弹窗（共用） -->
    <Modal
      v-model:open="showChapterModal"
      :title="chapterModalMode === 'add' ? '新建章节' : '编辑章节'"
      wrap-class-name="chapter-modal-wrap"
      centered
      :confirm-loading="chapterModalSubmitting"
      @ok="handleChapterModalOk"
      @cancel="handleChapterModalCancel"
    >
      <Form layout="vertical" style="margin-top: 16px;">
        <FormItem v-if="chapterModalMode === 'add'" label="父级章节">
          <TreeSelect
            v-model:value="chapterModalForm.parentId"
            :tree-data="chapterTree"
            :field-names="{ label: 'chapterTitle', value: 'id', children: 'children' }"
            :filter-tree-node="(input: string, node: any) => node.chapterTitle?.toLowerCase().includes(input.toLowerCase())"
            placeholder="不选则添加到根级别"
            allow-clear
            show-search
            tree-default-expand-all
            style="width: 100%;"
          />
        </FormItem>
        <FormItem label="章节标题" required>
          <Input
            v-model:value="chapterModalForm.chapterTitle"
            placeholder="请输入章节标题"
            allow-clear
            @press-enter="handleChapterModalOk"
          />
        </FormItem>
        <FormItem label="章节说明">
          <Input.TextArea
            v-model:value="chapterModalForm.reasonDescription"
            placeholder="请输入章节说明（选填）"
            :rows="3"
            :max-length="500"
            show-count
          />
        </FormItem>
      </Form>
    </Modal>
  </div>
</template>

<style scoped lang="less">
.step2-generate {
  display: flex;
  height: 100%;
  gap: 16px;
  padding: 10px 16px 16px 16px;

  // 左侧章节树
  .chapter-sidebar {
    width: 420px;
    background: #fff;
    border: 1px solid #d8d8d8;
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    flex-shrink: 0;

    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      border-bottom: 1px solid #f0f0f0;

      .sidebar-title {
        font-size: 15px;
        font-weight: 600;
        color: rgba(0, 0, 0, 0.88);
      }

      .sidebar-actions {
        display: flex;
        gap: 4px;
      }
    }

    .sidebar-content {
      flex: 1;
      overflow-y: scroll;
      scrollbar-gutter: stable;
      padding: 12px;

      .loading-state {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 60px 20px;
        color: #999;
      }

      .generating-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px 20px;
        text-align: center;

        .generating-icon {
          font-size: 48px;
          color: hsl(var(--primary));
          margin-bottom: 16px;
          animation: pulse 1.5s ease-in-out infinite;
        }

        .generating-text {
          color: hsl(var(--primary));
          margin-bottom: 16px;
          font-size: 14px;
          font-weight: 500;
        }

        :deep(.ant-progress) {
          width: 100%;
          max-width: 240px;
        }
      }

      @keyframes pulse {
        0%, 100% {
          opacity: 1;
          transform: scale(1);
        }
        50% {
          opacity: 0.6;
          transform: scale(1.1);
        }
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px 20px;
        text-align: center;

        .empty-icon {
          font-size: 48px;
          color: #d9d9d9;
          margin-bottom: 16px;
        }

        .empty-text {
          color: #999;
          margin-bottom: 16px;
          font-size: 14px;
        }
      }

      :deep(.ant-tree) {
        background: transparent;

        .ant-tree-treenode {
          padding: 4px 0;
        }

        .ant-tree-node-content-wrapper {
          border-radius: 6px;
          padding: 4px 8px;
          transition: all 0.2s;
          flex: 1;
          min-width: 0;

          &:hover {
            background: #f5f5f5;
          }
        }

        .ant-tree-treenode {
          display: flex;
          align-items: center;
          width: 100%;
        }

        .ant-tree-node-selected {
          .ant-tree-node-content-wrapper {
            background: hsl(var(--primary) / 0.08) !important;
          }
        }

        // 箭头展开收起动画
        .switcher-icon {
          font-size: 12px;
          color: #999;
          transition: transform 0.2s;

          &.switcher-icon-open {
            transform: rotate(90deg);
          }
        }

        .ant-tree-switcher {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .tree-node-wrapper {
          display: flex;
          align-items: center;
          width: 100%;
          gap: 4px;

          .tree-node-title {
            flex: 1;
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 14px;
            color: rgba(0, 0, 0, 0.88);
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;

            .chapter-no {
              color: hsl(var(--primary));
              font-weight: 600;
              flex-shrink: 0;
            }
          }

          .tree-node-actions {
            display: flex;
            gap: 2px;
            flex-shrink: 0;
            margin-left: auto;

            .ant-btn {
              padding: 0 4px;
              height: 24px;

              &:hover {
                color: hsl(var(--primary));
                background: hsl(var(--primary) / 0.08);
              }
            }

            .btn-danger {
              color: #ff4d4f !important;
              &:hover {
                background: rgba(255, 77, 79, 0.08) !important;
              }
            }
          }
        }
      }
    }
  }

  // 右侧内容区
  .content-main {
    flex: 1;
    background: #fff;
    border: 1px solid #d8d8d8;
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    overflow: hidden;

    .content-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 24px;
      border-bottom: 1px solid #f0f0f0;

      .header-left {
        .project-info {
          h3 {
            margin: 0 0 2px;
            font-size: 15px;
            font-weight: 600;
            color: rgba(0, 0, 0, 0.88);
            line-height: 1.4;
          }

          .project-meta {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .project-org {
            font-size: 12px;
            color: #999;
          }

          .document-tag {
            font-size: 12px;
            color: hsl(var(--primary));
            font-weight: 500;
            padding: 1px 6px;
            background: hsl(var(--primary) / 0.08);
            border-radius: 4px;
          }
        }
      }

      .header-actions {
        display: flex;
        gap: 8px;
      }
    }

    .content-body {
      flex: 1;
      overflow-y: auto;
      padding: 24px;

      .chapter-detail {
        .chapter-meta {
          display: flex;
          gap: 24px;
          padding: 16px;
          background: #fafafa;
          border-radius: 8px;
          margin-bottom: 24px;
          font-size: 14px;
          color: #666;
        }

        .chapter-reason {
          margin-bottom: 24px;
          padding: 16px;
          background: #f0f7ff;
          border-left: 4px solid hsl(var(--primary));
          border-radius: 4px;

          .reason-title {
            font-size: 14px;
            font-weight: 600;
            color: hsl(var(--primary));
            margin-bottom: 8px;
          }

          .reason-content {
            font-size: 14px;
            line-height: 1.8;
            color: rgba(0, 0, 0, 0.88);
          }
        }

        .chapter-content {
          .content-preview {
            padding: 20px;
            background: #fafafa;
            border-radius: 8px;
            line-height: 1.8;
            font-size: 14px;
            color: rgba(0, 0, 0, 0.88);
            white-space: pre-wrap;
            word-break: break-word;
          }

          .content-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 80px 20px;
            text-align: center;

            p {
              color: #999;
              margin-bottom: 16px;
              font-size: 14px;
            }
          }
        }
      }

      .welcome-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        text-align: center;

        .welcome-icon {
          font-size: 64px;
          color: #d9d9d9;
          margin-bottom: 24px;
        }

        .welcome-text {
          font-size: 16px;
          color: #666;
          margin-bottom: 8px;
        }

        .welcome-hint {
          font-size: 14px;
          color: #999;
        }
      }
    }
  }

}
</style>

<style>
.chapter-modal-wrap .ant-modal {
  width: 600px !important;
}
.menu-item-danger {
  color: #ff4d4f !important;
}
.menu-item-danger:hover {
  background: rgba(255, 77, 79, 0.08) !important;
}
</style>
