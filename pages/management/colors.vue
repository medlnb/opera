<script setup>
import { useApi } from '@/composables/useApi'
import { debounce } from 'lodash'
import { useI18n } from 'vue-i18n'
import { VDataTableServer } from 'vuetify/labs/VDataTable'

definePageMeta({
  authed: true,
  admin: true,
})

const { t } = useI18n({ useScope: 'global' })

// Reactive state
const colors = ref([])
const loading = ref(false)
const totalColors = ref(0)
const snackbar = ref({ show: false, text: '', color: 'success' })

// Dialog states
const createDialog = ref(false)
const editDialog = ref(false)
const deleteDialog = ref(false)

// Form states
const colorForm = ref({ name: '', code: '', selectedColor: '#FFFFFF', isTrend: false })
const editingColor = ref(null)
const colorToDelete = ref(null)
const formRef = ref()
const saving = ref(false)
const deleting = ref(false)
const trendUpdating = ref({})
const codeEditedManually = ref(false)

// Filters
const page = ref(1)
const itemsPerPage = ref(10)
const search = ref('')

// Validation rules
const rules = {
  name: [v => !!v || t('management.colors.validation.name_required')],
  code: [v => !!v || t('management.colors.validation.code_required')],
}

// Table headers
const headers = computed(() => [
  { title: t('management.colors.table.name'), key: 'name', sortable: false },
  { title: t('management.colors.table.code'), key: 'code', sortable: false },
  { title: t('management.colors.table.trend'), key: 'isTrend', sortable: false, align: 'center' },
  { title: t('management.common.table.actions'), key: 'actions', sortable: false, align: 'end' },
])

// Fetch colors
const fetchColors = async () => {
  loading.value = true
  try {
    const { data, error } = await useApi('/api/admin/colors', { method: 'GET' })

    if (error.value) {
      showSnackbar(t('management.colors.messages.fetch_error'), 'error')

      return
    }

    // Filter by search if needed
    let colorsData = data.value.data || []
    if (search.value.trim()) {
      const searchLower = search.value.trim().toLowerCase()

      colorsData = colorsData.filter(
        color =>
          color.name.toLowerCase().includes(searchLower)
          || color.code.toLowerCase().includes(searchLower),
      )
    }

    totalColors.value = colorsData.length

    // Manual pagination
    const start = (page.value - 1) * itemsPerPage.value
    const end = start + itemsPerPage.value

    colors.value = colorsData.slice(start, end)
  }
  catch (error) {
    console.error('Failed to fetch colors:', error)
    showSnackbar(t('management.colors.messages.fetch_error'), 'error')
  }
  finally {
    loading.value = false
  }
}

// Debounced search
const debouncedSearch = debounce(() => {
  page.value = 1
  fetchColors()
}, 300)

// Watch for search changes
watch(search, () => {
  debouncedSearch()
})

// Watch for pagination changes
watch([page, itemsPerPage], () => {
  fetchColors()
})

// Show snackbar
const showSnackbar = (text, color = 'success') => {
  snackbar.value = { show: true, text, color }
}

// Open create dialog
const openCreateDialog = () => {
  codeEditedManually.value = false
  colorForm.value = { name: '', code: '', selectedColor: '#FFFFFF', isTrend: false }
  createDialog.value = true
}

// Convert hex to stored code (strip the leading #)
const hexToCode = hex => {
  if (!hex)
    return ''

  const value = String(hex).trim().toUpperCase()

  return value.startsWith('#') ? value.slice(1) : value
}

// Update code when color picker changes
watch(() => colorForm.value.selectedColor, newColor => {
  if (newColor && newColor.startsWith('#')) {
    // Keep code in sync with the picker unless user manually edited the code field.
    if (!codeEditedManually.value)
      colorForm.value.code = hexToCode(newColor)
  }
})

// Open edit dialog
const openEditDialog = color => {
  editingColor.value = color
  codeEditedManually.value = false

  const rawCode = String(color?.code ?? '')
  const cleanCode = rawCode.startsWith('#') ? rawCode.slice(1) : rawCode

  // Try to convert code to hex color, fallback to white
  const hexColor = cleanCode.startsWith('#') ? cleanCode : `#${cleanCode.replace(/[^0-9A-F]/gi, '').padEnd(6, '0').substring(0, 6)}`

  colorForm.value = { name: color.name, code: cleanCode, selectedColor: hexColor, isTrend: Boolean(color.isTrend) }
  editDialog.value = true
}

