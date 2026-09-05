import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import GeminiChatView from "../components/GeminiChatView";
import ApiKeyModal from "../components/ApiKeyModal";
import { postChat } from "../api/client";

export default function CopilotApp({
  onReplaySplash = () => {},
  currentUser = null,
  onLogout = () => {},
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Derive unique per-user storage key
  const userKey = (currentUser?.userId || currentUser?.mailId || currentUser?.name || "guest")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_");
  const storageKey = `clearcart_copilot_threads_${userKey}`;

  // Helper to load user-isolated conversation threads
  function loadUserThreads(key) {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        id: `thread-${Date.now()}`,
        title: "Stock & Inventory Analysis",
        messages: [],
        updatedAt: Date.now(),
      },
    ];
  }

  const [threads, setThreads] = useState(() => loadUserThreads(storageKey));
  const [activeThreadId, setActiveThreadId] = useState(() => threads[0]?.id || `thread-${Date.now()}`);

  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  // Reload user's own isolated threads whenever currentUser switches
  useEffect(() => {
    const loaded = loadUserThreads(storageKey);
    setThreads(loaded);
    setActiveThreadId(loaded[0]?.id || `thread-${Date.now()}`);
  }, [storageKey]);

  // Sync threads specifically to this user's storage key
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(threads));
    } catch {}
  }, [threads, storageKey]);

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
        const fallback = {
          id: `thread-${Date.now()}`,
          title: "New Chat",
          messages: [],
          updatedAt: Date.now(),
        };
        setActiveThreadId(fallback.id);
        return [fallback];
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
      id: `msg-${Date.now()}-user`,
      role: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    // Append user message immediately
    setThreads((prev) =>
      prev.map((t) => {
        if (t.id === activeThread.id) {
          const isFirstUserMsg = t.messages.length === 0;
          return {
            ...t,
            title: isFirstUserMsg ? (text.length > 30 ? text.slice(0, 30) + "…" : text) : t.title,
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
        id: `msg-${Date.now()}-bot`,
        role: "assistant",
        text: res.answer,
        status: res.status,
        figures: res.figures || {},
        recommendation: res.recommendation,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
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
    } catch (err) {
      const errMsg = {
        id: `msg-${Date.now()}-err`,
        role: "assistant",
        text: "Could not retrieve real-time retail data. Please ensure the ClearCart server is active and try again.",
        status: "error",
        figures: {},
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setThreads((prev) =>
        prev.map((t) => {
          if (t.id === activeThread.id) {
            return {
              ...t,
              messages: [...t.messages, errMsg],
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
        currentUser={currentUser}
        onLogout={onLogout}
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
          currentUser={currentUser}
          onLogout={onLogout}
        />

        <main className="flex-1 overflow-hidden flex flex-col">
          <GeminiChatView
            messages={activeThread.messages}
            loading={loading}
            onSendMessage={handleSendMessage}
            currentUser={currentUser}
          />
        </main>
      </div>
    </div>
  );
}
