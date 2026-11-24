<script setup lang="ts">
  import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
  import {
    Crop,
    RotateCw,
    Pencil,
    MoveUpRight,
    Square,
    Type,
    Grid,
    Undo2,
    Redo2,
    RotateCcw,
    Check,
    X,
  } from 'lucide-vue-next'

  type ToolMode = 'draw' | 'arrow' | 'rect' | 'text' | 'pixelate' | 'crop'

  const props = defineProps<{
    modelValue: boolean
    imageSrc: string
    fileName?: string
  }>()

  const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void
    (e: 'save', payload: { file: File; blobUrl: string }): void
  }>()

  const canvasRef = ref<HTMLCanvasElement | null>(null)
  const isLoading = ref(false)
  const loadError = ref('')

  const activeTool = ref<ToolMode>('arrow')
  const activeColor = ref('#ef4444')
  const strokeSize = ref(4)

  const colors = [
    { value: '#ef4444', label: 'Rojo' },
    { value: '#facc15', label: 'Amarillo' },
    { value: '#22c55e', label: 'Verde' },
    { value: '#3b82f6', label: 'Azul' },
    { value: '#ffffff', label: 'Blanco' },
    { value: '#000000', label: 'Negro' },
  ]

  const strokeSizes = [
    { value: 3, label: 'Fino' },
    { value: 5, label: 'Medio' },
    { value: 8, label: 'Grueso' },
  ]

  // Historial de snapshots (cada entrada guarda un canvas offscreen con su propio ancho/alto)
  const history = ref<HTMLCanvasElement[]>([])
  const historyIndex = ref(-1)

  // Estado de interacción de puntero
  const isPointerDown = ref(false)
  const startPoint = ref({ x: 0, y: 0 })
  const currentPoint = ref({ x: 0, y: 0 })
  const freehandPoints = ref<Array<{ x: number; y: number }>>([])

  // Recorte (Crop)
  const cropRect = ref<{ x: number; y: number; w: number; h: number } | null>(null)

  // Entrada de texto
  const showTextPrompt = ref(false)
  const textPosition = ref({ x: 0, y: 0 })
  const textInputValue = ref('')
  const textInputRef = ref<HTMLInputElement | null>(null)

  const canUndo = () => historyIndex.value > 0
  const canRedo = () => historyIndex.value >= 0 && historyIndex.value < history.value.length - 1

  const cloneCanvas = (source: HTMLCanvasElement): HTMLCanvasElement => {
    const off = document.createElement('canvas')
    off.width = source.width
    off.height = source.height
    const ctx = off.getContext('2d')
    if (ctx) {
      ctx.drawImage(source, 0, 0)
    }
    return off
  }

  const renderCurrentSnapshot = () => {
    const canvas = canvasRef.value
    const snap = history.value[historyIndex.value]
    if (!canvas || !snap) return
    if (canvas.width !== snap.width || canvas.height !== snap.height) {
      canvas.width = snap.width
      canvas.height = snap.height
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(snap, 0, 0)
  }

  const pushSnapshot = () => {
    const canvas = canvasRef.value
    if (!canvas) return
    const snap = cloneCanvas(canvas)
    const nextList = history.value.slice(0, historyIndex.value + 1)
    nextList.push(snap)
    // Limitar historial a 25 pasos para cuidar memoria
    if (nextList.length > 25) {
      nextList.shift()
    }
    history.value = nextList
    historyIndex.value = nextList.length - 1
  }

  const undo = () => {
    if (!canUndo()) return
    cropRect.value = null
    showTextPrompt.value = false
    historyIndex.value -= 1
    renderCurrentSnapshot()
  }

  const redo = () => {
    if (!canRedo()) return
    cropRect.value = null
    showTextPrompt.value = false
    historyIndex.value += 1
    renderCurrentSnapshot()
  }

  const resetToOriginal = () => {
    if (history.value.length <= 1) return
    cropRect.value = null
    showTextPrompt.value = false
    historyIndex.value = 0
    renderCurrentSnapshot()
  }

  const selectTool = (tool: ToolMode) => {
    activeTool.value = tool
    cropRect.value = null
    showTextPrompt.value = false
    renderCurrentSnapshot()
  }

  const loadImageObject = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      if (!src.startsWith('blob:') && !src.startsWith('data:')) {
        img.crossOrigin = 'anonymous'
      }
      img.onload = () => resolve(img)
      img.onerror = err => reject(err)
      img.src = src
    })
  }

  const initEditorWithImage = async () => {
    if (!props.modelValue || !props.imageSrc) return
    isLoading.value = true
    loadError.value = ''
    history.value = []
    historyIndex.value = -1
    cropRect.value = null
    showTextPrompt.value = false

    let tempBlobUrl: string | null = null
    try {
      let img: HTMLImageElement
      try {
        img = await loadImageObject(props.imageSrc)
      } catch {
        // Fallback por si el servidor remoto bloquea crossOrigin directo en <img>
        const resp = await fetch(props.imageSrc)
        const blob = await resp.blob()
        tempBlobUrl = URL.createObjectURL(blob)
        img = await loadImageObject(tempBlobUrl)
      }

      await nextTick()
      const canvas = canvasRef.value
      if (!canvas) return

      // Escalar a máximo 1600px de lado mayor para edición fluida y alta nitidez en PDF
      const maxDim = 1600
      let w = img.naturalWidth || img.width || 800
      let h = img.naturalHeight || img.height || 600
      if (w > maxDim || h > maxDim) {
        const ratio = Math.min(maxDim / w, maxDim / h)
        w = Math.round(w * ratio)
        h = Math.round(h * ratio)
      }

      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, w, h)
      ctx.drawImage(img, 0, 0, w, h)

      const firstSnap = cloneCanvas(canvas)
      history.value = [firstSnap]
      historyIndex.value = 0
    } catch {
      loadError.value = 'No se pudo cargar la imagen para editar.'
    } finally {
      if (tempBlobUrl) {
        URL.revokeObjectURL(tempBlobUrl)
      }
      isLoading.value = false
    }
  }

  watch(
    () => [props.modelValue, props.imageSrc],
    ([open]) => {
      if (open) {
        initEditorWithImage()
      }
    }
  )

  onMounted(() => {
    if (props.modelValue) {
      initEditorWithImage()
    }
    window.addEventListener('keydown', handleKeydown)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleKeydown)
  })

  const handleKeydown = (e: KeyboardEvent) => {
    if (!props.modelValue) return
    if (showTextPrompt.value) return
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault()
      if (e.shiftKey) redo()
      else undo()
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault()
      redo()
    }
  }

  const getCanvasCoords = (e: PointerEvent): { x: number; y: number } => {
    const canvas = canvasRef.value
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / (rect.width || 1)
    const scaleY = canvas.height / (rect.height || 1)
    return {
      x: Math.max(0, Math.min(canvas.width, (e.clientX - rect.left) * scaleX)),
      y: Math.max(0, Math.min(canvas.height, (e.clientY - rect.top) * scaleY)),
    }
  }

  const getScaleFactor = (): number => {
    const canvas = canvasRef.value
    if (!canvas) return 1
    return Math.max(1, Math.max(canvas.width, canvas.height) / 800)
  }

  const drawArrowShape = (
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    lineWidth: number
  ) => {
    const dist = Math.hypot(x2 - x1, y2 - y1)
    if (dist < 4) return
    const headLen = Math.max(lineWidth * 3.8, 16)
    const angle = Math.atan2(y2 - y1, x2 - x1)

    ctx.save()
    ctx.strokeStyle = color
    ctx.fillStyle = color
    ctx.lineWidth = lineWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // Línea principal
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2 - headLen * 0.65 * Math.cos(angle), y2 - headLen * 0.65 * Math.sin(angle))
    ctx.stroke()

    // Punta de flecha
    ctx.beginPath()
    ctx.moveTo(x2, y2)
    ctx.lineTo(
      x2 - headLen * Math.cos(angle - Math.PI / 6),
      y2 - headLen * Math.sin(angle - Math.PI / 6)
    )
    ctx.lineTo(
      x2 - headLen * Math.cos(angle + Math.PI / 6),
      y2 - headLen * Math.sin(angle + Math.PI / 6)
    )
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  const drawRectShape = (
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    lineWidth: number
  ) => {
    const rx = Math.min(x1, x2)
    const ry = Math.min(y1, y2)
    const rw = Math.abs(x2 - x1)
    const rh = Math.abs(y2 - y1)
    if (rw < 3 || rh < 3) return

    ctx.save()
    ctx.strokeStyle = color
    ctx.lineWidth = lineWidth
    ctx.lineJoin = 'round'
    ctx.strokeRect(rx, ry, rw, rh)
    ctx.restore()
  }

  const applyPixelateRegion = (
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    previewOnly = false
  ) => {
    const canvas = canvasRef.value
    if (!canvas) return
    const rx = Math.max(0, Math.floor(Math.min(x1, x2)))
    const ry = Math.max(0, Math.floor(Math.min(y1, y2)))
    const rw = Math.min(canvas.width - rx, Math.floor(Math.abs(x2 - x1)))
    const rh = Math.min(canvas.height - ry, Math.floor(Math.abs(y2 - y1)))
    if (rw < 6 || rh < 6) return

    const pixelBlock = Math.max(10, Math.round(Math.max(canvas.width, canvas.height) / 55))
    const sw = Math.max(1, Math.floor(rw / pixelBlock))
    const sh = Math.max(1, Math.floor(rh / pixelBlock))

    const temp = document.createElement('canvas')
    temp.width = sw
    temp.height = sh
    const tCtx = temp.getContext('2d')
    if (!tCtx) return

    tCtx.imageSmoothingEnabled = false
    tCtx.drawImage(canvas, rx, ry, rw, rh, 0, 0, sw, sh)

    ctx.save()
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(temp, 0, 0, sw, sh, rx, ry, rw, rh)
    if (previewOnly) {
      ctx.strokeStyle = '#38bdf8'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 4])
      ctx.strokeRect(rx, ry, rw, rh)
    }
    ctx.restore()
  }

  const drawCropOverlay = (
    ctx: CanvasRenderingContext2D,
    rect: { x: number; y: number; w: number; h: number }
  ) => {
    const canvas = canvasRef.value
    if (!canvas) return
    ctx.save()
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'
    // Sombra exterior alrededor del recorte
    ctx.fillRect(0, 0, canvas.width, rect.y)
    ctx.fillRect(0, rect.y, rect.x, rect.h)
    ctx.fillRect(rect.x + rect.w, rect.y, canvas.width - (rect.x + rect.w), rect.h)
    ctx.fillRect(0, rect.y + rect.h, canvas.width, canvas.height - (rect.y + rect.h))

    // Marco punteado del área a recortar
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = Math.max(2, getScaleFactor() * 1.5)
    ctx.setLineDash([8, 6])
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h)
    ctx.restore()
  }

  const onPointerDown = (e: PointerEvent) => {
    const canvas = canvasRef.value
    if (!canvas || isLoading.value) return
    const pt = getCanvasCoords(e)

    if (activeTool.value === 'text') {
      textPosition.value = pt
      textInputValue.value = ''
      showTextPrompt.value = true
      nextTick(() => textInputRef.value?.focus())
      return
    }

    canvas.setPointerCapture(e.pointerId)
    isPointerDown.value = true
    startPoint.value = pt
    currentPoint.value = pt

    if (activeTool.value === 'draw') {
      freehandPoints.value = [pt]
    }
  }

  const onPointerMove = (e: PointerEvent) => {
    if (!isPointerDown.value) return
    const canvas = canvasRef.value
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const pt = getCanvasCoords(e)
    currentPoint.value = pt
    const scale = getScaleFactor()
    const lineWidth = strokeSize.value * scale

    renderCurrentSnapshot()

    if (activeTool.value === 'draw') {
      freehandPoints.value.push(pt)
      ctx.save()
      ctx.strokeStyle = activeColor.value
      ctx.lineWidth = lineWidth
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      const pts = freehandPoints.value
      const first = pts[0]
      if (first) {
        ctx.moveTo(first.x, first.y)
        for (let i = 1; i < pts.length; i++) {
          const p = pts[i]
          if (p) ctx.lineTo(p.x, p.y)
        }
        ctx.stroke()
      }
      ctx.restore()
    } else if (activeTool.value === 'arrow') {
      drawArrowShape(
        ctx,
        startPoint.value.x,
        startPoint.value.y,
        pt.x,
        pt.y,
        activeColor.value,
        lineWidth
      )
    } else if (activeTool.value === 'rect') {
      drawRectShape(
        ctx,
        startPoint.value.x,
        startPoint.value.y,
        pt.x,
        pt.y,
        activeColor.value,
        lineWidth
      )
    } else if (activeTool.value === 'pixelate') {
      applyPixelateRegion(ctx, startPoint.value.x, startPoint.value.y, pt.x, pt.y, true)
    } else if (activeTool.value === 'crop') {
      const rx = Math.min(startPoint.value.x, pt.x)
      const ry = Math.min(startPoint.value.y, pt.y)
      const rw = Math.abs(pt.x - startPoint.value.x)
      const rh = Math.abs(pt.y - startPoint.value.y)
      cropRect.value = { x: rx, y: ry, w: rw, h: rh }
      drawCropOverlay(ctx, cropRect.value)
    }
  }

  const onPointerUp = (e: PointerEvent) => {
    if (!isPointerDown.value) return
    isPointerDown.value = false
    const canvas = canvasRef.value
    if (!canvas) return
    if (canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId)
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const pt = getCanvasCoords(e)
    const scale = getScaleFactor()
    const lineWidth = strokeSize.value * scale

    if (activeTool.value === 'crop') {
      const rx = Math.min(startPoint.value.x, pt.x)
      const ry = Math.min(startPoint.value.y, pt.y)
      const rw = Math.abs(pt.x - startPoint.value.x)
      const rh = Math.abs(pt.y - startPoint.value.y)
      if (rw >= 20 && rh >= 20) {
        cropRect.value = { x: rx, y: ry, w: rw, h: rh }
        renderCurrentSnapshot()
        drawCropOverlay(ctx, cropRect.value)
      } else {
        cropRect.value = null
        renderCurrentSnapshot()
      }
      return
    }

    renderCurrentSnapshot()

    if (activeTool.value === 'draw') {
      if (freehandPoints.value.length > 1) {
        ctx.save()
        ctx.strokeStyle = activeColor.value
        ctx.lineWidth = lineWidth
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.beginPath()
        const pts = freehandPoints.value
        const first = pts[0]
        if (first) {
          ctx.moveTo(first.x, first.y)
          for (let i = 1; i < pts.length; i++) {
            const p = pts[i]
            if (p) ctx.lineTo(p.x, p.y)
          }
          ctx.stroke()
        }
        ctx.restore()
        pushSnapshot()
      }
      freehandPoints.value = []
    } else if (activeTool.value === 'arrow') {
      if (Math.hypot(pt.x - startPoint.value.x, pt.y - startPoint.value.y) >= 8) {
        drawArrowShape(
          ctx,
          startPoint.value.x,
          startPoint.value.y,
          pt.x,
          pt.y,
          activeColor.value,
          lineWidth
        )
        pushSnapshot()
      }
    } else if (activeTool.value === 'rect') {
      if (
        Math.abs(pt.x - startPoint.value.x) >= 6 &&
        Math.abs(pt.y - startPoint.value.y) >= 6
      ) {
        drawRectShape(
          ctx,
          startPoint.value.x,
          startPoint.value.y,
          pt.x,
          pt.y,
          activeColor.value,
          lineWidth
        )
        pushSnapshot()
      }
    } else if (activeTool.value === 'pixelate') {
      if (
        Math.abs(pt.x - startPoint.value.x) >= 8 &&
        Math.abs(pt.y - startPoint.value.y) >= 8
      ) {
        applyPixelateRegion(ctx, startPoint.value.x, startPoint.value.y, pt.x, pt.y, false)
        pushSnapshot()
      }
    }
  }

  const applyCrop = () => {
    const canvas = canvasRef.value
    const rect = cropRect.value
    const snap = history.value[historyIndex.value]
    if (!canvas || !rect || !snap) return

    const rx = Math.max(0, Math.round(rect.x))
    const ry = Math.max(0, Math.round(rect.y))
    const rw = Math.min(snap.width - rx, Math.round(rect.w))
    const rh = Math.min(snap.height - ry, Math.round(rect.h))
    if (rw < 20 || rh < 20) {
      cropRect.value = null
      renderCurrentSnapshot()
      return
    }

    canvas.width = rw
    canvas.height = rh
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(snap, rx, ry, rw, rh, 0, 0, rw, rh)
    cropRect.value = null
    pushSnapshot()
    activeTool.value = 'arrow'
  }

  const cancelCrop = () => {
    cropRect.value = null
    renderCurrentSnapshot()
  }

  const rotate90 = () => {
    const canvas = canvasRef.value
    const snap = history.value[historyIndex.value]
    if (!canvas || !snap) return

    cropRect.value = null
    showTextPrompt.value = false

    const newW = snap.height
    const newH = snap.width
    canvas.width = newW
    canvas.height = newH
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.save()
    ctx.translate(newW / 2, newH / 2)
    ctx.rotate(Math.PI / 2)
    ctx.drawImage(snap, -snap.width / 2, -snap.height / 2)
    ctx.restore()

    pushSnapshot()
  }

  const confirmTextInsert = () => {
    const text = textInputValue.value.trim()
    showTextPrompt.value = false
    if (!text) return

    const canvas = canvasRef.value
    if (!canvas) return
    renderCurrentSnapshot()
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const scale = getScaleFactor()
    const fontSize = Math.round((14 + strokeSize.value * 2) * scale)
    ctx.save()
    ctx.font = `bold ${fontSize}px Arial, sans-serif`
    ctx.textBaseline = 'top'

    const metrics = ctx.measureText(text)
    const padX = Math.round(6 * scale)
    const padY = Math.round(4 * scale)
    const boxW = metrics.width + padX * 2
    const boxH = fontSize + padY * 2

    const drawX = Math.min(Math.max(padX, textPosition.value.x), Math.max(padX, canvas.width - boxW))
    const drawY = Math.min(Math.max(padY, textPosition.value.y), Math.max(padY, canvas.height - boxH))

    // Fondo semitransparente para máxima legibilidad sobre cualquier foto
    ctx.fillStyle = activeColor.value === '#000000' ? 'rgba(255, 255, 255, 0.85)' : 'rgba(15, 23, 42, 0.78)'
    ctx.fillRect(drawX - padX, drawY - padY, boxW, boxH)

    ctx.fillStyle = activeColor.value
    ctx.fillText(text, drawX, drawY)
    ctx.restore()

    pushSnapshot()
    textInputValue.value = ''
  }

  const cancelTextInsert = () => {
    showTextPrompt.value = false
    textInputValue.value = ''
  }

  const closeEditor = () => {
    cropRect.value = null
    showTextPrompt.value = false
    emit('update:modelValue', false)
  }

  const saveEditedImage = () => {
    const canvas = canvasRef.value
    if (!canvas) return

    // Si había un recorte activo sin aplicar, renderizar el snapshot limpio antes de exportar
    if (cropRect.value) {
      cropRect.value = null
      renderCurrentSnapshot()
    }

    canvas.toBlob(
      blob => {
        if (!blob) return
        const baseName = (props.fileName || 'evidencia.jpg').replace(/\.[^.]+$/, '')
        const editedFile = new File([blob], `${baseName}-editada.jpg`, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        })
        const blobUrl = URL.createObjectURL(blob)
        emit('save', { file: editedFile, blobUrl })
        emit('update:modelValue', false)
      },
      'image/jpeg',
      0.92
    )
  }
