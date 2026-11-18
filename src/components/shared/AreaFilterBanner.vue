<script setup lang="ts">
  defineProps<{
    areaId?: number | null
    areaName?: string | null
  }>()

  const emit = defineEmits<{ clear: [] }>()
</script>

<template>
  <div v-if="areaId" class="area-filter-banner">
    <span class="area-filter-label">Viendo área</span>
    <strong class="area-filter-name">{{ areaName || `#${areaId}` }}</strong>
    <button type="button" class="area-filter-clear" @click="emit('clear')">Ver todas</button>
  </div>
</template>

<style scoped>
  .area-filter-banner {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
    padding: 0.65rem 0.9rem;
    border: 1px solid #bfdbfe;
    border-radius: 10px;
    background: #eff6ff;
    color: #1e3a8a;
    font-size: 0.9rem;
  }

  .area-filter-label {
    color: #475569;
  }

  .area-filter-name {
    font-weight: 700;
  }

  .area-filter-clear {
    margin-left: auto;
    padding: 0.3rem 0.65rem;
    border: 1px solid #93c5fd;
    border-radius: 6px;
    background: white;
    color: #1d4ed8;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
  }

  .area-filter-clear:hover {
    background: #dbeafe;
  }
</style>