const setTrend = async (color, isTrend) => {
  const id = color?._id
  if (!id)
    return

  if (trendUpdating.value[id])
    return

  trendUpdating.value = { ...trendUpdating.value, [id]: true }

  const previous = Boolean(color.isTrend)

  color.isTrend = Boolean(isTrend)

  try {
    const { error } = await useApi(`/api/admin/colors/${id}/trend`, {
      method: 'PATCH',
      body: { isTrend: Boolean(isTrend) },
    })

    if (error.value) {
      color.isTrend = previous

      const message = error.value.data?.message || t('management.colors.messages.trend_update_error')

      showSnackbar(message, 'error')

      return
    }

    showSnackbar(t('management.colors.messages.trend_update_success'))
  }
  catch (e) {
    color.isTrend = previous
    console.error('Failed to update color trend:', e)
    showSnackbar(t('management.colors.messages.trend_update_error'), 'error')
  }
  finally {
    const { [id]: _, ...rest } = trendUpdating.value

    trendUpdating.value = rest
  }
}

// Open delete dialog
const openDeleteDialog = color => {
  colorToDelete.value = color
  deleteDialog.value = true
}

// Create color
const createColor = async () => {
  const { valid } = await formRef.value.validate()
  if (!valid)
    return

  saving.value = true
  try {
    const { data, error } = await useApi('/api/admin/colors', {
      method: 'POST',
      body: {
        name: colorForm.value.name,
        code: colorForm.value.code.toUpperCase(),
        isTrend: Boolean(colorForm.value.isTrend),
      },
    })

    if (error.value) {
      const message = error.value.data?.message || t('management.colors.messages.create_error')

      showSnackbar(message, 'error')

      return
    }

    showSnackbar(t('management.colors.messages.create_success'))
    createDialog.value = false
    fetchColors()
  }
  catch (error) {
    console.error('Failed to create color:', error)
    showSnackbar(t('management.colors.messages.create_error'), 'error')
  }
  finally {
    saving.value = false
  }
}

// Update color
const updateColor = async () => {
  const { valid } = await formRef.value.validate()
  if (!valid)
    return

  saving.value = true
  try {
    const { data, error } = await useApi(`/api/admin/colors/${editingColor.value._id}`, {
      method: 'PATCH',
      body: {
        name: colorForm.value.name,
        code: colorForm.value.code.toUpperCase(),
        isTrend: Boolean(colorForm.value.isTrend),
      },
    })

    if (error.value) {
      const message = error.value.data?.message || t('management.colors.messages.update_error')

      showSnackbar(message, 'error')

      return
    }

    showSnackbar(t('management.colors.messages.update_success'))
    editDialog.value = false
    fetchColors()
  }
  catch (error) {
    console.error('Failed to update color:', error)
    showSnackbar(t('management.colors.messages.update_error'), 'error')
  }
  finally {
    saving.value = false
  }
}

// Delete color
const deleteColor = async () => {
  deleting.value = true
  try {
    const { error } = await useApi(`/api/admin/colors/${colorToDelete.value._id}`, {
      method: 'DELETE',
    })

    if (error.value) {
      showSnackbar(t('management.colors.messages.delete_error'), 'error')

      return
    }

    showSnackbar(t('management.colors.messages.delete_success'))
    deleteDialog.value = false
    fetchColors()
  }
  catch (error) {
    console.error('Failed to delete color:', error)
    showSnackbar(t('management.colors.messages.delete_error'), 'error')
  }
  finally {
    deleting.value = false
  }
}

// Initial fetch
onMounted(() => {
  fetchColors()
})

useHead(() => ({
  title: t('management.colors.title'),
}))
</script>

