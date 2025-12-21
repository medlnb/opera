<script lang="ts" setup>
import { useNavItems } from '@/navigation/horizontal'
import { themeConfig } from '@themeConfig'

// Components
import Footer from '@/layouts/components/Footer.vue'
import NavbarThemeSwitcher from '@/layouts/components/NavbarThemeSwitcher.vue'
import UserProfile from '@/layouts/components/UserProfile.vue'
import NavBarI18n from '@core/components/I18n.vue'
import { HorizontalNavLayout } from '@layouts'

const navItems = useNavItems()
</script>

<template>
  <HorizontalNavLayout :nav-items="navItems">
    <!-- 👉 navbar -->
    <template #navbar>
      <NuxtLink
        to="/"
        class="app-logo d-flex align-center gap-x-3"
      >
        <h1 class="app-title font-weight-bold leading-normal text-xl text-capitalize">
          {{ themeConfig.app.title }}
        </h1>
      </NuxtLink>
      <VSpacer />

      <NavBarI18n
        v-if="themeConfig.app.i18n.enable && themeConfig.app.i18n.langConfig?.length"
        :languages="themeConfig.app.i18n.langConfig"
      />

      <NavbarThemeSwitcher class="mx-2" />
      <UserProfile />
    </template>

    <!-- 👉 Pages -->
    <slot />

    <!-- 👉 Footer -->
    <template #footer>
      <Footer />
    </template>

    <!-- 👉 Customizer -->
    <!-- <TheCustomizer /> -->
  </HorizontalNavLayout>
</template>
