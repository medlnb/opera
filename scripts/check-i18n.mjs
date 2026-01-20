import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()

const LOCALES_DIR = path.join(ROOT, 'plugins', 'i18n', 'locales')
const LOCALE_FILES = ['en.json', 'fr.json', 'ar.json']

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8')
  return JSON.parse(raw)
}

function getByPath(obj, keyPath) {
  const parts = keyPath.split('.')
  let cur = obj
  for (const part of parts) {
    if (!cur || typeof cur !== 'object' || !(part in cur)) return undefined
    cur = cur[part]
  }
  return cur
}

function walk(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (['node_modules', '.git', '.nuxt', 'dist', 'build', '.output'].includes(e.name)) continue
      walk(full, out)
    }
    else {
      out.push(full)
    }
  }
  return out
}

const TRANSLATION_KEY_RE = /\b(?:t)\s*\(\s*(['"`])([^\1\n\r]+?)\1\s*[),]/g
const TRANSLATION_KEY_RE_ALT = /\$t\s*\(\s*(['"`])([^\1\n\r]+?)\1\s*[),]/g

function extractKeysFromText(text) {
  const keys = new Set()
  for (const re of [TRANSLATION_KEY_RE, TRANSLATION_KEY_RE_ALT]) {
    re.lastIndex = 0
    let m
    while ((m = re.exec(text))) {
      const key = String(m[2] || '').trim()
      if (!key) continue
      // Ignore dynamic / template literal-ish keys
      if (key.includes('${')) continue
      keys.add(key)
    }
  }
  return keys
}

function isCandidateSourceFile(filePath) {
  const rel = path.relative(ROOT, filePath)
  if (rel.startsWith(path.join('plugins', 'i18n', 'locales'))) return false
  const ext = path.extname(filePath).toLowerCase()
  return ['.vue', '.ts', '.js'].includes(ext)
}

const localeData = {}
for (const f of LOCALE_FILES) {
  localeData[f] = readJson(path.join(LOCALES_DIR, f))
}

const allFiles = walk(ROOT).filter(isCandidateSourceFile)
const allKeys = new Set()

for (const file of allFiles) {
  const txt = fs.readFileSync(file, 'utf8')
  const keys = extractKeysFromText(txt)
  for (const k of keys) allKeys.add(k)
}

const keysSorted = [...allKeys].sort((a, b) => a.localeCompare(b))

const missingByLocale = {}
for (const f of LOCALE_FILES) missingByLocale[f] = []

for (const key of keysSorted) {
  for (const f of LOCALE_FILES) {
    const v = getByPath(localeData[f], key)
    if (v === undefined) missingByLocale[f].push(key)
  }
}

function printTop(list, n = 50) {
  return list.slice(0, n).map(k => `  - ${k}`).join('\n') + (list.length > n ? `\n  … and ${list.length - n} more` : '')
}

console.log(`Scanned ${allFiles.length} source files`) 
console.log(`Found ${keysSorted.length} translation keys via t('...')`) 
console.log('')

for (const f of LOCALE_FILES) {
  const missing = missingByLocale[f]
  console.log(`${f}: missing ${missing.length}`)
  if (missing.length) console.log(printTop(missing, 80))
  console.log('')
}

// Keys missing in ALL locales are the ones that show up as raw paths in the UI
const missingEverywhere = keysSorted.filter(k => LOCALE_FILES.every(f => getByPath(localeData[f], k) === undefined))
console.log(`Missing in ALL locales: ${missingEverywhere.length}`)
if (missingEverywhere.length) console.log(printTop(missingEverywhere, 120))