<template>
  <div>
    <!-- Page Header -->
    <div class="d-flex justify-space-between align-center mb-6">
      <div>
        <h2 class="text-h4 font-weight-bold mb-1">
          {{ t('management.colors.title') }}
        </h2>
        <p class="text-body-1 text-medium-emphasis">
          {{ t('management.colors.subtitle') }}
        </p>
      </div>
      <VBtn
        color="primary"
        prepend-icon="tabler-plus"
        @click="openCreateDialog"
      >
        {{ t('management.colors.actions.create') }}
      </VBtn>
    </div>

    <!-- Search & Filters -->
    <VCard class="mb-6">
      <VCardText>
        <VRow>
          <VCol
            cols="12"
            md="6"
          >
            <VTextField
              v-model="search"
              :placeholder="t('management.colors.search_placeholder')"
              prepend-inner-icon="tabler-search"
              clearable
              density="compact"
            />
          </VCol>
        </VRow>
      </VCardText>
    </VCard>

    <!-- Colors Table -->
    <VCard>
      <VDataTableServer
        v-model:page="page"
        v-model:items-per-page="itemsPerPage"
        :headers="headers"
        :items="colors"
        :items-length="totalColors"
        :loading="loading"
        class="text-no-wrap"
      >
        <!-- Color Name with Visual Preview -->
        <template #item.name="{ item }">
          <div class="d-flex align-center gap-2">
            <VChip
              size="small"
              :style="{ backgroundColor: `#${item.code.replace('RAL', '')}` }"
              class="px-2"
            >
              &nbsp;
            </VChip>
            <span class="font-weight-medium">{{ item.name }}</span>
          </div>
        </template>

        <!-- Color Code -->
        <template #item.code="{ item }">
          <VChip
            size="small"
            color="primary"
            variant="tonal"
          >
            {{ item.code }}
          </VChip>
        </template>

        <!-- Trend Toggle -->
        <template #item.isTrend="{ item }">
          <div class="d-flex justify-center">
            <VSwitch
              :model-value="Boolean(item.isTrend)"
              density="compact"
              hide-details
              color="primary"
              :disabled="Boolean(trendUpdating[item._id])"
              :loading="Boolean(trendUpdating[item._id])"
              @update:model-value="val => setTrend(item, val)"
            />
          </div>
        </template>

        <!-- Actions -->
        <template #item.actions="{ item }">
          <div class="d-flex gap-1">
            <VBtn
              icon
              size="small"
              variant="text"
              color="primary"
              @click="openEditDialog(item)"
            >
              <VIcon
                size="22"
                icon="tabler-edit"
              />
              <VTooltip
                activator="parent"
                location="top"
              >
                {{ t('management.common.actions.edit') }}
              </VTooltip>
            </VBtn>

            <VBtn
              icon
              size="small"
              variant="text"
              color="error"
              @click="openDeleteDialog(item)"
            >
              <VIcon
                size="22"
                icon="tabler-trash"
              />
              <VTooltip
                activator="parent"
                location="top"
              >
                {{ t('management.common.actions.delete') }}
              </VTooltip>
            </VBtn>
          </div>
        </template>

        <!-- Empty State -->
        <template #no-data>
          <div class="text-center py-12">
            <VIcon
              size="64"
              icon="tabler-palette-off"
              class="mb-4 text-disabled"
            />
            <p class="text-h6 mb-2">
              {{ t('management.colors.empty.title') }}
            </p>
            <p class="text-body-2 text-medium-emphasis">
              {{ t('management.colors.empty.subtitle') }}
            </p>
          </div>
        </template>

        <!-- Loading -->
        <template #loading>
          <VProgressLinear
            indeterminate
            color="primary"
          />
        </template>
      </VDataTableServer>
    </VCard>

    <!-- Create Dialog -->
    <VDialog
      v-model="createDialog"
      max-width="500"
    >
      <VCard>
        <VCardTitle class="text-h5">
          {{ t('management.colors.dialogs.create.title') }}
        </VCardTitle>

        <VCardText>
          <VForm
            ref="formRef"
            @submit.prevent="createColor"
          >
            <VTextField
              v-model="colorForm.name"
              :label="t('management.colors.form.name')"
              :rules="rules.name"
              class="mb-4"
            />

            <div class="mb-4">
              <label class="text-body-2 text-medium-emphasis mb-2 d-block">
                {{ t('management.colors.form.color_picker') }}
              </label>
              <div class="d-flex align-center gap-3">
                <input
                  v-model="colorForm.selectedColor"
                  type="color"
                  class="color-picker-input"
                  style="width: 80px; height: 40px; cursor: pointer; border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)); border-radius: 4px;"
                >
                  <VChip
                    :style="{ backgroundColor: colorForm.selectedColor }"
                    class="px-4"
                  >
                  {{ colorForm.selectedColor }}
                </VChip>
              </div>
            </div>

            <VTextField
              v-model="colorForm.code"
              :label="t('management.colors.form.code')"
              :rules="rules.code"
              placeholder="RAL9016 or FFFFFF"
              hint="e.g., RAL9016, RAL3000, or hex code"
              @update:model-value="() => { codeEditedManually = true }"
            />

            <VSwitch
              v-model="colorForm.isTrend"
              class="mt-2"
              color="primary"
              hide-details
              :label="t('management.colors.form.trend')"
            />
          </VForm>
        </VCardText>

        <VCardActions>
          <VSpacer />
          <VBtn
            variant="text"
            @click="createDialog = false"
          >
            {{ t('management.common.actions.cancel') }}
          </VBtn>
          <VBtn
            color="primary"
            :loading="saving"
            @click="createColor"
          >
            {{ t('management.common.actions.create') }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Edit Dialog -->
    <VDialog
      v-model="editDialog"
      max-width="500"
    >
      <VCard>
        <VCardTitle class="text-h5">
          {{ t('management.colors.dialogs.edit.title') }}
        </VCardTitle>

        <VCardText>
          <VForm
            ref="formRef"
            @submit.prevent="updateColor"
          >
            <VTextField
              v-model="colorForm.name"
              :label="t('management.colors.form.name')"
              :rules="rules.name"
              class="mb-4"
            />

            <div class="mb-4">
              <label class="text-body-2 text-medium-emphasis mb-2 d-block">
                {{ t('management.colors.form.color_picker') }}
              </label>
              <div class="d-flex align-center gap-3">
                <input
                  v-model="colorForm.selectedColor"
                  type="color"
                  class="color-picker-input"
                  style="width: 80px; height: 40px; cursor: pointer; border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)); border-radius: 4px;"
                >
                <VChip
                  :style="{ backgroundColor: colorForm.selectedColor }"
                  class="px-4"
                >
                  {{ colorForm.selectedColor }}
                </VChip>
              </div>
            </div>

            <VTextField
              v-model="colorForm.code"
              :label="t('management.colors.form.code')"
              :rules="rules.code"
              placeholder="RAL9016 or FFFFFF"
              hint="e.g., RAL9016, RAL3000, or hex code"
              @update:model-value="() => { codeEditedManually = true }"
            />

            <VSwitch
              v-model="colorForm.isTrend"
              class="mt-2"
              color="primary"
              hide-details
              :label="t('management.colors.form.trend')"
            />
          </VForm>
        </VCardText>

        <VCardActions>
          <VSpacer />
          <VBtn
            variant="text"
            @click="editDialog = false"
          >
            {{ t('management.common.actions.cancel') }}
          </VBtn>
          <VBtn
            color="primary"
            :loading="saving"
            @click="updateColor"
          >
            {{ t('management.common.actions.save') }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Delete Confirmation Dialog -->
    <VDialog
      v-model="deleteDialog"
      max-width="400"
    >
      <VCard>
        <VCardTitle class="text-h5">
          {{ t('management.colors.dialogs.delete.title') }}
        </VCardTitle>

        <VCardText>
          <p class="mb-4">
            {{ t('management.colors.dialogs.delete.message') }}
          </p>
          <VAlert
            v-if="colorToDelete"
            type="warning"
            variant="tonal"
          >
            <div class="d-flex align-center gap-2">
              <VChip
                size="small"
                :style="{ backgroundColor: `#${colorToDelete.code.replace('RAL', '')}` }"
                class="px-2"
              >
                &nbsp;
              </VChip>
              <strong>{{ colorToDelete.name }}</strong>
              <VChip
                size="small"
                color="primary"
                variant="tonal"
              >
                {{ colorToDelete.code }}
              </VChip>
            </div>
          </VAlert>
        </VCardText>

        <VCardActions>
          <VSpacer />
          <VBtn
            variant="text"
            @click="deleteDialog = false"
          >
            {{ t('management.common.actions.cancel') }}
          </VBtn>
          <VBtn
            color="error"
            :loading="deleting"
            @click="deleteColor"
          >
            {{ t('management.common.actions.delete') }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Snackbar -->
    <VSnackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      location="top end"
    >
      {{ snackbar.text }}
    </VSnackbar>
  </div>
</template>
