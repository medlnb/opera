<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const router = useRouter()

const { t } = useI18n()

const fileInput = ref<HTMLInputElement | null>(null)

const imageFile = ref<File | null>(null)
const imageUrl = ref<string>('')
const canvas = ref<HTMLCanvasElement | null>(null)
const displayCanvas = ref<HTMLCanvasElement | null>(null)
const ctx = ref<CanvasRenderingContext2D | null>(null)
const displayCtx = ref<CanvasRenderingContext2D | null>(null)
const selectedColor = ref('#FF5733')
const originalImageData = ref<ImageData | null>(null)
const isLoading = ref(false)
const tolerance = ref(30)

type ToolMode = 'paint' | 'erase'
const toolMode = ref<ToolMode>('paint')

const undoStack = ref<ImageData[]>([])
const redoStack = ref<ImageData[]>([])

const canUndo = computed(() => undoStack.value.length > 0)
const canRedo = computed(() => redoStack.value.length > 0)

const clearHistory = () => {
  undoStack.value = []
  redoStack.value = []
}

const getSnapshot = () => {
  if (!ctx.value || !canvas.value)
    return null

  return ctx.value.getImageData(0, 0, canvas.value.width, canvas.value.height)
}

const applySnapshot = (snapshot: ImageData) => {
  if (!ctx.value || !displayCtx.value)
    return

  ctx.value.putImageData(snapshot, 0, 0)
  displayCtx.value.putImageData(snapshot, 0, 0)
}

const pushUndoSnapshot = () => {
  const snapshot = getSnapshot()
  if (!snapshot)
    return

  undoStack.value.push(snapshot)
  redoStack.value = []
}

const undoLastEdit = () => {
  if (!canUndo.value)
    return

  const current = getSnapshot()
  const previous = undoStack.value.pop()!
  if (current)
    redoStack.value.push(current)

  applySnapshot(previous)
}

const redoLastUndo = () => {
  if (!canRedo.value)
    return

  const current = getSnapshot()
  const next = redoStack.value.pop()!
  if (current)
    undoStack.value.push(current)

  applySnapshot(next)
}

const handleBack = async () => {
  // Prefer navigating back if there is browser history; otherwise go home
  if (typeof window !== 'undefined' && window.history.length > 1) {
    router.back()

    return
  }

  await navigateTo('/')
}

const onKeyDown = (event: KeyboardEvent) => {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform)
  const modKey = isMac ? event.metaKey : event.ctrlKey

  if (modKey && event.key.toLowerCase() === 'z') {
    event.preventDefault()
    if (event.shiftKey)
      redoLastUndo()
    else
      undoLastEdit()

    return
  }

  if (modKey && event.key.toLowerCase() === 'y') {
    event.preventDefault()
    redoLastUndo()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
})

// Load image onto canvas
const loadImageToCanvas = () => {
  if (!imageUrl.value)
    return

  isLoading.value = true

  const img = new Image()

  img.onload = () => {
    if (canvas.value && displayCanvas.value) {
      // Set canvas size to image size
      canvas.value.width = img.width
      canvas.value.height = img.height
      displayCanvas.value.width = img.width
      displayCanvas.value.height = img.height

      ctx.value = canvas.value.getContext('2d', { willReadFrequently: true })
      displayCtx.value = displayCanvas.value.getContext('2d', { willReadFrequently: true })

      if (ctx.value && displayCtx.value) {
        ctx.value.drawImage(img, 0, 0)
        displayCtx.value.drawImage(img, 0, 0)
        originalImageData.value = ctx.value.getImageData(0, 0, canvas.value.width, canvas.value.height)
        clearHistory()
      }
    }
    isLoading.value = false
  }
  img.src = imageUrl.value
}

const triggerFilePicker = () => {
  fileInput.value?.click()
}

// Load image from file
const handleImageUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    const file = target.files[0]

    imageFile.value = file

    const reader = new FileReader()

    reader.onload = e => {
      imageUrl.value = e.target?.result as string
      loadImageToCanvas()
    }
    reader.readAsDataURL(file)
  }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)

  if (!result)
    return null

  return {
    r: Number.parseInt(result[1], 16),
    g: Number.parseInt(result[2], 16),
    b: Number.parseInt(result[3], 16),
  }
}

