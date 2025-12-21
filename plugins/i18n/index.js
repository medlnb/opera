import { createI18n } from 'vue-i18n'
import ar from './locales/ar.json'
import en from './locales/en.json'
import fr from './locales/fr.json'

export default defineNuxtPlugin(nuxtApp => {
  const i18n = createI18n({
    locale: localStorage.getItem('locale') || 'en', // default locale
    fallbackLocale: 'en', // fallback locale
    messages: {
      en,
      fr,
      ar,
    },
    legacy: false, // Use Composition API
    datetimeFormats: {
      en: {
        short: {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        },
        long: {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          weekday: 'short',
          hour: 'numeric',
          minute: 'numeric',
          hour12: true,
        },
      },
      fr: {
        short: {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        },
        long: {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          weekday: 'short',
          hour: 'numeric',
          minute: 'numeric',
          hour12: true,
        },
      },
      ar: {
        short: {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        },
        long: {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          weekday: 'short',
          hour: 'numeric',
          minute: 'numeric',
          hour12: true,
        },
      },
    },
    numberFormats: {
      en: {
        currency: {
          style: 'currency',
          currency: 'DZD',
          useGrouping: true,
        },
        percent: {
          style: 'percent',
          useGrouping: false,
        },
      },
      fr: {
        currency: {
          style: 'currency',
          currency: 'DZD',
          useGrouping: true,
        },
        percent: {
          style: 'percent',
          useGrouping: false,
        },
      },
      ar: {
        currency: {
          style: 'currency',
          currency: 'دج',
          useGrouping: true,
        },
        percent: {
          style: 'percent',
          useGrouping: false,
        },
      },
    },
  })

  nuxtApp.vueApp.use(i18n)
})
