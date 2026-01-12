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
    // Debug Alert 1: Start
    // alert('Starting Push Registration...') 

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        alert('Push NOT supported on this browser/device')
        return
    }

    if (!VAPID_PUBLIC_KEY) {
        alert('Error: VAPID Public Key is MISSING in environment variables')
        return
    }

    try {
        const registration = await navigator.serviceWorker.ready

        // Check if already subscribed
        let subscription = await registration.pushManager.getSubscription()

        if (!subscription) {
            // Permission State
            if (Notification.permission === 'denied') {
                alert('Notification Permission is DENIED. Please reset in iOS Settings.')
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
            alert('Supabase DB Error: ' + error.message)
        } else {
            // Success!
            console.log('Push Registered')
        }

    } catch (error: any) {
        alert('Registration Error: ' + error.message)
    }
}