function isEdgePixel(
  x: number,
  y: number,
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  targetR: number,
  targetG: number,
  targetB: number,
): boolean {
  const directions = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ]

  for (const [dx, dy] of directions) {
    const nx = x + dx
    const ny = y + dy

    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
      const pos = (ny * width + nx) * 4
      const r = pixels[pos]
      const g = pixels[pos + 1]
      const b = pixels[pos + 2]

      if (
        Math.abs(r - targetR) > tolerance.value
        || Math.abs(g - targetG) > tolerance.value
        || Math.abs(b - targetB) > tolerance.value
      )
        return true
    }
  }

  return false
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255

  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const delta = max - min

  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1))

    if (max === rn)
      h = ((gn - bn) / delta) % 6
    else if (max === gn)
      h = (bn - rn) / delta + 2
    else
      h = (rn - gn) / delta + 4

    h *= 60
    if (h < 0)
      h += 360
  }

  return { h, s, l }
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const hp = (h % 360) / 60
  const x = c * (1 - Math.abs((hp % 2) - 1))

  let rn = 0
  let gn = 0
  let bn = 0

  if (hp >= 0 && hp < 1) {
    rn = c
    gn = x
    bn = 0
  }
  else if (hp >= 1 && hp < 2) {
    rn = x
    gn = c
    bn = 0
  }
  else if (hp >= 2 && hp < 3) {
    rn = 0
    gn = c
    bn = x
  }
  else if (hp >= 3 && hp < 4) {
    rn = 0
    gn = x
    bn = c
  }
  else if (hp >= 4 && hp < 5) {
    rn = x
    gn = 0
    bn = c
  }
  else {
    rn = c
    gn = 0
    bn = x
  }

  const m = l - c / 2

  return {
    r: Math.round((rn + m) * 255),
    g: Math.round((gn + m) * 255),
    b: Math.round((bn + m) * 255),
  }
}

