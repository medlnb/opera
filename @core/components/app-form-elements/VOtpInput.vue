<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'

defineOptions({ name: 'VOtpInput' })

const props = defineProps({
  modelValue: { type: String, default: '' },
  length: { type: Number, default: 6 },
  label: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  class: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])

const digits = ref<string[]>([])
const inputs = ref<Array<HTMLInputElement | null>>([])

function initDigits() {
  digits.value = Array.from({ length: props.length }, (_, i) => props.modelValue?.[i] ?? '')
}

initDigits()

watch(() => props.modelValue, (val) => {
  if (val == null) return
  for (let i = 0; i < props.length; i++) digits.value[i] = val[i] ?? ''
})

watch(digits, (val) => {
  emit('update:modelValue', val.join(''))
}, { deep: true })


function onTyped(idx: number) {
  // move to next input when a digit is entered
  if (digits.value[idx] && idx < props.length - 1) {
    nextTick(() => {
      const next = inputs.value[idx + 1]
      if (next) next.focus()
    })
  }
}

function onKeyDown(e: KeyboardEvent, idx: number) {
  const el = e.target as HTMLInputElement
  if (e.key === 'Backspace') {
    // if current has value, allow default behavior to clear it
    if (!el.value && idx > 0) {
      const prev = inputs.value[idx - 1]
      if (prev) {
        prev.focus()
        prev.select()
      }
    }
  }
}

function setInputRef(el: unknown, idx: number) {
  // Vue's ref callback can receive Element | ComponentPublicInstance | null.
  // Cast to HTMLInputElement|null for our inputs array to satisfy TS and keep runtime behavior.
  inputs.value[idx] = (el as HTMLInputElement) ?? null
}
</script>

<template>
  <div :class="['v-otp-input', props.class]">
    <VLabel v-if="props.label" class="mb-1 text-body-2 text-high-emphasis" :text="props.label" />
    <div class="v-otp-input__content d-flex gap-x-2">
      <input
        v-for="(_, idx) in props.length"
        :key="idx"
        :placeholder="props.placeholder ? props.placeholder.split(' ')[idx] ?? '' : ''"
        class="v-otp-input__input"
        type="tel"
        inputmode="numeric"
        maxlength="1"
        v-model="digits[idx]"
        @input="() => onTyped(idx)"
        @keydown="(e) => onKeyDown(e, idx)"
        :ref="(el) => setInputRef(el, idx)"
      />
    </div>
  </div>
</template>

<style scoped>
.v-otp-input__content { display: flex; }
.v-otp-input__input {
  width: 48px; height: 48px; text-align: center; font-size: 18px;
  border-radius: 6px; border: 1px solid rgba(168, 168, 168, 0.12); background: transparent;
}
</style>
