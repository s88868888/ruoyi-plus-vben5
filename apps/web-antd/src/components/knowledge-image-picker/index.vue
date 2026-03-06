<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { Modal, Tabs, TabPane, Spin, Empty, Image, Checkbox, message, Input } from 'ant-design-vue';
import { personnelList, certificateList, type BizPersonnel, type PersonnelCertificate } from '#/api/resource/personnel/index';
import { qualificationList, type BizQualification } from '#/api/resource/qualification';
import { performanceList, type BizPerformance } from '#/api/resource/performance';
import { patentMedalList, type BizPatentMedal } from '#/api/resource/patent-medal/index';
import { financeList, type BizFinanceInfo } from '#/api/resource/finance';
import { ossInfo } from '#/api/system/oss';

interface ImageItem {
  url: string;
  label: string;
  category: string;
}

// 待解析的条目（值可能是 OSS ID 或 URL）
interface RawItem {
  value: string;
  label: string;
  category: string;
}

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];

const props = defineProps<{
  open: boolean;
  companyId?: number;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  select: [urls: string[]];
}>();

const loading = ref(false);
const activeTab = ref('personnel');
const selectedUrls = ref<string[]>([]);
const searchKeyword = ref('');

// 各分类图片列表
const personnelImages = ref<ImageItem[]>([]);
const qualificationImages = ref<ImageItem[]>([]);
const performanceImages = ref<ImageItem[]>([]);
const patentImages = ref<ImageItem[]>([]);
const financeImages = ref<ImageItem[]>([]);

/** 当前 Tab 对应的原始列表 */
const currentImages = computed<ImageItem[]>(() => {
  const map: Record<string, ImageItem[]> = {
    personnel: personnelImages.value,
    qualification: qualificationImages.value,
    performance: performanceImages.value,
    patent: patentImages.value,
    finance: financeImages.value,
  };
  return map[activeTab.value] || [];
});

/** 搜索过滤后的列表 */
const filteredImages = computed<ImageItem[]>(() => {
  const kw = searchKeyword.value.trim().toLowerCase();
  if (!kw) return currentImages.value;
  return currentImages.value.filter(item => item.label.toLowerCase().includes(kw));
});

function onTabChange() {
  searchKeyword.value = '';
}

watch(() => props.open, async (val) => {
  if (val) {
    selectedUrls.value = [];
    searchKeyword.value = '';
    await loadAllImages();
  }
});

/** 判断值是否为直接 URL */
function isDirectUrl(val: string): boolean {
  return val.startsWith('http://') || val.startsWith('https://');
}

/** 判断值是否为 OSS ID（纯数字） */
function isOssId(val: string): boolean {
  return /^\d+$/.test(val);
}

/** 判断 URL 是否为图片 */
function isImageUrl(url: string): boolean {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    return IMAGE_EXTS.some(ext => pathname.endsWith(ext));
  } catch {
    // 非标准 URL，按扩展名兜底判断
    const lower = url.toLowerCase();
    return IMAGE_EXTS.some(ext => lower.endsWith(ext));
  }
}

/** 将原始值列表（可能含 OSS ID）解析为图片 URL 列表 */
async function resolveRawItems(rawItems: RawItem[]): Promise<ImageItem[]> {
  if (rawItems.length === 0) return [];

  const result: ImageItem[] = [];
  const ossIdItems: { ossId: string; label: string; category: string }[] = [];

  // 先分流：直接 URL vs OSS ID
  for (const item of rawItems) {
    if (isDirectUrl(item.value)) {
      if (isImageUrl(item.value)) {
        result.push({ url: item.value, label: item.label, category: item.category });
      }
    } else if (isOssId(item.value)) {
      // 纯数字才当作 OSS ID
      ossIdItems.push({ ossId: item.value, label: item.label, category: item.category });
    }
    // 其他值（如普通文本）直接忽略
  }

  // 批量解析 OSS ID -> URL
  if (ossIdItems.length > 0) {
    try {
      const allIds = ossIdItems.map(i => i.ossId).join(',');
      const ossFiles = await ossInfo(allIds);
      const urlMap = new Map<string, { url: string; suffix: string }>();
      for (const f of ossFiles) {
        urlMap.set(String(f.ossId), { url: f.url, suffix: (f.fileSuffix || '').toLowerCase() });
      }
      for (const item of ossIdItems) {
        const file = urlMap.get(item.ossId);
        if (file && IMAGE_EXTS.includes(file.suffix)) {
          result.push({ url: file.url, label: item.label, category: item.category });
        }
      }
    } catch { /* OSS 解析失败则跳过 */ }
  }

  return result;
}

