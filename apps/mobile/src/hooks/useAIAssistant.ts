/**
 * useAIAssistant Hook
 * Manages AI-assisted interview flow for memoir writing
 * Based on webapp's AIAssistant.jsx pattern
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export type Phase = 'start' | 'interview' | 'ready' | 'writing' | 'review';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface GatheredContent {
  type: 'existing' | 'response';
  content: string;
}

interface QuestionContext {
  chapterId: string;
  question: {
    id: string;
    question: string;
    prompt?: string;
  };
  answer?: string;
}

interface UseAIAssistantReturn {
  messages: Message[];
  phase: Phase;
  loading: boolean;
  editableStory: string;
  gatheredContent: GatheredContent[];
  startInterview: () => Promise<void>;
  sendResponse: (text: string) => Promise<void>;
  markReady: () => void;
  writeStory: () => Promise<void>;
  setEditableStory: (text: string) => void;
  insertStory: () => string | null;
  resetConversation: () => void;
  generateDraftAndClose: () => Promise<string | null>;
}

export function useAIAssistant(context: QuestionContext): UseAIAssistantReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [phase, setPhase] = useState<Phase>('start');
  const [loading, setLoading] = useState(false);
  const [gatheredContent, setGatheredContent] = useState<GatheredContent[]>([]);
  const [editableStory, setEditableStory] = useState('');

  const storageKey = `ai-chat-${context.chapterId}-${context.question.id}`;

  // Load saved chat state on mount
  useEffect(() => {
    const loadSavedState = async () => {
      try {
        const saved = await AsyncStorage.getItem(storageKey);
        if (saved) {
          const { messages: savedMessages, phase: savedPhase, gatheredContent: savedContent } = JSON.parse(saved);
          if (savedMessages?.length > 0) {
            setMessages(savedMessages);
            setPhase(savedPhase || 'interview');
            setGatheredContent(savedContent || []);
          }
        }
      } catch (e) {
        console.error('Failed to load saved chat:', e);
      }
    };
    loadSavedState();
  }, [storageKey]);

  // Save chat state whenever it changes
  useEffect(() => {
    const saveState = async () => {
      if (messages.length > 0) {
        const messagesToSave = messages.slice(-50);
        await AsyncStorage.setItem(
          storageKey,
          JSON.stringify({ messages: messagesToSave, phase, gatheredContent })
        );
      }
    };
    saveState();
  }, [messages, phase, gatheredContent, storageKey]);

  const addMessage = useCallback((role: 'user' | 'assistant', content: string) => {
    setMessages(prev => [...prev, { role, content }]);
  }, []);

  // Start the interview process
  const startInterview = useCallback(async () => {
    setPhase('interview');
    setLoading(true);

    const hasContent = context.answer && context.answer.trim().length > 50;

    try {
      const data = await api.aiInterview({
        question: context.question.question,
        prompt: context.question.prompt || '',
        existingAnswer: context.answer || '',
        action: 'start',
      });

      addMessage('assistant', data.response);

      if (hasContent) {
        setGatheredContent([{ type: 'existing', content: context.answer || '' }]);
      }
    } catch (err) {
      addMessage(
        'assistant',
        "Let's start exploring this memory together. What's the first thing that comes to mind when you think about this?"
      );
    } finally {
      setLoading(false);
    }
  }, [context, addMessage]);

  // Handle user response during interview
  const sendResponse = useCallback(async (userInput: string) => {
    if (!userInput.trim() || loading) return;

    const trimmedInput = userInput.trim();
    addMessage('user', trimmedInput);
    setGatheredContent(prev => [...prev, { type: 'response', content: trimmedInput }]);
    setLoading(true);

    try {
      const data = await api.aiInterview({
        question: context.question.question,
        prompt: context.question.prompt || '',
        existingAnswer: context.answer || '',
        gatheredContent: [...gatheredContent, { type: 'response', content: trimmedInput }],
        lastResponse: trimmedInput,
        history: messages,
        action: 'continue',
      });

      addMessage('assistant', data.response);

      if (data.readyToWrite) {
        setPhase('ready');
      }
    } catch (err) {
      addMessage(
        'assistant',
        "That's great detail! Tell me more - what else do you remember about this?"
      );
    } finally {
      setLoading(false);
    }
  }, [context, gatheredContent, messages, loading, addMessage]);

  // Signal we have enough content
  const markReady = useCallback(() => {
    setPhase('ready');
    addMessage(
      'assistant',
      "Got enough to work with. Tap 'Compose My Story' when ready, or keep adding more."
    );
  }, [addMessage]);

  // Generate the polished story
  const writeStory = useCallback(async () => {
    setPhase('writing');
    setLoading(true);
    addMessage(
      'assistant',
      "Now I'll weave everything you've shared into a beautifully written section of your story..."
    );

    try {
      const data = await api.aiWriteStory({
        question: context.question.question,
        prompt: context.question.prompt || '',
        existingAnswer: context.answer || '',
        gatheredContent,
        conversationHistory: messages,
      });

      addMessage('assistant', data.story);
      setEditableStory(data.story);
      setPhase('review');
    } catch (err) {
      addMessage('assistant', 'I had trouble generating the story. Please try again.');
      setPhase('ready');
    } finally {
      setLoading(false);
    }
  }, [context, gatheredContent, messages, addMessage]);

  // Insert the final story
  const insertStory = useCallback(() => {
    if (editableStory.trim()) {
      AsyncStorage.removeItem(storageKey);
      return editableStory.trim();
    }
    return null;
  }, [editableStory, storageKey]);

  // Reset conversation
  const resetConversation = useCallback(() => {
    AsyncStorage.removeItem(storageKey);
    setMessages([]);
    setGatheredContent([]);
    setEditableStory('');
    setPhase('start');
  }, [storageKey]);

  // Generate draft on close if there's content
  const generateDraftAndClose = useCallback(async (): Promise<string | null> => {
    const userResponses = gatheredContent.filter(g => g.type === 'response');
    if (userResponses.length > 0 && phase !== 'writing') {
      setLoading(true);
      try {
        const data = await api.aiWriteStory({
          question: context.question.question,
          prompt: context.question.prompt || '',
          existingAnswer: context.answer || '',
          gatheredContent,
          conversationHistory: messages,
        });
        if (data.story) {
          AsyncStorage.removeItem(storageKey);
          return data.story;
        }
      } catch (err) {
        console.error('Failed to generate draft:', err);
      } finally {
        setLoading(false);
      }
    }
    return null;
  }, [context, gatheredContent, messages, phase, storageKey]);

  return {
    messages,
    phase,
    loading,
    editableStory,
    gatheredContent,
    startInterview,
    sendResponse,
    markReady,
    writeStory,
    setEditableStory,
    insertStory,
    resetConversation,
    generateDraftAndClose,
  };
}

export default useAIAssistant;