// Flood fill algorithm with edge detection (paint) + depaint (restore original pixels)
const applyRegion = (startX: number, startY: number, fillColor: { r: number; g: number; b: number }, mode: ToolMode) => {
  if (!ctx.value || !displayCtx.value || !canvas.value || !originalImageData.value)
    return

  const imageData = ctx.value.getImageData(0, 0, canvas.value.width, canvas.value.height)
  const pixels = imageData.data
  const originalPixels = originalImageData.value.data
  const width = canvas.value.width
  const height = canvas.value.height

  const startPos = (startY * width + startX) * 4
  const currentStartR = pixels[startPos]
  const currentStartG = pixels[startPos + 1]
  const currentStartB = pixels[startPos + 2]

  const originalStartR = originalPixels[startPos]
  const originalStartG = originalPixels[startPos + 1]
  const originalStartB = originalPixels[startPos + 2]

  const fillHsl = rgbToHsl(fillColor.r, fillColor.g, fillColor.b)

  const paintFromOriginal = (or: number, og: number, ob: number): { r: number; g: number; b: number } => {
    // Preserve photo lighting/shadows: keep original pixel lightness, but apply selected hue/saturation.
    const { l } = rgbToHsl(or, og, ob)

    return hslToRgb(fillHsl.h, fillHsl.s, l)
  }

  // No-op checks (must happen BEFORE pushing undo snapshots).
  // Paint: if the clicked pixel already matches the expected painted value, do nothing.
  // Erase: if the clicked pixel already matches the original, do nothing.
  if (mode === 'paint') {
    const edge = isEdgePixel(startX, startY, originalPixels, width, height, originalStartR, originalStartG, originalStartB)
    const alpha = edge ? 0.7 : 1.0

    const painted = paintFromOriginal(originalStartR, originalStartG, originalStartB)

    const expectedR = painted.r * alpha + originalStartR * (1 - alpha)
    const expectedG = painted.g * alpha + originalStartG * (1 - alpha)
    const expectedB = painted.b * alpha + originalStartB * (1 - alpha)

    if (
      Math.abs(currentStartR - expectedR) <= 1
      && Math.abs(currentStartG - expectedG) <= 1
      && Math.abs(currentStartB - expectedB) <= 1
    )
      return
  }
  else {
    if (
      Math.abs(currentStartR - originalStartR) <= 1
      && Math.abs(currentStartG - originalStartG) <= 1
      && Math.abs(currentStartB - originalStartB) <= 1
    )
      return
  }

  pushUndoSnapshot()

  // Region selection is based on ORIGINAL pixels (stable across repeated paints/erases).
  const regionR = originalStartR
  const regionG = originalStartG
  const regionB = originalStartB

  const visited = new Uint8Array(width * height)
  const stack: Array<{ x: number; y: number }> = [{ x: startX, y: startY }]

  const colorMatch = (r: number, g: number, b: number): boolean => {
    return (
      Math.abs(r - regionR) <= tolerance.value
      && Math.abs(g - regionG) <= tolerance.value
      && Math.abs(b - regionB) <= tolerance.value
    )
  }

  while (stack.length > 0) {
    const { x, y } = stack.pop()!

    if (x < 0 || x >= width || y < 0 || y >= height)
      continue

    const pos = y * width + x
    if (visited[pos])
      continue

    const pixelPos = pos * 4
    const r = pixels[pixelPos]
    const g = pixels[pixelPos + 1]
    const b = pixels[pixelPos + 2]

    const or = originalPixels[pixelPos]
    const og = originalPixels[pixelPos + 1]
    const ob = originalPixels[pixelPos + 2]

    if (!colorMatch(or, og, ob))
      continue

    visited[pos] = 1

    const edge = isEdgePixel(x, y, originalPixels, width, height, regionR, regionG, regionB)
    const alpha = edge ? 0.7 : 1.0

    if (mode === 'paint') {
      // Preserve shadows by coloring the original pixel rather than flattening it.
      const painted = paintFromOriginal(or, og, ob)

      pixels[pixelPos] = painted.r * alpha + or * (1 - alpha)
      pixels[pixelPos + 1] = painted.g * alpha + og * (1 - alpha)
      pixels[pixelPos + 2] = painted.b * alpha + ob * (1 - alpha)
    }
    else {
      // Depaint: move pixels back toward original (blend at edges for smoother boundary).
      pixels[pixelPos] = or * alpha + r * (1 - alpha)
      pixels[pixelPos + 1] = og * alpha + g * (1 - alpha)
      pixels[pixelPos + 2] = ob * alpha + b * (1 - alpha)
    }

    stack.push({ x: x + 1, y })
    stack.push({ x: x - 1, y })
    stack.push({ x, y: y + 1 })
    stack.push({ x, y: y - 1 })
  }

  ctx.value.putImageData(imageData, 0, 0)
  displayCtx.value.putImageData(imageData, 0, 0)
}

// Handle canvas click
const handleCanvasClick = (event: MouseEvent) => {
  if (!displayCanvas.value)
    return

  const rect = displayCanvas.value.getBoundingClientRect()
  const scaleX = displayCanvas.value.width / rect.width
  const scaleY = displayCanvas.value.height / rect.height

  const x = Math.floor((event.clientX - rect.left) * scaleX)
  const y = Math.floor((event.clientY - rect.top) * scaleY)

  const color = hexToRgb(selectedColor.value)
  if (!color)
    return

  applyRegion(x, y, color, toolMode.value)
}

// Reset to original image
const resetImage = () => {
  if (ctx.value && displayCtx.value && originalImageData.value && canvas.value) {
    pushUndoSnapshot()
    ctx.value.putImageData(originalImageData.value, 0, 0)
    displayCtx.value.putImageData(originalImageData.value, 0, 0)
  }
}

const clearImage = () => {
  imageUrl.value = ''
  imageFile.value = null
  toolMode.value = 'paint'
  clearHistory()
}

// Download edited image
const downloadImage = () => {
  if (displayCanvas.value) {
    const link = document.createElement('a')

    link.download = 'painted-room.png'
    link.href = displayCanvas.value.toDataURL()
    link.click()
  }
}

