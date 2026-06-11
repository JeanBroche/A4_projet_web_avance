<script setup lang="ts">
withDefaults(defineProps<{
  alt?: string
}>(), {
  alt: 'AERONEXIS Dynamics — Precision Beyond Limits'
})
</script>

<template>
  <img
    src="/logo-aeronexis.png"
    :alt="alt"
    class="object-contain"
  >
</template>
