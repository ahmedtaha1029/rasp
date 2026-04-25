// src/pages/NotificationsPage.jsx
import { DashboardLayout, PageHeader } from "../components/layout/Sidebar"
import { Card, Badge, Button } from "../components/ui/index"
import { useNotifications } from "../hooks/index"

export default function NotificationsPage() {
  const { notifications, markRead, markAllRead, unreadCount } =
    useNotifications()

  const typeVariant = {
    scenario_assigned: "primary",
    session_completed: "success",
    deadline_reminder: "warning",
    system:            "muted",
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Notifications"
        subtitle={
          unreadCount > 0
            ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
            : "All caught up"
        }
        action={
          unreadCount > 0 ? (
            <Button variant="secondary" size="sm" onClick={markAllRead}>
              Mark all read
            </Button>
          ) : null
        }
      />

      <Card>
        {notifications.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-text-secondary text-sm">No notifications yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`flex items-start gap-4 px-4 py-4 transition-colors cursor-pointer ${
                  !n.is_read
                    ? "bg-primary/5 hover:bg-primary/10"
                    : "hover:bg-surface-2"
                }`}
                onClick={() => !n.is_read && markRead(n.id)}
              >
                {/* Unread indicator */}
                <div
                  className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                    !n.is_read ? "bg-primary" : "bg-surface-3"
                  }`}
                />

                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm leading-relaxed ${
                      !n.is_read
                        ? "text-text-primary font-medium"
                        : "text-text-secondary"
                    }`}
                  >
                    {n.message}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <Badge
                      variant={
                        typeVariant[n.notification_type] || "muted"
                      }
                    >
                      {n.notification_type_display}
                    </Badge>
                    {n.scenario_title && (
                      <span className="text-2xs text-text-muted font-mono">
                        {n.scenario_title}
                      </span>
                    )}
                    <span className="text-2xs text-text-muted ml-auto">
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </DashboardLayout>
  )
}