</script>

<template>
  <div v-if="modelValue" class="wa-editor-overlay" @click.self="closeEditor">
    <div class="wa-editor-modal">
      <!-- Barra superior oscura estilo WhatsApp Web -->
      <header class="wa-toolbar">
        <div class="wa-toolbar-left">
          <button
            type="button"
            class="wa-icon-btn"
            title="Cerrar sin guardar"
            @click="closeEditor"
          >
            <X :size="20" />
            <span class="wa-btn-label">Cerrar</span>
          </button>
        </div>

        <div class="wa-toolbar-center">
          <button
            type="button"
            class="wa-tool-btn"
            :class="{ active: activeTool === 'crop' }"
            title="Recortar imagen"
            @click="selectTool('crop')"
          >
            <Crop :size="18" />
            <span>Recortar</span>
          </button>

          <button
            type="button"
            class="wa-tool-btn"
            title="Rotar 90 grados"
            @click="rotate90"
          >
            <RotateCw :size="18" />
            <span>Rotar</span>
          </button>

          <button
            type="button"
            class="wa-tool-btn"
            :class="{ active: activeTool === 'arrow' }"
            title="Insertar flecha de señalamiento"
            @click="selectTool('arrow')"
          >
            <MoveUpRight :size="18" />
            <span>Flecha</span>
          </button>

          <button
            type="button"
            class="wa-tool-btn"
            :class="{ active: activeTool === 'rect' }"
            title="Insertar recuadro de señalamiento"
            @click="selectTool('rect')"
          >
            <Square :size="18" />
            <span>Recuadro</span>
          </button>

          <button
            type="button"
            class="wa-tool-btn"
            :class="{ active: activeTool === 'draw' }"
            title="Dibujo libre"
            @click="selectTool('draw')"
          >
            <Pencil :size="18" />
            <span>Dibujar</span>
          </button>

          <button
            type="button"
            class="wa-tool-btn"
            :class="{ active: activeTool === 'text' }"
            title="Agregar texto sobre la imagen"
            @click="selectTool('text')"
          >
            <Type :size="18" />
            <span>Texto</span>
          </button>

          <button
            type="button"
            class="wa-tool-btn"
            :class="{ active: activeTool === 'pixelate' }"
            title="Pixelar zona sensible"
            @click="selectTool('pixelate')"
          >
            <Grid :size="18" />
            <span>Pixelar</span>
          </button>

          <div class="wa-divider"></div>

          <button
            type="button"
            class="wa-icon-btn"
            :disabled="!canUndo()"
            title="Deshacer (Ctrl+Z)"
            @click="undo"
          >
            <Undo2 :size="18" />
          </button>

          <button
            type="button"
            class="wa-icon-btn"
            :disabled="!canRedo()"
            title="Rehacer (Ctrl+Y)"
            @click="redo"
          >
            <Redo2 :size="18" />
          </button>

          <button
            type="button"
            class="wa-icon-btn"
            :disabled="history.length <= 1"
            title="Restaurar imagen original"
            @click="resetToOriginal"
          >
            <RotateCcw :size="18" />
          </button>
        </div>

        <div class="wa-toolbar-right">
          <button
            type="button"
            class="wa-save-btn"
            title="Aplicar cambios a la foto"
            @click="saveEditedImage"
          >
            <Check :size="18" />
            <span>Listo</span>
          </button>
        </div>
      </header>

      <!-- Sub-barra de color, grosor y acciones contextuales -->
      <div class="wa-subbar">
        <div
          v-if="['draw', 'arrow', 'rect', 'text'].includes(activeTool)"
          class="wa-style-controls"
        >
          <div class="wa-color-group">
            <span class="wa-subbar-label">Color:</span>
            <button
              v-for="c in colors"
              :key="c.value"
              type="button"
              class="wa-color-dot"
              :class="{ selected: activeColor === c.value }"
              :style="{ backgroundColor: c.value }"
              :title="c.label"
              @click="activeColor = c.value"
            ></button>
          </div>

          <div class="wa-size-group">
            <span class="wa-subbar-label">Grosor:</span>
            <button
              v-for="s in strokeSizes"
              :key="s.value"
              type="button"
              class="wa-size-pill"
              :class="{ selected: strokeSize === s.value }"
              @click="strokeSize = s.value"
            >
              {{ s.label }}
            </button>
          </div>
        </div>

        <div v-else-if="activeTool === 'pixelate'" class="wa-hint-text">
          Arrastra sobre la imagen para pixelar placas, rostros o datos sensibles.
        </div>

        <div v-else-if="activeTool === 'crop'" class="wa-crop-actions">
          <span class="wa-hint-text">
            {{
              cropRect
                ? 'Ajusta o aplica el área seleccionada:'
                : 'Arrastra sobre la imagen para seleccionar el área a recortar.'
            }}
          </span>
          <template v-if="cropRect">
            <button type="button" class="wa-crop-confirm" @click="applyCrop">
              <Check :size="15" /> Aplicar recorte
            </button>
            <button type="button" class="wa-crop-cancel" @click="cancelCrop">
              Cancelar recorte
            </button>
          </template>
        </div>

        <div v-if="activeTool === 'text' && !showTextPrompt" class="wa-hint-text">
          Haz clic en el punto de la imagen donde deseas insertar el texto.
        </div>
      </div>

      <!-- Barra flotante para escribir texto cuando el usuario hace clic en modo Texto -->
      <div v-if="showTextPrompt" class="wa-text-prompt-bar">
        <input
          ref="textInputRef"
          v-model="textInputValue"
          type="text"
          class="wa-text-input"
          placeholder="Escribe el texto a insertar y presiona Enter..."
          @keydown.enter.prevent="confirmTextInsert"
          @keydown.esc.prevent="cancelTextInsert"
        />
        <button type="button" class="wa-crop-confirm" @click="confirmTextInsert">
          Insertar texto
        </button>
        <button type="button" class="wa-crop-cancel" @click="cancelTextInsert">
          Cancelar
        </button>
      </div>

      <!-- Área del lienzo (Canvas) -->
      <div class="wa-canvas-stage">
        <div v-if="isLoading" class="wa-status-msg">Cargando imagen...</div>
        <div v-else-if="loadError" class="wa-status-msg error">{{ loadError }}</div>
        <canvas
          v-show="!isLoading && !loadError"
          ref="canvasRef"
          class="wa-canvas"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
        ></canvas>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .wa-editor-overlay {
    position: fixed;
    inset: 0;
    z-index: 99999;
    background: rgba(11, 20, 26, 0.92);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px;
  }

  .wa-editor-modal {
    width: 100%;
    max-width: 1120px;
    height: 90vh;
    max-height: 860px;
    background: #0b141a;
    border: 1px solid #222e35;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
  }

  .wa-toolbar {
    background: #202c33;
    color: #e9edef;
    padding: 10px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    border-bottom: 1px solid #2a3942;
    flex-wrap: wrap;
  }

  .wa-toolbar-left,
  .wa-toolbar-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .wa-toolbar-center {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .wa-tool-btn,
  .wa-icon-btn {
    background: transparent;
    border: 1px solid transparent;
    color: #aebac1;
    border-radius: 8px;
    padding: 7px 11px;
    font-size: 0.82rem;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .wa-tool-btn:hover,
  .wa-icon-btn:hover:not(:disabled) {
    background: #2a3942;
    color: #ffffff;
  }

  .wa-tool-btn.active {
    background: #00a884;
    color: #ffffff;
    border-color: #00a884;
  }

  .wa-icon-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .wa-divider {
    width: 1px;
    height: 24px;
    background: #3b4a54;
    margin: 0 4px;
  }

  .wa-save-btn {
    background: #00a884;
    color: #ffffff;
    border: none;
    border-radius: 8px;
    padding: 8px 16px;
    font-size: 0.88rem;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .wa-save-btn:hover {
    background: #029072;
  }

  .wa-subbar {
    background: #111b21;
    color: #d1d7db;
    padding: 8px 16px;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 18px;
    border-bottom: 1px solid #222e35;
    flex-wrap: wrap;
  }

  .wa-style-controls {
    display: flex;
    align-items: center;
    gap: 20px;
    flex-wrap: wrap;
  }

  .wa-color-group,
  .wa-size-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .wa-subbar-label {
    font-size: 0.78rem;
    color: #8696a0;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }

  .wa-color-dot {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.35);
    cursor: pointer;
    transition: transform 0.12s ease, border-color 0.12s ease;
  }

  .wa-color-dot.selected {
    transform: scale(1.2);
    border-color: #ffffff;
    box-shadow: 0 0 0 2px #00a884;
  }

  .wa-size-pill {
    background: #202c33;
    color: #aebac1;
    border: 1px solid #2a3942;
    border-radius: 6px;
    padding: 4px 10px;
    font-size: 0.78rem;
    cursor: pointer;
  }

  .wa-size-pill.selected {
    background: #2a3942;
    color: #ffffff;
    border-color: #00a884;
  }

  .wa-hint-text {
    font-size: 0.82rem;
    color: #8696a0;
  }

  .wa-crop-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .wa-crop-confirm {
    background: #00a884;
    color: #ffffff;
    border: none;
    border-radius: 6px;
    padding: 5px 12px;
    font-size: 0.8rem;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
  }

  .wa-crop-cancel {
    background: #2a3942;
    color: #e9edef;
    border: none;
    border-radius: 6px;
    padding: 5px 12px;
    font-size: 0.8rem;
    cursor: pointer;
  }

  .wa-text-prompt-bar {
    background: #182229;
    padding: 8px 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-bottom: 1px solid #2a3942;
  }

  .wa-text-input {
    width: 100%;
    max-width: 420px;
    background: #2a3942;
    color: #ffffff;
    border: 1px solid #3b4a54;
    border-radius: 6px;
    padding: 6px 12px;
    font-size: 0.88rem;
    outline: none;
  }

  .wa-text-input:focus {
    border-color: #00a884;
  }

  .wa-canvas-stage {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    overflow: hidden;
    background: #0b141a;
    position: relative;
  }

  .wa-canvas {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    background: #ffffff;
    border-radius: 4px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    touch-action: none;
    cursor: crosshair;
  }

  .wa-status-msg {
    color: #aebac1;
    font-size: 0.95rem;
  }

  .wa-status-msg.error {
    color: #f87171;
  }

  @media (max-width: 768px) {
    .wa-editor-modal {
      height: 96vh;
      max-height: none;
    }

    .wa-tool-btn span,
    .wa-btn-label {
      display: none;
    }
  }
</style>

