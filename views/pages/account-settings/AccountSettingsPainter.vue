<script setup>
import communes from '@/data/commune.json'
import { useAuthStore } from '@/stores/auth'
import { useValidators } from '@/utils/validators'
import { useI18n } from 'vue-i18n'

const { t } = useI18n({ useScope: 'global' })
const authStore = useAuthStore()
const { requiredValidator } = useValidators()

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

const statusOptions = computed(() => [
  { id: 'pending', label: t('painters_apply_page.status.pending') },
  { id: 'accepted', label: t('painters_apply_page.status.accepted') },
  { id: 'rejected', label: t('painters_apply_page.status.rejected') },
  { id: 'cancelled', label: t('painters_apply_page.status.cancelled') },
  { id: 'completed', label: t('painters_apply_page.status.completed') },
])

const formRef = ref()

const profileLoading = ref(false)
const saving = ref(false)

const availabilityLocal = ref(true)
const availabilitySaving = ref(false)

const painterProfile = ref(null)

const serviceAreasLocal = ref([
  {
    state: null,
    city: null,
  },
])

const requestsLoading = ref(false)
const incomingRequests = ref([])

const normalizeServiceAreas = data => {
  const areas = Array.isArray(data?.serviceAreas) ? data.serviceAreas : []
  if (areas.length)
    return areas.map(a => ({ state: a?.state ?? null, city: a?.city ?? null }))

  // legacy single-area fields
  if (data?.state && data?.city)
    return [{ state: data.state, city: data.city }]

  return [{ state: null, city: null }]
}

const loadProfile = async () => {
  profileLoading.value = true
  try {
    const { data, error } = await useApi('/api/painters/me')

    if (error.value) {
      // If the user has no painter profile yet, backend returns 404
      if (error.value?.statusCode === 404 || error.value?.status === 404) {
        painterProfile.value = null
        serviceAreasLocal.value = [{ state: null, city: null }]

        return
      }

      return showSnackbar(error.value?.data?.message || t('settings.painter.errors.load_failed'), 'error')
    }

    const profile = data.value?.data ?? data.value

    painterProfile.value = profile
    serviceAreasLocal.value = normalizeServiceAreas(profile)
    availabilityLocal.value = profile?.available !== false
  }
  catch (e) {
    console.error(e)
    showSnackbar(t('settings.painter.errors.load_failed'), 'error')
  }
  finally {
    profileLoading.value = false
  }
}

const saveAvailability = async (nextAvailable) => {
  const currentRole = (authStore.user || {}).role
  const isPainter = currentRole === 'painter' || currentRole === 'admin'
  if (!isPainter)
    return

  if (!painterProfile.value) {
    showSnackbar(t('settings.painter.no_profile'), 'info')

    return
  }

  availabilitySaving.value = true
  try {
    const { error } = await useApi('/api/painters/me/availability', {
      method: 'PATCH',
      body: { available: !!nextAvailable },
    })

    if (error.value)
      return showSnackbar(error.value?.data?.message || t('settings.painter.errors.availability_failed'), 'error')

    showSnackbar(t('settings.painter.snackbar.availability_updated'), 'success')

    // Keep local state in sync without a second network request.
    painterProfile.value = { ...painterProfile.value, available: !!nextAvailable }
  }
  catch (e) {
    console.error(e)
    showSnackbar(t('settings.painter.errors.availability_failed'), 'error')
  }
  finally {
    availabilitySaving.value = false
  }
}

const onAvailabilityToggle = async nextValue => {
  if (profileLoading.value || availabilitySaving.value)
    return

  const previous = availabilityLocal.value
  availabilityLocal.value = !!nextValue

  try {
    await saveAvailability(availabilityLocal.value)
  }
  catch (e) {
    availabilityLocal.value = previous
    throw e
  }
}

const loadIncomingRequests = async () => {
  requestsLoading.value = true
  try {
    const { data, error } = await useApi('/api/painters/requests/incoming', {
      query: {
        p: 1,
        perPage: 20,
      },
    })

    if (error.value) {
      showSnackbar(error.value?.data?.message || t('painters_apply_page.requests_load_failed'), 'error')

      return
    }

    incomingRequests.value = data.value?.data ?? []
  }
  catch (e) {
    console.error(e)
    showSnackbar(t('painters_apply_page.requests_load_failed'), 'error')
  }
  finally {
    requestsLoading.value = false
  }
}

const addAreaRow = () => {
  serviceAreasLocal.value.push({ state: null, city: null })
}

