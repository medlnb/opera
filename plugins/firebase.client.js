import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

export default defineNuxtPlugin(() => {
  const firebaseConfig = {
    apiKey: 'AIzaSyAdFm_VnoyvZ-LBI844ZcZfNtKPMw8yM-M',
    authDomain: 'opera-peinture-6f34f.firebaseapp.com',
    projectId: 'opera-peinture-6f34f',
    storageBucket: 'opera-peinture-6f34f.firebasestorage.app',
    messagingSenderId: '664145135228',
    appId: '1:664145135228:web:95273a9c988c7bb7926bf9',
    measurementId: 'G-R5BY2K3JWV',
  }

  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
  const auth = getAuth(app)

  auth.useDeviceLanguage()

  return {
    provide: {
      firebaseAuth: auth,
    },
  }
})
