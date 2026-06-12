<script setup lang="ts">
withDefaults(defineProps<{
  alt?: string
}>(), {
  alt: 'AERONEXIS Dynamics — Précision au-delà des limites'
})
</script>

<template>
  <img
    src="/logo-aeronexis.png"
    :alt="alt"
    class="object-contain"
  >
</template>
