<script setup lang="ts">
import { useApi } from '@/composables/useApi'
import { useI18n } from 'vue-i18n'

const router = useRouter()

const { t } = useI18n()

type SampleCategory = 'room' | 'livingroom' | 'kitchen'

const sampleCategory = ref<SampleCategory>('room')

type SampleImage = { src: string; maskSrc: string }

const sampleImagesByCategory: Record<SampleCategory, SampleImage[]> = {
  room: [
    {
      src: new URL('../assets/images/room/room1.png', import.meta.url).href,
      maskSrc: new URL('../assets/images/room/room1-mask.png', import.meta.url).href,
    },
    {
      src: new URL('../assets/images/room/room2.jpg', import.meta.url).href,
      maskSrc: new URL('../assets/images/room/room2-mask.png', import.meta.url).href,
    },
  ],
  livingroom: [
    {
      src: new URL('../assets/images/livingroom/livingroom1.jpg', import.meta.url).href,
      maskSrc: new URL('../assets/images/livingroom/livingroom1-mask.png', import.meta.url).href,
    },
    {
      src: new URL('../assets/images/livingroom/livingroom2.jpg', import.meta.url).href,
      maskSrc: new URL('../assets/images/livingroom/livingroom2-mask.png', import.meta.url).href,
    },
    {
      src: new URL('../assets/images/livingroom/livingroom3.jpg', import.meta.url).href,
      maskSrc: new URL('../assets/images/livingroom/livingroom3-mask.png', import.meta.url).href,
    },
    {
      src: new URL('../assets/images/livingroom/livingroom5.jpg', import.meta.url).href,
      maskSrc: new URL('../assets/images/livingroom/livingroom5-mask.png', import.meta.url).href,
    },
  ],
  kitchen: [
    {
      src: new URL('../assets/images/kitchen/kitchen1.jpg', import.meta.url).href,
      maskSrc: new URL('../assets/images/kitchen/kitchen1-mask.png', import.meta.url).href,
    },
    {
      src: new URL('../assets/images/kitchen/kitchen3.jpg', import.meta.url).href,
      maskSrc: new URL('../assets/images/kitchen/kitchen3-mask.png', import.meta.url).href,
    },
  ],
}

const sampleImages = computed(() => sampleImagesByCategory[sampleCategory.value] ?? [])

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
const tolerance = ref(25)

// AI wall mask (from FastAPI borderServer). Used to constrain painting.
const wallMaskDataUrl = ref<string>('')
const wallMaskAlpha = ref<Uint8Array | null>(null)

// If the user selected a sample image, we can load its precomputed `*-mask.png`
// locally and skip the backend request.
const nextLocalMaskUrl = ref<string>('')

const clearWallMask = () => {
  wallMaskDataUrl.value = ''
  wallMaskAlpha.value = null
}

const buildMaskAlphaFromDataUrl = async (dataUrl: string, width: number, height: number) => {
  const img = new Image()

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('Failed to load mask image'))
    img.src = dataUrl
  })

  const maskCanvas = document.createElement('canvas')

  maskCanvas.width = width
  maskCanvas.height = height

  const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true })
  if (!maskCtx)
    return null

  maskCtx.clearRect(0, 0, width, height)
  maskCtx.drawImage(img, 0, 0, width, height)

  const pixels = maskCtx.getImageData(0, 0, width, height).data
  const alpha = new Uint8Array(width * height)

  for (let pos = 0; pos < alpha.length; pos++) {
    const i = pos * 4
    const a = pixels[i + 3]
    const v = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3

    alpha[pos] = (a > 0 && v > 127) ? 255 : 0
  }

  return alpha
}

const applyWallMaskToPaintLayer = (options?: { pushUndo?: boolean }) => {
  if (!canvas.value)
    return

  const mask = wallMaskAlpha.value
  if (!mask)
    return

  if (options?.pushUndo)
    pushUndoSnapshot()

  paintLayerAlpha.value = mask.slice()
  recountPaintedPixels()
  renderPaintLayer()
}

