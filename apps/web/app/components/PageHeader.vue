<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
}>()
</script>

<template>
  <div :class="PAGE_HEADER">
    <div>
      <h1 :class="PAGE_TITLE">{{ title }}</h1>
      <p v-if="subtitle" :class="PAGE_SUBTITLE">{{ subtitle }}</p>
    </div>
    <slot name="actions" />
  </div>
</template>
