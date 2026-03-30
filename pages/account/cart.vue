<script setup>
import communes from '@/data/commune.json'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import { useValidators } from '@/utils/validators'
import { useI18n } from 'vue-i18n'

definePageMeta({
  authed: true,
})

const authStore = useAuthStore()
const cartStore = useCartStore()
const config = useRuntimeConfig()

const { t } = useI18n({ useScope: 'global' })

useHead(() => ({
  title: t('user.my_cart'),
}))

const checkout = ref({
  address: '',
  state: undefined,
  city: undefined,
  sellpoint: null,
})

const sellpoints = ref([])
const sellpointsLoading = ref(false)
const sellpointRef = ref(null)

const checkoutLoading = ref(false)
const updatingItem = reactive(new Set())

const snackbar = ref({ show: false, message: '', color: 'success' })

const showSnackbar = (message, color = 'success') => {
  snackbar.value = { show: true, message, color }
}

// Build wilaya (state) options from grouped communes
const wilayaGroups = (communes || []).filter(g => Array.isArray(g) && g.length)

const stateOptions = computed(() =>
  wilayaGroups.map(g => ({ id: String(g[0].wilaya_id), label: g[0].name })),
)

// Cities (communes) for selected wilaya
const cityOptions = computed(() => {
  if (!checkout.value.state)
    return []
  const group = wilayaGroups.find(g => String(g[0].wilaya_id) === String(checkout.value.state))

  return group ? group.map(c => ({ id: String(c.id), label: c.name })) : []
})

watch(() => checkout.value.state, () => {
  checkout.value.city = null
})

onMounted(() => {
  if (!authStore.token) {
    navigateTo('/login')

    return
  }
  cartStore.fetchCart()
  fetchSellpoints()
})

function getStateLabel(stateId) {
  return stateOptions.value.find(s => String(s.id) === String(stateId))?.label || ''
}

function getCityLabel(stateId, cityId) {
  const group = wilayaGroups.find(g => String(g[0].wilaya_id) === String(stateId))

  return group?.find(c => String(c.id) === String(cityId))?.name || ''
}

async function fetchSellpoints() {
  sellpointsLoading.value = true
  try {
    const res = await fetch(`${config.public.apiBaseUrl}/api/cart/sellpoints`, {
      headers: { Authorization: `Bearer ${authStore.token}` },
    })

    if (!res.ok)
      throw new Error('Failed to fetch sellpoints')
    const data = await res.json()

    sellpoints.value = data.data.map(sp => ({
      id: sp._id,
      label: `${getCityLabel(sp.state, sp.city)}, ${getStateLabel(sp.state)}`,
    })) || []
  }
  catch (err) {
    console.error(err)
  }
  finally {
    sellpointsLoading.value = false
  }
}

async function updateQuantity(item, delta) {
  const key = `${item.product}-${item.variance}-${item.color}`
  if (updatingItem.has(key))
    return

  const newQty = Math.max(1, (item.qty || 1) + delta)

  updatingItem.add(key)
  try {
    await cartStore.updateItem({
      productId: item.product,
      variance: item.variance,
      color: item.color,
      qty: newQty,
    })
  }
  finally {
    updatingItem.delete(key)
  }
}

async function removeItem(item) {
  const key = `${item.product}-${item.variance}`
  if (updatingItem.has(key))
    return

  updatingItem.add(key)
  try {
    await cartStore.removeItem({
      productId: item.product,
      variance: item.variance,
    })
  }
  finally {
    updatingItem.delete(key)
  }
}

async function handleCheckout() {
  const { valid } = await sellpointRef.value.validate()
  if (!valid || cartStore.isEmpty)
    return
  checkoutLoading.value = true
  try {
    const order = await cartStore.checkout({
      contact: {
        address: checkout.value.address || undefined,
        state: checkout.value.state || undefined,
        city: checkout.value.city || undefined,
      },
      sellpoint: checkout.value.sellpoint || undefined,
    })

    if (order)
      showSnackbar(t('account.cart.snackbar.order_success'), 'success')
    else
      showSnackbar(t('account.cart.snackbar.checkout_failed'), 'error')
  }
  catch (err) {
    console.log(err)
    showSnackbar(t('account.cart.snackbar.checkout_failed'), 'error')
  }
  finally {
    checkoutLoading.value = false
  }
}

const { requiredValidator } = useValidators()
</script>

