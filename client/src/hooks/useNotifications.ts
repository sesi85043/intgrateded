import { useEffect, useState } from "react";

export function useNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isGranted, setIsGranted] = useState(false);

  useEffect(() => {
    // Check if browser supports notifications
    if ("Notification" in window) {
      setIsSupported(true);
      if (Notification.permission === "granted") {
        setIsGranted(true);
      }
    }
  }, []);

  const requestPermission = async () => {
    if (!isSupported) return;

    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setIsGranted(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to request notification permission:", error);
      return false;
    }
  };

  const sendNotification = (title: string, options?: NotificationOptions) => {
    if (!isSupported || !isGranted) {
      console.warn("Notifications not supported or not granted");
      return;
    }

    try {
      new Notification(title, {
        icon: "/logo.png",
        badge: "/logo.png",
        ...options,
      });
    } catch (error) {
      console.error("Failed to send notification:", error);
    }
  };

  return {
    isSupported,
    isGranted,
    requestPermission,
    sendNotification,
  };
}
