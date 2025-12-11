import { useAuthStore } from '@/stores/auth';

export default defineNuxtRouteMiddleware((to, from) => {
  const { token, user } = useAuthStore();

  if (!token && to.meta.authed)
    return navigateTo('/login');

  // Use the route's actual path instead of meta.path
  if (token && (to.path === "/login" || to.path === "/signup" || to.path === "/forgot-password"))
    return navigateTo('/');
  
  if ((!token || user?.role != 'admin') && to.meta.admin)
    return navigateTo('/');
})