// Predefined color palette
const colorPalette = [
  '#FFFFFF',
  '#F5F5F5',
  '#EEEEEE',
  '#E0E0E0',
  '#FF5733',
  '#FF6B6B',
  '#FFA07A',
  '#FFD700',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#87CEEB',
  '#9B59B6',
  '#DDA0DD',
  '#E6B0AA',
  '#F8B500',
  '#2C3E50',
  '#34495E',
  '#7F8C8D',
  '#95A5A6',
  '#27AE60',
  '#2ECC71',
  '#A8E6CF',
  '#C7CEEA',
]
</script>

<template>
  <div class="room-painter-page">
    <VCard class="mb-4">
      <VCardTitle class="d-flex align-center justify-space-between flex-wrap gap-2 pt-4">
        <div class="d-flex align-center gap-2">
          <VBtn
            variant="text"
            color="default"
            prepend-icon="tabler-arrow-left"
            @click="handleBack"
          >
            {{ t('common.back') }}
          </VBtn>

          <VDivider vertical />

          <VIcon
            icon="tabler-paint"
            size="28"
          />
          {{ t('room_painter.title') }}
        </div>

        <VChip
          v-if="imageUrl"
          color="primary"
          variant="tonal"
        >
          {{ t('room_painter.painting_enabled') }}
        </VChip>
      </VCardTitle>
      <VCardText>
        {{ t('room_painter.description') }}
      </VCardText>
    </VCard>

    <!-- Upload Section -->
    <VCard
      v-if="!imageUrl"
      class="mt-6"
    >
      <VCardText class="text-center pa-12">
        <VIcon
          icon="tabler-upload"
          size="64"
          color="primary"
          class="mb-4"
        />
        <h3 class="text-h5 mb-2">
          {{ t('room_painter.upload.title') }}
        </h3>
        <p class="text-body-1 text-medium-emphasis mb-6">
          {{ t('room_painter.upload.subtitle') }}
        </p>

        <VBtn
          color="primary"
          size="large"
          prepend-icon="tabler-photo"
          @click="triggerFilePicker"
        >
          {{ t('room_painter.upload.select_image') }}
        </VBtn>

        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          style="display: none"
          @change="handleImageUpload"
        >
      </VCardText>
    </VCard>

    <!-- Editor Section -->
    <div v-else>
      <VRow>
        <!-- Controls Panel -->
        <VCol
          cols="12"
          md="3"
        >
          <VCard>
            <VCardTitle>
              <VIcon
                icon="tabler-palette"
                class="me-2"
              />
              {{ t('room_painter.controls.title') }}
            </VCardTitle>

            <VCardText>
              <!-- Paint mode (always enabled) -->
              <div class="mb-6">
                <VBtnToggle
                  v-model="toolMode"
                  mandatory
                  divided
                  class="w-100"
                >
                  <VBtn
                    value="paint"
                    prepend-icon="tabler-brush"
                  >
                    {{ t('room_painter.controls.paint') }}
                  </VBtn>
                  <VBtn
                    value="erase"
                    prepend-icon="tabler-eraser"
                  >
                    {{ t('room_painter.controls.depaint') }}
                  </VBtn>
                </VBtnToggle>

                <p class="text-caption text-medium-emphasis mt-2">
                  {{ t('room_painter.controls.depaint_help') }}
                </p>

                <p class="text-caption text-medium-emphasis mt-2">
                  {{ t('room_painter.controls.tip_undo') }}
                </p>
              </div>

              <!-- Color Picker -->
              <div class="mb-4">
                <label class="text-sm font-weight-medium mb-2 d-block">{{ t('room_painter.controls.selected_color') }}</label>
                <input
                  v-model="selectedColor"
                  type="color"
                  class="color-picker"
                >
              </div>

              <!-- Color Palette -->
              <div class="mb-6">
                <label class="text-sm font-weight-medium mb-2 d-block">{{ t('room_painter.controls.quick_colors') }}</label>
                <div class="color-palette">
                  <button
                    v-for="color in colorPalette"
                    :key="color"
                    class="palette-color"
                    :style="{ backgroundColor: color }"
                    :class="{ active: selectedColor === color }"
                    @click="selectedColor = color"
                  />
                </div>
              </div>

              <!-- Tolerance Slider -->
              <div class="mb-6">
                <label class="text-sm font-weight-medium mb-2 d-block">
                  {{ t('room_painter.controls.detection_sensitivity', { value: tolerance }) }}
                </label>
                <VSlider
                  v-model="tolerance"
                  :min="5"
                  :max="100"
                  :step="5"
                  thumb-label
                  color="primary"
                />
                <p class="text-caption text-medium-emphasis">
                  {{ t('room_painter.controls.detection_help') }}
                </p>
              </div>

              <VDivider class="my-4" />

              <!-- Undo/Redo -->
              <div class="d-flex gap-3 mb-4">
                <VBtn
                  :disabled="!canUndo"
                  color="default"
                  variant="outlined"
                  prepend-icon="tabler-arrow-back-up"
                  @click="undoLastEdit"
                >
                  {{ t('room_painter.controls.undo') }}
                </VBtn>
                <VBtn
                  :disabled="!canRedo"
                  color="default"
                  variant="outlined"
                  prepend-icon="tabler-arrow-forward-up"
                  @click="redoLastUndo"
                >
                  {{ t('room_painter.controls.redo') }}
                </VBtn>
              </div>

              <!-- Action Buttons -->
              <div class="d-flex flex-column gap-3">
                <VBtn
                  color="warning"
                  variant="outlined"
                  prepend-icon="tabler-refresh"
                  block
                  @click="resetImage"
                >
                  {{ t('room_painter.controls.reset_image') }}
                </VBtn>

                <VBtn
                  color="success"
                  variant="flat"
                  prepend-icon="tabler-download"
                  block
                  @click="downloadImage"
                >
                  {{ t('room_painter.controls.download_result') }}
                </VBtn>

                <VBtn
                  color="default"
                  variant="outlined"
                  prepend-icon="tabler-photo"
                  block
                  @click="clearImage"
                >
                  {{ t('room_painter.controls.upload_new_image') }}
                </VBtn>
              </div>
            </VCardText>
          </VCard>

          <!-- Instructions Card -->
          <VCard class="mt-4 d-none d-md-block">
            <VCardTitle class="text-sm">
              <VIcon
                icon="tabler-info-circle"
                class="me-2"
                size="20"
              />
              {{ t('room_painter.how_to_use.title') }}
            </VCardTitle>
            <VCardText>
              <ol class="text-sm ps-4">
                <li class="mb-2">
                  {{ t('room_painter.how_to_use.step_1') }}
                </li>
                <li class="mb-2">
                  {{ t('room_painter.how_to_use.step_2') }}
                </li>
                <li class="mb-2">
                  {{ t('room_painter.how_to_use.step_3') }}
                </li>
                <li class="mb-2">
                  {{ t('room_painter.how_to_use.step_4') }}
                </li>
                <li>{{ t('room_painter.how_to_use.step_5') }}</li>
              </ol>
            </VCardText>
          </VCard>
        </VCol>

        <!-- Canvas Area -->
        <VCol
          cols="12"
          md="9"
        >
          <VCard>
            <VCardText>
              <div class="canvas-container painting-mode">
                <canvas
                  ref="canvas"
                  style="display: none;"
                />
                <canvas
                  ref="displayCanvas"
                  class="display-canvas"
                  @click="handleCanvasClick"
                />

                <div
                  v-if="isLoading"
                  class="loading-overlay"
                >
                  <VProgressCircular
                    indeterminate
                    size="64"
                    color="primary"
                  />
                </div>
              </div>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>

      <!-- Mobile sticky toolbar: keeps key actions reachable without scrolling -->
      <div
        v-if="imageUrl"
        class="mobile-toolbar d-md-none"
      >
        <VCard class="pa-2">
          <div class="d-flex align-center gap-2 flex-wrap">
            <VBtnToggle
              v-model="toolMode"
              mandatory
              divided
              density="compact"
              class="mobile-tool-toggle"
            >
              <VBtn
                value="paint"
                prepend-icon="tabler-brush"
                size="small"
              >
                {{ t('room_painter.controls.paint') }}
              </VBtn>
              <VBtn
                value="erase"
                prepend-icon="tabler-eraser"
                size="small"
              >
                {{ t('room_painter.controls.depaint') }}
              </VBtn>
            </VBtnToggle>

            <VBtn
              :disabled="!canUndo"
              color="default"
              variant="outlined"
              size="small"
              prepend-icon="tabler-arrow-back-up"
              @click="undoLastEdit"
            >
              {{ t('room_painter.controls.undo') }}
            </VBtn>
            <VBtn
              :disabled="!canRedo"
              color="default"
              variant="outlined"
              size="small"
              prepend-icon="tabler-arrow-forward-up"
              @click="redoLastUndo"
            >
              {{ t('room_painter.controls.redo') }}
            </VBtn>

            <input
              v-model="selectedColor"
              type="color"
              class="color-picker color-picker--sm"
              :aria-label="t('room_painter.aria.selected_color')"
            >
          </div>

          <div class="mobile-color-row mt-2">
            <button
              v-for="color in colorPalette"
              :key="color"
              class="palette-color palette-color--sm"
              :style="{ backgroundColor: color }"
              :class="{ active: selectedColor === color }"
              @click="selectedColor = color"
            />
          </div>

          <div class="d-flex gap-2 mt-2">
            <VBtn
              color="warning"
              variant="outlined"
              size="small"
              prepend-icon="tabler-refresh"
              @click="resetImage"
            >
              {{ t('room_painter.mobile.reset') }}
            </VBtn>

            <VBtn
              color="success"
              variant="flat"
              size="small"
              prepend-icon="tabler-download"
              @click="downloadImage"
            >
              {{ t('room_painter.mobile.download') }}
            </VBtn>

            <VBtn
              color="default"
              variant="outlined"
              size="small"
              prepend-icon="tabler-photo"
              @click="clearImage"
            >
              {{ t('room_painter.mobile.new') }}
            </VBtn>
          </div>
        </VCard>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.room-painter-page {
  padding: 0;
  margin-block: 0;
  margin-inline: auto;
  max-inline-size: 1600px;
}

