import { useAuthStore } from '@/stores/auth';
export  function useNavItems() {
  return computed(() => {
    const { user } = useAuthStore()
    return [
      {
        title: 'Home',
        to: { name: 'index' },
        icon: { icon: 'tabler-smart-home' },
      },
      {
        title: 'Colors',
        to: { name: 'colors' },
        icon: { icon: 'tabler-palette' },
      },
      {
        title: 'Products',
        icon: { icon: 'tabler-paint' },
        children:[
          {
            title: 'Decor',
            to: { name: 'products-type', params: { type: 'decor' } },
          },
          {
            title: 'Buildings',
            to: { name: 'products-type', params: { type: 'buildings' } },
          },
          {
            title: 'Coating',
            to: { name: 'products-type', params: { type: 'coating' } },
          }
        ]
      },
      {
        title: 'Tips',
        to: { name: 'tips' },
        icon: { icon: 'tabler-bulb' },
      },
      {
        title: 'Inspirations',
        to: { name: 'inspirations' },
        icon: { icon: 'tabler-sparkles' },
      },
      {
        title: 'Contact Us',
        to: { name: 'contact' },
        icon: { icon: 'tabler-map-pin' },
      },
      (user as any)?.role as string ==="admin" && {
        title: 'Management',
        icon: { icon: 'tabler-user-shield' },
        children:[
          {
            title: 'Dashboard',
            to: { name: 'management-dashboard'},
          },
          {
            title: 'Products',
            to: { name: 'management'},
          },
          {
            title: 'New Product',
            to: { name: 'management-product'},
          },
          {
            title: 'Articles',
            to: { name: 'management-articles'},
          },
          {
            title: 'New Article',
            to: { name: 'management-newArticle'},
          },
          {
            title: 'Orders',
            to: { name: 'management-orders'},
          },
          {
            title: 'Users',
            to: { name: 'management-users'},
          },
        ]
      },
    ].filter(Boolean)
  });
}
