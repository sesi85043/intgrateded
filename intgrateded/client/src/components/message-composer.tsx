import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Send, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MessageComposerProps {
  conversationId: string;
  disabled?: boolean;
  onMessageSent?: () => void;
}

export default function MessageComposer({ 
  conversationId, 
  disabled = false,
  onMessageSent 
}: MessageComposerProps) {
  const [content, setContent] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const sendMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/chatwoot/conversations/${conversationId}/messages`, {
        content,
        isPrivate,
      });
    },
    onSuccess: () => {
      setContent("");
      setIsPrivate(false);
      toast({
        title: "Success",
        description: "Message sent successfully",
      });
      // Invalidate the conversation query to refresh messages
      queryClient.invalidateQueries({
        queryKey: [`/api/chatwoot/conversations/${conversationId}`],
      });
      onMessageSent?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const handleSend = () => {
    if (!content.trim()) {
      toast({
        title: "Error",
        description: "Message cannot be empty",
        variant: "destructive",
      });
      return;
    }

    sendMutation.mutate();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="space-y-3 border-t pt-4">
      {/* Message Input */}
      <div className="relative">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message here... (Ctrl+Enter to send)"
          disabled={disabled || sendMutation.isPending}
          className="min-h-[100px] resize-none"
        />
        {sendMutation.error && (
          <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            Failed to send message
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Private Message Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={isPrivate ? "default" : "outline"}
                size="sm"
                onClick={() => setIsPrivate(!isPrivate)}
                disabled={disabled || sendMutation.isPending}
                className="gap-2"
              >
                {isPrivate ? (
                  <>
                    <Eye className="h-4 w-4" />
                    Private
                  </>
                ) : (
                  <>
                    <EyeOff className="h-4 w-4" />
                    Public
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isPrivate
                ? "Private messages are only visible to agents"
                : "Public messages are visible to the customer"}
            </TooltipContent>
          </Tooltip>

          {/* Character Count */}
          <span className="text-xs text-muted-foreground">
            {content.length} characters
          </span>
        </div>

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={disabled || sendMutation.isPending || !content.trim()}
          size="sm"
          className="gap-2"
        >
          {sendMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Send
            </>
          )}
        </Button>
      </div>

      {/* Help Text */}
      <p className="text-xs text-muted-foreground">
        Tip: Press <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">Ctrl+Enter</kbd> to send quickly
      </p>
    </div>
  );
}