/** 分割逗号分隔的值（可能是 URL 也可能是 OSS ID） */
function splitValues(str: string): string[] {
  return str.split(',').map(u => u.trim()).filter(Boolean);
}

async function loadAllImages() {
  loading.value = true;
  try {
    await Promise.all([
      loadPersonnelImages(),
      loadQualificationImages(),
      loadPerformanceImages(),
      loadPatentImages(),
      loadFinanceImages(),
    ]);
  } finally {
    loading.value = false;
  }
}

/** 加载人员及其证书图片 */
async function loadPersonnelImages() {
  const rawItems: RawItem[] = [];
  try {
    const res = await personnelList({ pageNum: 1, pageSize: 200, deptId: props.companyId });
    const list: BizPersonnel[] = res?.rows || [];
    for (const p of list) {
      if (p.photo) rawItems.push({ value: p.photo, label: `${p.name} - 照片`, category: '人员照片' });
      if (p.idCardFront) rawItems.push({ value: p.idCardFront, label: `${p.name} - 身份证正面`, category: '身份证' });
      if (p.idCardBack) rawItems.push({ value: p.idCardBack, label: `${p.name} - 身份证背面`, category: '身份证' });
      if (p.id) {
        try {
          const certs: PersonnelCertificate[] = await certificateList(p.id) || [];
          for (const cert of certs) {
            if (cert.certificateImage) {
              rawItems.push({ value: cert.certificateImage, label: `${p.name} - ${cert.certificateName || '证书'}`, category: '人员证书' });
            }
          }
        } catch { /* ignore */ }
      }
    }
  } catch { /* ignore */ }
  personnelImages.value = await resolveRawItems(rawItems);
}

/** 加载企业资质图片 */
async function loadQualificationImages() {
  const rawItems: RawItem[] = [];
  try {
    const res = await qualificationList({ pageNum: 1, pageSize: 200, deptId: props.companyId });
    const list: BizQualification[] = res?.rows || [];
    for (const q of list) {
      if (q.certImages) {
        const values = splitValues(q.certImages);
        values.forEach((val, idx) => {
          rawItems.push({ value: val, label: `${q.certName || '资质证书'}${values.length > 1 ? ` (${idx + 1})` : ''}`, category: '企业资质' });
        });
      }
    }
  } catch { /* ignore */ }
  qualificationImages.value = await resolveRawItems(rawItems);
}

/** 加载业绩案例附件图片 */
async function loadPerformanceImages() {
  const rawItems: RawItem[] = [];
  try {
    const res = await performanceList({ pageNum: 1, pageSize: 200, deptId: props.companyId });
    const list: BizPerformance[] = res?.rows || [];
    for (const p of list) {
      const name = p.name || '业绩项目';
      if (p.contractImages) {
        splitValues(p.contractImages).forEach((val, idx, arr) => {
          rawItems.push({ value: val, label: `${name} - 合同${arr.length > 1 ? ` (${idx + 1})` : ''}`, category: '业绩合同' });
        });
      }
      if (p.bidNoticeAttachment) {
        splitValues(p.bidNoticeAttachment).forEach((val, idx, arr) => {
          rawItems.push({ value: val, label: `${name} - 中标通知书${arr.length > 1 ? ` (${idx + 1})` : ''}`, category: '中标通知' });
        });
      }
      if (p.acceptanceAttachment) {
        splitValues(p.acceptanceAttachment).forEach((val, idx, arr) => {
          rawItems.push({ value: val, label: `${name} - 验收报告${arr.length > 1 ? ` (${idx + 1})` : ''}`, category: '验收报告' });
        });
      }
    }
  } catch { /* ignore */ }
  performanceImages.value = await resolveRawItems(rawItems);
}

