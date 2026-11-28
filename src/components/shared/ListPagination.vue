<script setup lang="ts">
  import { computed } from 'vue'
  import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

  const props = defineProps<{
    pagina: number
    totalPaginas: number
    total: number
    desde: number
    hasta: number
    etiqueta?: string
  }>()

  const emit = defineEmits<{ (e: 'ir', pagina: number): void }>()

  /** Números de página a mostrar, con "…" para saltos (1 … 4 5 6 … 20). */
  const paginas = computed<(number | '…')[]>(() => {
    const n = props.totalPaginas
    const actual = props.pagina
    if (n <= 7) return Array.from({ length: n }, (_, i) => i + 1)

    const lista: (number | '…')[] = [1]
    const inicio = Math.max(2, actual - 1)
    const fin = Math.min(n - 1, actual + 1)
    if (inicio > 2) lista.push('…')
    for (let i = inicio; i <= fin; i++) lista.push(i)
    if (fin < n - 1) lista.push('…')
    lista.push(n)
    return lista
  })
</script>

<template>
  <nav v-if="total > 0" class="list-pagination" aria-label="Paginación">
    <span class="resumen">
      {{ desde }}–{{ hasta }} de {{ total }} {{ etiqueta || 'registros' }}
    </span>

    <div v-if="totalPaginas > 1" class="controles">
      <button
        type="button"
        class="pag-btn"
        :disabled="pagina <= 1"
        aria-label="Página anterior"
        @click="emit('ir', pagina - 1)"
      >
        <ChevronLeft :size="16" />
      </button>

      <template v-for="(p, i) in paginas" :key="`${p}-${i}`">
        <span v-if="p === '…'" class="salto">…</span>
        <button
          v-else
          type="button"
          class="pag-btn"
          :class="{ activa: p === pagina }"
          :aria-current="p === pagina ? 'page' : undefined"
          @click="emit('ir', p)"
        >
          {{ p }}
        </button>
      </template>

      <button
        type="button"
        class="pag-btn"
        :disabled="pagina >= totalPaginas"
        aria-label="Página siguiente"
        @click="emit('ir', pagina + 1)"
      >
        <ChevronRight :size="16" />
      </button>
    </div>
  </nav>
</template>

<style scoped>
  .list-pagination {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.875rem 1rem;
    font-size: 0.85rem;
    color: #64748b;
  }

  .controles {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.25rem;
  }

  .pag-btn {
    min-width: 2rem;
    height: 2rem;
    padding: 0 0.5rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #ffffff;
    color: #334155;
    font-size: 0.85rem;
    cursor: pointer;
    transition:
      background 0.15s,
      border-color 0.15s;
  }

  .pag-btn:hover:not(:disabled) {
    border-color: #93c5fd;
    background: #eff6ff;
  }

  .pag-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .pag-btn.activa {
    background: #2563eb;
    border-color: #2563eb;
    color: #ffffff;
    font-weight: 600;
  }

  .salto {
    padding: 0 0.25rem;
  }
</style>