const fetchWallMaskForCurrentImage = async () => {
  if (!canvas.value || !imageUrl.value)
    return

  try {
    const form = new FormData()

    if (imageFile.value) {
      form.append('file', imageFile.value, imageFile.value.name)
    }
    else {
      const res = await fetch(imageUrl.value)
      if (!res.ok)
        throw new Error(`Failed to fetch image (${res.status})`)

      const blob = await res.blob()
      const filename = blob.type?.includes('png') ? 'image.png' : 'image.jpg'

      form.append('file', blob, filename)
    }

    const resp = await $fetch<{ maskDataUrl: string }>('/api/ai/wall-mask', {
      method: 'POST',
      body: form,
    })

    const nextMaskDataUrl = resp?.maskDataUrl
    if (!nextMaskDataUrl) {
      clearWallMask()

      return
    }

    wallMaskDataUrl.value = nextMaskDataUrl
    wallMaskAlpha.value = await buildMaskAlphaFromDataUrl(nextMaskDataUrl, canvas.value.width, canvas.value.height)

    // Auto-paint the detected wall area (no manual selection tools).
    applyWallMaskToPaintLayer()
  }
  catch (err) {
    // Fall back to the local (color-based) region detection.
    console.warn('Wall mask detection failed; continuing without mask.', err)
    clearWallMask()
  }
}

// Paint layer: stores how strongly each pixel is painted (0 = not painted).
// This enables recoloring all painted areas when `selectedColor` changes.
const paintLayerAlpha = ref<Uint8Array | null>(null)
const paintedPixelCount = ref(0)

type ToolMode = 'paint' | 'erase'
const toolMode = ref<ToolMode>('paint')

type SelectionMode = 'point' | 'rect'
const selectionMode = ref<SelectionMode>('point')

const isSelecting = ref(false)
const selectionStartClient = ref<{ x: number; y: number } | null>(null)
const selectionCurrentClient = ref<{ x: number; y: number } | null>(null)

interface LayerSnapshot { paintLayerAlpha: Uint8Array }

const undoStack = ref<LayerSnapshot[]>([])
const redoStack = ref<LayerSnapshot[]>([])

const canUndo = computed(() => undoStack.value.length > 0)
const canRedo = computed(() => redoStack.value.length > 0)

const clearHistory = () => {
  undoStack.value = []
  redoStack.value = []
}

const recountPaintedPixels = () => {
  const alpha = paintLayerAlpha.value
  if (!alpha) {
    paintedPixelCount.value = 0

    return
  }

  let count = 0
  for (let i = 0; i < alpha.length; i++) {
    if (alpha[i] > 0)
      count++
  }
  paintedPixelCount.value = count
}

const renderPaintLayer = () => {
  if (!ctx.value || !displayCtx.value || !canvas.value || !originalImageData.value)
    return

  const alpha = paintLayerAlpha.value
  if (!alpha)
    return

  const color = hexToRgb(selectedColor.value)
  if (!color)
    return

  const width = canvas.value.width
  const height = canvas.value.height

  const originalPixels = originalImageData.value.data
  const out = new ImageData(new Uint8ClampedArray(originalPixels), width, height)
  const outPixels = out.data

  const fillHsl = rgbToHsl(color.r, color.g, color.b)

  // Preserve original lighting/shadows by mixing the original lightness into the chosen paint.
  // We also apply a minimum lightness derived from the chosen color so light paints don't
  // disappear on very dark areas.
  const lightingPreservation = 0.8
  const minLightnessFromPaint = 0.35

  for (let pos = 0; pos < alpha.length; pos++) {
    const aByte = alpha[pos]
    if (aByte === 0)
      continue

    const i = pos * 4
    const or = originalPixels[i]
    const og = originalPixels[i + 1]
    const ob = originalPixels[i + 2]

    const { l: origL } = rgbToHsl(or, og, ob)

    const mixedL = fillHsl.l * (1 - lightingPreservation) + origL * lightingPreservation
    const targetL = Math.max(fillHsl.l * minLightnessFromPaint, mixedL)

    const painted = hslToRgb(fillHsl.h, fillHsl.s, targetL)

    const a = aByte / 255

    outPixels[i] = painted.r * a + or * (1 - a)
    outPixels[i + 1] = painted.g * a + og * (1 - a)
    outPixels[i + 2] = painted.b * a + ob * (1 - a)
  }

  ctx.value.putImageData(out, 0, 0)
  displayCtx.value.putImageData(out, 0, 0)
}

