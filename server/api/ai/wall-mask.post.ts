import { createError, defineEventHandler, readMultipartFormData } from 'h3'

const toBase64 = (buffer: ArrayBuffer) => Buffer.from(buffer).toString('base64')

export default defineEventHandler(async event => {
  const config = useRuntimeConfig()
  const borderServerUrl = (config as any).borderServerUrl as string | undefined

  if (!borderServerUrl) {
    throw createError({
      statusCode: 501,
      statusMessage: 'Border server is not configured. Set NUXT_BORDER_SERVER_URL on the server.',
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

  const upstreamUrl = new URL('/segment/wall/mask', borderServerUrl).toString()

  const res = await fetch(upstreamUrl, {
    method: 'POST',
    body: form,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw createError({
      statusCode: res.status,
      statusMessage: text || `Border server error (${res.status}).`,
    })
  }

  const contentType = res.headers.get('content-type') || ''
  if (!contentType.startsWith('image/')) {
    const text = await res.text().catch(() => '')
    throw createError({
      statusCode: 502,
      statusMessage: `Border server returned unexpected content-type: ${contentType || 'unknown'}. preview=${text.slice(0, 200)}`,
    })
  }

  const buf = await res.arrayBuffer()

  return {
    maskDataUrl: `data:${contentType};base64,${toBase64(buf)}`,
  }
})
