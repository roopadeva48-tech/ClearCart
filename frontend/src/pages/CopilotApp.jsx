import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import GeminiChatView from "../components/GeminiChatView";
import { postChat } from "../api/client";

const STORAGE_KEY = "clearcart_copilot_threads_v1";

export default function CopilotApp({ onReplaySplash = () => {} }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [threads, setThreads] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        id: "thread-default",
        title: "Stock & Inventory Analysis",
        messages: [],
        updatedAt: Date.now(),
      },
    ];
  });

  const [activeThreadId, setActiveThreadId] = useState(() => {
    return threads[0]?.id || "thread-default";
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  // Sync threads to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
    } catch {}
  }, [threads]);

  const activeThread = threads.find((t) => t.id === activeThreadId) || threads[0] || {
    id: "thread-default",
    title: "New Chat",
    messages: [],
  };

  function handleNewChat() {
    const newId = `thread-${Date.now()}`;
    const newThread = {
      id: newId,
      title: "New Chat",
      messages: [],
      updatedAt: Date.now(),
    };
    setThreads((prev) => [newThread, ...prev]);
    setActiveThreadId(newId);
  }

  function handleSelectThread(id) {
    setActiveThreadId(id);
  }

  function handleDeleteThread(id) {
    setThreads((prev) => {
      const filtered = prev.filter((t) => t.id !== id);
      if (filtered.length === 0) {
        const fresh = {
          id: `thread-${Date.now()}`,
          title: "New Chat",
          messages: [],
          updatedAt: Date.now(),
        };
        setActiveThreadId(fresh.id);
        return [fresh];
      }
      if (activeThreadId === id) {
        setActiveThreadId(filtered[0].id);
      }
      return filtered;
    });
  }

  async function handleSendMessage(text) {
    if (!text.trim() || loading) return;

    const userMsg = {
      role: "user",
      text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    // Update thread title if it's the first user message
    const isFirst = activeThread.messages.length === 0;
    const newTitle = isFirst ? (text.length > 28 ? `${text.slice(0, 28)}…` : text) : activeThread.title;

    setThreads((prev) =>
      prev.map((t) => {
        if (t.id === activeThread.id) {
          return {
            ...t,
            title: newTitle,
            messages: [...t.messages, userMsg],
            updatedAt: Date.now(),
          };
        }
        return t;
      })
    );

    setLoading(true);

    try {
      const res = await postChat(text);
      const botMsg = {
        role: "bot",
        text: res.answer,
        status: res.status,
        figures: res.figures,
        intent: res.intent,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setThreads((prev) =>
        prev.map((t) => {
          if (t.id === activeThread.id) {
            return {
              ...t,
              messages: [...t.messages, botMsg],
              updatedAt: Date.now(),
            };
          }
          return t;
        })
      );
    } catch {
      const errorMsg = {
        role: "bot",
        text: "Could not reach the ClearCart backend. Please ensure `python app.py` is running on port 8000.",
        status: "error",
        figures: {},
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setThreads((prev) =>
        prev.map((t) => {
          if (t.id === activeThread.id) {
            return {
              ...t,
              messages: [...t.messages, errorMsg],
              updatedAt: Date.now(),
            };
          }
          return t;
        })
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSearchSubmit(query) {
    if (!query.trim()) return;
    setSearchQuery("");
    handleSendMessage(query);
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-canvas font-sans">
      {/* Gemini-Style Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        threads={threads}
        activeThreadId={activeThread.id}
        onSelectThread={handleSelectThread}
        onNewChat={handleNewChat}
        onDeleteThread={handleDeleteThread}
        onQuickPrompt={handleSendMessage}
      />

      {/* Main Chat Workspace */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchSubmit={handleSearchSubmit}
          onReplaySplash={onReplaySplash}
        />

        <main className="flex-1 overflow-hidden flex flex-col">
          <GeminiChatView
            messages={activeThread.messages}
            loading={loading}
            onSendMessage={handleSendMessage}
          />
        </main>
      </div>
    </div>
  );
}
