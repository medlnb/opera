<script lang="ts" setup>
import AccountSettingsAccount from '@/views/pages/account-settings/AccountSettingsAccount.vue'
import AccountSettingsSecurity from '@/views/pages/account-settings/AccountSettingsSecurity.vue'

const route = useRoute('settings-tab')

const activeTab = computed({
  get: () => route.params.tab,
  set: () => route.params.tab,
})

// tabs
const tabs = [
  { title: 'Account', icon: 'tabler-users', tab: 'account' },
  { title: 'Security', icon: 'tabler-lock', tab: 'security' },
]

definePageMeta({
  navActiveLink: 'pages-account-settings-tab',
  authed: true,
})
</script>

<template>
  <div>
    <VTabs
      v-model="activeTab"
      class="v-tabs-pill"
    >
      <VTab
        v-for="item in tabs"
        :key="item.icon"
        :value="item.tab"
        :to="{ name: 'settings-tab', params: { tab: item.tab } }"
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
        class="mt-6 disable-tab-transition"
        :touch="false"
      >
        <VWindowItem value="account">
          <AccountSettingsAccount />
        </VWindowItem>

        <VWindowItem value="security">
          <AccountSettingsSecurity />
        </VWindowItem>
        <!--
          <VWindowItem value="billing-plans">
          <AccountSettingsBillingAndPlans />
          </VWindowItem>

          <VWindowItem value="notification">
          <AccountSettingsNotification />
          </VWindowItem>

          <VWindowItem value="connection">
          <AccountSettingsConnections />
          </VWindowItem>
        -->
      </VWindow>
    </ClientOnly>
  </div>
</template>
