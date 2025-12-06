<script lang="ts" setup>
import UserProfileHeader from '@/views/pages/user-profile/UserProfileHeader.vue'
// import UserConnections from '@/views/pages/user-profile/connections/index.vue'
// import UserProfile from '@/views/pages/user-profile/profile/index.vue'
// import UserProjects from '@/views/pages/user-profile/projects/index.vue'
import UserFavorites from '@/views/pages/user-profile/userFavorites/index.vue'

definePageMeta({
  navActiveLink: 'user-profile-tab',
  key: 'tab',
})

const route = useRoute('user-profile-tab')

const activeTab = computed({
  get: () => route.params.tab,
  set: () => route.params.tab,
})

// tabs
const tabs = [
  { title: 'Profile', icon: 'tabler-user-check', tab: 'profile' },
  { title: 'Favorites', icon: 'tabler-users', tab: 'favorites' },
  { title: 'Projects', icon: 'tabler-layout-grid', tab: 'projects' },
  { title: 'Connections', icon: 'tabler-link', tab: 'connections' },
]
</script>

<template>
  <div>
    <UserProfileHeader class="mb-5" />

    <VTabs
      v-model="activeTab"
      class="v-tabs-pill"
    >
      <VTab
        v-for="item in tabs"
        :key="item.icon"
        :value="item.tab"
        :to="{ name: 'user-profile-tab', params: { tab: item.tab } }"
      >
        <VIcon
          size="20"
          start
          :icon="item.icon"
        />
        {{ item.title }}
      </VTab>
    </VTabs>

    <ClientOnly>
      <VWindow
        v-model="activeTab"
        class="mt-5 disable-tab-transition"
        :touch="false"
      >

        <VWindowItem value="profile">
          <!-- <UserProfile /> -->
           <p>profiling </p>
        </VWindowItem>


        <VWindowItem value="favorites">
          <UserFavorites />
        </VWindowItem>

<!-- 

        <VWindowItem value="projects">
          <UserProjects />
        </VWindowItem>


        <VWindowItem value="connections">
          <UserConnections />
        </VWindowItem> -->
      </VWindow>
    </ClientOnly>
  </div>
</template>
