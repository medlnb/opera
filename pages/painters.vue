<script setup>
import communes from '@/data/commune.json'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from 'vue-i18n'

const { t } = useI18n({ useScope: 'global' })
const authStore = useAuthStore()

const snackbar = ref({ show: false, message: '', color: 'success' })

const showSnackbar = (message, color = 'success') => {
  snackbar.value = { show: true, message, color }
}

// Build state/city options from communes dataset
const wilayaGroups = (communes || []).filter(g => Array.isArray(g) && g.length)

const stateOptions = computed(() =>
  wilayaGroups.map(g => ({ id: String(g[0].name), label: String(g[0].name) })),
)

const getCityOptionsForState = stateName => {
  if (!stateName)
    return []

  const group = wilayaGroups.find(g => String(g[0].name) === String(stateName))

  return group ? group.map(c => ({ id: String(c.name), label: String(c.name) })) : []
}

const filters = ref({
  state: null,
  city: null,
})

watch(() => filters.value.state, () => {
  filters.value.city = null
})

const paintersLoading = ref(false)
const painters = ref([])

const fetchPainters = async () => {
  paintersLoading.value = true

  try {
    const { data, error } = await useApi('/api/painters', {
      query: {
        state: filters.value.state || undefined,
        city: filters.value.city || undefined,
      },
    })

    if (error.value) {
      showSnackbar(error.value?.data?.message || t('painters_page.errors.load_failed'), 'error')
      return painters.value = []
    }

    painters.value = data.value?.data ?? []
  }
  catch (e) {
    console.error(e)
    painters.value = []
    showSnackbar(t('painters_page.errors.load_failed'), 'error')
  }
  finally {
    paintersLoading.value = false
  }
}

watch([() => filters.value.state, () => filters.value.city], fetchPainters, { immediate: true })

const requestDialog = ref(false)
const requestLoading = ref(false)
const selectedPainter = ref(null)

const requestForm = ref({
  state: null,
  city: null,
  address: '',
  note: '',
})

const painterDisplayName = painter => {
  const user = painter?.user
  const first = user?.firstName
  const last = user?.lastName

  if (first || last)
    return `${first ?? ''} ${last ?? ''}`.trim()

  return t('painters_page.card.unnamed')
}

const painterAreasLabel = painter => {
  const areas = Array.isArray(painter?.serviceAreas) ? painter.serviceAreas : []
  if (!areas.length) return ''

  return areas.map(a => `${a.city}, ${a.state}`).join(' | ')
}

const painterServiceAreas = painter => {
  const areas = Array.isArray(painter?.serviceAreas) ? painter.serviceAreas : []
  if (areas.length)
    return areas
      .map(a => ({ city: a?.city ?? '', state: a?.state ?? '' }))
      .filter(a => a.city && a.state)

  // legacy fallback
  if (painter?.city && painter?.state)
    return [{ city: painter.city, state: painter.state }]

  return []
}

const painterAvatarSrc = painter => {
  const user = painter?.user
  if (user?.avatar)
    return user.avatar

  const first = user?.firstName?.charAt(0) ?? ''
  const last = user?.lastName?.charAt(0) ?? ''

  return `https://dummyimage.com/100x100/000/fff&text=${first}${last}`
}

const requestableAreas = computed(() => painterServiceAreas(selectedPainter.value))

const requestStateOptions = computed(() => {
  const areas = requestableAreas.value
  const states = [...new Set(areas.map(a => a.state).filter(Boolean))]

  return states.map(s => ({ id: s, label: s }))
})

const requestCityOptions = computed(() => {
  const state = requestForm.value.state
  if (!state)
    return []

  const areas = requestableAreas.value
    .filter(a => a.state === state)

  const cities = [...new Set(areas.map(a => a.city).filter(Boolean))]

  return cities.map(c => ({ id: c, label: c }))
})

watch(() => requestForm.value.state, () => {
  // Ensure city stays valid for the selected state
  requestForm.value.city = null
})

const openRequest = painter => {
  if (!authStore.token) {
    showSnackbar(t('painters_page.actions.sign_in_to_request'), 'info')
    navigateTo('/login')
    return
  }

  selectedPainter.value = painter

  const areas = painterServiceAreas(painter)
  const hasPrefillFromFilters = areas.some(a => a.state === filters.value.state && a.city === filters.value.city)

  if (hasPrefillFromFilters) {
    requestForm.value.state = filters.value.state
    requestForm.value.city = filters.value.city
  }
  else if (areas.length === 1) {
    requestForm.value.state = areas[0].state
    requestForm.value.city = areas[0].city
  }
  else {
    // Keep state only if it's valid for this painter
    const validStates = new Set(areas.map(a => a.state))
    requestForm.value.state = validStates.has(filters.value.state) ? filters.value.state : null
    requestForm.value.city = null
  }

  requestForm.value.address = ''
  requestForm.value.note = ''
  requestDialog.value = true
}

const submitRequest = async () => {
  if (!selectedPainter.value)
    return

  if (!requestForm.value.state || !requestForm.value.city) 
    return showSnackbar(t('painters_page.validation.fix_errors'), 'error')

  const painterUserId = selectedPainter.value?.user?._id || selectedPainter.value?.user?.id || selectedPainter.value?.user

  if (!painterUserId) 
    return showSnackbar(t('painters_page.errors.request_failed'), 'error')

  requestLoading.value = true
  try {
    const { error } = await useApi(`/api/painters/${painterUserId}/request`, {
      method: 'POST',
      body: {
        state: requestForm.value.state,
        city: requestForm.value.city,
        address: requestForm.value.address || undefined,
        note: requestForm.value.note || undefined,
      },
    })

    if (error.value) {
      showSnackbar(error.value?.data?.message || t('painters_page.errors.request_failed'), 'error')

      return
    }

    showSnackbar(t('painters_page.snackbar.requested'), 'success')
    requestDialog.value = false
  }
  catch (e) {
    console.error(e)
    showSnackbar(t('painters_page.errors.request_failed'), 'error')
  }
  finally {
    requestLoading.value = false
  }
}

