import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../hooks/useToast.js';
import notificationService from '../../services/notificationService.js';
import SampleDataBadge from '../../components/common/SampleDataBadge.jsx';
import Button from '../../components/common/Button.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { Bell, Check, Sparkles, Inbox, ShieldCheck } from 'lucide-react';

export function InstitutionNotificationsPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadNotifs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await notificationService.getUserNotifications(user?.id);
      setNotifications(data);
    } catch (err) {
      console.error('Failed to load institution notifications:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifs();
  }, [user?.id]);

  const handleMarkRead = async (id) => {
    await notificationService.markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleMarkAllRead = async () => {
    await notificationService.markAllAsRead(user?.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success('All notifications marked as read.');
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-sand-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-terracotta-800 bg-terracotta-50 px-2.5 py-0.5 rounded-md border border-terracotta-200">
              Institutional Alerts
            </span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-charcoal-900">
            Institution Alerts ({unreadCount} unread)
          </h1>
          <p className="text-sm text-charcoal-600 mt-1">
            Pledge notifications, prototype review standing updates, and logistics status changes.
          </p>
        </div>

        {unreadCount > 0 && (
          <Button variant="secondary" size="sm" icon={Check} onClick={handleMarkAllRead}>
            Mark All as Read
          </Button>
        )}
      </div>

      {error ? (
        <ErrorState
          title="Failed to Load Notifications"
          message={error}
          onRetry={loadNotifs}
        />
      ) : loading ? (
        <div className="py-20 text-center space-y-3 bg-white rounded-3xl border border-sand-200">
          <div className="w-8 h-8 border-2 border-sage-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-charcoal-500">Loading alerts...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-sand-200 p-8 space-y-3 shadow-soft-sm">
          <Bell className="w-10 h-10 text-charcoal-400 mx-auto" />
          <h3 className="font-serif text-xl font-bold text-charcoal-900">
            No institutional alerts
          </h3>
          <p className="text-xs text-charcoal-500 max-w-sm mx-auto">
            You will be alerted when donors reserve matching deliveries for your open needs.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const Icon =
              n.type === 'verification'
                ? ShieldCheck
                : n.type === 'match'
                ? Sparkles
                : Inbox;

            return (
              <div
                key={n.id}
                onClick={() => !n.read && handleMarkRead(n.id)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 ${
                  n.read
                    ? 'bg-white/70 border-sand-200 text-charcoal-700'
                    : 'bg-white border-terracotta-300 ring-1 ring-terracotta-100 shadow-soft-sm'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    n.read ? 'bg-sand-100 text-charcoal-500' : 'bg-terracotta-100 text-terracotta-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <p className={`text-sm font-semibold ${n.read ? 'text-charcoal-800' : 'text-charcoal-900'}`}>
                        {n.title}
                      </p>
                      {n.isSample && <SampleDataBadge />}
                    </div>
                    <span className="text-[11px] text-charcoal-400">
                      {new Date(n.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-xs text-charcoal-600 leading-relaxed">{n.message}</p>
                </div>

                {!n.read && (
                  <span
                    className="w-2.5 h-2.5 rounded-full bg-terracotta-500 flex-shrink-0 mt-2"
                    title="Unread alert"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default InstitutionNotificationsPage;
