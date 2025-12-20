import React from "react";
import { Database, MessageCircle, Zap, Mail } from "lucide-react";

type PlatformKey = "metabase" | "chatwoot" | "typebot" | "mailcow";

const platformMap: Record<
  PlatformKey,
  { label: string; color: string; Icon: any }
> = {
  metabase: { label: "Metabase", color: "bg-purple-600", Icon: Database },
  chatwoot: { label: "Chatwoot", color: "bg-green-600", Icon: MessageCircle },
  typebot: { label: "Typebot", color: "bg-indigo-600", Icon: Zap },
  mailcow: { label: "Mailcow", color: "bg-amber-500", Icon: Mail },
};

export default function PlatformBadge({
  platform,
  small,
}: {
  platform: PlatformKey | string;
  small?: boolean;
}) {
  const key = (platform || "").toLowerCase() as PlatformKey;
  const info = (platformMap as any)[key] || { label: platform || "Unknown", color: "bg-gray-500", Icon: Database };

  return (
    <div className={`inline-flex items-center space-x-2 rounded-full text-xs text-white ${small ? "px-1 py-0" : "px-2 py-0.5"}`}>
      <span className={`${info.color} inline-flex items-center justify-center rounded-full w-5 h-5`}> 
        <info.Icon className="w-3 h-3" />
      </span>
      {!small && <span className="font-medium text-[0.75rem]">{info.label}</span>}
    </div>
  );
}
