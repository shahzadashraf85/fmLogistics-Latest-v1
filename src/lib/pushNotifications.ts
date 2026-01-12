
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
)

const VAPID_PUBLIC_KEY = import.meta.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
}

export async function registerPushNotifications(userId: string) {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.log('Push notifications not supported')
        return
    }

    try {
        const registration = await navigator.serviceWorker.ready

        // Check if already subscribed
        let subscription = await registration.pushManager.getSubscription()

        if (!subscription) {
            if (!VAPID_PUBLIC_KEY) {
                console.error("VAPID Public Key missing")
                return
            }

            const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedVapidKey
            })
        }

        // Save to Supabase
        const { error } = await supabase
            .from('push_subscriptions')
            .upsert({
                user_id: userId,
                endpoint: subscription.endpoint,
                keys: subscription.toJSON().keys,
                user_agent: navigator.userAgent
            }, { onConflict: 'endpoint' })

        if (error) {
            console.error('Failed to save push token:', error)
        } else {
            console.log('Push notification registered successfully')
        }

    } catch (error) {
        console.error('Error registering push:', error)
    }
}
