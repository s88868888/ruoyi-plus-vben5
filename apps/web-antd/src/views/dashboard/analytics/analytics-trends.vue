<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';
import { ref, watch } from 'vue';

const props = defineProps<{
  data: Array<{ date: string; total: number; passCount: number; failCount: number }>;
}>();

const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);

watch(
  () => props.data,
  (val) => {
    if (!val || val.length === 0) return;
    const dates = val.map((item) => item.date.slice(5)); // MM-DD
    renderEcharts({
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
      },
      legend: {
        data: ['总量', '通过', '不通过'],
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
        boundaryGap: false,
        data: dates,
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        splitLine: { lineStyle: { type: 'dashed' } },
      },
      series: [
        {
          name: '总量',
          type: 'line',
          smooth: true,
          data: val.map((item) => item.total),
          lineStyle: { width: 2 },
          itemStyle: { color: '#1677ff' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(22,119,255,0.25)' },
                { offset: 1, color: 'rgba(22,119,255,0.02)' },
              ],
            },
          },
        },
        {
          name: '通过',
          type: 'line',
          smooth: true,
          data: val.map((item) => item.passCount),
          lineStyle: { width: 2 },
          itemStyle: { color: '#52c41a' },
        },
        {
          name: '不通过',
          type: 'line',
          smooth: true,
          data: val.map((item) => item.failCount),
          lineStyle: { width: 2 },
          itemStyle: { color: '#ff4d4f' },
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