useHead(() => ({
  title: t('painters_page.title'),
}))
</script>

<template>
  <div>
    <VCard class="mb-6">
      <VCardText>
        <div class="d-flex align-center justify-space-between flex-wrap gap-4">
          <div>
            <h4 class="text-h4 mb-1">
              {{ t('painters_page.title') }}
            </h4>
            <p class="mb-0 text-medium-emphasis">
              {{ t('painters_page.card.note') }}
            </p>
          </div>
        </div>

        <VRow class="mt-4">
          <VCol
            cols="12"
            md="6"
          >
            <AppSelect
              v-model="filters.state"
              item-value="id"
              item-title="label"
              :items="stateOptions"
              :label="t('painters_page.filters.state')"
              :placeholder="t('painters_page.filters.state_placeholder')"
              clearable
            />
          </VCol>

          <VCol
            cols="12"
            md="6"
          >
            <AppSelect
              v-model="filters.city"
              item-value="id"
              item-title="label"
              :items="getCityOptionsForState(filters.state)"
              :label="t('painters_page.filters.city')"
              :placeholder="t('painters_page.filters.city_placeholder')"
              clearable
              :disabled="!filters.state"
            />
          </VCol>
        </VRow>
      </VCardText>
    </VCard>

    <div v-if="paintersLoading">
      <VProgressLinear indeterminate />
    </div>

    <VRow v-else>
      <VCol
        v-if="!painters.length"
        cols="12"
      >
        <VCard>
          <VCardText>
            <h6 class="text-h6 mb-1">
              {{ t('painters_page.empty.title') }}
            </h6>
            <p class="mb-0 text-medium-emphasis">
              {{ t('painters_page.empty.subtitle') }}
            </p>
          </VCardText>
        </VCard>
      </VCol>

      <VCol
        v-for="p in painters"
        :key="p._id || p.id || (p.user && (p.user._id || p.user.id))"
        cols="12"
        md="6"
        lg="4"
      >
        <VCard>
          <VCardText>
            <div class="d-flex align-center gap-3 mb-2">
              <VAvatar
                color="primary"
                variant="tonal"
                size="40"
              >
                <VImg
                  :src="painterAvatarSrc(p)"
                  cover
                />
              </VAvatar>

              <h6 class="text-h6 mb-0">
                {{ painterDisplayName(p) }}
              </h6>
            </div>

            <div
              v-if="painterServiceAreas(p).length"
              class="d-flex flex-wrap gap-2 mb-3"
            >
              <VChip
                v-for="(a, idx) in painterServiceAreas(p)"
                :key="`${a.state}-${a.city}-${idx}`"
                size="small"
                color="primary"
                variant="tonal"
              >
                {{ `${a.city}, ${a.state}` }}
              </VChip>
            </div>

            <VBtn
              block
              @click="openRequest(p)"
            >
              {{ t('painters_page.actions.request') }}
            </VBtn>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <VDialog
      v-model="requestDialog"
      max-width="560"
    >
      <VCard>
        <VCardText>
          <h5 class="text-h5 mb-1">
            {{ t('painters_page.request.title') }}
          </h5>
          <p class="mb-4 text-medium-emphasis">
            {{ t('painters_page.request.subtitle', { name: painterDisplayName(selectedPainter) }) }}
          </p>

          <VRow>
            <VCol
              cols="12"
              md="6"
            >
              <AppSelect
                v-model="requestForm.state"
                item-value="id"
                item-title="label"
                :items="requestStateOptions"
                :label="t('painters_page.request.fields.state')"
                :placeholder="t('painters_page.filters.state_placeholder')"
                :disabled="!selectedPainter || !requestStateOptions.length"
              />
            </VCol>

            <VCol
              cols="12"
              md="6"
            >
              <AppSelect
                v-model="requestForm.city"
                item-value="id"
                item-title="label"
                :items="requestCityOptions"
                :label="t('painters_page.request.fields.city')"
                :placeholder="t('painters_page.filters.city_placeholder')"
                :disabled="!requestForm.state || !requestCityOptions.length"
              />
            </VCol>

            <VCol cols="12">
              <AppTextField
                v-model="requestForm.address"
                :label="t('painters_page.request.fields.address')"
                :placeholder="t('painters_page.request.fields.address_placeholder')"
              />
            </VCol>

            <VCol cols="12">
              <VTextarea
                v-model="requestForm.note"
                :label="t('painters_page.request.fields.note')"
                :placeholder="t('painters_page.request.fields.note_placeholder')"
                rows="3"
              />
            </VCol>

            <VCol
              cols="12"
              class="d-flex gap-4"
            >
              <VBtn
                :loading="requestLoading"
                :disabled="requestLoading"
                @click="submitRequest"
              >
                {{ t('painters_page.actions.submit_request') }}
              </VBtn>

              <VBtn
                variant="tonal"
                color="secondary"
                :disabled="requestLoading"
                @click="requestDialog = false"
              >
                {{ t('painters_page.actions.cancel') }}
              </VBtn>
            </VCol>
          </VRow>
        </VCardText>
      </VCard>
    </VDialog>

    <VSnackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      timeout="5000"
      location="bottom end"
    >
      {{ snackbar.message }}
    </VSnackbar>
  </div>
</template>