/** 加载专利奖章图片 */
async function loadPatentImages() {
  const rawItems: RawItem[] = [];
  try {
    const res = await patentMedalList({ pageNum: 1, pageSize: 200, deptId: props.companyId });
    const list: BizPatentMedal[] = res?.rows || [];
    for (const p of list) {
      const name = p.patentName || '专利';
      if (p.patentImage) rawItems.push({ value: p.patentImage, label: `${name} - 专利图`, category: '专利图' });
      if (p.certificateImage) rawItems.push({ value: p.certificateImage, label: `${name} - 证书`, category: '专利证书' });
    }
  } catch { /* ignore */ }
  patentImages.value = await resolveRawItems(rawItems);
}

/** 加载财务信息附件（仅图片） */
async function loadFinanceImages() {
  const rawItems: RawItem[] = [];
  try {
    const res = await financeList({ pageNum: 1, pageSize: 200, deptId: props.companyId });
    const list: BizFinanceInfo[] = res?.rows || [];
    for (const f of list) {
      if (f.attachmentUrl) {
        splitValues(f.attachmentUrl).forEach((val, idx, arr) => {
          const name = f.financeName || '财务信息';
          rawItems.push({ value: val, label: `${name}${arr.length > 1 ? ` (${idx + 1})` : ''}`, category: '财务信息' });
        });
      }
    }
  } catch { /* ignore */ }
  financeImages.value = await resolveRawItems(rawItems);
}

function toggleSelect(url: string) {
  const idx = selectedUrls.value.indexOf(url);
  if (idx >= 0) {
    selectedUrls.value.splice(idx, 1);
  } else {
    selectedUrls.value.push(url);
  }
}

function isSelected(url: string) {
  return selectedUrls.value.includes(url);
}

function handleOk() {
  if (selectedUrls.value.length === 0) {
    message.warning('请至少选择一张图片');
    return;
  }
  emit('select', [...selectedUrls.value]);
  emit('update:open', false);
}

function handleCancel() {
  emit('update:open', false);
}

const fallbackImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTQwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5IiBmb250LXNpemU9IjEyIj7liqDovb3lpLHotKU8L3RleHQ+PC9zdmc+';
</script>

