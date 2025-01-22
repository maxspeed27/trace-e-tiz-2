import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { usePdfFocus } from '../hooks/usePdfFocus';
import Citation from './Citation';
import { DocumentColorEnum } from '../constants/colors';
import { Citation as CitationType } from '../types/citation';
import { Send, Copy, Minimize, Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VariableSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
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
    url: string;
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

interface MessageRowData {
  messages: Message[];
  minimizedMessages: number[];
  handleCitationClick: (citation: CitationType) => void;
  toggleMinimize: (index: number) => void;
  copyMessage: (content: string) => void;
  getDocumentName: (documentId: string) => string;
  activeDocument?: {
    id: string;
    name: string;
    url: string;
  };
}

interface MessageRowProps {
  data: MessageRowData;
  index: number;
  style: React.CSSProperties;
}

const MessageRow = React.memo(({ data, index, style }: MessageRowProps) => {
  const { messages, minimizedMessages, handleCitationClick, toggleMinimize, copyMessage, getDocumentName, activeDocument } = data;
  const message = messages[index];
  const rowRef = useRef<HTMLDivElement>(null);

  // Return empty div if no message (shouldn't happen but safe)
  if (!message) return <div ref={rowRef} style={style} />;

  return (
    <div ref={rowRef} style={style}>
      <div 
        className={`${
          message.role === 'user' ? 
            'max-w-[75%] bg-blue-50 ml-auto' : 
            'max-w-[98%] bg-white'
        } p-3 rounded-md shadow-sm m-2`}
      >
        {message.role === 'user' ? (
          <div className="text-blue-900 font-medium">{message.content}</div>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-between items-start gap-2">
              <div className={`text-gray-900 leading-relaxed whitespace-pre-wrap ${
                minimizedMessages.includes(index) ? 'line-clamp-2' : ''
              }`}>
                {message.content}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => copyMessage(message.content)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => toggleMinimize(index)}
                >
                  {minimizedMessages.includes(index) ? (
                    <Maximize className="h-4 w-4" />
                  ) : (
                    <Minimize className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            {(message.citations && !minimizedMessages.includes(index)) && (
              <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t">
                {message.citations.map((citation: CitationType, citIdx: number) => (
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
    </div>
  );
});

export default function ChatPanel({ 
  selectedDocuments, 
  onCitationClick,
  activeDocument 
}: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [minimizedMessages, setMinimizedMessages] = useState<number[]>([]);
  const { setPdfFocusState } = usePdfFocus();
  const listRef = useRef<List>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Memoize row data to prevent unnecessary re-renders
  const rowData = useMemo(() => ({
    messages,
    minimizedMessages,
    handleCitationClick: (citation: CitationType) => {
      setPdfFocusState({
        documentId: citation.documentId,
        pageNumber: citation.pageNumber,
        citation: {
          ...citation,
          color: citation.color || DocumentColorEnum.yellow,
        },
      });
      onCitationClick?.(citation.documentId);
    },
    toggleMinimize: (index: number) => {
      setMinimizedMessages(prev => 
        prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
      );
      // Reset cache for this item to recalculate height
      if (listRef.current) {
        listRef.current.resetAfterIndex(index);
      }
    },
    copyMessage: (content: string) => {
      navigator.clipboard.writeText(content);
    },
    getDocumentName: (documentId: string) => {
      const doc = selectedDocuments.find(d => d.id === documentId);
      return doc?.name || documentId;
    },
    activeDocument
  }), [messages, minimizedMessages, setPdfFocusState, onCitationClick, selectedDocuments, activeDocument]);

  const getItemSize = useCallback((index: number) => {
    // If it's the loading indicator
    if (index === messages.length) return 80;
    
    const message = messages[index];
    if (!message) return 80; // Default height for invalid messages
    
    // Base height for user messages
    if (message.role === 'user') return 80;
    // Expanded assistant messages with citations
    if (!minimizedMessages.includes(index) && message.citations?.length) {
      return 150 + (message.citations.length * 40);
    }
    // Minimized or no citations
    return 100;
  }, [messages, minimizedMessages]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !selectedDocuments.length || isLoading) return;

    // Minimize previous answer if exists
    if (messages.length > 0) {
      const lastIndex = messages.length - 1;
      if (messages[lastIndex].role === 'assistant' && !minimizedMessages.includes(lastIndex)) {
        setMinimizedMessages(prev => [...prev, lastIndex]);
      }
    }

    setIsLoading(true);
    const userMessage = inputValue;
    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          documents: selectedDocuments.map(doc => doc.id)
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');
      const data = await response.json();

      const transformedCitations = data.citations?.map((citation: any, index: number) => ({
        documentId: citation.document_id,
        pageNumber: citation.page_number,
        snippet: citation.text_snippet,
        ticker: `[${index + 1}]`,
        displayDate: '',
        color: DocumentColorEnum.yellow,
        documentName: citation.document_name || rowData.getDocumentName(citation.document_id),
        url: selectedDocuments.find(d => d.id === citation.document_id)?.url
      })).filter(Boolean);

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer,
        citations: transformedCitations
      }]);

      // Scroll to bottom after new message
      if (listRef.current) {
        listRef.current.scrollToItem(messages.length + 1, 'end');
      }
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

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50">
      <div className="flex-1">
        <AutoSizer>
          {({ height, width }: { height: number; width: number }) => (
            <List
              ref={listRef}
              height={height}
              width={width}
              itemCount={messages.length + (isLoading ? 1 : 0)}
              itemSize={getItemSize}
              itemData={rowData}
            >
              {({ index, style }) => {
                // Handle loading indicator
                if (isLoading && index === messages.length) {
                  return (
                    <div style={style} className="flex justify-start p-2">
                      <div className="bg-white rounded-md p-3 shadow-sm">
                        <div className="flex space-x-2">
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-100"></div>
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-200"></div>
                        </div>
                      </div>
                    </div>
                  );
                }
                
                // Handle regular messages
                const message = messages[index];
                if (!message) return null;
                
                return <MessageRow data={rowData} index={index} style={style} />;
              }}
            </List>
          )}
        </AutoSizer>
      </div>

      <div className="border-t bg-white p-3 shadow-sm">
        <div className="max-w-[99%] mx-auto">
          <form onSubmit={handleSubmit} className="flex items-center space-x-2">
            <Input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              placeholder={selectedDocuments.length ? "Ask a question..." : "Please select documents first"}
              disabled={!selectedDocuments.length || isLoading}
              className="flex-1 bg-white border-gray-200"
            />
            <Button 
              type="submit" 
              disabled={!inputValue.trim() || !selectedDocuments.length || isLoading}
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