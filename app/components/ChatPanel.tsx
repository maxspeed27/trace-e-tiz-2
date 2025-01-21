import React, { useState, useEffect, useCallback, useRef } from 'react';
import { usePdfFocus } from '../hooks/usePdfFocus';
import Citation from './Citation';
import { DocumentColorEnum } from '../constants/colors';
import { Citation as CitationType } from '../types/citation';
import { Send, Copy, Minimize, Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import debounce from 'lodash/debounce';
import { PdfDocument } from '../types/pdf';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  citations?: {
    documentId: string;
    pageNumber: number;
    snippet: string;
    ticker: string;
    displayDate: string;
    color: DocumentColorEnum;
    documentName?: string;
  }[];
}

interface ChatPanelProps {
  selectedDocuments: PdfDocument[];
  onCitationClick: (documentId: string) => void;
  activeDocument?: {
    id: string;
    name: string;
    url: string;
  };
}

export default function ChatPanel({ 
  selectedDocuments, 
  onCitationClick,
  activeDocument 
}: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [displayValue, setDisplayValue] = useState('');
  const [submissionValue, setSubmissionValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [minimizedMessages, setMinimizedMessages] = useState<number[]>([]);
  const { setPdfFocusState } = usePdfFocus();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const toggleMinimize = (index: number) => {
    setMinimizedMessages(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const getDocumentDisplayName = (documentId: string): string => {
    const parts = documentId.split('/');
    const filename = parts[parts.length - 1];
    return decodeURIComponent(filename.replace(/\.[^/.]+$/, ""));
  };

  const getDocumentName = (documentId: string): string => {
    const doc = selectedDocuments.find(d => d.id === documentId);
    return doc?.name || getDocumentDisplayName(documentId);
  };

  const debouncedSetSubmission = useCallback(
    debounce((value: string) => {
      setSubmissionValue(value);
    }, 150),
    []
  );

  useEffect(() => {
    return () => {
      debouncedSetSubmission.cancel();
    };
  }, [debouncedSetSubmission]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDisplayValue(value);
    debouncedSetSubmission(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submissionValue.trim() || !selectedDocuments.length || isLoading) return;

    // Collapse previous answer if it exists
    if (messages.length > 0) {
      const lastMessageIndex = messages.length - 1;
      if (messages[lastMessageIndex].role === 'assistant' && !minimizedMessages.includes(lastMessageIndex)) {
        setMinimizedMessages(prev => [...prev, lastMessageIndex]);
      }
    }

    setIsLoading(true);
    const userMessage = submissionValue;
    setDisplayValue('');
    setSubmissionValue('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          documents: selectedDocuments.map(doc => doc.id)
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      const transformedCitations = data.citations?.map((citation: any, index: number) => ({
        documentId: citation.document_id,
        pageNumber: citation.page_number,
        snippet: citation.text_snippet,
        ticker: `[${index + 1}]`,
        displayDate: '',
        color: DocumentColorEnum.yellow,
        documentName: citation.document_name || getDocumentName(citation.document_id)
      }));

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer,
        citations: transformedCitations
      }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, there was an error processing your request.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleCitationClick = (citation: CitationType) => {
    setPdfFocusState({
      documentId: citation.documentId,
      pageNumber: citation.pageNumber,
      citation: {
        ...citation,
        color: citation.color || DocumentColorEnum.yellow,
      },
    });
    onCitationClick?.(citation.documentId);
  };

  const renderMessage = (message: Message) => {
    if (message.role === 'user') {
      return <div className="text-blue-900">{message.content}</div>;
    }

    return (
      <div className="space-y-2">
        <div className="text-gray-900 leading-relaxed">{message.content}</div>
        {message.citations && message.citations.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {message.citations.map((citation, idx) => (
              <Citation 
                key={idx} 
                {...citation} 
                documentName={getDocumentName(citation.documentId)}
                onClick={() => handleCitationClick(citation)}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50">
      <ScrollArea className="flex-1 px-1">
        <div className="space-y-4 max-w-[99%] mx-auto py-2">
          {messages.map((message, idx) => (
            <div 
              key={idx} 
              className={`${
                message.role === 'user' ? 
                  'max-w-[75%] bg-blue-50 ml-auto' : 
                  'max-w-[98%] bg-white'
              } p-3 rounded-md shadow-sm`}
            >
              {message.role === 'user' ? (
                <div className="text-blue-900 font-medium">{message.content}</div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <div className={`text-gray-900 leading-relaxed whitespace-pre-wrap ${
                      minimizedMessages.includes(idx) ? 'line-clamp-2' : ''
                    }`}>
                      {message.content}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-gray-500 hover:text-gray-700"
                        onClick={() => copyMessage(message.content)}
                        title="Copy message"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-gray-500 hover:text-gray-700"
                        onClick={() => toggleMinimize(idx)}
                        title={minimizedMessages.includes(idx) ? "Expand" : "Minimize"}
                      >
                        {minimizedMessages.includes(idx) ? (
                          <Maximize className="h-4 w-4" />
                        ) : (
                          <Minimize className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  {(!minimizedMessages.includes(idx) && message.citations && message.citations.length > 0) && (
                    <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t">
                      {message.citations.map((citation, citIdx) => (
                        <Citation 
                          key={citIdx} 
                          {...citation} 
                          documentName={getDocumentName(citation.documentId)}
                          onClick={() => handleCitationClick(citation)}
                          isActive={citation.documentId === activeDocument?.id}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white rounded-md p-3 shadow-sm">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t bg-white p-3 shadow-sm">
        <div className="max-w-[99%] mx-auto">
          <form onSubmit={handleSubmit} className="flex items-center space-x-2">
            <Input
              type="text"
              value={displayValue}
              onChange={handleInputChange}
              placeholder={selectedDocuments.length ? "Ask a question..." : "Please select documents first"}
              disabled={!selectedDocuments.length || isLoading}
              className="flex-1 bg-white border-gray-200"
            />
            <Button 
              type="submit" 
              disabled={!submissionValue.trim() || !selectedDocuments.length || isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4"
            >
              <Send className="w-4 h-4 mr-2" />
              Send
            </Button>
          </form>
          {!selectedDocuments.length && (
            <p className="mt-2 text-sm text-gray-500 text-center">
              Select documents to start asking questions
            </p>
          )}
        </div>
      </div>
    </div>
  );
} 