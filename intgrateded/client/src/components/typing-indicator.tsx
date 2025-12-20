import { MessageCircle } from "lucide-react";

interface TypingIndicatorProps {
  agentName?: string;
}

export default function TypingIndicator({ agentName = "Agent" }: TypingIndicatorProps) {
  return (
    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
      <MessageCircle className="h-4 w-4 text-muted-foreground animate-pulse" />
      <span className="text-sm text-muted-foreground">
        {agentName} is typing
        <span className="inline-block ml-1">
          <span className="animate-bounce inline-block">.</span>
          <span className="animate-bounce inline-block" style={{ animationDelay: "0.1s" }}>.</span>
          <span className="animate-bounce inline-block" style={{ animationDelay: "0.2s" }}>.</span>
        </span>
      </span>
    </div>
  );
}
