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
    Trash2,
    Check,
    X,
  } from 'lucide-vue-next'

  type ToolMode = 'draw' | 'arrow' | 'rect' | 'text' | 'pixelate' | 'crop'

  interface TextAnnotation {
    id: number
    text: string
    x: number
    y: number
    color: string
    sizeLevel: number
  }

  interface HistoryStep {
    bitmap: HTMLCanvasElement
    texts: TextAnnotation[]
  }

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
  const strokeSize = ref(5)

  const colors = [
    { value: '#ef4444', label: 'Rojo' },
    { value: '#facc15', label: 'Amarillo' },
    { value: '#22c55e', label: 'Verde' },
    { value: '#2563eb', label: 'Azul' },
    { value: '#ffffff', label: 'Blanco' },
    { value: '#000000', label: 'Negro' },
  ]

  const strokeSizes = [
    { value: 3, label: 'Fino' },
    { value: 5, label: 'Medio' },
    { value: 8, label: 'Grueso' },
  ]

  // Historial de pasos (bitmap + etiquetas de texto móviles)
  const history = ref<HistoryStep[]>([])
  const historyIndex = ref(-1)
  const workingTexts = ref<TextAnnotation[]>([])
  const selectedTextId = ref<number | null>(null)
  let nextTextId = 1

  // Estado de interacción de puntero
  const isPointerDown = ref(false)
  const isDraggingText = ref(false)
  const textDragMoved = ref(false)
  const textDragOffset = ref({ dx: 0, dy: 0 })
  const hoveredTextId = ref<number | null>(null)

  const startPoint = ref({ x: 0, y: 0 })
  const currentPoint = ref({ x: 0, y: 0 })
  const freehandPoints = ref<Array<{ x: number; y: number }>>([])

  // Recorte (Crop)
  const cropRect = ref<{ x: number; y: number; w: number; h: number } | null>(null)

  // Entrada de texto
  const showTextPrompt = ref(false)
  const editingExistingTextId = ref<number | null>(null)
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

  const cloneTexts = (list: TextAnnotation[]): TextAnnotation[] =>
    list.map(t => ({ ...t }))

  const getScaleFactor = (): number => {
    const canvas = canvasRef.value
    if (!canvas) return 1
    return Math.max(1, Math.max(canvas.width, canvas.height) / 800)
  }

  const getTextBoxMetrics = (
    ctx: CanvasRenderingContext2D,
    item: TextAnnotation,
    canvasW: number,
    canvasH: number
  ) => {
    const scale = getScaleFactor()
    const fontSize = Math.round((14 + item.sizeLevel * 2) * scale)
    ctx.save()
    ctx.font = `bold ${fontSize}px Arial, sans-serif`
    const metrics = ctx.measureText(item.text)
    ctx.restore()

    const padX = Math.round(6 * scale)
    const padY = Math.round(4 * scale)
    const boxW = metrics.width + padX * 2
    const boxH = fontSize + padY * 2
    const drawX = Math.min(Math.max(padX, item.x), Math.max(padX, canvasW - boxW + padX))
    const drawY = Math.min(Math.max(padY, item.y), Math.max(padY, canvasH - boxH + padY))

    return {
      fontSize,
      padX,
      padY,
      boxX: drawX - padX,
      boxY: drawY - padY,
      boxW,
      boxH,
      drawX,
      drawY,
    }
  }

  const drawTextsOnContext = (
    ctx: CanvasRenderingContext2D,
    texts: TextAnnotation[],
    canvasW: number,
    canvasH: number,
    showSelectionOutline = true
  ) => {
    const scale = getScaleFactor()
    for (const item of texts) {
      const m = getTextBoxMetrics(ctx, item, canvasW, canvasH)
      ctx.save()
      ctx.font = `bold ${m.fontSize}px Arial, sans-serif`
      ctx.textBaseline = 'top'

      ctx.fillStyle =
        item.color === '#000000' ? 'rgba(255, 255, 255, 0.88)' : 'rgba(15, 23, 42, 0.82)'
      ctx.fillRect(m.boxX, m.boxY, m.boxW, m.boxH)

      ctx.fillStyle = item.color
      ctx.fillText(item.text, m.drawX, m.drawY)

      if (showSelectionOutline && (item.id === selectedTextId.value || item.id === hoveredTextId.value)) {
        ctx.strokeStyle = item.id === selectedTextId.value ? '#3b82f6' : 'rgba(148, 163, 184, 0.9)'
        ctx.lineWidth = Math.max(2, 1.5 * scale)
        ctx.setLineDash([5, 3])
        ctx.strokeRect(m.boxX - 2, m.boxY - 2, m.boxW + 4, m.boxH + 4)
      }
      ctx.restore()
    }
  }

  const renderCurrentSnapshot = (showSelectionOutline = true) => {
    const canvas = canvasRef.value
    const step = history.value[historyIndex.value]
    if (!canvas || !step) return
    if (canvas.width !== step.bitmap.width || canvas.height !== step.bitmap.height) {
      canvas.width = step.bitmap.width
      canvas.height = step.bitmap.height
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(step.bitmap, 0, 0)
    drawTextsOnContext(ctx, workingTexts.value, canvas.width, canvas.height, showSelectionOutline)
  }

  const getCurrentBitmapClone = (): HTMLCanvasElement | null => {
    const step = history.value[historyIndex.value]
    if (!step) return null
    return cloneCanvas(step.bitmap)
  }

  const pushHistoryStep = (newBitmap: HTMLCanvasElement, newTexts: TextAnnotation[]) => {
    const nextList = history.value.slice(0, historyIndex.value + 1)
    nextList.push({
      bitmap: cloneCanvas(newBitmap),
      texts: cloneTexts(newTexts),
    })
    if (nextList.length > 25) {
      nextList.shift()
    }
    history.value = nextList
    historyIndex.value = nextList.length - 1
    workingTexts.value = cloneTexts(newTexts)
    renderCurrentSnapshot()
  }

  const syncFromHistoryStep = () => {
    const step = history.value[historyIndex.value]
    if (!step) return
    workingTexts.value = cloneTexts(step.texts)
    if (
      selectedTextId.value !== null &&
      !workingTexts.value.some(t => t.id === selectedTextId.value)
    ) {
      selectedTextId.value = null
    }
    renderCurrentSnapshot()
  }

  const undo = () => {
    if (!canUndo()) return
    cropRect.value = null
    showTextPrompt.value = false
    historyIndex.value -= 1
    syncFromHistoryStep()
  }

  const redo = () => {
    if (!canRedo()) return
    cropRect.value = null
    showTextPrompt.value = false
    historyIndex.value += 1
    syncFromHistoryStep()
  }

  const resetToOriginal = () => {
    if (history.value.length <= 1) return
    cropRect.value = null
    showTextPrompt.value = false
    selectedTextId.value = null
    historyIndex.value = 0
    syncFromHistoryStep()
  }

  const selectTool = (tool: ToolMode) => {
    activeTool.value = tool
    cropRect.value = null
    showTextPrompt.value = false
    renderCurrentSnapshot()
  }

  const setColor = (colorVal: string) => {
    activeColor.value = colorVal
    if (selectedTextId.value !== null) {
      const target = workingTexts.value.find(t => t.id === selectedTextId.value)
      const step = history.value[historyIndex.value]
      if (target && step && target.color !== colorVal) {
        target.color = colorVal
        pushHistoryStep(step.bitmap, workingTexts.value)
      }
    }
  }

  const setStrokeSize = (sizeVal: number) => {
    strokeSize.value = sizeVal
    if (selectedTextId.value !== null) {
      const target = workingTexts.value.find(t => t.id === selectedTextId.value)
      const step = history.value[historyIndex.value]
      if (target && step && target.sizeLevel !== sizeVal) {
        target.sizeLevel = sizeVal
        pushHistoryStep(step.bitmap, workingTexts.value)
      }
    }
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
    workingTexts.value = []
    selectedTextId.value = null
    cropRect.value = null
    showTextPrompt.value = false

    let tempBlobUrl: string | null = null
    try {
      let img: HTMLImageElement
      try {
        img = await loadImageObject(props.imageSrc)
      } catch {
        const resp = await fetch(props.imageSrc)
        const blob = await resp.blob()
        tempBlobUrl = URL.createObjectURL(blob)
        img = await loadImageObject(tempBlobUrl)
      }

      await nextTick()
      const canvas = canvasRef.value
      if (!canvas) return

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

      const firstBitmap = cloneCanvas(canvas)
      history.value = [{ bitmap: firstBitmap, texts: [] }]
      historyIndex.value = 0
      workingTexts.value = []
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

  const deleteSelectedText = () => {
    if (selectedTextId.value === null) return
    const step = history.value[historyIndex.value]
    if (!step) return
    const filtered = workingTexts.value.filter(t => t.id !== selectedTextId.value)
    selectedTextId.value = null
    pushHistoryStep(step.bitmap, filtered)
  }

  const editSelectedText = () => {
    if (selectedTextId.value === null) return
    const target = workingTexts.value.find(t => t.id === selectedTextId.value)
    if (!target) return
    editingExistingTextId.value = target.id
    textInputValue.value = target.text
    textPosition.value = { x: target.x, y: target.y }
    showTextPrompt.value = true
    nextTick(() => textInputRef.value?.focus())
  }

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
    } else if (
      (e.key === 'Delete' || e.key === 'Backspace') &&
      selectedTextId.value !== null
    ) {
      e.preventDefault()
      deleteSelectedText()
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

  const findTextAtPoint = (pt: { x: number; y: number }): TextAnnotation | null => {
    const canvas = canvasRef.value
    if (!canvas) return null
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    // Recorrer de arriba hacia abajo (último agregado primero)
    for (let i = workingTexts.value.length - 1; i >= 0; i--) {
      const item = workingTexts.value[i]
      if (!item) continue
      const m = getTextBoxMetrics(ctx, item, canvas.width, canvas.height)
      if (
        pt.x >= m.boxX - 4 &&
        pt.x <= m.boxX + m.boxW + 4 &&
        pt.y >= m.boxY - 4 &&
        pt.y <= m.boxY + m.boxH + 4
      ) {
        return item
      }
    }
    return null
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

    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2 - headLen * 0.65 * Math.cos(angle), y2 - headLen * 0.65 * Math.sin(angle))
    ctx.stroke()

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
    sourceCanvas: HTMLCanvasElement,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    previewOnly = false
  ) => {
    const rx = Math.max(0, Math.floor(Math.min(x1, x2)))
    const ry = Math.max(0, Math.floor(Math.min(y1, y2)))
    const rw = Math.min(sourceCanvas.width - rx, Math.floor(Math.abs(x2 - x1)))
    const rh = Math.min(sourceCanvas.height - ry, Math.floor(Math.abs(y2 - y1)))
    if (rw < 6 || rh < 6) return

    const pixelBlock = Math.max(
      10,
      Math.round(Math.max(sourceCanvas.width, sourceCanvas.height) / 55)
    )
    const sw = Math.max(1, Math.floor(rw / pixelBlock))
    const sh = Math.max(1, Math.floor(rh / pixelBlock))

    const temp = document.createElement('canvas')
    temp.width = sw
    temp.height = sh
    const tCtx = temp.getContext('2d')
    if (!tCtx) return

    tCtx.imageSmoothingEnabled = false
    tCtx.drawImage(sourceCanvas, rx, ry, rw, rh, 0, 0, sw, sh)

    ctx.save()
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(temp, 0, 0, sw, sh, rx, ry, rw, rh)
    if (previewOnly) {
      ctx.strokeStyle = '#3b82f6'
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
    ctx.fillStyle = 'rgba(15, 23, 42, 0.6)'
    ctx.fillRect(0, 0, canvas.width, rect.y)
    ctx.fillRect(0, rect.y, rect.x, rect.h)
    ctx.fillRect(rect.x + rect.w, rect.y, canvas.width - (rect.x + rect.w), rect.h)
    ctx.fillRect(0, rect.y + rect.h, canvas.width, canvas.height - (rect.y + rect.h))

    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = Math.max(2, getScaleFactor() * 1.5)
    ctx.setLineDash([8, 6])
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h)
    ctx.restore()
  }

  const onPointerDown = (e: PointerEvent) => {
    const canvas = canvasRef.value
    if (!canvas || isLoading.value) return
    const pt = getCanvasCoords(e)

    // Si el usuario hace clic sobre un texto ya colocado (en cualquier modo excepto recorte),
    // permite seleccionarlo y arrastrarlo libremente de lugar
    if (activeTool.value !== 'crop') {
      const hitText = findTextAtPoint(pt)
      if (hitText) {
        selectedTextId.value = hitText.id
        activeColor.value = hitText.color
        strokeSize.value = hitText.sizeLevel
        isDraggingText.value = true
        textDragMoved.value = false
        isPointerDown.value = true
        textDragOffset.value = {
          dx: pt.x - hitText.x,
          dy: pt.y - hitText.y,
        }
        canvas.setPointerCapture(e.pointerId)
        renderCurrentSnapshot()
        return
      }
    }

    selectedTextId.value = null
    renderCurrentSnapshot()

    if (activeTool.value === 'text') {
      editingExistingTextId.value = null
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
    const canvas = canvasRef.value
    if (!canvas) return
    const pt = getCanvasCoords(e)

    if (!isPointerDown.value) {
      const hit = activeTool.value !== 'crop' ? findTextAtPoint(pt) : null
      const hitId = hit ? hit.id : null
      if (hoveredTextId.value !== hitId) {
        hoveredTextId.value = hitId
        renderCurrentSnapshot()
      }
      return
    }

    if (isDraggingText.value && selectedTextId.value !== null) {
      const target = workingTexts.value.find(t => t.id === selectedTextId.value)
      if (target) {
        const nextX = Math.max(8, Math.min(canvas.width - 20, pt.x - textDragOffset.value.dx))
        const nextY = Math.max(8, Math.min(canvas.height - 20, pt.y - textDragOffset.value.dy))
        if (Math.abs(nextX - target.x) > 1 || Math.abs(nextY - target.y) > 1) {
          textDragMoved.value = true
        }
        target.x = nextX
        target.y = nextY
        renderCurrentSnapshot()
      }
      return
    }

    const ctx = canvas.getContext('2d')
    const step = history.value[historyIndex.value]
    if (!ctx || !step) return

    currentPoint.value = pt
    const scale = getScaleFactor()
    const lineWidth = strokeSize.value * scale

    // Redibujar base bitmap
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(step.bitmap, 0, 0)

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
      applyPixelateRegion(
        ctx,
        step.bitmap,
        startPoint.value.x,
        startPoint.value.y,
        pt.x,
        pt.y,
        true
      )
    }

    // Dibujar textos encima
    drawTextsOnContext(ctx, workingTexts.value, canvas.width, canvas.height, true)

    if (activeTool.value === 'crop') {
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

    if (isDraggingText.value) {
      isDraggingText.value = false
      const step = history.value[historyIndex.value]
      if (textDragMoved.value && step) {
        pushHistoryStep(step.bitmap, workingTexts.value)
      }
      textDragMoved.value = false
      return
    }

    const ctx = canvas.getContext('2d')
    const baseBitmap = getCurrentBitmapClone()
    const bCtx = baseBitmap?.getContext('2d')
    if (!ctx || !baseBitmap || !bCtx) return

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

    if (activeTool.value === 'draw') {
      if (freehandPoints.value.length > 1) {
        bCtx.save()
        bCtx.strokeStyle = activeColor.value
        bCtx.lineWidth = lineWidth
        bCtx.lineCap = 'round'
        bCtx.lineJoin = 'round'
        bCtx.beginPath()
        const pts = freehandPoints.value
        const first = pts[0]
        if (first) {
          bCtx.moveTo(first.x, first.y)
          for (let i = 1; i < pts.length; i++) {
            const p = pts[i]
            if (p) bCtx.lineTo(p.x, p.y)
          }
          bCtx.stroke()
        }
        bCtx.restore()
        pushHistoryStep(baseBitmap, workingTexts.value)
      } else {
        renderCurrentSnapshot()
      }
      freehandPoints.value = []
    } else if (activeTool.value === 'arrow') {
      if (Math.hypot(pt.x - startPoint.value.x, pt.y - startPoint.value.y) >= 8) {
        drawArrowShape(
          bCtx,
          startPoint.value.x,
          startPoint.value.y,
          pt.x,
          pt.y,
          activeColor.value,
          lineWidth
        )
        pushHistoryStep(baseBitmap, workingTexts.value)
      } else {
        renderCurrentSnapshot()
      }
    } else if (activeTool.value === 'rect') {
      if (
        Math.abs(pt.x - startPoint.value.x) >= 6 &&
        Math.abs(pt.y - startPoint.value.y) >= 6
      ) {
        drawRectShape(
          bCtx,
          startPoint.value.x,
          startPoint.value.y,
          pt.x,
          pt.y,
          activeColor.value,
          lineWidth
        )
        pushHistoryStep(baseBitmap, workingTexts.value)
      } else {
        renderCurrentSnapshot()
      }
    } else if (activeTool.value === 'pixelate') {
      if (
        Math.abs(pt.x - startPoint.value.x) >= 8 &&
        Math.abs(pt.y - startPoint.value.y) >= 8
      ) {
        applyPixelateRegion(
          bCtx,
          baseBitmap,
          startPoint.value.x,
          startPoint.value.y,
          pt.x,
          pt.y,
          false
        )
        pushHistoryStep(baseBitmap, workingTexts.value)
      } else {
        renderCurrentSnapshot()
      }
    }
  }

  const applyCrop = () => {
    const rect = cropRect.value
    const step = history.value[historyIndex.value]
    if (!rect || !step) return

    const rx = Math.max(0, Math.round(rect.x))
    const ry = Math.max(0, Math.round(rect.y))
    const rw = Math.min(step.bitmap.width - rx, Math.round(rect.w))
    const rh = Math.min(step.bitmap.height - ry, Math.round(rect.h))
    if (rw < 20 || rh < 20) {
      cropRect.value = null
      renderCurrentSnapshot()
      return
    }

    const croppedBitmap = document.createElement('canvas')
    croppedBitmap.width = rw
    croppedBitmap.height = rh
    const cCtx = croppedBitmap.getContext('2d')
    if (!cCtx) return
    cCtx.drawImage(step.bitmap, rx, ry, rw, rh, 0, 0, rw, rh)

    // Ajustar coordenadas de los textos que queden dentro del recorte
    const shiftedTexts = workingTexts.value
      .map(t => ({
        ...t,
        x: t.x - rx,
        y: t.y - ry,
      }))
      .filter(t => t.x >= 0 && t.x <= rw && t.y >= 0 && t.y <= rh)

    cropRect.value = null
    pushHistoryStep(croppedBitmap, shiftedTexts)
    activeTool.value = 'arrow'
  }

  const cancelCrop = () => {
    cropRect.value = null
    renderCurrentSnapshot()
  }

  const rotate90 = () => {
    const step = history.value[historyIndex.value]
    if (!step) return

    cropRect.value = null
    showTextPrompt.value = false

    const oldW = step.bitmap.width
    const oldH = step.bitmap.height
    const newW = oldH
    const newH = oldW

    const rotatedBitmap = document.createElement('canvas')
    rotatedBitmap.width = newW
    rotatedBitmap.height = newH
    const rCtx = rotatedBitmap.getContext('2d')
    if (!rCtx) return

    rCtx.save()
    rCtx.translate(newW / 2, newH / 2)
    rCtx.rotate(Math.PI / 2)
    rCtx.drawImage(step.bitmap, -oldW / 2, -oldH / 2)
    rCtx.restore()

    const rotatedTexts = workingTexts.value.map(t => ({
      ...t,
      x: Math.max(10, Math.min(newW - 20, oldH - t.y)),
      y: Math.max(10, Math.min(newH - 20, t.x)),
    }))

    pushHistoryStep(rotatedBitmap, rotatedTexts)
  }

  const confirmTextInsert = () => {
    const text = textInputValue.value.trim()
    showTextPrompt.value = false
    const step = history.value[historyIndex.value]
    if (!text || !step) {
      editingExistingTextId.value = null
      return
    }

    if (editingExistingTextId.value !== null) {
      const target = workingTexts.value.find(t => t.id === editingExistingTextId.value)
      if (target) {
        target.text = text
        target.color = activeColor.value
        target.sizeLevel = strokeSize.value
        selectedTextId.value = target.id
        pushHistoryStep(step.bitmap, workingTexts.value)
      }
      editingExistingTextId.value = null
      textInputValue.value = ''
      return
    }

    const newItem: TextAnnotation = {
      id: nextTextId++,
      text,
      x: textPosition.value.x,
      y: textPosition.value.y,
      color: activeColor.value,
      sizeLevel: strokeSize.value,
    }
    const nextTexts = [...workingTexts.value, newItem]
    selectedTextId.value = newItem.id
    pushHistoryStep(step.bitmap, nextTexts)
    textInputValue.value = ''
  }

  const cancelTextInsert = () => {
    showTextPrompt.value = false
    editingExistingTextId.value = null
    textInputValue.value = ''
  }

  const closeEditor = () => {
    cropRect.value = null
    showTextPrompt.value = false
    selectedTextId.value = null
    emit('update:modelValue', false)
  }

  const saveEditedImage = () => {
    const canvas = canvasRef.value
    if (!canvas) return

    cropRect.value = null
    selectedTextId.value = null
    hoveredTextId.value = null
    // Renderizar sin bordes de selección antes de exportar
    renderCurrentSnapshot(false)

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
  <div v-if="modelValue" class="cr-editor-overlay" @click.self="closeEditor">
    <div class="cr-editor-modal">
      <!-- Barra superior con los colores institucionales de CoreReports -->
      <header class="cr-toolbar">
        <div class="cr-toolbar-left">
          <button
            type="button"
            class="cr-icon-btn"
            title="Cerrar sin guardar"
            @click="closeEditor"
          >
            <X :size="20" />
            <span class="cr-btn-label">Cerrar</span>
          </button>
        </div>

        <div class="cr-toolbar-center">
          <button
            type="button"
            class="cr-tool-btn"
            :class="{ active: activeTool === 'crop' }"
            title="Recortar imagen"
            @click="selectTool('crop')"
          >
            <Crop :size="18" />
            <span>Recortar</span>
          </button>

          <button
            type="button"
            class="cr-tool-btn"
            title="Rotar 90 grados"
            @click="rotate90"
          >
            <RotateCw :size="18" />
            <span>Rotar</span>
          </button>

          <button
            type="button"
            class="cr-tool-btn"
            :class="{ active: activeTool === 'arrow' }"
            title="Insertar flecha de señalamiento"
            @click="selectTool('arrow')"
          >
            <MoveUpRight :size="18" />
            <span>Flecha</span>
          </button>

          <button
            type="button"
            class="cr-tool-btn"
            :class="{ active: activeTool === 'rect' }"
            title="Insertar recuadro de señalamiento"
            @click="selectTool('rect')"
          >
            <Square :size="18" />
            <span>Recuadro</span>
          </button>

          <button
            type="button"
            class="cr-tool-btn"
            :class="{ active: activeTool === 'draw' }"
            title="Dibujo libre"
            @click="selectTool('draw')"
          >
            <Pencil :size="18" />
            <span>Dibujar</span>
          </button>

          <button
            type="button"
            class="cr-tool-btn"
            :class="{ active: activeTool === 'text' }"
            title="Agregar o mover texto sobre la imagen"
            @click="selectTool('text')"
          >
            <Type :size="18" />
            <span>Texto</span>
          </button>

          <button
            type="button"
            class="cr-tool-btn"
            :class="{ active: activeTool === 'pixelate' }"
            title="Pixelar zona sensible"
            @click="selectTool('pixelate')"
          >
            <Grid :size="18" />
            <span>Pixelar</span>
          </button>

          <div class="cr-divider"></div>

          <button
            type="button"
            class="cr-icon-btn"
            :disabled="!canUndo()"
            title="Deshacer (Ctrl+Z)"
            @click="undo"
          >
            <Undo2 :size="18" />
          </button>

          <button
            type="button"
            class="cr-icon-btn"
            :disabled="!canRedo()"
            title="Rehacer (Ctrl+Y)"
            @click="redo"
          >
            <Redo2 :size="18" />
          </button>

          <button
            type="button"
            class="cr-icon-btn"
            :disabled="history.length <= 1"
            title="Restaurar imagen original"
            @click="resetToOriginal"
          >
            <RotateCcw :size="18" />
          </button>
        </div>

        <div class="cr-toolbar-right">
          <button
            type="button"
            class="cr-save-btn"
            title="Aplicar cambios a la foto"
            @click="saveEditedImage"
          >
            <Check :size="18" />
            <span>Listo</span>
          </button>
        </div>
      </header>

      <!-- Sub-barra de color, grosor y acciones sobre textos o recortes -->
      <div class="cr-subbar">
        <div
          v-if="['draw', 'arrow', 'rect', 'text'].includes(activeTool) || selectedTextId !== null"
          class="cr-style-controls"
        >
          <div class="cr-color-group">
            <span class="cr-subbar-label">Color:</span>
            <button
              v-for="c in colors"
              :key="c.value"
              type="button"
              class="cr-color-dot"
              :class="{ selected: activeColor === c.value }"
              :style="{ backgroundColor: c.value }"
              :title="c.label"
              @click="setColor(c.value)"
            ></button>
          </div>

          <div class="cr-size-group">
            <span class="cr-subbar-label">
              {{ activeTool === 'text' || selectedTextId !== null ? 'Tamaño:' : 'Grosor:' }}
            </span>
            <button
              v-for="s in strokeSizes"
              :key="s.value"
              type="button"
              class="cr-size-pill"
              :class="{ selected: strokeSize === s.value }"
              @click="setStrokeSize(s.value)"
            >
              {{ s.label }}
            </button>
          </div>

          <div v-if="selectedTextId !== null" class="cr-text-selected-actions">
            <button type="button" class="cr-action-secondary" @click="editSelectedText">
              <Pencil :size="14" /> Editar texto
            </button>
            <button type="button" class="cr-action-danger" @click="deleteSelectedText">
              <Trash2 :size="14" /> Quitar texto
            </button>
          </div>
        </div>

        <div v-else-if="activeTool === 'pixelate'" class="cr-hint-text">
          Arrastra sobre la imagen para pixelar placas, rostros o datos sensibles.
        </div>

        <div v-else-if="activeTool === 'crop'" class="cr-crop-actions">
          <span class="cr-hint-text">
            {{
              cropRect
                ? 'Ajusta o aplica el área seleccionada:'
                : 'Arrastra sobre la imagen para seleccionar el área a recortar.'
            }}
          </span>
          <template v-if="cropRect">
            <button type="button" class="cr-crop-confirm" @click="applyCrop">
              <Check :size="15" /> Aplicar recorte
            </button>
            <button type="button" class="cr-crop-cancel" @click="cancelCrop">
              Cancelar recorte
            </button>
          </template>
        </div>

        <div v-if="activeTool === 'text' && !showTextPrompt" class="cr-hint-text">
          Haz clic para agregar texto, o arrastra cualquier texto colocado para moverlo de lugar.
        </div>
      </div>

      <!-- Barra para escribir o editar un texto -->
      <div v-if="showTextPrompt" class="cr-text-prompt-bar">
        <input
          ref="textInputRef"
          v-model="textInputValue"
          type="text"
          class="cr-text-input"
          placeholder="Escribe el texto a insertar y presiona Enter..."
          @keydown.enter.prevent="confirmTextInsert"
          @keydown.esc.prevent="cancelTextInsert"
        />
        <button type="button" class="cr-crop-confirm" @click="confirmTextInsert">
          {{ editingExistingTextId !== null ? 'Actualizar texto' : 'Insertar texto' }}
        </button>
        <button type="button" class="cr-crop-cancel" @click="cancelTextInsert">
          Cancelar
        </button>
      </div>

      <!-- Área del lienzo (Canvas) -->
      <div class="cr-canvas-stage">
        <div v-if="isLoading" class="cr-status-msg">Cargando imagen...</div>
        <div v-else-if="loadError" class="cr-status-msg error">{{ loadError }}</div>
        <canvas
          v-show="!isLoading && !loadError"
          ref="canvasRef"
          class="cr-canvas"
          :class="{ 'cursor-move': hoveredTextId !== null || isDraggingText }"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @dblclick="editSelectedText"
        ></canvas>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .cr-editor-overlay {
    position: fixed;
    inset: 0;
    z-index: 99999;
    background: rgba(15, 23, 42, 0.88);
    backdrop-filter: blur(3px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px;
  }

  .cr-editor-modal {
    width: 100%;
    max-width: 1120px;
    height: 90vh;
    max-height: 860px;
    background: #0f172a;
    border: 1px solid #334155;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 25px 50px -12px rgba(2, 6, 23, 0.75);
  }

  .cr-toolbar {
    background: #1e293b;
    color: #f8fafc;
    padding: 10px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    border-bottom: 1px solid #334155;
    flex-wrap: wrap;
  }

  .cr-toolbar-left,
  .cr-toolbar-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .cr-toolbar-center {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .cr-tool-btn,
  .cr-icon-btn {
    background: transparent;
    border: 1px solid transparent;
    color: #cbd5e1;
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

  .cr-tool-btn:hover,
  .cr-icon-btn:hover:not(:disabled) {
    background: #334155;
    color: #ffffff;
  }

  .cr-tool-btn.active {
    background: #2563eb;
    color: #ffffff;
    border-color: #3b82f6;
    box-shadow: 0 1px 3px rgba(37, 99, 235, 0.35);
  }

  .cr-icon-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .cr-divider {
    width: 1px;
    height: 24px;
    background: #475569;
    margin: 0 4px;
  }

  .cr-save-btn {
    background: #2563eb;
    color: #ffffff;
    border: 1px solid #3b82f6;
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

  .cr-save-btn:hover {
    background: #1d4ed8;
  }

  .cr-subbar {
    background: #0f172a;
    color: #e2e8f0;
    padding: 8px 16px;
    min-height: 46px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 18px;
    border-bottom: 1px solid #1e293b;
    flex-wrap: wrap;
  }

  .cr-style-controls {
    display: flex;
    align-items: center;
    gap: 20px;
    flex-wrap: wrap;
  }

  .cr-color-group,
  .cr-size-group,
  .cr-text-selected-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .cr-subbar-label {
    font-size: 0.78rem;
    color: #94a3b8;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }

  .cr-color-dot {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.35);
    cursor: pointer;
    transition: transform 0.12s ease, border-color 0.12s ease;
  }

  .cr-color-dot.selected {
    transform: scale(1.2);
    border-color: #ffffff;
    box-shadow: 0 0 0 2px #2563eb;
  }

  .cr-size-pill {
    background: #1e293b;
    color: #cbd5e1;
    border: 1px solid #334155;
    border-radius: 6px;
    padding: 4px 10px;
    font-size: 0.78rem;
    cursor: pointer;
  }

  .cr-size-pill.selected {
    background: #2563eb;
    color: #ffffff;
    border-color: #3b82f6;
  }

  .cr-action-secondary {
    background: #1e293b;
    color: #e2e8f0;
    border: 1px solid #475569;
    border-radius: 6px;
    padding: 4px 10px;
    font-size: 0.78rem;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    cursor: pointer;
  }

  .cr-action-secondary:hover {
    background: #334155;
  }

  .cr-action-danger {
    background: rgba(239, 68, 68, 0.15);
    color: #fca5a5;
    border: 1px solid rgba(239, 68, 68, 0.4);
    border-radius: 6px;
    padding: 4px 10px;
    font-size: 0.78rem;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    cursor: pointer;
  }

  .cr-action-danger:hover {
    background: #dc2626;
    color: #ffffff;
  }

  .cr-hint-text {
    font-size: 0.82rem;
    color: #94a3b8;
  }

  .cr-crop-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .cr-crop-confirm {
    background: #2563eb;
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

  .cr-crop-confirm:hover {
    background: #1d4ed8;
  }

  .cr-crop-cancel {
    background: #334155;
    color: #f8fafc;
    border: none;
    border-radius: 6px;
    padding: 5px 12px;
    font-size: 0.8rem;
    cursor: pointer;
  }

  .cr-crop-cancel:hover {
    background: #475569;
  }

  .cr-text-prompt-bar {
    background: #1e293b;
    padding: 8px 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-bottom: 1px solid #334155;
  }

  .cr-text-input {
    width: 100%;
    max-width: 420px;
    background: #0f172a;
    color: #ffffff;
    border: 1px solid #475569;
    border-radius: 6px;
    padding: 6px 12px;
    font-size: 0.88rem;
    outline: none;
  }

  .cr-text-input:focus {
    border-color: #3b82f6;
  }

  .cr-canvas-stage {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    overflow: hidden;
    background: #090e1a;
    position: relative;
  }

  .cr-canvas {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    background: #ffffff;
    border-radius: 6px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.55);
    touch-action: none;
    cursor: crosshair;
  }

  .cr-canvas.cursor-move {
    cursor: grab;
  }

  .cr-canvas.cursor-move:active {
    cursor: grabbing;
  }

  .cr-status-msg {
    color: #cbd5e1;
    font-size: 0.95rem;
  }

  .cr-status-msg.error {
    color: #f87171;
  }

  @media (max-width: 768px) {
    .cr-editor-modal {
      height: 96vh;
      max-height: none;
    }

    .cr-tool-btn span,
    .cr-btn-label {
      display: none;
    }
  }
</style>
