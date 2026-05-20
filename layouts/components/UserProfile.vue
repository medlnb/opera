<script setup>
import { useAuthStore } from '@/stores/auth.js'
import { useI18n } from 'vue-i18n'

const authStore = useAuthStore()

const { t } = useI18n({ useScope: 'global' })

const items = [
  { title: 'user.my_orders', to: { name: '/account/orders' }, icon: { icon: 'tabler-shopping-cart' } },
  { title: 'user.my_cart', to: { name: '/account/cart' }, icon: { icon: 'tabler-shopping-bag' } },
  { title: 'user.my_favorites', to: { name: '/account/favorites' }, icon: { icon: 'tabler-heart' } },
  { title: 'user.account', to: { name: '/settings/account' }, icon: { icon: 'tabler-user' } },
]

const logout = () => {
  authStore.logout()
  window.location.reload()
}
</script>

<template>
  <!-- Show login/signup buttons when not logged in -->
  <template v-if="!authStore.token">
    <VBtn
      variant="text"
      color="error"
      to="/login"
      prepend-icon="tabler-user"
    >
      {{ t('auth.log_in') }}
    </VBtn>
  </template>

  <!-- Show user profile menu when logged in -->
  <VAvatar
    v-if="authStore.token"
    class="cursor-pointer mx-2"
    color="primary"
    variant="tonal"
  >
    <VImg
      :src="authStore.user?.avatar || `https://dummyimage.com/100x100/000/fff&text=${authStore.user?.firstName?.charAt(0) || ''}${authStore.user?.lastName?.charAt(0) || ''}`"
      cover
    />
    <!-- SECTION Menu -->
    <VMenu
      activator="parent"
      width="230"
      location="bottom end"
      offset="14px"
    >
      <VList>
        <!-- 👉 User Avatar & Name -->
        <VListItem>
          <template #prepend>
            <VListItemAction start>
              <VBadge
                dot
                location="bottom right"
                offset-x="3"
                offset-y="3"
                color="success"
              >
                <VAvatar
                  color="primary"
                  variant="tonal"
                >
                  <VImg :src="authStore.user?.avatar || `https://dummyimage.com/100x100/000/fff&text=${authStore.user?.firstName?.charAt(0) || ''}${authStore.user?.lastName?.charAt(0) || ''}`" />
                </VAvatar>
              </VBadge>
            </VListItemAction>
          </template>

          <VListItemTitle class="font-weight-semibold">
            {{ `${authStore.user?.firstName || ''} ${authStore.user?.lastName || ''}` }}
          </VListItemTitle>
          <VListItemSubtitle v-if="authStore.user?.phone">
            <bdi dir="ltr">{{ `${authStore.user.phone.slice(0, 4)} ${authStore.user.phone.slice(4, 20)}` }}</bdi>
          </VListItemSubtitle>
        </VListItem>

        <VDivider class="my-2" />

        <VListItem
          v-for="item in items"
          :key="item.to.name"
          link
          :to="item.to.name"
        >
          <template #prepend>
            <VIcon
              class="me-2"
              :icon="item.icon.icon"
              size="22"
            />
          </template>

          <VListItemTitle>{{ t(item.title) }}</VListItemTitle>
        </VListItem>

        <!-- Divider -->
        <VDivider class="my-2" />

        <!-- 👉 Logout -->
        <VListItem @click="logout">
          <template #prepend>
            <VIcon
              class="me-2"
              icon="tabler-logout"
              size="22"
            />
          </template>

          <VListItemTitle>{{ t('user.logout') }}</VListItemTitle>
        </VListItem>
      </VList>
    </VMenu>
    <!-- !SECTION -->
  </VAvatar>

</template>
