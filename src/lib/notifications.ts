import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { EventWithStats, UpcomingDeadline } from '@/lib/storage';

const CHANNEL_ID = 'boothbuddy-reminders';

// Local-only reminders (no push server, no backend job — everything here
// runs on-device and gets rescheduled from scratch whenever the app opens;
// see the call site in (tabs)/_layout.tsx). Native only: browsers need a
// completely different permission/scheduling model (service workers) for
// notifications, which is out of scope for a $0, no-backend feature.
export function notificationsSupported(): boolean {
  return Platform.OS !== 'web';
}

async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Reminders',
    importance: Notifications.AndroidImportance.HIGH,
  });
}

// On Android 13+, the permission prompt won't appear until a channel
// exists, so the channel is created before requesting.
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  await ensureChannel();
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

function atTime(date: Date, hour: number, minute: number): Date {
  const result = new Date(date);
  result.setHours(hour, minute, 0, 0);
  return result;
}

async function scheduleIfFuture(title: string, body: string, date: Date) {
  if (date.getTime() <= Date.now()) return;
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
  });
}

// Re-derives every reminder from current data and replaces whatever was
// scheduled before — simpler and more correct than trying to track
// individual notification ids as jobs/events are edited or deleted, at the
// cost of only staying accurate when the app is actually opened (there's
// no background sync on a $0, client-only project).
export async function resyncReminders(
  events: EventWithStats[],
  deadlines: UpcomingDeadline[],
): Promise<void> {
  if (!notificationsSupported()) return;
  const granted = await ensureNotificationPermission();
  if (!granted) return;

  await Notifications.cancelAllScheduledNotificationsAsync();

  for (const event of events) {
    if (event.contactCount === 0) continue;
    const eventDate = new Date(`${event.date}T00:00:00`);
    if (Number.isNaN(eventDate.getTime())) continue;
    await scheduleIfFuture(
      event.name,
      `You met ${event.contactCount} ${event.contactCount === 1 ? 'person' : 'people'}. Do your follow-ups.`,
      atTime(eventDate, 20, 0),
    );
  }

  for (const job of deadlines) {
    if (!job.deadline) continue;
    const dueDate = new Date(job.deadline);
    if (Number.isNaN(dueDate.getTime())) continue; // free-text deadlines like "rolling" can't be scheduled

    const dayBefore = new Date(dueDate);
    dayBefore.setDate(dayBefore.getDate() - 1);
    const label = `${job.title} — ${job.contactName}`;

    await scheduleIfFuture('Application due tomorrow', label, atTime(dayBefore, 18, 0));
    await scheduleIfFuture('Application due today', label, atTime(dueDate, 9, 0));
  }
}
