import { useState, useEffect, useRef } from "react";
import { Bot, X } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getSafeErrorMessage } from "@/lib/error-utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

type ChatMode = "motivational" | "casual" | "professional";

const FloatingChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<ChatMode>("motivational");
  const [userName, setUserName] = useState<string>("");
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, coaching_mode')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          const name = profile.full_name || 'Friend';
          setUserName(name);
          setMode((profile.coaching_mode as ChatMode) || 'motivational');
          
          const greetings = {
            motivational: `Hey there, ${name}! 👋 I'm your AI Buddy, here to keep you motivated and help you crush those habits! What's on your mind?`,
            casual: `Hey ${name}! 😊 What's up? Ready to chat about whatever's on your mind?`,
            professional: `Hello ${name}. I'm here to provide structured guidance on your goals and habits. How can I assist you today?`
          };
          
          setMessages([{
            role: "assistant",
            content: greetings[profile.coaching_mode as ChatMode] || greetings.motivational,
          }]);
        }
      }
    };
    
    if (isOpen) {
      fetchUserProfile();
    }
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getModePrompt = (mode: ChatMode, name: string) => {
    const namePrefix = name ? `The user's name is ${name}. Use their name naturally in conversation. ` : "";
    switch (mode) {
      case "motivational":
        return namePrefix + "You are an enthusiastic motivational coach helping users achieve their dreams through daily habits. Be highly energetic, inspiring, and use plenty of emojis! Push users to take action and believe in themselves. Keep responses concise and actionable.";
      case "casual":
        return namePrefix + "You are a casual, friendly AI buddy who chats naturally like a good friend. Be relaxed, conversational, and easy-going. Use simple language, occasional emojis, and keep things laid-back while still being helpful. No pressure, just chill vibes.";
      case "professional":
        return namePrefix + "You are a professional life coach providing thoughtful, structured advice on building habits and achieving goals. Be clear, analytical, and focus on actionable strategies and frameworks. Keep responses organized and strategic.";
    }
  };

  const handleModeChange = async (newMode: ChatMode) => {
    setMode(newMode);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase
        .from('profiles')
        .update({ coaching_mode: newMode })
        .eq('id', user.id);
      
      if (error) {
        console.error('Error saving coaching mode:', error);
        toast({
          title: "Note",
          description: "Coaching mode changed for this session",
        });
      } else {
        toast({
          title: "Coaching Mode Saved",
          description: `Switched to ${newMode} mode!`,
        });
      }
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('chat', {
        body: { 
          messages: [
            {
              role: "system",
              content: getModePrompt(mode, userName)
            },
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: "user", content: input }
          ]
        }
      });

      if (error) throw error;

      const aiMessage: Message = {
        role: "assistant",
        content: data.choices[0].message.content,
      };
      
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error: any) {
      console.error('Chat error:', error);
      toast({
        title: "Error",
        description: getSafeErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        size="icon"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg glow-primary z-50 gradient-primary"
      >
        <Bot className="h-6 w-6" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="text-2xl">
              Your <span className="text-gradient">AI Buddy</span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 flex flex-col min-h-0 px-6">
            <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-2">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
                >
                  <div
                    className={`max-w-[80%] p-4 rounded-2xl ${
                      message.role === "user"
                        ? "gradient-primary text-white glow-primary"
                        : "bg-muted border border-border"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start animate-fade-in">
                  <div className="bg-muted border border-border p-4 rounded-2xl">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></span>
                      <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></span>
                      <span className="w-2 h-2 rounded-full bg-primary animate-bounce"></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t pt-4 pb-4 space-y-3 bg-background">
              <div className="flex gap-2">
                <Input
                  placeholder="Type your message..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && !isLoading && sendMessage()}
                  className="bg-background border-border"
                  disabled={isLoading}
                />
                <Button
                  onClick={sendMessage}
                  variant="default"
                  disabled={isLoading}
                  className="shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <Button
                  variant={mode === "motivational" ? "default" : "outline"}
                  onClick={() => handleModeChange("motivational")}
                  size="sm"
                  className="text-xs"
                >
                  💪 Motivational
                </Button>
                <Button
                  variant={mode === "casual" ? "default" : "outline"}
                  onClick={() => handleModeChange("casual")}
                  size="sm"
                  className="text-xs"
                >
                  😎 Casual
                </Button>
                <Button
                  variant={mode === "professional" ? "default" : "outline"}
                  onClick={() => handleModeChange("professional")}
                  size="sm"
                  className="text-xs"
                >
                  👔 Professional
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FloatingChatbot;
