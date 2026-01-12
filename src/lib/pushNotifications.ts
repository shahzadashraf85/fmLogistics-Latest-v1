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
        alert('Push NOT supported on this browser/device')
        return
    }

    if (!VAPID_PUBLIC_KEY) {
        alert('Error: VAPID Public Key is MISSING in environment variables')
        return
    }

    // Check current permission state
    const currentPermission = Notification.permission
    alert(`Current Permission: ${currentPermission}\n\nIf this says "denied", go to iPhone Settings > FM Logistics > Notifications and turn it ON.`)

    try {
        const registration = await navigator.serviceWorker.ready

        // Check if already subscribed
        let subscription = await registration.pushManager.getSubscription()

        if (subscription) {
            alert(`Already subscribed!\nEndpoint: ${subscription.endpoint.substring(0, 50)}...`)
        } else {
            // Permission State
            if (Notification.permission === 'denied') {
                alert('Notification Permission is DENIED. Go to iPhone Settings > FM Logistics > Notifications and enable it.')
                return
            }

            if (Notification.permission === 'default') {
                alert('Requesting permission now...')
                const permission = await Notification.requestPermission()
                if (permission !== 'granted') {
                    alert(`Permission ${permission}. You must allow notifications.`)
                    return
                }
            }

            const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedVapidKey
            })

            alert(`New subscription created!\nEndpoint: ${subscription.endpoint.substring(0, 50)}...`)
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
            alert('Supabase DB Error: ' + error.message)
        } else {
            alert('✅ SUCCESS! Push subscription saved to database. Try the Test Notification button now.')
        }

    } catch (error: any) {
        alert('Registration Error: ' + error.message)
    }
}
