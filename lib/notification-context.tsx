import React, { createContext, useCallback, useState } from "react";

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "success" | "info" | "warning" | "error";
  duration?: number;
}

interface NotificationContextType {
  showNotification: (notification: Omit<Notification, "id">) => void;
  hideNotification: (id: string) => void;
  notifications: Notification[];
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = useCallback((notification: Omit<Notification, "id">) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newNotification: Notification = {
      ...notification,
      id,
    };

    setNotifications((prev) => [...prev, newNotification]);

    // Auto remove after duration
    if (notification.duration !== 0) {
      const timer = setTimeout(() => {
        hideNotification(id);
      }, notification.duration || 4000);

      return () => clearTimeout(timer);
    }
  }, []);

  const hideNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification, hideNotification, notifications }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = React.useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within NotificationProvider");
  }
  return context;
}
