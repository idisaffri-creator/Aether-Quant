import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, X, MessageSquare } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export function AgentChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Welcome to Aether Energy. I'm your AI trading assistant. How can I help you today?",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;

    const userMsg: Message = { role: "user", content: input.trim(), timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    setTimeout(() => {
      const lower = userMsg.content.toLowerCase();
      let response = "";

      if (lower.includes("agent") || lower.includes("status")) {
        response = "I can see the agent system status. Would you like me to start or stop any specific agent?";
      } else if (lower.includes("wti") || lower.includes("crude")) {
        response = "WTI Crude is currently trading with above-average volume. Key support at $77.50, resistance at $79.20.";
      } else if (lower.includes("risk") || lower.includes("portfolio")) {
        response = "Your portfolio risk metrics are within acceptable parameters. All positions have active stop-losses.";
      } else {
        response = "I understand your request. I'm processing the market data and will have analysis ready shortly. Is there anything specific about your portfolio or trading strategy you'd like to discuss?";
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response, timestamp: new Date().toISOString() },
      ]);
      setSending(false);
    }, 800);
  };

  return (
    <>
      {/* FAB */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full btn-amber flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      )}

      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-96 h-[600px] glass-card rounded-2xl border border-border flex flex-col shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-card">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-amber" />
              </div>
              <div>
                <div className="text-sm font-semibold">Aether AI</div>
                <div className="text-[10px] text-green-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  Online
                </div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-accent transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
                {msg.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full bg-amber/20 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-3 h-3 text-amber" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] p-3 rounded-xl text-xs leading-relaxed ${
                    msg.role === "user"
                      ? "bg-amber text-black rounded-tr-sm"
                      : "bg-accent/50 rounded-tl-sm"
                  }`}
                >
                  {msg.content.split("\n").map((line, j) => (
                    <span key={j}>
                      {line}
                      {j < msg.content.split("\n").length - 1 && <br />}
                    </span>
                  ))}
                </div>
                {msg.role === "user" && (
                  <div className="w-6 h-6 rounded-full bg-amber flex items-center justify-center shrink-0 mt-1">
                    <User className="w-3 h-3 text-black" />
                  </div>
                )}
              </div>
            ))}
            {sending && (
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-amber/20 flex items-center justify-center">
                  <Bot className="w-3 h-3 text-amber" />
                </div>
                <div className="bg-accent/50 rounded-xl rounded-tl-sm p-3">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" />
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0.1s" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0.2s" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Ask Aether AI..."
                className="flex-1 px-3 py-2 rounded-lg bg-accent/50 border border-border text-xs focus:outline-none focus:border-amber/50"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || sending}
                className="p-2 rounded-lg btn-amber disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