const getSnapshot = (): LayerSnapshot | null => {
  const alpha = paintLayerAlpha.value
  if (!alpha)
    return null

  return { paintLayerAlpha: alpha.slice() }
}

const applySnapshot = (snapshot: LayerSnapshot) => {
  paintLayerAlpha.value = snapshot.paintLayerAlpha.slice()
  recountPaintedPixels()
  renderPaintLayer()
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

  // Load color palette from backend (fallback to defaults if unavailable).
  fetchBackendColors()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
})

// Load image onto canvas
const loadImageToCanvas = () => {
  if (!imageUrl.value)
    return

  isLoading.value = true
  clearWallMask()

  const localMaskUrl = nextLocalMaskUrl.value

  nextLocalMaskUrl.value = ''

  const img = new Image()

  img.onload = async () => {
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
        paintLayerAlpha.value = new Uint8Array(canvas.value.width * canvas.value.height)
        paintedPixelCount.value = 0
        clearHistory()
      }
    }

    if (localMaskUrl) {
      try {
        wallMaskDataUrl.value = localMaskUrl
        wallMaskAlpha.value = await buildMaskAlphaFromDataUrl(localMaskUrl, canvas.value!.width, canvas.value!.height)
        applyWallMaskToPaintLayer()
      }
      catch (err) {
        console.warn('Failed to load local sample mask; continuing without wall mask (no backend request).', err)
        clearWallMask()
      }
    }
    else {
      await fetchWallMaskForCurrentImage()
    }
    isLoading.value = false
  }
  img.src = imageUrl.value
}

const loadSampleImage = (sample: SampleImage) => {
  imageFile.value = null
  imageUrl.value = sample.src
  nextLocalMaskUrl.value = sample.maskSrc
  loadImageToCanvas()
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
type RegionMatcher = (or: number, og: number, ob: number, x: number, y: number) => boolean

const isEdgePixelByMatcher = (
  x: number,
  y: number,
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  matcher: RegionMatcher,
): boolean => {
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
      const nr = pixels[pos]
      const ng = pixels[pos + 1]
      const nb = pixels[pos + 2]

      if (!matcher(nr, ng, nb, nx, ny))
        return true
    }
  }

  return false
}

const hueDistance = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360

  return d > 180 ? 360 - d : d
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

const applyRegionWithMatcher = (
  startX: number,
  startY: number,
  fillColor: { r: number; g: number; b: number },
  mode: ToolMode,
  matcher?: RegionMatcher,
) => {
  if (!canvas.value || !originalImageData.value)
    return

  if (!paintLayerAlpha.value || paintLayerAlpha.value.length !== canvas.value.width * canvas.value.height) {
    paintLayerAlpha.value = new Uint8Array(canvas.value.width * canvas.value.height)
    paintedPixelCount.value = 0
    clearHistory()
  }

  const originalPixels = originalImageData.value.data
  const width = canvas.value.width
  const height = canvas.value.height

  const alphaLayer = paintLayerAlpha.value
  const maskLayer = wallMaskAlpha.value

  const startIndex = startY * width + startX
  if (maskLayer && maskLayer[startIndex] === 0)
    return

  if (mode === 'paint') {
    if (alphaLayer[startIndex] > 0)
      return
  }
  else {
    if (alphaLayer[startIndex] === 0)
      return
  }

  pushUndoSnapshot()

  // Region selection is based on ORIGINAL pixels (stable across repeated paints/erases).
  const startPosPx = startIndex * 4
  const regionR = originalPixels[startPosPx]
  const regionG = originalPixels[startPosPx + 1]
  const regionB = originalPixels[startPosPx + 2]

  const visited = new Uint8Array(width * height)
  const stack: Array<{ x: number; y: number }> = [{ x: startX, y: startY }]

  const colorMatch: RegionMatcher = matcher
    ?? ((or: number, og: number, ob: number) => {
      return (
        Math.abs(or - regionR) <= tolerance.value
        && Math.abs(og - regionG) <= tolerance.value
        && Math.abs(ob - regionB) <= tolerance.value
      )
    })

  while (stack.length > 0) {
    const { x, y } = stack.pop()!

    if (x < 0 || x >= width || y < 0 || y >= height)
      continue

    const pos = y * width + x
    if (visited[pos])
      continue

    // Constrain the region traversal to the AI wall mask (when available).
    if (maskLayer && maskLayer[pos] === 0)
      continue

    const pixelPos = pos * 4
    const or = originalPixels[pixelPos]
    const og = originalPixels[pixelPos + 1]
    const ob = originalPixels[pixelPos + 2]

    if (!colorMatch(or, og, ob, x, y))
      continue

    visited[pos] = 1

    const edge = matcher
      ? isEdgePixelByMatcher(x, y, originalPixels, width, height, colorMatch)
      : isEdgePixel(x, y, originalPixels, width, height, regionR, regionG, regionB)

    const alpha = edge ? 0.7 : 1.0

    // Store the paint layer intensity so we can recolor later.
    const aByte = Math.round(alpha * 255)

    if (mode === 'paint') {
      if (alphaLayer[pos] === 0)
        paintedPixelCount.value++

      alphaLayer[pos] = Math.max(alphaLayer[pos], aByte)
    }
    else {
      if (alphaLayer[pos] > 0)
        paintedPixelCount.value--

      alphaLayer[pos] = 0
    }

    stack.push({ x: x + 1, y })
    stack.push({ x: x - 1, y })
    stack.push({ x, y: y + 1 })
    stack.push({ x, y: y - 1 })
  }

  renderPaintLayer()
}

