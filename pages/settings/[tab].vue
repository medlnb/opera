<script setup>
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import AccountSettingsAccount from '@/views/pages/account-settings/AccountSettingsAccount.vue'
import AccountSettingsPainter from '@/views/pages/account-settings/AccountSettingsPainter.vue'
import AccountSettingsSecurity from '@/views/pages/account-settings/AccountSettingsSecurity.vue'

const route = useRoute('settings-tab')

const { t } = useI18n({ useScope: 'global' })
const { user } = useAuthStore()

const activeTab = computed({
  get: () => route.params.tab,
  set: () => route.params.tab,
})

// tabs
const tabs = [
  { titleKey: 'settings.tabs.account', icon: 'tabler-users', tab: 'account' },
  { titleKey: 'settings.tabs.security', icon: 'tabler-lock', tab: 'security' },
  user?.role === 'painter' ? { titleKey: 'settings.tabs.painter', icon: 'tabler-brush', tab: 'painter' } : null,
].filter(Boolean)

useHead(() => ({
  title:
    activeTab.value === 'security'
      ? t('settings.tabs.security')
      : activeTab.value === 'painter'
        ? t('settings.tabs.painter')
        : t('settings.tabs.account'),
}))

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
        {{ t(item.titleKey) }}
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

        <VWindowItem value="painter">
          <AccountSettingsPainter />
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
