<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';
import { ref, watch } from 'vue';

const props = defineProps<{
  data: Array<{ ruleName: string; hitCount: number }>;
}>();

const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);

watch(
  () => props.data,
  (val) => {
    if (!val || val.length === 0) return;
    // 倒序：排行最高的在最上面
    const sorted = [...val].reverse();
    renderEcharts({
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      grid: {
        left: '3%',
        right: '10%',
        bottom: '3%',
        top: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        minInterval: 1,
        splitLine: { lineStyle: { type: 'dashed' } },
      },
      yAxis: {
        type: 'category',
        data: sorted.map((item) => item.ruleName),
        axisLabel: {
          width: 120,
          overflow: 'truncate',
          fontSize: 11,
        },
      },
      series: [
        {
          type: 'bar',
          data: sorted.map((item) => item.hitCount),
          barMaxWidth: 20,
          itemStyle: {
            borderRadius: [0, 4, 4, 0],
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 1, y2: 0,
              colorStops: [
                { offset: 0, color: '#1677ff' },
                { offset: 1, color: '#69b1ff' },
              ],
            },
          },
          label: {
            show: true,
            position: 'right',
            fontSize: 11,
            color: '#666',
          },
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