const applyRegion = (startX: number, startY: number, fillColor: { r: number; g: number; b: number }, mode: ToolMode) => {
  applyRegionWithMatcher(startX, startY, fillColor, mode)
}

const clampInt = (value: number, min: number, max: number) => Math.max(min, Math.min(max, Math.trunc(value)))

const getCanvasPointFromClient = (clientX: number, clientY: number) => {
  if (!displayCanvas.value)
    return null

  const rect = displayCanvas.value.getBoundingClientRect()
  const scaleX = displayCanvas.value.width / rect.width
  const scaleY = displayCanvas.value.height / rect.height

  const x = Math.floor((clientX - rect.left) * scaleX)
  const y = Math.floor((clientY - rect.top) * scaleY)

  return { x, y, rect, scaleX, scaleY }
}

const pickSeedFromRoi = (x0: number, y0: number, x1: number, y1: number) => {
  if (!canvas.value || !originalImageData.value)
    return null

  const width = canvas.value.width
  const height = canvas.value.height

  const left = clampInt(Math.min(x0, x1), 0, width - 1)
  const right = clampInt(Math.max(x0, x1), 0, width - 1)
  const top = clampInt(Math.min(y0, y1), 0, height - 1)
  const bottom = clampInt(Math.max(y0, y1), 0, height - 1)

  const roiW = right - left + 1
  const roiH = bottom - top + 1
  if (roiW <= 0 || roiH <= 0)
    return null

  const pixels = originalImageData.value.data
  const roiArea = roiW * roiH
  const targetSamples = 5000
  const step = Math.max(1, Math.floor(Math.sqrt(roiArea / targetSamples)))

  let sumR = 0
  let sumG = 0
  let sumB = 0
  let count = 0

  for (let y = top; y <= bottom; y += step) {
    for (let x = left; x <= right; x += step) {
      const pos = (y * width + x) * 4

      sumR += pixels[pos]
      sumG += pixels[pos + 1]
      sumB += pixels[pos + 2]
      count++
    }
  }

  if (count === 0)
    return { x: clampInt((left + right) / 2, 0, width - 1), y: clampInt((top + bottom) / 2, 0, height - 1) }

  const avgR = sumR / count
  const avgG = sumG / count
  const avgB = sumB / count

  const centerX = clampInt((left + right) / 2, 0, width - 1)
  const centerY = clampInt((top + bottom) / 2, 0, height - 1)

  let bestX = centerX
  let bestY = centerY
  let bestScore = Number.POSITIVE_INFINITY

  for (let y = top; y <= bottom; y += step) {
    for (let x = left; x <= right; x += step) {
      const pos = (y * width + x) * 4
      const r = pixels[pos]
      const g = pixels[pos + 1]
      const b = pixels[pos + 2]

      const dist = Math.abs(r - avgR) + Math.abs(g - avgG) + Math.abs(b - avgB)

      // Prefer interior pixels (non-edges) to reduce accidental boundary seeds.
      const edgePenalty = isEdgePixel(x, y, pixels, width, height, r, g, b) ? 60 : 0
      const centerPenalty = (Math.abs(x - centerX) + Math.abs(y - centerY)) * 0.05

      const score = dist + edgePenalty + centerPenalty
      if (score < bestScore) {
        bestScore = score
        bestX = x
        bestY = y
      }
    }
  }

  return { x: bestX, y: bestY }
}