const removeAreaRow = index => {
  serviceAreasLocal.value.splice(index, 1)
  if (!serviceAreasLocal.value.length)
    serviceAreasLocal.value.push({ state: null, city: null })
}

const onAreaStateChanged = index => {
  if (!serviceAreasLocal.value[index])
    return
  serviceAreasLocal.value[index].city = null
}

const savePainterSettings = async () => {
  // Validate
  const cleaned = serviceAreasLocal.value
    .map(a => ({ state: a?.state ?? null, city: a?.city ?? null }))
    .filter(a => a.state && a.city)

  if (!cleaned.length) {
    // Trigger Vuetify validation so inputs show errors
    await formRef.value?.validate?.()

    return showSnackbar(t('settings.validation.fix_errors'), 'error')
  }

  saving.value = true
  try {
    const currentRole = (authStore.user || {}).role
    const isPainter = currentRole === 'painter' || currentRole === 'admin'

    // If already a painter, update service areas.
    // Otherwise, apply to become a painter.
    const url = isPainter ? '/api/painters/me/areas' : '/api/painters/apply'
    const method = isPainter ? 'PATCH' : 'POST'

    const { data, error } = await useApi(url, {
      method,
      body: { serviceAreas: cleaned },
    })

    if (error.value)
      return showSnackbar(error.value?.data?.message || t('settings.painter.errors.save_failed'), 'error')

    const payload = data.value?.data ?? data.value

    // Apply route returns { painter, user }; update route returns painter.
    const updatedPainter = payload?.painter ?? payload

    if (payload?.user)
      authStore.patchUser(payload.user)
    else if (currentRole !== 'admin')
      authStore.patchUser({ role: 'painter' })

    painterProfile.value = updatedPainter ?? painterProfile.value
    showSnackbar(t('settings.painter.snackbar.saved'), 'success')

    await loadProfile()
    await loadIncomingRequests()
  }
  catch (e) {
    console.error(e)
    showSnackbar(t('settings.painter.errors.save_failed'), 'error')
  }
  finally {
    saving.value = false
  }
}

const getRequesterLabel = req => {
  const requester = req?.requester
  if (!requester)
    return t('common.unnamed')

  const first = requester?.firstName
  const last = requester?.lastName

  if (first || last)
    return `${first ?? ''} ${last ?? ''}`.trim()

  return requester?._id || requester?.id || String(requester)
}

const requestRowBusy = ref({})

const updateRequestStatus = async (req, newStatus) => {
  if (!req)
    return

  const id = req?._id || req?.id
  if (!id)
    return

  requestRowBusy.value = { ...requestRowBusy.value, [id]: true }

  try {
    const { error } = await useApi(`/api/painters/requests/${id}/status`, {
      method: 'PATCH',
      body: { status: newStatus },
    })

    if (error.value) {
      showSnackbar(error.value?.data?.message || t('painters_apply_page.requests.snackbar.status_update_failed'), 'error')

      return
    }

    req.status = newStatus
    showSnackbar(t('painters_apply_page.requests.snackbar.status_updated'), 'success')
  }
  catch (e) {
    console.error(e)
    showSnackbar(t('painters_apply_page.requests.snackbar.status_update_failed'), 'error')
  }
  finally {
    requestRowBusy.value = { ...requestRowBusy.value, [id]: false }
  }
}

onMounted(async () => {
  if (authStore.user?.role !== 'painter' && authStore.user?.role !== 'admin')
    return
  await loadProfile()
  await loadIncomingRequests()
})
</script>

