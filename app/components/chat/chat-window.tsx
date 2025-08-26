
"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ModelSelector } from "./model-selector";
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  Brain,
  Settings,
  AlertCircle
} from "lucide-react";
import { Message } from "@/lib/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";

interface ChatWindowProps {
  conversationId: string | null;
  messages: Message[];
  onMessagesUpdate: (messages: Message[]) => void;
  onConversationUpdate: () => void;
}

export function ChatWindow({
  conversationId,
  messages,
  onMessagesUpdate,
  onConversationUpdate,
}: ChatWindowProps) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState("openai/gpt-4o-mini");
  const [chatError, setChatError] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);



  const sendMessage = async () => {
    if (!input.trim() || !conversationId || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);
    setChatError(null);

    try {
      // Add user message to UI immediately
      const newUserMessage: Message = {
        id: `temp-user-${Date.now()}`,
        conversationId,
        role: "user",
        content: userMessage,
        createdAt: new Date(),
      };

      onMessagesUpdate([...messages, newUserMessage]);

      // Save user message to database
      const userResponse = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "user",
          content: userMessage,
        }),
      });

      if (!userResponse.ok) {
        throw new Error("Failed to save user message");
      }

      const savedUserMessage = await userResponse.json();

      // Prepare messages for OpenRouter API
      const conversationMessages = [...messages, savedUserMessage].map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      // Create assistant message placeholder
      const assistantMessage: Message = {
        id: `temp-assistant-${Date.now()}`,
        conversationId,
        role: "assistant",
        content: "",
        modelUsed: selectedModel,
        createdAt: new Date(),
      };

      onMessagesUpdate([...messages, savedUserMessage, assistantMessage]);

      // Stream response from OpenRouter
      const chatResponse = await fetch("/api/openrouter/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: conversationMessages,
          model: selectedModel,
          conversationId,
        }),
      });

      if (!chatResponse.ok) {
        const error = await chatResponse.json();
        throw new Error(error.error || "Failed to get response");
      }

      // Handle streaming response
      const reader = chatResponse.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content || '';
                if (content) {
                  fullResponse += content;
                  
                  // Update assistant message in real-time
                  const updatedAssistantMessage = {
                    ...assistantMessage,
                    content: fullResponse,
                  };
                  
                  onMessagesUpdate([...messages, savedUserMessage, updatedAssistantMessage]);
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      }

      // Save final assistant message to database
      if (fullResponse) {
        const assistantResponse = await fetch(`/api/conversations/${conversationId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: "assistant",
            content: fullResponse,
            modelUsed: selectedModel,
          }),
        });

        if (assistantResponse.ok) {
          const savedAssistantMessage = await assistantResponse.json();
          onMessagesUpdate([...messages, savedUserMessage, savedAssistantMessage]);
          onConversationUpdate();
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setChatError(error instanceof Error ? error.message : "An error occurred");
      // Remove the temporary assistant message on error
      onMessagesUpdate([...messages]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <img src="/NeuroLM_img.png" alt="NeuroLM" className="h-32 w-auto mx-auto mb-6" />
          <h3 className="text-2xl font-semibold mb-2">Welcome to NeuroLM</h3>
          <p className="text-muted-foreground">
            Select a conversation from the sidebar or create a new one to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-screen">
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Brain className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">Chat</h1>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-80">
              <ModelSelector
                selectedModel={selectedModel}
                onModelSelect={setSelectedModel}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4" ref={scrollAreaRef}>
        <div className="py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Start a conversation with NeuroLM
              </p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={message.id}
                className={`flex gap-3 message-animation ${
                  message.role === 'assistant' ? 'justify-start' : 'justify-start'
                }`}
              >
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback>
                    {message.role === 'assistant' ? (
                      <Bot className="h-4 w-4" />
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                  </AvatarFallback>
                </Avatar>
                <Card className={`max-w-[80%] p-4 ${
                  message.role === 'assistant' 
                    ? 'bg-card border-border' 
                    : 'bg-primary text-primary-foreground'
                }`}>
                  <div className="space-y-2">
                    <div className="text-sm font-medium">
                      {message.role === 'assistant' ? 'NeuroLM' : 'You'}
                      {message.modelUsed && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          {message.modelUsed.split('/').pop()}
                        </Badge>
                      )}
                    </div>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                </Card>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <Card className="max-w-[80%] p-4 bg-card border-border">
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">
                    NeuroLM is thinking...
                  </span>
                </div>
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border p-4">
        {chatError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{chatError}</AlertDescription>
          </Alert>
        )}
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Message NeuroLM..."
            className="flex-1 resize-none min-h-[44px] max-h-32"
            disabled={isLoading}
          />
          <Button 
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="self-end"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-xs text-muted-foreground mt-2 text-center">
          NeuroLM can make mistakes. Consider checking important information.
        </div>
      </div>
    </div>
  );
}
