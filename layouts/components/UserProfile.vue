<script setup>
import { useAuthStore } from "@core/stores/auth.js";
import avatar1 from '@images/avatars/avatar-1.png';



const authStore = useAuthStore();


const saveToken = () => {
  authStore.setToken({ token: authStore.token });
}

const showToken = () => {
  console.log(authStore.token)
}


const items = [    
  { title: 'My Orders', to: { name: 'account/orders' }, icon: { icon: 'tabler-shopping-cart' } },
  { title: 'My Reviews', to: { name: 'account/reviews' }, icon: { icon: 'tabler-star' } },
  { title: 'My Wallet', to: { name: 'account/wallet' }, icon: { icon: 'tabler-wallet' } },
  { title: 'My Favorites', to: { name: 'account/favorites' }, icon: { icon: 'tabler-heart' } },
  { title: 'My Addresses', to: { name: 'account/addresses' }, icon: { icon: 'tabler-map-pin' } },
  { title: 'Personal', to: { name: 'account' }, icon: { icon: 'tabler-user' } },
]
</script>

<template>
  <VBtn @click="showToken">Show Token</VBtn>
  <VBtn @click="saveToken">Save Token</VBtn>
  <VBadge
    dot
    location="bottom right"
    offset-x="3"
    offset-y="3"
    bordered
    color="success"
  >
    <VAvatar
      class="cursor-pointer"
      color="primary"
      variant="tonal"
    >
      <VImg :src="avatar1" />

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
                    <VImg :src="avatar1" />
                  </VAvatar>
                </VBadge>
              </VListItemAction>
            </template>

            <VListItemTitle class="font-weight-semibold">
              John Doe
            </VListItemTitle>
            <VListItemSubtitle>Admin</VListItemSubtitle>
          </VListItem>

          <VDivider class="my-2" />


          <VListItem v-for="item in items" :key="item.to.name" link :to="item.to.name">
            <template #prepend>
              <VIcon
                class="me-2"
                :icon="item.icon.icon"
                size="22"
              />
            </template>

            <VListItemTitle>{{ item.title }}</VListItemTitle>
          </VListItem>

          <!-- Divider -->
          <VDivider class="my-2" />

          <!-- 👉 Logout -->
          <VListItem to="/login">
            <template #prepend>
              <VIcon
                class="me-2"
                icon="tabler-logout"
                size="22"
              />
            </template>

            <VListItemTitle>Logout</VListItemTitle>
          </VListItem>
        </VList>
      </VMenu>
      <!-- !SECTION -->
    </VAvatar>
  </VBadge>
</template>
