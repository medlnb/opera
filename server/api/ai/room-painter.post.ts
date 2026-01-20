import { createError, defineEventHandler, readMultipartFormData } from 'h3'

const toBase64 = (buffer: ArrayBuffer) => Buffer.from(buffer).toString('base64')

const looksLikeDataUrl = (value: string) => /^data:image\/[a-z0-9.+-]+;base64,/i.test(value)
const looksLikeUrl = (value: string) => /^https?:\/\//i.test(value)

const normalizeImageToDataUrl = async (value: unknown, mimeType?: string): Promise<string | null> => {
  if (!value)
    return null

  if (typeof value === 'string') {
    if (looksLikeDataUrl(value))
      return value

    // Some services return a plain base64 string.
    const base64Candidate = value.trim()
    if (/^[A-Za-z0-9+/=]+$/.test(base64Candidate) && base64Candidate.length > 200) {
      const mt = mimeType || 'image/png'

      return `data:${mt};base64,${base64Candidate}`
    }

    // Some services return a URL.
    if (looksLikeUrl(value)) {
      const res = await fetch(value)
      if (!res.ok)
        return null

      const ct = res.headers.get('content-type') || mimeType || 'image/png'
      const buf = await res.arrayBuffer()

      return `data:${ct};base64,${toBase64(buf)}`
    }

    return null
  }

  // If it's an object like { url: '...' }
  if (typeof value === 'object') {
    const v = value as any

    return (
      await normalizeImageToDataUrl(v?.imageDataUrl, v?.mimeType)
      || await normalizeImageToDataUrl(v?.dataUrl, v?.mimeType)
      || await normalizeImageToDataUrl(v?.image, v?.mimeType)
      || await normalizeImageToDataUrl(v?.url, v?.mimeType)
      || await normalizeImageToDataUrl(v?.imageUrl, v?.mimeType)
      || await normalizeImageToDataUrl(v?.output, v?.mimeType)
      || await normalizeImageToDataUrl(v?.result, v?.mimeType)
    )
  }

  return null
}

export default defineEventHandler(async event => {
  const config = useRuntimeConfig()
  const aiPaintUrl = (config as any).aiPaintUrl as string | undefined

  if (!aiPaintUrl) {
    throw createError({
      statusCode: 501,
      statusMessage: 'AI paint endpoint is not configured. Set NUXT_AI_PAINT_URL on the server.',
    })
  }

  const parts = await readMultipartFormData(event)
  if (!parts || parts.length === 0)
    throw createError({ statusCode: 400, statusMessage: 'Missing multipart form-data.' })

  const form = new FormData()

  for (const part of parts) {
    if (!part?.name)
      continue

    if (part.filename) {
      const bytes = new Uint8Array(part.data)
      const blob = new Blob([bytes], { type: part.type || 'application/octet-stream' })

      form.append(part.name, blob, part.filename)
    }
    else {
      form.append(part.name, part.data.toString())
    }
  }

  const res = await fetch(aiPaintUrl, {
    method: 'POST',
    body: form,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw createError({
      statusCode: res.status,
      statusMessage: text || `AI paint service error (${res.status}).`,
    })
  }

  const contentType = res.headers.get('content-type') || ''

  // If upstream returns an image directly, convert to a data URL for the client.
  if (contentType.startsWith('image/')) {
    const buf = await res.arrayBuffer()

    return {
      imageDataUrl: `data:${contentType};base64,${toBase64(buf)}`,
    }
  }

  // Otherwise assume JSON (many AI services return URLs or nested structures).
  const text = await res.text().catch(() => '')

  const json = (() => {
    try {
      return JSON.parse(text)
    }
    catch {
      return null
    }
  })() as any

  const imageDataUrl
    = await normalizeImageToDataUrl(json)
    || await normalizeImageToDataUrl(json?.imageDataUrl)
    || await normalizeImageToDataUrl(json?.dataUrl)
    || await normalizeImageToDataUrl(json?.image)
    || await normalizeImageToDataUrl(json?.imageUrl)
    || await normalizeImageToDataUrl(json?.url)
    || await normalizeImageToDataUrl(json?.output)
    || await normalizeImageToDataUrl(json?.result)
    || await normalizeImageToDataUrl(json?.data)
    || await normalizeImageToDataUrl(json?.response)
    || await normalizeImageToDataUrl(json?.images?.[0])
    || await normalizeImageToDataUrl(json?.output?.images?.[0])
    || await normalizeImageToDataUrl(json?.data?.[0])
    || await normalizeImageToDataUrl(json?.artifacts?.[0]?.base64, json?.artifacts?.[0]?.mime)
    || await normalizeImageToDataUrl(json?.artifacts?.[0]?.base64, 'image/png')

  if (!imageDataUrl) {
    const preview = text ? text.slice(0, 500) : ''
    throw createError({
      statusCode: 502,
      statusMessage: `AI paint service returned no image. Expected image/* response or JSON with imageDataUrl/dataUrl/image/url/images[]. content-type=${contentType || 'unknown'} preview=${preview || '[empty]'}`,
    })
  }

  return { imageDataUrl }
})
