# Mobile Notifications Guide

To receive notifications on your mobile device for FM Logistics, follow these steps.

## Type 1: In-App & Active Tab Notifications (Current Setup)
We have already implemented this.
- **How it works:** If you have the FM Logistics tab open on your phone (even in the background), you will receive a system notification when a job status changes.
- **Requirement:** You MUST click "Allow" when asked for permission.
- **Troubleshooting:**
    - If you didn't see the prompt, go to your browser settings (Chrome/Safari) -> Site Settings -> Notifications -> Allow for this site.
    - **iOS (iPhone/iPad):** Notifications **ONLY** work if you add the app to your Home Screen (see below). Safari does not support notifications for regular tabs.

## Type 2: "App-Like" Experience (Recommended)
To make your website behave like a real app (full screen, separate icon, better notifications), you should install it as a **PWA (Progressive Web App)**.

### For Android (Chrome)
1. Open the website in Chrome.
2. Tap the **Three Dots** menu (top right).
3. Tap **"Install App"** or **"Add to Home Screen"**.
4. Launch the app from your home screen.

### For iOS (iPhone - Safari) - CRITICAL for notifications
1. Open the website in **Safari**.
2. Tap the **Share** button (rectangle with arrow up).
3. Scroll down and tap **"Add to Home Screen"**.
4. Launch the app from the new icon on your home screen.
5. Go to **Settings** -> **Apps** -> **FM Logistics** (or Web Apps) -> **Notifications** -> **Allow Notifications**.

## Type 3: Full Background Push (When App is Closed)
*Current Implementation Status: Pending Backend Integration*

The current system uses "Local Notifications" which work great when the app is "frozen" in the background but the browser is still alive. If you swipe-close the app, you will not receive notifications.

To receive notifications even when the phone is completely locked and the app is closed, we need to implement "Web Push Protocol" with a dedicated Notification Server. This is a complex feature that requires:
1. Generating VAPID Keys.
2. Storing user subscriptions in the database.
3. Setting up a Supabase Edge Function to trigger the push message.

For now, **Type 1 & 2** cover 90% of use cases for logistics drivers who usually keep the app open during their shift.
