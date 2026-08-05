import { LocalNotifications } from '@capacitor/local-notifications';

// ── Permission ────────────────────────────────────────────────────────────────
// ── Permission ────────────────────────────────────────────────────────────────
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    // Try Capacitor LocalNotifications first
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display === 'granted') return true;

    const req = await LocalNotifications.requestPermissions();
    if (req.display === 'granted') return true;
  } catch {
    // Fall back to Web Notification API
  }

  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') return true;
    if (Notification.permission !== 'denied') {
      const res = await Notification.requestPermission();
      return res === 'granted';
    }
  }

  return false;
}

// ── Hydration Reminders ───────────────────────────────────────────────────────

const HYDRATION_CHANNEL_ID = 'hydration_reminders';
const HYDRATION_NOTIFICATION_BASE_ID = 9000;

/**
 * Schedule repeating hydration reminders.
 * @param intervalMinutes — how often to remind (e.g., 45 minutes)
 * @param dailyGoalMl — daily water goal (e.g., 3000)
 * @param currentMl — current intake so far
 * @param weatherTempC — optional live weather temperature
 * @param heatTier — optional heat risk tier
 */
export async function scheduleHydrationReminders(
  intervalMinutes: number,
  dailyGoalMl: number,
  currentMl: number,
  weatherTempC?: number,
  heatTier?: string,
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
  const tempStr = weatherTempC ? `${weatherTempC.toFixed(0)}°C` : 'current';

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
      `Weather Hydration Alert (${tempStr}): Drink 250ml water now! ${glassesLeft} glasses left today.`,
      `Stay cool in ${tempStr} heat! Drink water — ${remaining}ml left for your goal.`,
      `Water Break: Heat index requires steady hydration.`,
      `${heatTier ? heatTier.toUpperCase() + ' risk' : 'Heat Risk'}: Drink water to regulate body temperature in ${tempStr} weather.`,
      `Hydration Check: ${Math.round((currentMl / dailyGoalMl) * 100)}% of your target reached today.`,
    ];

    notifications.push({
      id: HYDRATION_NOTIFICATION_BASE_ID + i,
      title: `HeatWatch — Drink Water (${tempStr})`,
      body: messages[i % messages.length],
      schedule: { at: triggerAt },
      channelId: HYDRATION_CHANNEL_ID,
      smallIcon: 'ic_launcher',
      largeIcon: 'ic_launcher',
    });
  }

  if (notifications.length > 0) {
    try {
      await LocalNotifications.schedule({ notifications });
      console.log(`Scheduled ${notifications.length} weather hydration reminders every ${intervalMinutes}min`);
    } catch (e) {
      console.warn('Native notification schedule note:', e);
    }
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

  try {
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
  } catch {
    // Web fallback if Capacitor plugin is unavailable or fails
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  }
}

