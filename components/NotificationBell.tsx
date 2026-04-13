'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { getUserSafe } from '@/lib/auth';
import type { NotificationItem } from '@/types';
import styles from './NotificationBell.module.css';

const MAX_NOTIFICATIONS = 20;
const FALLBACK_POLL_INTERVAL = 30_000; // 30 seconds if realtime fails

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.floor(ms / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationBell() {
  const supabase = createClient();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const fallbackPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState(false);

  const loadForUser = useCallback(async (targetUserId: string) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, user_id, order_id, kind, title, message, payload, is_read, created_at')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(MAX_NOTIFICATIONS);

      if (error) {
        console.error('[NotificationBell] Query error:', error);
        return;
      }

      setNotifications((data as NotificationItem[]) || []);
    } catch (err) {
      console.error('[NotificationBell] Unexpected error loading notifications:', err);
    }
  }, [supabase]);

  // Initial load and auth check
  useEffect(() => {
    let active = true;

    async function init() {
      const user = await getUserSafe(supabase);
      if (!active) return;

      if (!user) {
        setLoading(false);
        return;
      }

      setUserId(user.id);
      await loadForUser(user.id);
      if (!active) return;
      setLoading(false);
    }

    init();

    return () => {
      active = false;
    };
  }, [loadForUser, supabase]);

  // Realtime subscription with error handling and fallback
  useEffect(() => {
    if (!userId) return;

    let isActive = true;

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          if (isActive && userId) {
            loadForUser(userId);
          }
        },
      )
      .subscribe(
        async (status: string) => {
          if (!isActive) return;

          if (status === 'SUBSCRIBED') {
            setSubscriptionError(false);
            // Clear any fallback polling since realtime is working
            if (fallbackPollRef.current) {
              clearInterval(fallbackPollRef.current);
              fallbackPollRef.current = null;
            }
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setSubscriptionError(true);
            // Activate fallback polling only once
            if (!fallbackPollRef.current) {
              fallbackPollRef.current = setInterval(() => {
                if (isActive && userId) {
                  loadForUser(userId);
                }
              }, FALLBACK_POLL_INTERVAL);
            }
          }
        },
        () => {
          if (!isActive) return;
          setSubscriptionError(true);
          // Activate fallback polling on subscription error
          if (!fallbackPollRef.current) {
            fallbackPollRef.current = setInterval(() => {
              if (isActive && userId) {
                loadForUser(userId);
              }
            }, FALLBACK_POLL_INTERVAL);
          }
        },
      );

    subscriptionRef.current = channel;

    return () => {
      isActive = false;
      supabase.removeChannel(channel);
      if (fallbackPollRef.current) {
        clearInterval(fallbackPollRef.current);
        fallbackPollRef.current = null;
      }
    };
  }, [loadForUser, userId, supabase]);

  // Outside click handler
  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const unreadCount = useMemo(
    () => notifications.reduce((acc, n) => acc + (n.is_read ? 0 : 1), 0),
    [notifications],
  );

  async function markAllRead() {
    if (!userId || unreadCount === 0) return;

    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('[NotificationBell] Error marking all as read:', err);
    }
  }

  async function markOneRead(notificationId: string) {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n)));
    } catch (err) {
      console.error('[NotificationBell] Error marking one as read:', err);
    }
  }

  if (loading || !userId) {
    return null;
  }

  return (
    <div ref={rootRef} className={styles.container}>
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        aria-label="Notifications"
        className={styles.button}
        title={
          subscriptionError
            ? 'Notifications (connection issue, using fallback)'
            : unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
              : 'Notifications'
        }
        data-error={subscriptionError ? 'true' : undefined}
      >
        <span className={styles.label}>NOTIF</span>
        {subscriptionError && <span className={styles.errorDot} aria-label="Connection issue" />}
        {unreadCount > 0 && !subscriptionError && (
          <span className={styles.badge} aria-label={`${unreadCount} unread`}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className={styles.panel}>
          <div className={styles.header}>
            <span className={styles.title}>Notifications</span>
            {subscriptionError && (
              <span className={styles.errorMsg} title="Using fallback polling every 30 seconds">
                Connection issue
              </span>
            )}
            <button
              type="button"
              onClick={markAllRead}
              disabled={unreadCount === 0}
              className={styles.markAllBtn}
            >
              Mark all read
            </button>
          </div>

          {notifications.length === 0 ? (
            <div className={styles.empty}>No notifications yet.</div>
          ) : (
            <div className={styles.list}>
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`${styles.notification} ${!n.is_read ? styles.unread : ''}`}
                >
                  <div className={styles.notificationHeader}>
                    <div className={styles.notificationTitle}>{n.title}</div>
                    <div className={styles.notificationTime}>{timeAgo(n.created_at)}</div>
                  </div>
                  <div className={styles.notificationMessage}>
                    {n.message}
                  </div>

                  {!n.is_read && (
                    <button
                      type="button"
                      onClick={() => markOneRead(n.id)}
                      className={styles.markReadBtn}
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
