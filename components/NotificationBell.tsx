'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase';
import type { NotificationItem } from '@/types';

const MAX_NOTIFICATIONS = 20;

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

  const [userId, setUserId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const loadForUser = useCallback(async (targetUserId: string) => {
    const { data } = await supabase
      .from('notifications')
      .select('id, user_id, order_id, kind, title, message, payload, is_read, created_at')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false })
      .limit(MAX_NOTIFICATIONS);

    setNotifications((data as NotificationItem[]) || []);
  }, [supabase]);

  useEffect(() => {
    let active = true;

    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
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

  useEffect(() => {
    if (!userId) return;

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
          loadForUser(userId);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadForUser, userId, supabase]);

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

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  async function markOneRead(notificationId: string) {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n)));
  }

  if (loading || !userId) {
    return null;
  }

  return (
    <div ref={rootRef} style={{ position: 'relative', marginRight: '0.5rem' }}>
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        aria-label="Notifications"
        style={{
          height: '2.4rem',
          minWidth: '2.4rem',
          border: '0.12rem solid #2a2a2a',
          background: 'var(--surf)',
          color: 'var(--white)',
          cursor: 'pointer',
          position: 'relative',
          fontFamily: 'var(--mono)',
          fontSize: '0.8rem',
        }}
      >
        NOTIF
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              right: '-0.35rem',
              top: '-0.35rem',
              minWidth: '1.1rem',
              height: '1.1rem',
              borderRadius: '999px',
              background: 'var(--red)',
              color: '#fff',
              fontSize: '0.6rem',
              display: 'grid',
              placeItems: 'center',
              padding: '0 0.2rem',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '2.8rem',
            width: 'min(28rem, 88vw)',
            maxHeight: '70vh',
            overflow: 'auto',
            zIndex: 120,
            background: 'var(--surface, #101010)',
            border: '0.14rem solid #2a2a2a',
            boxShadow: '0 0.7rem 1.6rem rgba(0,0,0,0.35)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.8rem 0.9rem',
              borderBottom: '0.08rem solid #2a2a2a',
            }}
          >
            <div style={{ fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--yellow)' }}>
              Notifications
            </div>
            <button
              type="button"
              onClick={markAllRead}
              disabled={unreadCount === 0}
              style={{
                background: 'transparent',
                border: 'none',
                color: unreadCount === 0 ? 'var(--muted)' : 'var(--yellow)',
                fontFamily: 'var(--mono)',
                fontSize: '0.62rem',
                cursor: unreadCount === 0 ? 'default' : 'pointer',
              }}
            >
              Mark all read
            </button>
          </div>

          {notifications.length === 0 ? (
            <div style={{ padding: '1rem', color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: '0.68rem' }}>
              No notifications yet.
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                style={{
                  padding: '0.85rem 0.9rem',
                  borderBottom: '0.06rem solid #222',
                  background: n.is_read ? 'transparent' : 'rgba(233,181,11,0.08)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.6rem', alignItems: 'center' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '0.68rem', color: 'var(--white)' }}>{n.title}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '0.56rem', color: 'var(--muted)' }}>{timeAgo(n.created_at)}</div>
                </div>
                <div style={{ marginTop: '0.35rem', fontFamily: 'var(--mono)', fontSize: '0.62rem', color: '#c8c8c8' }}>
                  {n.message}
                </div>

                {!n.is_read && (
                  <button
                    type="button"
                    onClick={() => markOneRead(n.id)}
                    style={{
                      marginTop: '0.5rem',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--yellow)',
                      fontFamily: 'var(--mono)',
                      fontSize: '0.58rem',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    Mark read
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
