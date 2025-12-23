import { useAuthStore } from '@/stores/auth'

export function useNavItems() {
  return computed(() => {
    const { user } = useAuthStore()

    return [
      {
        title: 'nav.home',
        to: { name: 'index' },
        icon: { icon: 'tabler-smart-home' },
      },
      {
        title: 'nav.colors',
        to: { name: 'colors' },
        icon: { icon: 'tabler-palette' },
      },
      {
        title: 'nav.products.root',
        icon: { icon: 'tabler-paint' },
        children: [
          {
            title: 'nav.products.decor',
            to: { name: 'products-type', params: { type: 'decor' } },
          },
          {
            title: 'nav.products.buildings',
            to: { name: 'products-type', params: { type: 'buildings' } },
          },
          {
            title: 'nav.products.coating',
            to: { name: 'products-type', params: { type: 'coating' } },
          },
        ],
      },
      {
        title: 'nav.tips',
        to: { name: 'tips' },
        icon: { icon: 'tabler-bulb' },
      },
      {
        title: 'nav.inspirations',
        to: { name: 'inspirations' },
        icon: { icon: 'tabler-sparkles' },
      },
      {
        to: { name: 'room-painter' },
        title: 'nav.virtual_painter',
        icon: { icon: 'tabler-brush' },
      },
      {
        to: { name: 'painters' },
        title: 'nav.painters',
        icon: { icon: 'tabler-users' },
      },
      {
        to: { name: 'contact' },
        title: 'nav.contact',
        icon: { icon: 'tabler-phone' },
      },
      (user as any)?.role as string === 'admin' && {
        title: 'nav.management.root',
        icon: { icon: 'tabler-user-shield' },
        children: [
          {
            title: 'nav.management.dashboard',
            to: { name: 'management-dashboard' },
          },
          {
            title: 'nav.management.products',
            to: { name: 'management' },
          },
          {
            title: 'nav.management.new_product',
            to: { name: 'management-product' },
          },
          {
            title: 'nav.management.articles',
            to: { name: 'management-articles' },
          },
          {
            title: 'nav.management.new_article',
            to: { name: 'management-newArticle' },
          },
          {
            title: 'nav.management.orders',
            to: { name: 'management-orders' },
          },
          {
            title: 'nav.management.users',
            to: { name: 'management-users' },
          },
        ],
      },
    ].filter(Boolean)
  })
}
