<script setup lang="ts">
import { ref, watch } from 'vue';
import { Modal, Tabs, TabPane, Spin, Empty, Image, Checkbox, message } from 'ant-design-vue';
import { personnelList, certificateList, type BizPersonnel, type PersonnelCertificate } from '#/api/resource/personnel/index';
import { qualificationList, type BizQualification } from '#/api/resource/qualification';
import { performanceList, type BizPerformance } from '#/api/resource/performance';
import { patentMedalList, type BizPatentMedal } from '#/api/resource/patent-medal/index';
import { financeList, type BizFinanceInfo } from '#/api/resource/finance';

interface ImageItem {
  url: string;
  label: string;
  category: string;
}

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

// 各分类图片列表
const personnelImages = ref<ImageItem[]>([]);
const qualificationImages = ref<ImageItem[]>([]);
const performanceImages = ref<ImageItem[]>([]);
const patentImages = ref<ImageItem[]>([]);
const financeImages = ref<ImageItem[]>([]);

watch(() => props.open, async (val) => {
  if (val) {
    selectedUrls.value = [];
    await loadAllImages();
  }
});

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
  const items: ImageItem[] = [];
  try {
    const res = await personnelList({ pageNum: 1, pageSize: 200, deptId: props.companyId });
    const list: BizPersonnel[] = res?.rows || [];
    for (const p of list) {
      if (p.photo) items.push({ url: p.photo, label: `${p.name} - 照片`, category: '人员照片' });
      if (p.idCardFront) items.push({ url: p.idCardFront, label: `${p.name} - 身份证正面`, category: '身份证' });
      if (p.idCardBack) items.push({ url: p.idCardBack, label: `${p.name} - 身份证背面`, category: '身份证' });
      // 加载该人员的证书
      if (p.id) {
        try {
          const certs: PersonnelCertificate[] = await certificateList(p.id) || [];
          for (const cert of certs) {
            if (cert.certificateImage) {
              items.push({ url: cert.certificateImage, label: `${p.name} - ${cert.certificateName || '证书'}`, category: '人员证书' });
            }
          }
        } catch (e) { /* ignore */ }
      }
    }
  } catch (e) { /* ignore */ }
  personnelImages.value = items;
}

/** 加载企业资质图片 */
async function loadQualificationImages() {
  const items: ImageItem[] = [];
  try {
    const res = await qualificationList({ pageNum: 1, pageSize: 200, deptId: props.companyId });
    const list: BizQualification[] = res?.rows || [];
    for (const q of list) {
      if (q.certImages) {
        // certImages 可能是逗号分隔的多张图
        const urls = q.certImages.split(',').map(u => u.trim()).filter(Boolean);
        urls.forEach((url, idx) => {
          items.push({ url, label: `${q.certName || '资质证书'}${urls.length > 1 ? ` (${idx + 1})` : ''}`, category: '企业资质' });
        });
      }
    }
  } catch (e) { /* ignore */ }
  qualificationImages.value = items;
}

/** 加载业绩案例附件图片 */
async function loadPerformanceImages() {
  const items: ImageItem[] = [];
  try {
    const res = await performanceList({ pageNum: 1, pageSize: 200, deptId: props.companyId });
    const list: BizPerformance[] = res?.rows || [];
    for (const p of list) {
      const name = p.name || '业绩项目';
      // 合同图片（逗号分隔）
      if (p.contractImages) {
        splitUrls(p.contractImages).forEach((url, idx, arr) => {
          items.push({ url, label: `${name} - 合同${arr.length > 1 ? ` (${idx + 1})` : ''}`, category: '业绩合同' });
        });
      }
      // 中标通知书
      if (p.bidNoticeAttachment) {
        splitUrls(p.bidNoticeAttachment).forEach((url, idx, arr) => {
          items.push({ url, label: `${name} - 中标通知书${arr.length > 1 ? ` (${idx + 1})` : ''}`, category: '中标通知' });
        });
      }
      // 验收报告
      if (p.acceptanceAttachment) {
        splitUrls(p.acceptanceAttachment).forEach((url, idx, arr) => {
          items.push({ url, label: `${name} - 验收报告${arr.length > 1 ? ` (${idx + 1})` : ''}`, category: '验收报告' });
        });
      }
    }
  } catch (e) { /* ignore */ }
  performanceImages.value = items;
}

/** 加载专利奖章图片 */
async function loadPatentImages() {
  const items: ImageItem[] = [];
  try {
    const res = await patentMedalList({ pageNum: 1, pageSize: 200, deptId: props.companyId });
    const list: BizPatentMedal[] = res?.rows || [];
    for (const p of list) {
      const name = p.patentName || '专利';
      if (p.patentImage) {
        items.push({ url: p.patentImage, label: `${name} - 专利图`, category: '专利图' });
      }
      if (p.certificateImage) {
        items.push({ url: p.certificateImage, label: `${name} - 证书`, category: '专利证书' });
      }
    }
  } catch (e) { /* ignore */ }
  patentImages.value = items;
}

/** 加载财务信息附件 */
async function loadFinanceImages() {
  const items: ImageItem[] = [];
  try {
    const res = await financeList({ pageNum: 1, pageSize: 200, deptId: props.companyId });
    const list: BizFinanceInfo[] = res?.rows || [];
    for (const f of list) {
      if (f.attachmentUrl) {
        splitUrls(f.attachmentUrl).forEach((url, idx, arr) => {
          const name = f.financeName || '财务信息';
          items.push({ url, label: `${name}${arr.length > 1 ? ` (${idx + 1})` : ''}`, category: '财务信息' });
        });
      }
    }
  } catch (e) { /* ignore */ }
  financeImages.value = items;
}

/** 分割逗号分隔的URL */
function splitUrls(urlStr: string): string[] {
  return urlStr.split(',').map(u => u.trim()).filter(Boolean);
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
    width="800px"
    ok-text="插入选中图片"
    cancel-text="取消"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <Spin :spinning="loading">
      <Tabs v-model:activeKey="activeTab">
        <!-- 人员及证书 -->
        <TabPane key="personnel" tab="人员及证书">
          <div v-if="personnelImages.length === 0" class="image-empty">
            <Empty description="暂无人员图片" />
          </div>
          <div v-else class="image-grid">
            <div
              v-for="item in personnelImages"
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
          <div v-if="qualificationImages.length === 0" class="image-empty">
            <Empty description="暂无资质图片" />
          </div>
          <div v-else class="image-grid">
            <div
              v-for="item in qualificationImages"
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
          <div v-if="performanceImages.length === 0" class="image-empty">
            <Empty description="暂无业绩图片" />
          </div>
          <div v-else class="image-grid">
            <div
              v-for="item in performanceImages"
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
          <div v-if="patentImages.length === 0" class="image-empty">
            <Empty description="暂无专利图片" />
          </div>
          <div v-else class="image-grid">
            <div
              v-for="item in patentImages"
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
          <div v-if="financeImages.length === 0" class="image-empty">
            <Empty description="暂无财务附件" />
          </div>
          <div v-else class="image-grid">
            <div
              v-for="item in financeImages"
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