<template>
  <div>
    <VCard
      :title="t('account.cart.title')"
      class="mb-6"
    >
      <VCardText>
        <div
          v-if="cartStore.loading && cartStore.items.length === 0"
          class="text-center py-8"
        >
          <VProgressCircular
            indeterminate
            color="primary"
          />
        </div>

        <div
          v-else-if="cartStore.isEmpty"
          class="text-center py-8"
        >
          <VIcon
            icon="tabler-shopping-cart-off"
            size="64"
            class="text-disabled mb-4"
          />
          <p class="text-h6 text-disabled">
            {{ t('account.cart.empty.title') }}
          </p>
          <VBtn
            color="primary"
            to="/products/decor"
            class="mt-4"
          >
            {{ t('account.cart.actions.browse_products') }}
          </VBtn>
        </div>

        <template v-else>
          <VList lines="two">
            <VListItem
              v-for="(item) in cartStore.items"
              :key="`${item.product}-${item.variance}-${item.color}`"
              class="py-4"
            >
              <template #prepend>
                <VAvatar
                  v-if="item.imageUrl"
                  size="64"
                  rounded
                  :image="`${config.public.apiBaseUrl}/api/image?id=${item.imageUrl}`"
                />
                <VAvatar
                  v-else
                  size="64"
                  rounded
                  color="grey-lighten-3"
                >
                  <VIcon icon="tabler-package" />
                </VAvatar>
              </template>

              <VListItemTitle class="font-weight-medium">
                {{ item.title }}
              </VListItemTitle>
              <VListItemSubtitle>
                <span>{{ item.name }}</span>
              </VListItemSubtitle>

              <template #append>
                <div class="d-flex align-center gap-2">
                  <VBtn
                    icon="tabler-minus"
                    variant="tonal"
                    size="small"
                    :disabled="item.qty <= 1 || updatingItem.has(`${item.product}-${item.variance}-${item.color}`)"
                    @click="updateQuantity(item, -1)"
                  />
                  <span
                    class="text-body-1 font-weight-medium"
                    style="min-inline-size: 24px; text-align: center;"
                  >
                    {{ item.qty }}
                  </span>
                  <VBtn
                    icon="tabler-plus"
                    variant="tonal"
                    size="small"
                    :disabled="updatingItem.has(`${item.product}-${item.variance}-${item.color}`)"
                    @click="updateQuantity(item, 1)"
                  />
                  <VBtn
                    icon="tabler-trash"
                    variant="tonal"
                    color="error"
                    size="small"
                    :loading="updatingItem.has(`${item.product}-${item.variance}-${item.color}`)"
                    @click="removeItem(item)"
                  />
                </div>
              </template>
            </VListItem>
          </VList>

          <VDivider class="my-4" />

          <VRow align="end">
            <VCol cols="12">
              <h6 class="text-h6 mb-3">
                {{ t('account.cart.shipping.title') }}
              </h6>
              <VRow>
                <VCol
                  cols="12"
                  md="6"
                >
                  <AppSelect
                    v-model="checkout.state"
                    item-value="id"
                    item-title="label"
                    :label="t('auth.wilaya')"
                    :placeholder="t('auth.select_wilaya')"
                    :items="stateOptions"
                  />
                </VCol>

                <VCol
                  cols="12"
                  md="6"
                >
                  <AppSelect
                    v-model="checkout.city"
                    :label="t('auth.city')"
                    item-value="id"
                    item-title="label"
                    :placeholder="t('auth.select_city')"
                    :items="cityOptions"
                  />
                </VCol>
                <VCol cols="12">
                  <AppTextField
                    v-model="checkout.address"
                    :label="t('account.cart.shipping.fields.address.label')"
                    :placeholder="t('account.cart.shipping.fields.address.placeholder')"
                  />
                </VCol>
              </VRow>
            </VCol>
          </VRow>

          <VDivider class="mt-8 mb-4" />

          <VCard
            flat
            class="pt-4"
          >
            <h6 class="text-h6 mb-3">
              {{ t('account.cart.sellpoint.title') }}
            </h6>
            <div
              v-if="sellpointsLoading"
              class="text-center py-4"
            >
              <VProgressCircular
                indeterminate
                color="primary"
                size="24"
              />
            </div>
            <VRow
              v-else
              dense
            >
              <VCol cols="12">
                <VForm ref="sellpointRef">
                  <AppSelect
                    v-model="checkout.sellpoint"
                    item-value="id"
                    item-title="label"
                    :label="t('account.cart.sellpoint.label')"
                    :placeholder="t('account.cart.sellpoint.placeholder')"
                    :items="sellpoints"
                    :rules="[requiredValidator]"
                  />
                </VForm>
              </VCol>
            </VRow>
          </VCard>

          <VDivider class="mt-8 mb-4" />

          <VCard
            flat
            class="pa-4 d-flex justify-end"
          >
            <VBtn
              color="primary"
              size="large"
              :loading="checkoutLoading"
              :disabled="cartStore.isEmpty"
              @click="handleCheckout"
            >
              {{ t('account.cart.actions.checkout') }}
            </VBtn>
          </VCard>
        </template>
      </VCardText>
    </VCard>
  </div>

  <VSnackbar
    v-model="snackbar.show"
    :color="snackbar.color"
    timeout="5000"
    location="bottom end"
  >
    {{ snackbar.message }}
  </VSnackbar>
</template>
