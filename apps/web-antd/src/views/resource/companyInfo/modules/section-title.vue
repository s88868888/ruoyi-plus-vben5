<script setup lang="ts">
defineProps<{
  title: string;
}>();
</script>

<template>
  <span class="section-title">{{ title }}</span>
</template>

<style scoped>
.section-title {
  padding-left: 8px;
  border-left: 3px solid hsl(var(--primary));
  font-weight: 600;
  font-size: 16px;
  line-height: 1.5;
}
</style>
