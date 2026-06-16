<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';
import { ref, watch } from 'vue';

const props = defineProps<{
  data: Array<{ week: string; errorCount: number; warningCount: number; infoCount: number }>;
}>();

const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);

watch(
  () => props.data,
  (val) => {
    if (!val || val.length === 0) return;
    renderEcharts({
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      legend: {
        data: ['错误', '警告', '提示'],
        bottom: 0,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '12%',
        top: '8%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: val.map((item) => item.week),
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        splitLine: { lineStyle: { type: 'dashed' } },
      },
      series: [
        {
          name: '错误',
          type: 'bar',
          stack: 'severity',
          data: val.map((item) => item.errorCount),
          itemStyle: { color: '#ff4d4f', borderRadius: [0, 0, 0, 0] },
          barMaxWidth: 32,
        },
        {
          name: '警告',
          type: 'bar',
          stack: 'severity',
          data: val.map((item) => item.warningCount),
          itemStyle: { color: '#faad14' },
          barMaxWidth: 32,
        },
        {
          name: '提示',
          type: 'bar',
          stack: 'severity',
          data: val.map((item) => item.infoCount),
          itemStyle: { color: '#1677ff', borderRadius: [4, 4, 0, 0] },
          barMaxWidth: 32,
        },
      ],
    });
  },
  { immediate: true },
);
</script>

<template>
  <EchartsUI ref="chartRef" height="300px" />
</template>
