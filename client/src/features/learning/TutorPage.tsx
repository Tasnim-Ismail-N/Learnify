import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Brain, Sparkles } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Avatar } from '../../components/ui/Avatar';
import { useAuthStore } from '../../stores/authStore';
import api from '../../lib/axios';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

const SUGGESTED_PROMPTS = ['explain', 'example', 'exercise', 'review'] as const;

export function TutorPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: t('tutor.welcome') },
  ]);
  const [input, setInput] = useState('');
  const [subject, setSubject] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string = input) => {
    if (!text.trim() || isStreaming) return;
    const userMsg: Message = { role: 'user', content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages([...updatedMessages, { role: 'assistant', content: '', streaming: true }]);
    setInput('');
    setIsStreaming(true);

    try {
      const token = localStorage.getItem('learnify-access-token');
      const response = await fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api'}/learn/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          subject: subject || 'General',
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter((l) => l.startsWith('data: '));
          for (const line of lines) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) {
                fullText += data.text;
                setMessages((prev) => {
                  const newMsgs = [...prev];
                  newMsgs[newMsgs.length - 1] = { role: 'assistant', content: fullText, streaming: true };
                  return newMsgs;
                });
              }
              if (data.done) {
                setMessages((prev) => {
                  const newMsgs = [...prev];
                  newMsgs[newMsgs.length - 1] = { role: 'assistant', content: fullText };
                  return newMsgs;
                });
              }
            } catch {
              // skip malformed chunk
            }
          }
        }
      }
    } catch {
      setMessages((prev) => {
        const newMsgs = [...prev];
        newMsgs[newMsgs.length - 1] = { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' };
        return newMsgs;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-800 px-6 py-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-brand-600/15 flex items-center justify-center">
          <Brain className="w-5 h-5 text-brand-400" />
        </div>
        <div>
          <h1 className="font-semibold text-zinc-100">{t('tutor.title')}</h1>
          <p className="text-xs text-zinc-500">Powered by Claude AI</p>
        </div>
        <div className="ml-auto">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={t('tutor.subject')}
            className="px-3 py-1.5 text-sm rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-brand-500 w-40"
          />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {msg.role === 'assistant' ? (
                <div className="w-8 h-8 rounded-xl bg-brand-600/20 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-brand-400" />
                </div>
              ) : (
                user && <Avatar username={user.username} size="sm" />
              )}
              <div
                className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-brand-600 text-white rounded-tr-sm'
                    : 'bg-zinc-800 text-zinc-200 rounded-tl-sm border border-zinc-700'
                }`}
              >
                {msg.content || (msg.streaming && (
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Suggested prompts */}
      {messages.length === 1 && (
        <div className="px-6 pb-2 flex flex-wrap gap-2">
          {SUGGESTED_PROMPTS.map((key) => (
            <button
              key={key}
              onClick={() => sendMessage(t(`tutor.suggestions.${key}`))}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-zinc-800 border border-zinc-700 text-zinc-300 hover:border-brand-500 hover:text-brand-300 transition-all"
            >
              {t(`tutor.suggestions.${key}`)}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-zinc-800 px-6 py-4">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder={t('tutor.placeholder')}
            disabled={isStreaming}
            className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-brand-500 text-sm"
          />
          <Button onClick={() => sendMessage()} disabled={!input.trim() || isStreaming} loading={isStreaming} icon={<Send className="w-4 h-4" />}>
            {t('tutor.send')}
          </Button>
        </div>
      </div>
    </div>
  );
}