<template>
  <div>
    <VRow>
      <VCol cols="12">
        <VCard :title="t('settings.painter.title')">
          <VCardText>
            <p
              v-if="!painterProfile && !profileLoading"
              class="mb-4"
            >
              {{ t('settings.painter.no_profile') }}
            </p>

            <VForm
              ref="formRef"
              class="mt-2"
            >
              <VRow>
                <VCol cols="12">
                  <div class="d-flex align-center justify-space-between flex-wrap gap-3">
                    <div>
                      <h6 class="text-h6 mb-0">
                        {{ t('settings.painter.availability.title') }}
                      </h6>
                      <p class="text-body-2 text-medium-emphasis mb-0">
                        {{ t('settings.painter.availability.help') }}
                      </p>
                    </div>

                    <div class="d-flex align-center gap-3">
                      <VSwitch
                        v-model="availabilityLocal"
                        :label="availabilityLocal ? t('settings.painter.availability.available') : t('settings.painter.availability.unavailable')"
                        color="success"
                        inset
                        hide-details
                        :disabled="profileLoading || availabilitySaving"
                        @update:model-value="onAvailabilityToggle"
                      />

                      <VProgressCircular
                        v-if="availabilitySaving"
                        size="20"
                        width="2"
                        indeterminate
                        color="primary"
                      />
                    </div>
                  </div>

                  <VDivider class="my-4" />
                </VCol>

                <VCol cols="12">
                  <h6 class="text-h6 mb-0">
                    {{ t('painters_apply_page.service_areas_title') }}
                  </h6>
                </VCol>

                <VCol
                  v-for="(area, idx) in serviceAreasLocal"
                  :key="idx"
                  cols="12"
                >
                  <VRow>
                    <VCol
                      cols="12"
                      md="6"
                    >
                      <AppSelect
                        v-model="area.state"
                        item-value="id"
                        item-title="label"
                        :items="stateOptions"
                        :label="t('painters_apply_page.state')"
                        :placeholder="t('painters_apply_page.state_placeholder')"
                        :rules="[requiredValidator]"
                        @update:model-value="onAreaStateChanged(idx)"
                      />
                    </VCol>

                    <VCol
                      cols="10"
                      md="5"
                    >
                      <AppSelect
                        v-model="area.city"
                        item-value="id"
                        item-title="label"
                        :items="getCityOptionsForState(area.state)"
                        :label="t('auth.city')"
                        :placeholder="t('painters_apply_page.city_placeholder')"
                        :rules="[requiredValidator]"
                      />
                    </VCol>

                    <VCol
                      cols="2"
                      md="1"
                      class="d-flex align-end pb-6"
                    >
                      <VIcon
                        color="error"
                        icon="tabler-trash"
                        @click="removeAreaRow(idx)"
                      />
                    </VCol>
                  </VRow>
                </VCol>
                <VCol cols="12">
                  <VBtn
                    variant="tonal"
                    color="primary"
                    @click="addAreaRow"
                  >
                    {{ t('painters_apply_page.actions.add_area') }}
                  </VBtn>
                </VCol>

                <VCol
                  cols="12"
                  class="d-flex flex-wrap gap-4"
                >
                  <VBtn
                    :loading="saving"
                    :disabled="saving || profileLoading"
                    @click="savePainterSettings"
                  >
                    {{ t('settings.actions.save_changes') }}
                  </VBtn>

                  <VBtn
                    color="secondary"
                    variant="tonal"
                    :disabled="saving || profileLoading"
                    @click="loadProfile"
                  >
                    {{ t('settings.actions.reset') }}
                  </VBtn>
                </VCol>
              </VRow>
            </VForm>
          </VCardText>
        </VCard>
      </VCol>

      <VCol
        v-if="authStore.user?.role === 'painter' || authStore.user?.role === 'admin'"
        cols="12"
      >
        <VCard :title="t('painters_apply_page.requests.title')">
          <VCardText>
            <div v-if="requestsLoading">
              <VProgressLinear indeterminate />
            </div>

            <div v-else-if="!incomingRequests.length">
              {{ t('painters_apply_page.requests.empty') }}
            </div>

            <VTable v-else>
              <thead>
                <tr>
                  <th>{{ t('painters_apply_page.requests.table.requester') }}</th>
                  <th>{{ t('painters_apply_page.requests.table.area') }}</th>
                  <th>{{ t('painters_apply_page.requests.table.address') }}</th>
                  <th>{{ t('painters_apply_page.requests.table.note') }}</th>
                  <th>{{ t('painters_apply_page.requests.table.status') }}</th>
                  <th>{{ t('painters_apply_page.requests.table.date') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="req in incomingRequests"
                  :key="req._id || req.id"
                >
                  <td>{{ getRequesterLabel(req) }}</td>
                  <td>{{ `${req.city ?? ''}, ${req.state ?? ''}` }}</td>
                  <td>{{ req.address || '-' }}</td>
                  <td>{{ req.note || '-' }}</td>
                  <td style="min-width: 180px;">
                    <AppSelect
                      :model-value="req.status"
                      item-value="id"
                      item-title="label"
                      :items="statusOptions"
                      density="compact"
                      hide-details
                      :disabled="!!requestRowBusy[(req._id || req.id)]"
                      @update:model-value="val => updateRequestStatus(req, val)"
                    />
                  </td>
                  <td>{{ req.createdAt ? new Date(req.createdAt).toLocaleString() : '-' }}</td>
                </tr>
              </tbody>
            </VTable>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

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
