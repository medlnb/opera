<script setup>
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'

definePageMeta({
  authed: true,
})

const authStore = useAuthStore()
const cartStore = useCartStore()
const config = useRuntimeConfig()

const checkout = ref({
  shippingCost: 0,
  address: '',
  state: '',
  city: '',
})

const checkoutLoading = ref(false)
const updatingItem = reactive(new Set())

const snackbar = ref({ show: false, message: '', color: 'success' })

const showSnackbar = (message, color = 'success') => {
  snackbar.value = { show: true, message, color }
}

onMounted(() => {
  if (!authStore.token) {
    navigateTo('/login')

    return
  }
  cartStore.fetchCart()
})

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
  const key = `${item.product}-${item.variance}-${item.color}`
  if (updatingItem.has(key))
    return

  updatingItem.add(key)
  try {
    await cartStore.removeItem({
      productId: item.product,
      variance: item.variance,
      color: item.color,
    })
  }
  finally {
    updatingItem.delete(key)
  }
}

async function handleCheckout() {
  if (cartStore.isEmpty)
    return

  checkoutLoading.value = true
  try {
    const order = await cartStore.checkout({
      contact: {
        address: checkout.value.address || undefined,
        state: checkout.value.state || undefined,
        city: checkout.value.city || undefined,
      },
    })

    if (order)
      showSnackbar('Order placed successfully', 'success')
    else
      showSnackbar('Checkout failed', 'error')
  }
  catch (err) {
    console.log(err)
    showSnackbar('Checkout failed', 'error')
  }
  finally {
    checkoutLoading.value = false
  }
}

const subtotal = computed(() => {
  return cartStore.items.reduce((sum, item) => {
    return sum + (item.price || 0) * (item.qty || 1)
  }, 0)
})

const total = computed(() => {
  return subtotal.value + (Number(checkout.value.shippingCost) || 0)
})
</script>

<template>
  <div>
    <VCard
      title="Shopping Cart"
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
            Your cart is empty
          </p>
          <VBtn
            color="primary"
            to="/products/interior"
            class="mt-4"
          >
            Browse Products
          </VBtn>
        </div>

        <template v-else>
          <VList lines="two">
            <VListItem
              v-for="(item, index) in cartStore.items"
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
                <span v-if="item.variance">Size: {{ item.quantity }}</span>
                <span v-if="item.color"> · Color: {{ item.color }}</span>
              </VListItemSubtitle>
              <VListItemSubtitle class="mt-1">
                <span class="text-primary font-weight-medium">{{ item.price }} DZD</span>
                <span class="text-disabled"> × {{ item.qty }}</span>
                <span class="font-weight-bold"> = {{ (item.price || 0) * (item.qty || 1) }} DZD</span>
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

          <VRow>
            <VCol
              cols="12"
              md="6"
            >
              <h6 class="text-h6 mb-3">
                Shipping Details (Optional)
              </h6>
              <VRow>
                <VCol cols="12">
                  <AppTextField
                    v-model="checkout.address"
                    label="Address"
                    placeholder="Street address"
                  />
                </VCol>
                <VCol cols="6">
                  <AppTextField
                    v-model="checkout.state"
                    label="State"
                    placeholder="State/Province"
                  />
                </VCol>
                <VCol cols="6">
                  <AppTextField
                    v-model="checkout.city"
                    label="City"
                    placeholder="City"
                  />
                </VCol>
              </VRow>
            </VCol>

            <VCol
              cols="12"
              md="6"
            >
              <VCard
                variant="outlined"
                class="pa-4"
              >
                <h6 class="text-h6 mb-4">
                  Order Summary
                </h6>
                <div class="d-flex justify-space-between mb-2">
                  <span class="text-body-1">Subtotal</span>
                  <span class="text-body-1 font-weight-medium">{{ subtotal }} DZD</span>
                </div>
                <VDivider class="my-3" />
                <div class="d-flex justify-space-between mb-4">
                  <span class="text-h6">Total</span>
                  <span class="text-h6 text-primary">{{ total }} DZD</span>
                </div>
                <VBtn
                  color="primary"
                  block
                  size="large"
                  :loading="checkoutLoading"
                  :disabled="cartStore.isEmpty"
                  @click="handleCheckout"
                >
                  Checkout
                </VBtn>
              </VCard>
            </VCol>
          </VRow>
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
