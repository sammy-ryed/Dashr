'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase';

interface Message {
  id: string;
  order_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

interface ChatDrawerProps {
  orderId: string;
  currentUserId: string;
  /** Name of the other party (customer's dasher name or dasher's customer name) */
  otherPartyName: string;
  orderStatus: string;
  /** If true, offset the chat button upward so it doesn't clash with other fixed buttons (e.g. Report button) */
  offsetButton?: boolean;
}

export default function ChatDrawer({ orderId, currentUserId, otherPartyName, orderStatus, offsetButton }: ChatDrawerProps) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const isTerminal = ['delivered', 'cancelled', 'expired'].includes(orderStatus);

  // Load messages
  async function loadMessages() {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });
    setMessages((data as Message[]) || []);
  }

  useEffect(() => {
    loadMessages();

    // Real-time subscription — tear down any existing channel first
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`chat-${orderId}-${currentUserId}`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `order_id=eq.${orderId}`,
        },
        (payload: { new: Message }) => {
          setMessages((prev) => {
            // Deduplicate: don't add if already in state (e.g. optimistic add)
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
          if (payload.new.sender_id !== currentUserId) {
            setUnread((n) => n + 1);
          }
        },
      )
      .subscribe((status: string) => {
        // If subscription fails, fall back to polling every 5s
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[chat] Realtime unavailable, falling back to polling');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  // Scroll to bottom when new messages arrive or drawer opens
  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open, messages.length]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || sending || isTerminal) return;
    setSending(true);
    setError('');

    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, content: text }),
      });
      const data = await res.json();
      if (!data.ok) { setError(data.error || 'Failed to send'); }
      else { setInput(''); }
    } catch { setError('Network error.'); }
    setSending(false);
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  // The chat button sits at bottom-right; if offsetButton is true it sits higher
  // to avoid clashing with a Report button at the default 1.5rem position
  const buttonBottom = offsetButton ? '5.2rem' : '1.5rem';

  return (
    <>
      {/* Floating chat button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open chat"
        style={{
          position: 'fixed', bottom: buttonBottom, right: '1.5rem', zIndex: 200,
          width: '3.2rem', height: '3.2rem',
          background: 'var(--yellow)', color: 'var(--ink)',
          border: '0.18rem solid var(--ink)',
          boxShadow: '0.3rem 0.3rem 0 var(--ink)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.3rem',
          transition: 'transform 0.15s, box-shadow 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0.4rem 0.4rem 0 var(--ink)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0.3rem 0.3rem 0 var(--ink)'; }}
      >
        💬
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: '-0.3rem', right: '-0.3rem',
            background: 'var(--danger)', color: '#fff',
            borderRadius: '50%', width: '1.1rem', height: '1.1rem',
            fontSize: '0.5rem', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '0.1rem solid var(--ink)',
          }}>
            {unread}
          </span>
        )}
      </button>

      {/* Drawer backdrop */}
      {open && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div style={{
        position: 'fixed', bottom: 0, right: 0, zIndex: 301,
        width: 'min(100vw, 22rem)',
        height: open ? 'min(100dvh, 32rem)' : 0,
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        background: 'var(--surf)',
        border: open ? '0.18rem solid var(--yellow)' : 'none',
        borderBottom: 'none',
        boxShadow: open ? '-0.4rem -0.4rem 0 var(--yellow)' : 'none',
        transition: 'height 0.3s cubic-bezier(0.23,1,0.32,1)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.8rem 1rem',
          background: 'var(--yellow)', color: 'var(--ink)',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Chat</div>
            <div style={{ fontFamily: 'var(--font)', fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase' }}>{otherPartyName}</div>
          </div>
          <button
            onClick={() => setOpen(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 700, color: 'var(--ink)', padding: '0.2rem' }}
          >✕</button>
        </div>

        {isTerminal && (
          <div style={{ padding: '0.5rem 1rem', background: '#1a1a1a', fontFamily: 'var(--mono)', fontSize: '0.58rem', color: 'var(--muted)', textAlign: 'center', flexShrink: 0 }}>
            This order is {orderStatus} — chat is read-only.
          </div>
        )}

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: '0.65rem', marginTop: '2rem' }}>
              No messages yet.<br />Say something to your {otherPartyName === 'Dasher' ? 'dasher' : 'customer'}!
            </div>
          )}
          {messages.map((msg) => {
            const isMine = msg.sender_id === currentUserId;
            return (
              <div key={msg.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '78%',
                  background: isMine ? 'var(--yellow)' : 'var(--surf2)',
                  color: isMine ? 'var(--ink)' : 'var(--white)',
                  border: `0.1rem solid ${isMine ? 'var(--ink)' : '#333'}`,
                  padding: '0.5rem 0.7rem',
                  boxShadow: isMine ? '0.15rem 0.15rem 0 var(--ink)' : '0.15rem 0.15rem 0 #333',
                }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '0.72rem', lineHeight: 1.5, wordBreak: 'break-word' }}>
                    {msg.content}
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '0.5rem', marginTop: '0.2rem', opacity: 0.6, textAlign: isMine ? 'right' : 'left' }}>
                    {formatTime(msg.created_at)}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        {!isTerminal && (
          <div style={{ padding: '0.6rem', borderTop: '0.12rem solid #2a2a2a', display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Type a message… (Enter to send)"
              rows={2}
              maxLength={500}
              style={{
                flex: 1, resize: 'none', fontFamily: 'var(--mono)', fontSize: '0.72rem',
                background: 'var(--surf2)', color: 'var(--white)',
                border: '0.12rem solid #333', padding: '0.5rem 0.6rem',
                outline: 'none', lineHeight: 1.5,
              }}
            />
            <button
              onClick={sendMessage}
              disabled={sending || !input.trim()}
              style={{
                background: 'var(--yellow)', color: 'var(--ink)',
                border: '0.14rem solid var(--ink)',
                boxShadow: '0.2rem 0.2rem 0 var(--ink)',
                padding: '0 0.8rem', cursor: 'pointer', fontWeight: 700,
                fontSize: '1rem', alignSelf: 'stretch', flexShrink: 0,
                opacity: (sending || !input.trim()) ? 0.4 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              {sending ? '…' : '→'}
            </button>
          </div>
        )}

        {error && (
          <div style={{ padding: '0.4rem 1rem', background: 'rgba(220,53,69,0.15)', fontFamily: 'var(--mono)', fontSize: '0.6rem', color: 'var(--danger)', flexShrink: 0 }}>
            {error}
          </div>
        )}
      </div>
    </>
  );
}