.color-picker {
  border: 2px solid rgb(var(--v-theme-surface-variant));
  border-radius: 8px;
  block-size: 60px;
  cursor: pointer;
  inline-size: 100%;

  &:hover {
    border-color: rgb(var(--v-theme-primary));
  }
}

.color-picker--sm {
  padding: 0;
  block-size: 36px;
  inline-size: 56px;
}

.color-palette {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(4, 1fr);
}

.palette-color {
  border: 2px solid rgb(var(--v-theme-surface-variant));
  border-radius: 8px;
  aspect-ratio: 1;
  cursor: pointer;
  inline-size: 100%;
  transition: all 0.2s;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 15%);
    transform: scale(1.1);
  }

  &.active {
    border-width: 3px;
    border-color: rgb(var(--v-theme-primary));
    transform: scale(1.05);
  }
}

.palette-color--sm {
  flex: 0 0 auto;
  border-radius: 10px;
  block-size: 28px;
  inline-size: 28px;
}

.mobile-toolbar {
  position: fixed;
  z-index: 10;
  padding: 8px;
  background: rgb(var(--v-theme-background));
  inset-block-end: 0;
  inset-inline: 0;
}

.mobile-color-row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-block: 2px;
}

.mobile-tool-toggle {
  flex: 1 1 auto;
}

@media (max-width: 959.98px) {
  .room-painter-page {
    padding-block-end: 170px;
  }
}

.canvas-container {
  position: relative;
  display: flex;
  overflow: hidden;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: repeating-conic-gradient(#f5f5f5 0% 25%, #fff 0% 50%)
    50% / 20px 20px;
  inline-size: fit-content;
  margin-inline: auto;
  max-inline-size: 100%;

  &.painting-mode {
    cursor: crosshair;
  }
}

.display-canvas {
  display: block;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 10%);
  max-block-size: 800px;
  max-inline-size: 100%;
  object-fit: contain;
}

.loading-overlay {
  position: absolute;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 90%);
  inset: 0;
}
</style>
