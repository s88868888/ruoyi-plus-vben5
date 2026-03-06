<script setup lang="ts">
import { computed, h, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { Button, message, Progress, Tree, Dropdown, Menu, MenuItem, Modal, Input, Form, FormItem, TreeSelect, Tooltip, Popconfirm, Badge, Spin, Popover, Tag, Select, SelectOption } from 'ant-design-vue';
import {
  FileTextOutlined,
  ThunderboltOutlined,
  ReloadOutlined,
  EllipsisOutlined,
  InfoCircleOutlined,
  EditOutlined,
  SafetyCertificateOutlined,
  PlusOutlined,
  CaretRightOutlined,
  DeleteOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  LoadingOutlined,
  ClockCircleOutlined,
  SaveOutlined,
  PaperClipOutlined,
  EyeOutlined,
  PictureOutlined,
} from '@ant-design/icons-vue';
import {
  getChapterTree,
  getChapterInfo,
  generateChapterStructure,
  regenerateChapterStructure,
  generateChapter,
  regenerateChapter,
  generateAllChapters,
  saveChapterContent,
  updateChapterSort,
  addChapter,
  deleteChapter,
  clearChapters,
  updateChapterType,
  type BizSubmissionChapter
} from '#/api/bid/chapter';
import { submissionInfo, getSubmissionAttachments, type BidProjectAttachment } from '#/api/bid/submission';
import { useSseMessage } from '#/utils/message';
import AiEditorComp from '#/components/ai-editor/index.vue';
import FloatingPreview from '#/components/floating-preview/index.vue';
import KnowledgeImagePicker from '#/components/knowledge-image-picker/index.vue';

interface Props {
  submissionId: string;
  documentConfigId?: string;
  submissionData?: {
    projectName?: string;
    bidOrg?: string;
  };
  documentConfig?: {
    companyId?: number;
    companyName?: string;
    documentType?: string;
    documentNo?: string | number;
  };
}

const props = defineProps<Props>();
const emit = defineEmits(['structure-generated', 'next', 'back']);

// 当前文档配置对应的公司ID（用于知识库图片筛选）
const currentDocumentCompanyId = computed(() => props.documentConfig?.companyId);

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

// 章节内容编辑相关
const chapterContentValue = ref('');
const contentSaving = ref(false);
const contentModified = ref(false);
const contentBodyRef = ref<HTMLElement>();
const editorHeight = ref(500);

// 批量生成相关
const batchGenerating = ref(false);
const batchProgress = ref(0);
const batchMessage = ref('');
const batchTotal = ref(0);
const batchCurrent = ref(0);

// 新建/编辑章节弹窗（共用）
const showChapterModal = ref(false);
const chapterModalMode = ref<'add' | 'edit'>('add');
const chapterModalSubmitting = ref(false);
const chapterModalForm = ref({
  chapterTitle: '',
  reasonDescription: '',
  parentId: null as number | null,  // null 表示根级别
  chapterType: 'generate' as 'template' | 'generate',
});
const editingChapter = ref<BizSubmissionChapter | null>(null);

// 附件信息相关
const attachmentList = ref<BidProjectAttachment[]>([]);
const attachmentLoading = ref(false);
const attachmentPopoverOpen = ref(false);

// 悬浮预览相关
const previewVisible = ref(false);
const previewFileUrl = ref('');
const previewFileName = ref('');
const previewFileFormat = ref('');

// 知识库图片选择弹窗
const knowledgePickerOpen = ref(false);
const editorRef = ref<InstanceType<typeof AiEditorComp>>();

/** 插入知识库图片到编辑器 */
function handleInsertKnowledgeImages(urls: string[]) {
  if (!editorRef.value) return;
  const html = urls.map(url => `<div style="text-align:center"><img src="${url}" alt="知识库图片" data-align="center" style="max-width:80%;border:1px solid #eee;border-radius:4px;" /></div>`).join('');
  editorRef.value.insertHtml(html);
  // 标记内容已修改
  contentModified.value = true;
}

// 轮询定时器（刷新页面后恢复生成中状态用）
let pollTimer: ReturnType<typeof setInterval> | null = null;
// 批量生成轮询（刷新后检测 generating 章节状态）
let batchPollTimer: ReturnType<typeof setInterval> | null = null;

function startPolling() {
  if (pollTimer) return;
  pollTimer = setInterval(async () => {
    try {
      const info = await submissionInfo(props.submissionId);
      const progress = info?.generationProgress ?? 0;
      generatingProgress.value = progress;
      // 检查章节树是否已生成（通过加载章节树判断）
      try {
        const tree = await getChapterTree({ submissionId: props.submissionId, documentId: props.documentConfigId });
        const treeData = (tree as BizSubmissionChapter[]) || [];
        if (treeData.length > 0) {
          // 已完成
          stopPolling();
          generating.value = false;
          generatingMessage.value = '章节结构生成完成';
          loadChapterTree();
        }
      } catch {
        // 继续轮询
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

// 递归判断是否有章节正在生成或等待生成
function hasGeneratingChapters(list: BizSubmissionChapter[]): boolean {
  for (const item of list) {
    // 只检查 generating 状态，不包括 pending（pending 表示未开始，不应触发批量生成进度）
    if (item.generationStatus === 'generating') return true;
    if (item.children?.length && hasGeneratingChapters(item.children)) return true;
  }
  return false;
}

// 从章节树中统计叶子章节的完成/总数
function countLeafChapterProgress(list: BizSubmissionChapter[]): { total: number; completed: number } {
  let total = 0;
  let completed = 0;
  function walk(items: BizSubmissionChapter[]) {
    for (const item of items) {
      if (item.children?.length) {
        walk(item.children);
      } else {
        total++;
        if (item.generationStatus === 'completed') completed++;
      }
    }
  }
  walk(list);
  return { total, completed };
}

// 静默刷新章节树（不显示 loading，避免闪烁）
async function silentRefreshTree() {
  try {
    const res = await getChapterTree({
      submissionId: props.submissionId,
      documentId: props.documentConfigId
    });
    chapterTree.value = res || [];
  } catch (e) {
    // 忽略
  }
}

// 批量生成轮询（每3秒刷新树状态并计算进度）
function startBatchPolling() {
  if (batchPollTimer) return;
  batchPollTimer = setInterval(async () => {
    await silentRefreshTree();
    const { total, completed } = countLeafChapterProgress(chapterTree.value);
    batchTotal.value = total;
    batchCurrent.value = completed;
    batchProgress.value = total > 0 ? Math.round((completed / total) * 100) : 0;
    batchMessage.value = `正在生成章节内容 (${completed}/${total})...`;
    const noGenerating = !hasGeneratingChapters(chapterTree.value);
    const allDone = total > 0 && completed >= total;
    if (noGenerating && allDone) {
      stopBatchPolling();
      batchProgress.value = 100;
      batchMessage.value = '全部章节生成完成';
      message.success('全部章节生成完成');
      loadChapterTree();
      setTimeout(() => {
        batchGenerating.value = false;
        batchMessage.value = '';
      }, 2000);
    }
  }, 3000);
}

function stopBatchPolling() {
  if (batchPollTimer) {
    clearInterval(batchPollTimer);
    batchPollTimer = null;
  }
}

onMounted(async () => {
  // 计算编辑器高度
  calcEditorHeight();
  window.addEventListener('resize', calcEditorHeight);

  // 先检查后端状态，判断是否有正在进行的生成任务（刷新页面后恢复）
  try {
    const info = await submissionInfo(props.submissionId);
    // 如果投标项目处于生成中，恢复轮询
    if (info?.status === 'generating') {
      generating.value = true;
      generatingProgress.value = info?.generationProgress ?? 0;
      generatingMessage.value = '正在生成章节结构，请稍候...';
      startPolling();
    } else {
      await loadChapterTree();
      // 检测是否有批量内容生成任务在进行（刷新页面后恢复进度条）
      if (hasGeneratingChapters(chapterTree.value)) {
        batchGenerating.value = true;
        const { total, completed } = countLeafChapterProgress(chapterTree.value);
        batchTotal.value = total;
        batchCurrent.value = completed;
        batchProgress.value = total > 0 ? Math.round((completed / total) * 100) : 0;
        batchMessage.value = `正在生成章节内容 (${completed}/${total})...`;
        startBatchPolling();
      }
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
        // 处理章节结构生成相关的消息
        if (parsedMessage.type === 'start' || parsedMessage.type === 'progress' ||
            parsedMessage.type === 'success' || parsedMessage.type === 'error') {
          handleSseMessage(parsedMessage);
        }
        // 处理章节内容生成相关的消息
        if (parsedMessage.type?.startsWith('chapter_') || parsedMessage.type?.startsWith('batch_')) {
          handleChapterContentSseMessage(parsedMessage);
        }
      } catch (e) {
        // 忽略非 JSON 消息
      }
    });
  }
});

onUnmounted(() => {
  stopPolling();
  stopBatchPolling();
  window.removeEventListener('resize', calcEditorHeight);
});

// 计算编辑器高度：content-body 的高度减去内边距
function calcEditorHeight() {
  nextTick(() => {
    if (contentBodyRef.value) {
      editorHeight.value = contentBodyRef.value.clientHeight - 48; // 上下 padding 各 24px
    }
  });
}

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

    // 初次加载时默认展开第一个章节
    if (chapterTree.value.length > 0 && expandedKeys.value.length === 0) {
      expandedKeys.value = [String(chapterTree.value[0].id)];
    }

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
  chapterModalForm.value = { chapterTitle: '', reasonDescription: '', parentId: null, chapterType: 'generate' };
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
        chapterType: chapterModalForm.value.chapterType,
        reasonDescription: chapterModalForm.value.reasonDescription.trim(),
      });
      message.success('章节创建成功');
      showChapterModal.value = false;
      loadChapterTree();
    } else {
      if (editingChapter.value) {
        // 如果章节类型有变化，调用后端接口更新
        if (chapterModalForm.value.chapterType !== editingChapter.value.chapterType) {
          await updateChapterType(String(editingChapter.value.id), chapterModalForm.value.chapterType);
        }
      }
      message.success('章节修改成功');
      showChapterModal.value = false;
      loadChapterTree();
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
async function handleTreeSelect(keys: string[], info: any) {
  if (keys.length > 0) {
    selectedKeys.value = keys;
    currentChapter.value = info.node;
    chapterContentValue.value = info.node.chapterContent || '';
    contentModified.value = false;
    // 只有叶子章节（无子节点）才查询内容详情
    const isParent = info.node.children && info.node.children.length > 0;
    if (!isParent && info.node.id) {
      try {
        const detail = await getChapterInfo(String(info.node.id));
        if (detail) {
          currentChapter.value = { ...info.node, ...detail };
          chapterContentValue.value = detail.chapterContent || '';
        }
      } catch (e) {
        // 使用树节点数据即可
      }
    }
  }
}

/** 手风琴模式：同级只保留一个展开的父节点 */
function handleTreeExpand(keys: string[], { expanded, node }: { expanded: boolean; node: any }) {
  if (!expanded) {
    // 折叠操作：直接用新 keys
    expandedKeys.value = keys;
    return;
  }
  // 展开操作：在同级兄弟中只保留当前节点
  const nodeId = String(node.id ?? node.key);
  const siblings = findSiblingNodes(chapterTree.value, nodeId);
  const siblingIdSet = new Set(siblings.map((n: any) => String(n.id)));
  // 过滤掉同级其他节点，保留不同层级已展开的 + 当前节点
  expandedKeys.value = keys.filter(
    (k) => !siblingIdSet.has(String(k)) || String(k) === nodeId,
  );
}

/** 递归查找目标节点的同级节点列表 */
function findSiblingNodes(nodes: BizSubmissionChapter[], targetId: string): BizSubmissionChapter[] {
  for (const node of nodes) {
    if (String(node.id) === targetId) return nodes;
    if (node.children?.length) {
      const found = findSiblingNodes(node.children, targetId);
      if (found.length > 0) return found;
    }
  }
  return [];
}

// 下一步
async function handleNext() {
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
  chapterModalForm.value = { chapterTitle: chapter.chapterTitle || '', reasonDescription: chapter.reasonDescription || '', parentId: null, chapterType: (chapter.chapterType as 'template' | 'generate') || 'generate' };
  editingChapter.value = chapter;
  showChapterModal.value = true;
}

// 切换章节类型（template ↔ generate）
async function handleToggleChapterType(chapter: BizSubmissionChapter) {
  const newType = chapter.chapterType === 'template' ? 'generate' : 'template';
  const label = newType === 'template' ? '规定格式' : 'AI生成';
  try {
    await updateChapterType(String(chapter.id), newType);
    message.success(`章节类型已切换为: ${label}`);
    loadChapterTree();
  } catch (e) {
    message.error('切换章节类型失败');
  }
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
async function generateChapterContent(chapter: BizSubmissionChapter) {
  updateChapterStatusInTree(chapter.id!, 'generating');
  try {
    await generateChapter(String(chapter.id));
    // SSE 会推送进度，无需等待
  } catch (e) {
    message.error('生成失败');
    updateChapterStatusInTree(chapter.id!, 'failed');
  }
}

// 重新生成章节内容
async function handleRegenerateContent() {
  if (!currentChapter.value) return;
  Modal.confirm({
    title: '确认重新生成',
    content: '重新生成将清空当前章节内容，确定继续吗？',
    okText: '确定',
    cancelText: '取消',
    async onOk() {
      const chapter = currentChapter.value!;
      updateChapterStatusInTree(chapter.id!, 'generating');
      chapterContentValue.value = '';
      contentModified.value = false;
      try {
        await regenerateChapter(String(chapter.id));
      } catch (e) {
        message.error('重新生成失败');
        updateChapterStatusInTree(chapter.id!, 'failed');
      }
    },
  });
}

// 一键生成全部章节内容
async function handleGenerateAll() {
  if (!props.documentConfigId) {
    message.warning('缺少文档配置信息');
    return;
  }
  Modal.confirm({
    title: '一键生成全部章节内容',
    content: '将对所有未生成内容的叶子章节调用AI生成内容，耗时较长，确定继续吗？',
    okText: '开始生成',
    cancelText: '取消',
    async onOk() {
      batchGenerating.value = true;
      batchProgress.value = 0;
      batchMessage.value = '正在启动批量生成...';
      try {
        await generateAllChapters({
          submissionId: props.submissionId,
          documentConfigId: props.documentConfigId!,
        });
        // 启动轮询作为 SSE 的兜底，确保进度实时更新
        startBatchPolling();
      } catch (e) {
        message.error('批量生成启动失败');
        batchGenerating.value = false;
      }
    },
  });
}

// 保存章节内容
async function handleSaveContent() {
  if (!currentChapter.value) return;
  contentSaving.value = true;
  try {
    await saveChapterContent(String(currentChapter.value.id), chapterContentValue.value);
    currentChapter.value.chapterContent = chapterContentValue.value;
    contentModified.value = false;
    message.success('保存成功');
  } catch (e) {
    message.error('保存失败');
  } finally {
    contentSaving.value = false;
  }
}

// 编辑器内容变更
function handleEditorChange(html: string) {
  chapterContentValue.value = html;
  contentModified.value = true;
}

// 判断是否为叶子章节（无子节点 = 需要生成内容的章节）
function isLeafChapter(chapter: BizSubmissionChapter | null): boolean {
  if (!chapter) return false;
  return !chapter.children || chapter.children.length === 0;
}

// 处理章节内容 SSE 消息
function handleChapterContentSseMessage(data: any) {
  const { type, chapterId, message: msg, progress, total, current } = data;

  switch (type) {
    case 'chapter_start':
      updateChapterStatusInTree(chapterId, 'generating');
      break;
    case 'chapter_success':
      updateChapterStatusInTree(chapterId, 'completed');
      // 如果是当前选中章节，刷新内容
      if (currentChapter.value?.id === chapterId) {
        refreshCurrentChapter();
      }
      break;
    case 'chapter_error':
      updateChapterStatusInTree(chapterId, 'failed');
      if (currentChapter.value?.id === chapterId) {
        message.error(msg || '章节生成失败');
      }
      break;
    case 'batch_start':
      batchGenerating.value = true;
      batchTotal.value = total || 0;
      batchCurrent.value = 0;
      batchProgress.value = 0;
      batchMessage.value = msg || '开始批量生成...';
      break;
    case 'batch_progress':
      batchCurrent.value = current || 0;
      batchTotal.value = total || 0;
      batchProgress.value = progress || 0;
      batchMessage.value = msg || '';
      if (chapterId) {
        updateChapterStatusInTree(chapterId, 'generating');
      }
      break;
    case 'batch_chapter_success':
      batchCurrent.value = current || 0;
      batchTotal.value = total || batchTotal.value;
      batchProgress.value = progress || 0;
      batchMessage.value = msg || `已完成 (${batchCurrent.value}/${batchTotal.value})`;
      if (chapterId) {
        updateChapterStatusInTree(chapterId, 'completed');
        if (currentChapter.value?.id === chapterId) {
          refreshCurrentChapter();
        }
      }
      break;
    case 'batch_success':
      stopBatchPolling();
      batchProgress.value = 100;
      batchMessage.value = msg || '全部生成完成';
      message.success('全部章节生成完成');
      loadChapterTree();
      setTimeout(() => {
        batchGenerating.value = false;
        batchMessage.value = '';
      }, 2000);
      break;
    case 'batch_error':
      stopBatchPolling();
      batchGenerating.value = false;
      batchMessage.value = msg || '批量生成失败';
      message.error(msg || '批量生成失败');
      break;
  }
}

// 在树中更新章节状态
function updateChapterStatusInTree(chapterId: number, status: string) {
  function updateInList(list: BizSubmissionChapter[]): boolean {
    for (const item of list) {
      if (item.id === chapterId) {
        item.generationStatus = status;
        return true;
      }
      if (item.children?.length && updateInList(item.children)) {
        return true;
      }
    }
    return false;
  }
  updateInList(chapterTree.value);
  // 强制触发响应式更新
  chapterTree.value = [...chapterTree.value];
}

// 刷新当前选中章节的内容
async function refreshCurrentChapter() {
  if (!currentChapter.value?.id) return;
  try {
    const info = await getChapterInfo(String(currentChapter.value.id));
    if (info) {
      currentChapter.value = { ...currentChapter.value, ...info };
      chapterContentValue.value = info.chapterContent || '';
      contentModified.value = false;
    }
  } catch (e) {
    // 忽略刷新错误
  }
}

// 加载附件列表
async function loadAttachments() {
  if (attachmentList.value.length > 0) return; // 已加载过就不重复请求
  attachmentLoading.value = true;
  try {
    const list = await getSubmissionAttachments(props.submissionId);
    attachmentList.value = list || [];
  } catch (e) {
    message.error('加载附件信息失败');
  } finally {
    attachmentLoading.value = false;
  }
}

// 附件弹窗打开时加载
function handleAttachmentPopoverChange(open: boolean) {
  attachmentPopoverOpen.value = open;
  if (open) {
    loadAttachments();
  }
}

// 格式化文件大小
function formatFileSize(bytes?: number): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// 判断是否可预览
function canPreview(format?: string): boolean {
  if (!format) return false;
  return ['pdf', 'docx', 'doc'].includes(format.toLowerCase());
}

// 预览附件
function handlePreviewAttachment(attachment: BidProjectAttachment) {
  if (!attachment.filePath) {
    message.warning('文件路径不存在');
    return;
  }
  previewFileUrl.value = attachment.filePath;
  previewFileName.value = attachment.attachmentName || '文件预览';
  previewFileFormat.value = attachment.fileFormat || '';
  previewVisible.value = true;
  attachmentPopoverOpen.value = false; // 关闭气泡弹窗
}

// 关闭预览
function handleClosePreview() {
  previewVisible.value = false;
}


</script>

<template>
  <div class="step2-generate">
    <!-- 左侧章节树 -->
    <div class="chapter-sidebar">
      <div class="sidebar-header">
        <span class="sidebar-title">章节目录</span>
        <div class="sidebar-actions">
          <Tooltip title="一键生成全部内容">
            <Button type="text" size="small" :icon="h(ThunderboltOutlined)" @click="handleGenerateAll" :disabled="batchGenerating" />
          </Tooltip>
          <Button type="text" size="small" :icon="h(PlusOutlined)" @click="handleAddChapter" title="新建章节" />
          <Dropdown placement="bottomRight">
            <Button type="text" size="small" :icon="h(EllipsisOutlined)" />
            <template #overlay>
              <Menu>
                <MenuItem key="regenerate" @click="handleRegenerate">
                  <ReloadOutlined />
                  重新生成结构
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
        <!-- 批量生成进度条 -->
        <div v-if="batchGenerating" class="batch-progress">
          <div class="batch-progress-info">
            <LoadingOutlined spin />
            <span>{{ batchMessage }}</span>

          </div>
          <Progress :percent="batchProgress" :show-info="true" size="small" />
          <div v-if="batchTotal > 0" class="batch-progress-detail">
            {{ batchCurrent }} / {{ batchTotal }} 章节
          </div>
        </div>

        <div v-if="loading" class="loading-state">
          <span>加载中...</span>
        </div>
        <div v-else-if="generating" class="generating-state">
          <LoadingOutlined spin class="generating-icon" />
          <p class="generating-text">{{ generatingMessage || 'AI 正在生成章节结构，请稍候...' }}</p>
          <p class="generating-hint">生成过程通常需要 30~60 秒</p>
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
          :expanded-keys="expandedKeys"
          v-model:selected-keys="selectedKeys"
          :tree-data="chapterTree"
          :field-names="{ title: 'chapterTitle', key: 'id', children: 'children' }"
          :expand-action="'click'"
          :virtual="false"
          draggable
          @select="handleTreeSelect"
          @expand="handleTreeExpand"
          @drop="handleTreeDrop"
        >
          <template #switcherIcon="{ expanded }">
            <CaretRightOutlined :class="['switcher-icon', { 'switcher-icon-open': expanded }]" />
          </template>
          <template #title="node">
            <div class="tree-node-wrapper">
              <span class="tree-node-title">
                <span class="chapter-no">{{ node.chapterNo }}</span>
                <span class="chapter-title-text">{{ node.chapterTitle }}</span>
                <Tooltip v-if="isLeafChapter(node) && node.chapterType === 'template'" title="规定格式">
                  <SafetyCertificateOutlined class="chapter-type-icon" />
                </Tooltip>
                <span v-if="isLeafChapter(node)" class="chapter-status-icon">
                  <CheckCircleFilled v-if="node.generationStatus === 'completed'" style="color: #52c41a; font-size: 12px;" />
                  <LoadingOutlined v-else-if="node.generationStatus === 'generating'" spin style="color: #1677ff; font-size: 12px;" />
                  <CloseCircleFilled v-else-if="node.generationStatus === 'failed'" style="color: #ff4d4f; font-size: 12px;" />
                  <ClockCircleOutlined v-else style="color: #d9d9d9; font-size: 12px;" />
                </span>
              </span>
              <div class="tree-node-actions" @click.stop>
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
                  :disabled="batchGenerating"
                  @click="editChapterContent(node)"
                />
                <Popconfirm
                  title="确认删除该章节？"
                  description="若有子章节也会一并删除。"
                  ok-text="删除"
                  ok-type="danger"
                  cancel-text="取消"
                  placement="right"
                  :disabled="batchGenerating"
                  @confirm="handleDeleteChapter(node)"
                >
                  <Button
                    type="text"
                    size="small"
                    :icon="h(DeleteOutlined)"
                    class="btn-danger"
                    :disabled="batchGenerating"
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
          <span v-if="contentModified" class="modified-hint">* 内容已修改</span>
          <Button :loading="contentSaving" :disabled="!contentModified" @click="handleSaveContent" v-if="isLeafChapter(currentChapter) && (currentChapter?.chapterContent || chapterContentValue)">
            <template #icon><SaveOutlined /></template>
            保存
          </Button>
          <Button @click="handleRegenerateContent" v-if="isLeafChapter(currentChapter) && (currentChapter?.chapterContent || chapterContentValue)">
            <template #icon><ReloadOutlined /></template>
            重新生成
          </Button>
          <Button @click="knowledgePickerOpen = true" v-if="isLeafChapter(currentChapter) && (currentChapter?.chapterContent || chapterContentValue)">
            <template #icon><PictureOutlined /></template>
            知识库图片
          </Button>
          <!-- 附件信息按钮 -->
          <Popover
            v-model:open="attachmentPopoverOpen"
            trigger="click"
            placement="bottomRight"
            overlay-class-name="attachment-popover"
            @open-change="handleAttachmentPopoverChange"
          >
            <template #content>
              <div class="attachment-popover-content">
                <div class="attachment-popover-title">招标文件附件</div>
                <Spin v-if="attachmentLoading" size="small" style="display: block; text-align: center; padding: 20px 0;" />
                <div v-else-if="attachmentList.length === 0" class="attachment-empty">暂无附件</div>
                <div v-else class="attachment-list">
                  <div
                    v-for="item in attachmentList"
                    :key="item.id"
                    class="attachment-item"
                  >
                    <div class="attachment-item-icon">
                      <FilePdfOutlined v-if="item.fileFormat === 'pdf'" style="color: #ff4d4f; font-size: 20px;" />
                      <FileWordOutlined v-else-if="item.fileFormat === 'docx' || item.fileFormat === 'doc'" style="color: #1677ff; font-size: 20px;" />
                      <FileUnknownOutlined v-else style="color: #999; font-size: 20px;" />
                    </div>
                    <div class="attachment-item-info">
                      <div class="attachment-item-name" :title="item.attachmentName">{{ item.attachmentName }}</div>
                      <div class="attachment-item-meta">
                        <span>{{ item.fileFormat?.toUpperCase() }}</span>
                        <span>{{ formatFileSize(item.fileSize) }}</span>
                      </div>
                    </div>
                    <Button
                      v-if="canPreview(item.fileFormat)"
                      type="link"
                      size="small"
                      @click="handlePreviewAttachment(item)"
                    >
                      <template #icon><EyeOutlined /></template>
                      预览
                    </Button>
                  </div>
                </div>
              </div>
            </template>
            <Button>
              <template #icon><PaperClipOutlined /></template>
              附件信息
            </Button>
          </Popover>
          <Button @click="handleBack">返回</Button>
          <Button type="primary" @click="handleNext">下一步</Button>
        </div>
      </div>

      <div ref="contentBodyRef" class="content-body">
        <div v-if="currentChapter" class="chapter-detail">
          <!-- 父级章节（目录节点）：不生成内容 -->
          <template v-if="!isLeafChapter(currentChapter)">
            <div class="content-empty">
              <FileTextOutlined style="font-size: 48px; color: #d9d9d9; margin-bottom: 16px;" />
              <p>该章节为目录节点，请选择子章节查看内容</p>
            </div>
          </template>

          <!-- 叶子章节：可生成/查看/编辑内容 -->
          <template v-else>
            <!-- 章节元信息和生成说明：仅在未生成内容时显示 -->
            <template v-if="!currentChapter.chapterContent && !chapterContentValue">
              <div class="chapter-meta">
                <span>章节编号: {{ currentChapter.chapterNo }}</span>
                <span>层级: {{ currentChapter.chapterLevel }}</span>
                <span>
                  状态:
                  <CheckCircleFilled v-if="currentChapter.generationStatus === 'completed'" style="color: #52c41a" />
                  <LoadingOutlined v-else-if="currentChapter.generationStatus === 'generating'" spin style="color: #1677ff" />
                  <CloseCircleFilled v-else-if="currentChapter.generationStatus === 'failed'" style="color: #ff4d4f" />
                  <ClockCircleOutlined v-else style="color: #d9d9d9" />
                  {{ currentChapter.generationStatus === 'completed' ? '已完成' : currentChapter.generationStatus === 'generating' ? '生成中' : currentChapter.generationStatus === 'failed' ? '失败' : '待生成' }}
                </span>
              </div>

              <div v-if="currentChapter.reasonDescription" class="chapter-reason">
                <div class="reason-title">生成说明</div>
                <div class="reason-content">{{ currentChapter.reasonDescription }}</div>
              </div>
            </template>

            <!-- 错误信息 -->
            <div v-if="currentChapter.generationStatus === 'failed' && currentChapter.errorMessage" class="chapter-error">
              <CloseCircleFilled style="color: #ff4d4f" />
              <span>{{ currentChapter.errorMessage }}</span>
              <Button type="link" size="small" @click="generateChapterContent(currentChapter)">重新生成</Button>
            </div>

            <!-- 生成中状态 -->
            <div v-if="currentChapter.generationStatus === 'generating'" class="chapter-generating">
              <Spin>
                <template #indicator>
                  <LoadingOutlined style="font-size: 24px" spin />
                </template>
              </Spin>
              <p>AI 正在生成章节内容，请稍候...</p>
            </div>

            <!-- 已有内容：AiEditor -->
            <div v-else-if="currentChapter.chapterContent || chapterContentValue" class="chapter-content">
              <AiEditorComp
                ref="editorRef"
                :key="currentChapter.id"
                v-model="chapterContentValue"
                :height="editorHeight"
                :chapter-id="currentChapter?.id"
                placeholder="章节内容..."
                @change="handleEditorChange"
              />
            </div>

            <!-- 无内容：生成按钮 -->
            <div v-else class="content-empty">
              <FileTextOutlined style="font-size: 48px; color: #d9d9d9; margin-bottom: 16px;" />
              <p>该章节内容尚未生成</p>
              <Button type="primary" @click="generateChapterContent(currentChapter)">
                <ThunderboltOutlined />
                生成此章节
              </Button>
            </div>
          </template>
        </div>
        <div v-else class="welcome-state">
          <FileTextOutlined class="welcome-icon" />
          <p class="welcome-text">请从左侧选择章节查看内容</p>
          <p class="welcome-hint">或点击左上角闪电图标一键生成全部章节</p>
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
        <FormItem label="章节类型">
          <Select v-model:value="chapterModalForm.chapterType" style="width: 100%;">
            <SelectOption value="generate">AI生成</SelectOption>
            <SelectOption value="template">规定格式</SelectOption>
          </Select>
        </FormItem>
        <FormItem label="原因说明">
          <Input.TextArea
            v-model:value="chapterModalForm.reasonDescription"
            placeholder="请输入原因说明（选填）"
            :rows="3"
            :max-length="500"
            show-count
          />
        </FormItem>
      </Form>
    </Modal>

    <!-- 悬浮文件预览 -->
    <FloatingPreview
      :visible="previewVisible"
      :file-url="previewFileUrl"
      :file-name="previewFileName"
      :file-format="previewFileFormat"
      @close="handleClosePreview"
    />

    <!-- 知识库图片选择弹窗 -->
    <KnowledgeImagePicker
      v-model:open="knowledgePickerOpen"
      :company-id="currentDocumentCompanyId"
      @select="handleInsertKnowledgeImages"
    />
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

      .batch-progress {
        padding: 12px;
        background: #f0f7ff;
        border-radius: 8px;
        margin-bottom: 12px;
        border: 1px solid hsl(var(--primary) / 0.2);

        .batch-progress-info {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          font-size: 13px;
          color: hsl(var(--primary));
          font-weight: 500;
        }

        .batch-progress-detail {
          font-size: 12px;
          color: #999;
          margin-top: 4px;
          text-align: right;
        }
      }

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
        }

        .generating-text {
          color: hsl(var(--primary));
          margin-bottom: 8px;
          font-size: 14px;
          font-weight: 500;
        }

        .generating-hint {
          color: #999;
          font-size: 12px;
          margin: 0;
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

        // 展开/折叠过渡动画
        .ant-tree-treenode-motion {
          transition: all 0.25s ease-in-out;
          overflow: hidden;
        }

        .ant-tree-treenode {
          padding: 4px 0;
        }

        .ant-tree-node-content-wrapper {
          border-radius: 6px;
          padding: 4px 8px;
          transition: background-color 0.2s;
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
          transition: transform 0.25s ease;

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
            min-width: 0;

            .chapter-no {
              color: hsl(var(--primary));
              font-weight: 600;
              flex-shrink: 0;
            }

            .chapter-title-text {
              flex: 1;
              min-width: 0;
              overflow: hidden;
              white-space: nowrap;
              text-overflow: ellipsis;
            }

            .chapter-type-icon {
              flex-shrink: 0;
              color: #1677ff;
              font-size: 13px;
              margin-left: 2px;
            }

            .chapter-status-icon {
              flex-shrink: 0;
              display: inline-flex;
              align-items: center;
            }
          }

          .tree-node-actions {
            display: flex;
            gap: 2px;
            flex-shrink: 0;
            margin-left: auto;
            min-width: 120px;
            justify-content: flex-end;

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
        align-items: center;

        .modified-hint {
          color: #faad14;
          font-size: 13px;
          margin-right: 4px;
        }
      }
    }

    .content-body {
      flex: 1;
      overflow: hidden;
      padding: 24px;

      .chapter-detail {
        .chapter-meta {
          display: flex;
          gap: 24px;
          padding: 12px 16px;
          background: #fafafa;
          border-radius: 8px;
          margin-bottom: 16px;
          font-size: 13px;
          color: #666;
          align-items: center;
        }

        .chapter-reason {
          margin-bottom: 16px;
          padding: 12px 16px;
          background: #f0f7ff;
          border-left: 4px solid hsl(var(--primary));
          border-radius: 4px;

          .reason-title {
            font-size: 13px;
            font-weight: 600;
            color: hsl(var(--primary));
            margin-bottom: 4px;
          }

          .reason-content {
            font-size: 13px;
            line-height: 1.6;
            color: rgba(0, 0, 0, 0.88);
          }
        }

        .chapter-error {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: #fff2f0;
          border: 1px solid #ffccc7;
          border-radius: 8px;
          margin-bottom: 16px;
          font-size: 13px;
          color: #ff4d4f;
        }

        .chapter-generating {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 20px;
          text-align: center;

          p {
            margin-top: 16px;
            color: #666;
            font-size: 14px;
          }
        }

        .chapter-content {
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

/* 附件弹窗样式 */
.attachment-popover .ant-popover-inner {
  padding: 0;
}

.attachment-popover-content {
  width: 360px;
  max-height: 420px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.attachment-popover-title {
  font-size: 15px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
}

.attachment-empty {
  padding: 32px 16px;
  text-align: center;
  color: #999;
  font-size: 14px;
}

.attachment-list {
  overflow-y: auto;
  max-height: 360px;
  padding: 8px 0;
}

.attachment-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  cursor: default;
  transition: background 0.2s;
}

.attachment-item:hover {
  background: #f5f5f5;
}

.attachment-item-icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
  border-radius: 6px;
}

.attachment-item-info {
  flex: 1;
  min-width: 0;
}

.attachment-item-name {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.88);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  line-height: 1.4;
}

.attachment-item-meta {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: #999;
  line-height: 1.4;
}
</style>
