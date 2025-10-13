'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function useAuthRedirect() {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('cafestock_token')
    const user = localStorage.getItem('cafestock_user')

    if (token && user) {
      const parsedUser = JSON.parse(user)
      const path = parsedUser.role === 'manager' 
        ? '/manager/dashboard' 
        : '/barista/dashboard'

      router.replace(path)
    }
  }, [router])
}
