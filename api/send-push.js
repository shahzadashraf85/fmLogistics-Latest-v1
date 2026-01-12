
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

export default async function handler(req, res) {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const { title, body, url } = req.body

    if (!title || !body) {
        return res.status(400).json({ error: 'Missing title or body' })
    }

    // Init Supabase (Service Role to read all subscriptions)
    const supabaseUrl = process.env.VITE_SUPABASE_URL
    // IMPORTANT: You need to add VITE_SUPABASE_SERVICE_ROLE_KEY to your Vercel Environment Variables
    // We cannot use the Anon key because RLS might block reading other users' subscriptions
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error("Missing Backend Environment Variables")
        return res.status(500).json({ error: 'Server Configuration Error' })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Configure Web Push
    const vapidPublicKey = process.env.VITE_VAPID_PUBLIC_KEY
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
    const vapidMailto = process.env.VAPID_MAILTO || 'mailto:admin@example.com'

    if (!vapidPublicKey || !vapidPrivateKey) {
        console.error("Missing VAPID Keys")
        return res.status(500).json({ error: 'Push Configuration Error' })
    }

    webpush.setVapidDetails(vapidMailto, vapidPublicKey, vapidPrivateKey)

    try {
        // 1. Get all subscriptions
        const { data: subscriptions, error } = await supabase
            .from('push_subscriptions')
            .select('*')

        if (error) throw error

        // 2. Send Notifications
        const promises = subscriptions.map((sub) => {
            const pushSubscription = {
                endpoint: sub.endpoint,
                keys: sub.keys,
            }

            const payload = JSON.stringify({
                title,
                body,
                url,
            })

            return webpush.sendNotification(pushSubscription, payload).catch((err) => {
                if (err.statusCode === 410 || err.statusCode === 404) {
                    // Subscription/Endpoint is gone, delete it
                    console.log(`Subscription gone, deleting: ${sub.id}`)
                    supabase.from('push_subscriptions').delete().eq('id', sub.id).then()
                } else {
                    console.error('Error sending push:', err)
                }
                throw err; // Re-throw to be caught by Promise.allSettled as rejected
            })
        })

        const results = await Promise.allSettled(promises)
        const successCount = results.filter(r => r.status === 'fulfilled').length
        const failures = results.filter(r => r.status === 'rejected').map(r => r.reason.message)

        return res.status(200).json({
            success: true,
            total: subscriptions.length,
            sent: successCount,
            failures: failures
        })
    } catch (err) {
        console.error('Error in push handler:', err)
        return res.status(500).json({ error: err.message, stack: err.stack })
    }
}
