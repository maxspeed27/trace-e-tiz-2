import React, { createContext, useState } from 'react';
import { DocumentColorEnum } from '../constants/colors';
import { Citation } from '../types/citation';

interface PdfFocusState {
  documentId: string;
  pageNumber: number;
  citation?: Citation;
}

export interface PdfFocusContextProps {
  pdfFocusState: PdfFocusState;
  setPdfFocusState: React.Dispatch<React.SetStateAction<PdfFocusState>>;
}

// Initialize Context
export const PdfFocusContext = createContext<PdfFocusContextProps | undefined>(undefined);

export interface PdfFocusProviderProps {
  children: React.ReactNode;
}

// PDF Provider
export const PdfFocusProvider: React.FC<PdfFocusProviderProps> = ({ children }) => {
  const [pdfFocusState, setPdfFocusState] = useState<PdfFocusState>({
    documentId: '',
    pageNumber: 0,
  });

  return (
    <PdfFocusContext.Provider
      value={{
        pdfFocusState,
        setPdfFocusState,
      }}
    >
      {children}
    </PdfFocusContext.Provider>
  );
}; 