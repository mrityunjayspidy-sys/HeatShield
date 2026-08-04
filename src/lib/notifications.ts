import { LocalNotifications } from '@capacitor/local-notifications';

// ── Permission ────────────────────────────────────────────────────────────────
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display === 'granted') return true;

    const req = await LocalNotifications.requestPermissions();
    return req.display === 'granted';
  } catch (e) {
    console.warn('Notification permission note:', e);
    return false;
  }
}

// ── Hydration Reminders ───────────────────────────────────────────────────────

const HYDRATION_CHANNEL_ID = 'hydration_reminders';
const HYDRATION_NOTIFICATION_BASE_ID = 9000;

/**
 * Schedule repeating hydration reminders.
 * @param intervalMinutes — how often to remind (e.g., 45 minutes)
 * @param dailyGoalMl — daily water goal (e.g., 3000)
 * @param currentMl — current intake so far
 */
export async function scheduleHydrationReminders(
  intervalMinutes: number,
  dailyGoalMl: number,
  currentMl: number,
): Promise<void> {
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return;

  // Cancel any existing reminders first
  await cancelHydrationReminders();

  // Create the notification channel for Android
  try {
    await LocalNotifications.createChannel({
      id: HYDRATION_CHANNEL_ID,
      name: 'Hydration Reminders',
      description: 'Reminders to drink water throughout the day',
      importance: 4, // HIGH
      vibration: true,
      sound: 'default',
    });
  } catch {
    // Channel creation may not be supported on web
  }

  const remaining = Math.max(0, dailyGoalMl - currentMl);
  const glassesLeft = Math.ceil(remaining / 250);

  // Schedule notifications for the next 14 hours (typical waking hours)
  const maxNotifications = Math.min(14, Math.floor((14 * 60) / intervalMinutes));
  const notifications = [];

  for (let i = 1; i <= maxNotifications; i++) {
    const triggerAt = new Date(Date.now() + i * intervalMinutes * 60 * 1000);

    // Don't schedule past 10 PM
    if (triggerAt.getHours() >= 22) break;
    // Don't schedule before 7 AM
    if (triggerAt.getHours() < 7) continue;

    const messages = [
      `💧 Time to hydrate! You have ${glassesLeft} glasses left today.`,
      `🥤 Stay cool! Drink some water — ${remaining}ml to go!`,
      `💦 Water break! Keep your hydration on track.`,
      `🌡️ Heat alert! Drinking water helps regulate your body temperature.`,
      `💧 Your body needs water! ${Math.round((currentMl / dailyGoalMl) * 100)}% of your goal reached.`,
    ];

    notifications.push({
      id: HYDRATION_NOTIFICATION_BASE_ID + i,
      title: 'HeatWatch — Drink Water 💧',
      body: messages[i % messages.length],
      schedule: { at: triggerAt },
      channelId: HYDRATION_CHANNEL_ID,
      smallIcon: 'ic_launcher',
      largeIcon: 'ic_launcher',
    });
  }

  if (notifications.length > 0) {
    await LocalNotifications.schedule({ notifications });
    console.log(`✅ Scheduled ${notifications.length} hydration reminders every ${intervalMinutes}min`);
  }
}

/** Cancel all hydration reminder notifications */
export async function cancelHydrationReminders(): Promise<void> {
  try {
    const pending = await LocalNotifications.getPending();
    const hydrationIds = pending.notifications
      .filter((n) => n.id >= HYDRATION_NOTIFICATION_BASE_ID && n.id < HYDRATION_NOTIFICATION_BASE_ID + 100)
      .map((n) => ({ id: n.id }));

    if (hydrationIds.length > 0) {
      await LocalNotifications.cancel({ notifications: hydrationIds });
    }
  } catch {
    // Silently fail on web
  }
}

/** Send a one-time push notification */
export async function sendLocalNotification(
  title: string,
  body: string,
  id?: number,
): Promise<void> {
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return;

  await LocalNotifications.schedule({
    notifications: [
      {
        id: id ?? Math.floor(Math.random() * 10000),
        title,
        body,
        schedule: { at: new Date(Date.now() + 1000) }, // 1 second from now
        smallIcon: 'ic_launcher',
        largeIcon: 'ic_launcher',
      },
    ],
  });
}
