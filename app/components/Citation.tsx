import React from 'react';
import { usePdfFocus } from '../hooks/usePdfFocus';
import { DocumentColorEnum } from '../constants/colors';

interface CitationProps {
  documentId: string;
  pageNumber: number;
  snippet: string;
  ticker: string;
  displayDate: string;
  color: DocumentColorEnum;
  documentName?: string;
  url: string;
  isActive?: boolean;
  onClick?: () => void;
}

export default function Citation({
  documentId,
  pageNumber,
  snippet,
  ticker,
  displayDate,
  color,
  documentName,
  url,
  isActive,
  onClick
}: CitationProps) {
  const { setPdfFocusState } = usePdfFocus();

  const handleClick = () => {
    setPdfFocusState({
      documentId,
      pageNumber,
      citation: {
        documentId,
        pageNumber,
        snippet,
        ticker,
        displayDate,
        color,
        url
      }
    });
    onClick?.();
  };

  return (
    <button
      onClick={handleClick}
      title={documentName}
      className={`
        inline-flex items-center gap-1.5 px-3 py-1.5 
        text-sm font-medium rounded-md 
        ${isActive 
          ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' 
          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
        }
        border transition-colors duration-150 
        shadow-sm
      `}
    >
      <span className="max-w-[200px] truncate">{documentName || ticker}</span>
      <span className="text-gray-400">•</span>
      <span className="text-gray-600">Page {pageNumber}</span>
      {displayDate && (
        <>
          <span className="text-gray-400">•</span>
          <span className="text-gray-600">{displayDate}</span>
        </>
      )}
    </button>
  );
} 