import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
)

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

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
        console.log('Push notifications not supported on this browser/device')
        return
    }

    if (!VAPID_PUBLIC_KEY) {
        console.error('Error: VAPID Public Key is MISSING in environment variables')
        return
    }

    // Check current permission state
    const currentPermission = Notification.permission
    console.log(`Current Permission: ${currentPermission}`)

    try {
        const registration = await navigator.serviceWorker.ready

        // Check if already subscribed
        let subscription = await registration.pushManager.getSubscription()

        if (subscription) {
            console.log(`Already subscribed!`)
        } else {
            // Permission State
            if (Notification.permission === 'denied') {
                console.log('Notification Permission is DENIED. Go to iPhone Settings > FM Logistics > Notifications and enable it.')
                return
            }

            if (Notification.permission === 'default') {
                console.log('Requesting permission now...')
                const permission = await Notification.requestPermission()
                if (permission !== 'granted') {
                    console.log(`Permission ${permission}. You must allow notifications.`)
                    return
                }
            }

            const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedVapidKey
            })

            console.log(`New subscription created!`)
        }

        // Save to Supabase
        // First, delete any existing subscriptions for this user to avoid duplicates
        const { error: deleteError } = await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', userId)

        if (deleteError) {
            console.log('Note: Could not delete old subscriptions:', deleteError.message)
        }

        // Now insert the new subscription
        const { error } = await supabase
            .from('push_subscriptions')
            .insert({
                user_id: userId,
                endpoint: subscription.endpoint,
                keys: subscription.toJSON().keys,
                user_agent: navigator.userAgent
            })

        if (error) {
            console.error('Supabase DB Error:', error.message)
        } else {
            console.log('✅ Push notifications enabled successfully!')
        }

    } catch (error: any) {
        console.error('Registration Error:', error.message)
    }
}
