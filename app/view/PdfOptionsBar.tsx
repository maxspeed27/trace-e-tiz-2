import React from 'react';
import { PdfDocument } from '../types/pdf';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const PDFOptionsBar = ({
  file,
  selectedDocuments,
  currentDocumentIndex,
  onDocumentChange,
}: {
  file: PdfDocument;
  selectedDocuments: string[];
  currentDocumentIndex: number;
  onDocumentChange: (index: number) => void;
}) => {
  return (
    <div className="flex items-center justify-between px-2 py-1.5 border-b bg-white">
      <div className="flex items-center gap-2">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDocumentChange(currentDocumentIndex - 1)}
            disabled={currentDocumentIndex <= 0}
            className="h-7 w-7 text-gray-600 hover:text-gray-900 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDocumentChange(currentDocumentIndex + 1)}
            disabled={currentDocumentIndex >= selectedDocuments.length - 1}
            className="h-7 w-7 text-gray-600 hover:text-gray-900 disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-gray-900 truncate max-w-[500px]">
            {file.name}
          </span>
          <span className="text-xs text-gray-500">
            ({currentDocumentIndex + 1} of {selectedDocuments.length})
          </span>
        </div>
      </div>
    </div>
  );
};

PDFOptionsBar.displayName = 'PDFOptionsBar';

export default PDFOptionsBar; 