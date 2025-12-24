<script setup>
import { useAuthStore } from '@/stores/auth'
import { useI18n } from 'vue-i18n'

const { t } = useI18n({ useScope: 'global' })
const authStore = useAuthStore()

const snackbar = ref({ show: false, message: '', color: 'success' })

const showSnackbar = (message, color = 'success') => {
  snackbar.value = { show: true, message, color }
}

const myRequestsLoading = ref(false)
const myRequests = ref([])
const myRequestsPage = ref(1)
const myRequestsPerPage = 10
const myRequestsTotal = ref(0)
const myRequestsRowBusy = ref({})

const myRequestsTotalPages = computed(() => {
  const total = Number(myRequestsTotal.value || 0)
  return Math.max(1, Math.ceil(total / myRequestsPerPage))
})

const normalizeStatus = status => String(status || '').toLowerCase().trim()
const canRemoveRequest = req => normalizeStatus(req?.status) !== 'completed'

const confirmRemoveDialog = ref(false)
const confirmRemoveRequest = ref(null)

const painterNameFromRequest = req => {
  const p = req?.painter
  const first = p?.firstName
  const last = p?.lastName
  if (first || last)
    return `${first ?? ''} ${last ?? ''}`.trim()

  return p?.phone || t('common.unnamed')
}

const fetchMyRequests = async () => {
  if (!authStore.token)
    return

  myRequestsLoading.value = true
  try {
    const { data, error } = await useApi('/api/painters/requests/my', {
      query: {
        p: myRequestsPage.value,
        perPage: myRequestsPerPage,
      },
    })

    if (error.value) {
      showSnackbar(error.value?.data?.message || t('painters_page.my_requests.errors.load_failed'), 'error')
      myRequests.value = []
      myRequestsTotal.value = 0
      return
    }

    myRequests.value = data.value?.data ?? []
    myRequestsTotal.value = data.value?.pagination?.total ?? myRequests.value.length
  }
  catch (e) {
    console.error(e)
    showSnackbar(t('painters_page.my_requests.errors.load_failed'), 'error')
    myRequests.value = []
    myRequestsTotal.value = 0
  }
  finally {
    myRequestsLoading.value = false
  }
}

watch(myRequestsPage, fetchMyRequests)

const doRemoveMyRequest = async req => {
  const id = req?._id || req?.id
  if (!id)
    return

  if (!canRemoveRequest(req))
    return

  myRequestsRowBusy.value = { ...myRequestsRowBusy.value, [id]: true }
  try {
    const { data, error } = await useApi(`/api/painters/requests/${id}`, {
      method: 'DELETE',
    })

    if (error.value)
      return showSnackbar(error.value?.data?.message || t('painters_page.my_requests.errors.remove_failed'), 'error')

    const message = data.value?.message
    showSnackbar(message || t('painters_page.my_requests.snackbar.removed'), 'success')
    await fetchMyRequests()
  }
  catch (e) {
    console.error(e)
    showSnackbar(t('painters_page.my_requests.errors.remove_failed'), 'error')
  }
  finally {
    myRequestsRowBusy.value = { ...myRequestsRowBusy.value, [id]: false }
  }
}

const openConfirmRemove = req => {
  const id = req?._id || req?.id
  if (!id)
    return

  if (!canRemoveRequest(req))
    return

  confirmRemoveRequest.value = req
  confirmRemoveDialog.value = true
}

const closeConfirmRemove = () => {
  confirmRemoveDialog.value = false
  confirmRemoveRequest.value = null
}

const confirmRemove = async () => {
  const req = confirmRemoveRequest.value
  closeConfirmRemove()
  await doRemoveMyRequest(req)
}

onMounted(async () => {
  if (!authStore.token) {
    showSnackbar(t('painters_page.actions.sign_in_to_request'), 'info')
    navigateTo('/login')
    return
  }

  await fetchMyRequests()
})

useHead(() => ({
  title: t('painters_page.my_requests.title'),
}))
</script>

<template>
  <div>
    <VCard>
      <VCardText>
        <div class="d-flex align-center justify-space-between flex-wrap gap-3 mb-3">
          <div>
            <h4 class="text-h4 mb-1">
              {{ t('painters_page.my_requests.title') }}
            </h4>
            <p class="text-body-2 text-medium-emphasis mb-0">
              {{ t('painters_page.my_requests.subtitle') }}
            </p>
          </div>

          <VBtn
            variant="tonal"
            color="secondary"
            @click="navigateTo('/painters')"
          >
            {{ t('common.back') }}
          </VBtn>
        </div>

        <div v-if="myRequestsLoading">
          <VProgressLinear indeterminate />
        </div>

        <div v-else-if="!myRequests.length">
          {{ t('painters_page.my_requests.empty') }}
        </div>

        <VTable v-else>
          <thead>
            <tr>
              <th>{{ t('painters_page.my_requests.table.painter') }}</th>
              <th>{{ t('painters_page.my_requests.table.area') }}</th>
              <th>{{ t('painters_page.my_requests.table.status') }}</th>
              <th>{{ t('painters_page.my_requests.table.date') }}</th>
              <th style="width: 90px;">{{ t('painters_page.my_requests.table.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="req in myRequests"
              :key="req._id || req.id"
            >
              <td>{{ painterNameFromRequest(req) }}</td>
              <td>{{ `${req.city ?? ''}, ${req.state ?? ''}` }}</td>
              <td>
                <VChip
                  size="small"
                  variant="tonal"
                  color="primary"
                >
                  {{ req.status || '-' }}
                </VChip>
              </td>
              <td>{{ req.createdAt ? new Date(req.createdAt).toLocaleString() : '-' }}</td>
              <td>
                <VBtn
                  v-if="canRemoveRequest(req)"
                  icon
                  variant="text"
                  color="error"
                  :loading="!!myRequestsRowBusy[(req._id || req.id)]"
                  :disabled="!!myRequestsRowBusy[(req._id || req.id)]"
                  @click="openConfirmRemove(req)"
                >
                  <VIcon icon="tabler-trash" />
                </VBtn>
                <span v-else>-</span>
              </td>
            </tr>
          </tbody>
        </VTable>

        <div
          v-if="myRequestsTotalPages > 1"
          class="d-flex justify-center mt-4"
        >
          <VPagination
            v-model="myRequestsPage"
            :length="myRequestsTotalPages"
            total-visible="7"
          />
        </div>
      </VCardText>
    </VCard>

    <VSnackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      timeout="5000"
      location="bottom end"
    >
      {{ snackbar.message }}
    </VSnackbar>

    <VDialog
      v-model="confirmRemoveDialog"
      max-width="440"
    >
      <VCard>
        <VCardText>
          <h5 class="text-h5 mb-2">
            {{ t('painters_page.my_requests.confirm_title') }}
          </h5>
          <p class="mb-0">
            {{ t('painters_page.my_requests.confirm_remove') }}
          </p>

          <div class="d-flex justify-end gap-3 mt-6">
            <VBtn
              variant="tonal"
              color="secondary"
              @click="closeConfirmRemove"
            >
              {{ t('common.cancel') }}
            </VBtn>

            <VBtn
              color="error"
              :disabled="!!myRequestsRowBusy[(confirmRemoveRequest?._id || confirmRemoveRequest?.id)]"
              @click="confirmRemove"
            >
              {{ t('common.delete') }}
            </VBtn>
          </div>
        </VCardText>
      </VCard>
    </VDialog>
  </div>
</template>