const buildMatcherFromRoi = (x0: number, y0: number, x1: number, y1: number): RegionMatcher | null => {
  if (!canvas.value || !originalImageData.value)
    return null

  const width = canvas.value.width
  const height = canvas.value.height

  const left = clampInt(Math.min(x0, x1), 0, width - 1)
  const right = clampInt(Math.max(x0, x1), 0, width - 1)
  const top = clampInt(Math.min(y0, y1), 0, height - 1)
  const bottom = clampInt(Math.max(y0, y1), 0, height - 1)

  const roiW = right - left + 1
  const roiH = bottom - top + 1
  const roiArea = roiW * roiH
  if (roiArea <= 1)
    return null

  const pixels = originalImageData.value.data
  const targetSamples = 7000
  const step = Math.max(1, Math.floor(Math.sqrt(roiArea / targetSamples)))

  let sumR = 0
  let sumG = 0
  let sumB = 0
  let minL = 1
  let maxL = 0

  // Circular mean for hue (weighted by saturation to reduce noise on near-gray pixels)
  let sumSin = 0
  let sumCos = 0
  let sumSat = 0
  let count = 0

  const samples: Array<{ h: number; s: number; l: number; r: number; g: number; b: number }> = []

  for (let y = top; y <= bottom; y += step) {
    for (let x = left; x <= right; x += step) {
      const pos = (y * width + x) * 4
      const r = pixels[pos]
      const g = pixels[pos + 1]
      const b = pixels[pos + 2]

      const { h, s, l } = rgbToHsl(r, g, b)

      sumR += r
      sumG += g
      sumB += b

      minL = Math.min(minL, l)
      maxL = Math.max(maxL, l)

      const w = Math.max(0.001, s)

      sumSin += Math.sin((h * Math.PI) / 180) * w
      sumCos += Math.cos((h * Math.PI) / 180) * w
      sumSat += s

      count++
      samples.push({ h, s, l, r, g, b })
    }
  }

  if (count === 0)
    return null

  const avgR = sumR / count
  const avgG = sumG / count
  const avgB = sumB / count

  const meanSat = sumSat / count
  const meanHue = (Math.atan2(sumSin, sumCos) * 180) / Math.PI
  const hue0 = (meanHue + 360) % 360

  let hueDev = 0
  let satDev = 0
  let maxDevR = 0
  let maxDevG = 0
  let maxDevB = 0

  for (const s of samples) {
    hueDev += hueDistance(s.h, hue0)
    satDev += Math.abs(s.s - meanSat)
    maxDevR = Math.max(maxDevR, Math.abs(s.r - avgR))
    maxDevG = Math.max(maxDevG, Math.abs(s.g - avgG))
    maxDevB = Math.max(maxDevB, Math.abs(s.b - avgB))
  }

  hueDev /= samples.length
  satDev /= samples.length

  // Map existing tolerance slider (RGB) to HSL thresholds.
  const t = tolerance.value
  const hueTol = Math.max(10, Math.min(80, 10 + hueDev * 1.6 + t * 0.35))
  const satTol = clamp01(0.06 + satDev * 1.8 + t / 900)
  const lMargin = clamp01(0.03 + t / 650)

  const lMin = clamp01(minL - lMargin)
  const lMax = clamp01(maxL + lMargin)

  // If it's mostly gray/low-saturation, hue becomes unreliable; fall back to RGB spread.
  if (meanSat < 0.12) {
    const rTol = maxDevR + t
    const gTol = maxDevG + t
    const bTol = maxDevB + t

    return (or: number, og: number, ob: number) => {
      return (
        Math.abs(or - avgR) <= rTol
        && Math.abs(og - avgG) <= gTol
        && Math.abs(ob - avgB) <= bTol
      )
    }
  }

  return (or: number, og: number, ob: number) => {
    const { h, s, l } = rgbToHsl(or, og, ob)

    // Include the full lightness range seen in the rectangle (shadows/highlights).
    if (l < lMin || l > lMax)
      return false

    if (hueDistance(h, hue0) > hueTol)
      return false

    if (Math.abs(s - meanSat) > satTol)
      return false

    return true
  }
}