<template>
  <Modal
    :open="props.open"
    title="插入知识库图片"
    :width="640"
    wrap-class-name="knowledge-image-picker-modal"
    ok-text="插入选中图片"
    cancel-text="取消"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <Spin :spinning="loading">
      <Input.Search
        v-model:value="searchKeyword"
        placeholder="搜索图片名称..."
        allow-clear
        style="margin-bottom: 12px;"
      />
      <Tabs v-model:activeKey="activeTab" @change="onTabChange">
        <!-- 人员及证书 -->
        <TabPane key="personnel" tab="人员及证书">
          <div v-if="filteredImages.length === 0" class="image-empty">
            <Empty :description="searchKeyword ? '未找到匹配图片' : '暂无人员图片'" />
          </div>
          <div v-else class="image-grid">
            <div
              v-for="item in filteredImages"
              :key="item.url"
              class="image-card"
              :class="{ selected: isSelected(item.url) }"
              @click="toggleSelect(item.url)"
            >
              <div class="image-checkbox">
                <Checkbox :checked="isSelected(item.url)" />
              </div>
              <Image :src="item.url" :preview="false" :width="140" :height="100" style="object-fit: cover; border-radius: 4px;" :fallback="fallbackImage" />
              <div class="image-label" :title="item.label">{{ item.label }}</div>
            </div>
          </div>
        </TabPane>

        <!-- 企业资质 -->
        <TabPane key="qualification" tab="企业资质">
          <div v-if="filteredImages.length === 0" class="image-empty">
            <Empty :description="searchKeyword ? '未找到匹配图片' : '暂无资质图片'" />
          </div>
          <div v-else class="image-grid">
            <div
              v-for="item in filteredImages"
              :key="item.url"
              class="image-card"
              :class="{ selected: isSelected(item.url) }"
              @click="toggleSelect(item.url)"
            >
              <div class="image-checkbox">
                <Checkbox :checked="isSelected(item.url)" />
              </div>
              <Image :src="item.url" :preview="false" :width="140" :height="100" style="object-fit: cover; border-radius: 4px;" :fallback="fallbackImage" />
              <div class="image-label" :title="item.label">{{ item.label }}</div>
            </div>
          </div>
        </TabPane>

        <!-- 业绩附件 -->
        <TabPane key="performance" tab="业绩附件">
          <div v-if="filteredImages.length === 0" class="image-empty">
            <Empty :description="searchKeyword ? '未找到匹配图片' : '暂无业绩图片'" />
          </div>
          <div v-else class="image-grid">
            <div
              v-for="item in filteredImages"
              :key="item.url"
              class="image-card"
              :class="{ selected: isSelected(item.url) }"
              @click="toggleSelect(item.url)"
            >
              <div class="image-checkbox">
                <Checkbox :checked="isSelected(item.url)" />
              </div>
              <Image :src="item.url" :preview="false" :width="140" :height="100" style="object-fit: cover; border-radius: 4px;" :fallback="fallbackImage" />
              <div class="image-label" :title="item.label">{{ item.label }}</div>
            </div>
          </div>
        </TabPane>

        <!-- 专利奖章 -->
        <TabPane key="patent" tab="专利奖章">
          <div v-if="filteredImages.length === 0" class="image-empty">
            <Empty :description="searchKeyword ? '未找到匹配图片' : '暂无专利图片'" />
          </div>
          <div v-else class="image-grid">
            <div
              v-for="item in filteredImages"
              :key="item.url"
              class="image-card"
              :class="{ selected: isSelected(item.url) }"
              @click="toggleSelect(item.url)"
            >
              <div class="image-checkbox">
                <Checkbox :checked="isSelected(item.url)" />
              </div>
              <Image :src="item.url" :preview="false" :width="140" :height="100" style="object-fit: cover; border-radius: 4px;" :fallback="fallbackImage" />
              <div class="image-label" :title="item.label">{{ item.label }}</div>
            </div>
          </div>
        </TabPane>

        <!-- 财务信息 -->
        <TabPane key="finance" tab="财务信息">
          <div v-if="filteredImages.length === 0" class="image-empty">
            <Empty :description="searchKeyword ? '未找到匹配图片' : '暂无财务附件'" />
          </div>
          <div v-else class="image-grid">
            <div
              v-for="item in filteredImages"
              :key="item.url"
              class="image-card"
              :class="{ selected: isSelected(item.url) }"
              @click="toggleSelect(item.url)"
            >
              <div class="image-checkbox">
                <Checkbox :checked="isSelected(item.url)" />
              </div>
              <Image :src="item.url" :preview="false" :width="140" :height="100" style="object-fit: cover; border-radius: 4px;" :fallback="fallbackImage" />
              <div class="image-label" :title="item.label">{{ item.label }}</div>
            </div>
          </div>
        </TabPane>
      </Tabs>
    </Spin>
  </Modal>
</template>

<style scoped lang="less">
.image-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  max-height: 420px;
  overflow-y: auto;
  padding: 4px;
}

.image-card {
  position: relative;
  width: 140px;
  cursor: pointer;
  border: 2px solid transparent;
  border-radius: 6px;
  padding: 4px;
  transition: all 0.2s;

  &:hover {
    border-color: hsl(var(--primary) / 0.4);
    background: hsl(var(--primary) / 0.04);
  }

  &.selected {
    border-color: hsl(var(--primary));
    background: hsl(var(--primary) / 0.08);
  }

  .image-checkbox {
    position: absolute;
    top: 8px;
    left: 8px;
    z-index: 1;
  }

  .image-label {
    margin-top: 4px;
    font-size: 12px;
    color: rgba(0, 0, 0, 0.65);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    text-align: center;
  }
}

.image-empty {
  padding: 40px 0;
}
</style>

<style>
.knowledge-image-picker-modal .ant-modal {
  max-width: 800px !important;
  width: 800px !important;
}
</style>
