export default [
  {
    title: 'Home',
    to: { name: 'index' },
    icon: { icon: 'tabler-smart-home' },
  },
  {
    title: 'asdas',
    to: { name: 'second-page' },
    icon: { icon: 'tabler-file' },
  },
  {
    title: 'Products',
    icon: { icon: 'tabler-paint' },
    children:[
      {
        title: 'Interior Wall Paint',
        to: { name: 'products-type', params: { type: 'interior' } },
      },
      {
        title: 'Exterior Wall Paint',
        to: { name: 'products-type', params: { type: 'exterior' } },
      },
      {
        title: 'Tools & Hardeners',
        to: { name: 'products-type', params: { type: 'tools' } },
      }
    ]
  },
]