const applyRegionFromRoi = (x0: number, y0: number, x1: number, y1: number) => {
  const color = hexToRgb(selectedColor.value)
  if (!color)
    return

  const seed = pickSeedFromRoi(x0, y0, x1, y1)
  if (!seed)
    return

  const matcher = buildMatcherFromRoi(x0, y0, x1, y1)
  if (!matcher) {
    applyRegion(seed.x, seed.y, color, toolMode.value)

    return
  }

  applyRegionWithMatcher(seed.x, seed.y, color, toolMode.value, matcher)
}

// Handle canvas click
const handleCanvasClick = (event: MouseEvent) => {
  if (selectionMode.value === 'rect')
    return

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

const selectionOverlayStyle = computed(() => {
  if (!isSelecting.value || !displayCanvas.value || !selectionStartClient.value || !selectionCurrentClient.value)
    return null

  const rect = displayCanvas.value.getBoundingClientRect()

  const x0 = selectionStartClient.value.x - rect.left
  const y0 = selectionStartClient.value.y - rect.top
  const x1 = selectionCurrentClient.value.x - rect.left
  const y1 = selectionCurrentClient.value.y - rect.top

  const left = Math.min(x0, x1)
  const top = Math.min(y0, y1)
  const width = Math.abs(x1 - x0)
  const height = Math.abs(y1 - y0)

  return {
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`,
  }
})

const handleCanvasPointerDown = (event: PointerEvent) => {
  if (selectionMode.value !== 'rect')
    return

  if (!displayCanvas.value || isLoading.value)
    return

  // Only primary button for mouse; allow touch/pen.
  if (event.pointerType === 'mouse' && event.button !== 0)
    return

  event.preventDefault()
  displayCanvas.value.setPointerCapture(event.pointerId)

  isSelecting.value = true
  selectionStartClient.value = { x: event.clientX, y: event.clientY }
  selectionCurrentClient.value = { x: event.clientX, y: event.clientY }
}

const handleCanvasPointerMove = (event: PointerEvent) => {
  if (!isSelecting.value || selectionMode.value !== 'rect')
    return

  event.preventDefault()
  selectionCurrentClient.value = { x: event.clientX, y: event.clientY }
}

const finishSelection = (event: PointerEvent) => {
  if (!isSelecting.value || selectionMode.value !== 'rect')
    return

  event.preventDefault()

  const start = selectionStartClient.value
  const current = selectionCurrentClient.value

  isSelecting.value = false
  selectionStartClient.value = null
  selectionCurrentClient.value = null

  if (!start || !current)
    return

  const p0 = getCanvasPointFromClient(start.x, start.y)
  const p1 = getCanvasPointFromClient(current.x, current.y)
  if (!p0 || !p1)
    return

  const dx = Math.abs(current.x - start.x)
  const dy = Math.abs(current.y - start.y)

  // Small drag acts like a normal click.
  if (dx < 4 && dy < 4) {
    applyRegionFromRoi(p0.x, p0.y, p0.x, p0.y)

    return
  }

  applyRegionFromRoi(p0.x, p0.y, p1.x, p1.y)
}

const handleCanvasPointerUp = (event: PointerEvent) => {
  finishSelection(event)
}

const handleCanvasPointerCancel = (event: PointerEvent) => {
  if (!isSelecting.value)
    return

  event.preventDefault()
  isSelecting.value = false
  selectionStartClient.value = null
  selectionCurrentClient.value = null
}

// Reset to original image
const resetImage = () => {
  if (!originalImageData.value || !canvas.value)
    return

  // Reset to the default behavior: paint the whole detected wall.
  if (wallMaskAlpha.value) {
    applyWallMaskToPaintLayer({ pushUndo: true })
  }
  else {
    pushUndoSnapshot()
    paintLayerAlpha.value = new Uint8Array(canvas.value.width * canvas.value.height)
    paintedPixelCount.value = 0
    renderPaintLayer()
  }
}

const clearImage = () => {
  imageUrl.value = ''
  imageFile.value = null
  toolMode.value = 'paint'
  paintLayerAlpha.value = null
  paintedPixelCount.value = 0
  clearWallMask()
  clearHistory()

  // Allow selecting the same file again (otherwise input change may not fire).
  if (fileInput.value)
    fileInput.value.value = ''
}

const startNewImageUpload = () => {
  // Must be synchronous (no await) or browsers may block the file dialog.
  clearImage()
  triggerFilePicker()
}

// Recolor all painted regions when the user changes the color.
watch(selectedColor, () => {
  if (!imageUrl.value || !originalImageData.value)
    return

  // If we have an AI wall mask, painting is simply: mask = painted area.
  if (wallMaskAlpha.value)
    applyWallMaskToPaintLayer()

  renderPaintLayer()
})

// Download edited image
const downloadImage = () => {
  if (displayCanvas.value) {
    const link = document.createElement('a')

    link.download = 'painted-room.png'
    link.href = displayCanvas.value.toDataURL()
    link.click()
  }
}

const backendColorsLoading = ref(false)
const backendColorPalette = ref<string[]>([])
const customColors = ref<string[]>([])

const normalizeHexColor = (value: unknown): string | null => {
  let v = String(value ?? '').trim()
  if (!v)
    return null

  if (!v.startsWith('#'))
    v = `#${v}`

  // Expand #RGB -> #RRGGBB
  if (/^#[0-9a-fA-F]{3}$/.test(v)) {
    const r = v[1]
    const g = v[2]
    const b = v[3]
    v = `#${r}${r}${g}${g}${b}${b}`
  }

  if (!/^#[0-9a-fA-F]{6}$/.test(v))
    return null

  return v.toUpperCase()
}

const selectedColorModel = computed({
  get: () => selectedColor.value,
  set: (value: string) => {
    const normalized = normalizeHexColor(value)
    if (normalized)
      selectedColor.value = normalized
  },
})

const addSelectedToQuickColors = () => {
  const normalized = normalizeHexColor(selectedColor.value)
  if (!normalized)
    return

  const existing = new Set(customColors.value.map(c => c.toUpperCase()))
  if (existing.has(normalized))
    return

  customColors.value = [normalized, ...customColors.value].slice(0, 24)
}

const customPickerDialog = ref(false)
const customPickerTemp = ref<string>(selectedColor.value)

const openCustomPicker = () => {
  customPickerTemp.value = selectedColor.value
  customPickerDialog.value = true
}

const applyCustomPicker = () => {
  const normalized = normalizeHexColor(customPickerTemp.value)
  if (normalized)
    selectedColor.value = normalized
  customPickerDialog.value = false
}

const fetchBackendColors = async () => {
  try {
    backendColorsLoading.value = true

    const { data, error } = await useApi<{ colors?: any[] }>('/api/products/colors', {
      method: 'GET',
    })

    if (error.value)
      throw error.value

    const list = data.value?.colors ?? []
    const normalizedList = Array.isArray(list) ? list : []

    const next = normalizedList
      .map((c: any) => normalizeHexColor(c?.code ?? c?.hex ?? c))
      .filter(Boolean) as string[]

    backendColorPalette.value = Array.from(new Set(next)).slice(0, 24)

    if (backendColorPalette.value.length > 0 && selectedColor.value === '#FF5733')
      selectedColor.value = backendColorPalette.value[0]
  }
  catch {
    backendColorPalette.value = []
  }
  finally {
    backendColorsLoading.value = false
  }
}

// Predefined color palette (fallback)
const defaultColorPalette = [
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

const colorPalette = computed(() => {
  const base = backendColorPalette.value.length ? backendColorPalette.value : defaultColorPalette
  const merged = [...customColors.value, ...base]
  return Array.from(new Set(merged.map(c => c.toUpperCase()))).slice(0, 24)
})
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

        <VDivider class="my-6" />

        <h4 class="text-h6 mb-2">
          {{ t('room_painter.samples.title') }}
        </h4>
        <p class="text-body-2 text-medium-emphasis mb-4">
          {{ t('room_painter.samples.subtitle') }}
        </p>

        <div class="d-flex justify-center flex-wrap gap-2 mb-6">
          <VChip
            :color="sampleCategory === 'room' ? 'primary' : 'default'"
            :variant="sampleCategory === 'room' ? 'tonal' : 'outlined'"
            @click="sampleCategory = 'room'"
          >
            {{ t('room_painter.samples.categories.room') }}
          </VChip>

          <VChip
            :color="sampleCategory === 'livingroom' ? 'primary' : 'default'"
            :variant="sampleCategory === 'livingroom' ? 'tonal' : 'outlined'"
            @click="sampleCategory = 'livingroom'"
          >
            {{ t('room_painter.samples.categories.livingroom') }}
          </VChip>

          <VChip
            :color="sampleCategory === 'kitchen' ? 'primary' : 'default'"
            :variant="sampleCategory === 'kitchen' ? 'tonal' : 'outlined'"
            @click="sampleCategory = 'kitchen'"
          >
            {{ t('room_painter.samples.categories.kitchen') }}
          </VChip>
        </div>

        <VRow class="justify-center">
          <VCol
            v-for="(sample, index) in sampleImages"
            :key="index"
            cols="12"
            sm="6"
            md="4"
            lg="3"
          >
            <VCard
              class="cursor-pointer"
              variant="outlined"
              @click="loadSampleImage(sample)"
            >
              <VImg
                :src="sample.src"
                height="140"
                cover
              />
            </VCard>
          </VCol>
        </VRow>
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
              <VAlert
                v-if="wallMaskDataUrl"
                type="success"
                variant="tonal"
                class="mb-6"
              >
                {{ t('room_painter.controls.wall_detected') }}
              </VAlert>

              <VAlert
                v-else
                type="info"
                variant="tonal"
                class="mb-6"
              >
                {{ t('room_painter.controls.wall_detecting') }}
              </VAlert>

              <!-- Color Picker -->
              <div class="mb-4">
                <label class="text-sm font-weight-medium mb-2 d-block">{{ t('room_painter.controls.selected_color') }}</label>
                <div class="d-flex align-center gap-3 flex-wrap">
                  <input
                    v-model="selectedColorModel"
                    type="color"
                    class="color-picker"
                  >

                  <VTextField
                    v-model="selectedColorModel"
                    density="compact"
                    variant="outlined"
                    hide-details
                    style="max-width: 160px"
                    placeholder="#RRGGBB"
                  />

                  <VBtn
                    size="small"
                    variant="outlined"
                    @click="openCustomPicker"
                  >
                    {{ t('room_painter.controls.more_colors') }}
                  </VBtn>

                  <VBtn
                    size="small"
                    variant="tonal"
                    @click="addSelectedToQuickColors"
                  >
                    {{ t('room_painter.controls.add_to_quick_colors') }}
                  </VBtn>
                </div>
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

              <VDialog
                v-model="customPickerDialog"
                max-width="420"
              >
                <VCard>
                  <VCardTitle>
                    {{ t('room_painter.controls.more_colors') }}
                  </VCardTitle>

                  <VCardText>
                    <VColorPicker
                      v-model="customPickerTemp"
                      mode="hex"
                      hide-inputs
                    />
                  </VCardText>

                  <VCardActions>
                    <VSpacer />
                    <VBtn
                      variant="text"
                      @click="customPickerDialog = false"
                    >
                      {{ t('common.cancel') }}
                    </VBtn>
                    <VBtn
                      color="primary"
                      variant="flat"
                      @click="applyCustomPicker"
                    >
                      {{ t('common.apply') }}
                    </VBtn>
                  </VCardActions>
                </VCard>
              </VDialog>

              <!-- Action Buttons -->
              <div class="d-flex flex-column gap-3">
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
                  @click="startNewImageUpload"
                >
                  {{ t('room_painter.controls.upload_new_image') }}
                </VBtn>
              </div>
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
              <div class="canvas-container">
                <canvas
                  ref="canvas"
                  style="display: none;"
                />
                <canvas
                  ref="displayCanvas"
                  class="display-canvas"
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
              @click="startNewImageUpload"
            >
              {{ t('room_painter.mobile.new') }}
            </VBtn>
          </div>
        </VCard>
      </div>
    </div>
  </div>

  <input
    ref="fileInput"
    type="file"
    accept="image/*"
    style="display: none"
    @change="handleImageUpload"
  >
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
    padding-block-end: 80px;
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

}

.display-canvas {
  display: block;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 10%);
  max-block-size: 800px;
  max-inline-size: 100%;
  object-fit: contain;
  touch-action: none;
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
