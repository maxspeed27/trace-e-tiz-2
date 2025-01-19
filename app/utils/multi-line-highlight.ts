import { DocumentColorEnum, highlightColors } from '../constants/colors';

export const multiHighlight = (
  textToHighlight: string,
  pageNumber: number,
  color = DocumentColorEnum.yellow
) => {
  console.log('[multiHighlight] Starting highlight:', {
    textLength: textToHighlight.length,
    pageNumber,
    color
  });

  // Clean up any existing highlights
  const existingHighlights = document.querySelectorAll('.highlight-wrapper');
  console.log('[multiHighlight] Removing existing highlights:', existingHighlights.length);
  existingHighlights.forEach(el => el.remove());

  // Find the specific page's text layer
  const page = document.querySelector(`.react-pdf__Page[data-page-number="${pageNumber + 1}"]`);
  if (!page) {
    console.error('[multiHighlight] Page not found:', pageNumber + 1);
    return false;
  }

  const textLayer = page.querySelector('.react-pdf__Page__textContent');
  if (!textLayer) {
    console.error('[multiHighlight] Text layer not found for page:', pageNumber + 1);
    return false;
  }

  console.log('[multiHighlight] Found text layer:', {
    pageNumber: pageNumber + 1,
    childCount: textLayer.children.length
  });

  const spans = Array.from(textLayer.children) as HTMLElement[];
  
  // Clean and normalize text
  const normalizeText = (text: string) => 
    text.replace(/\s+/g, ' ')
        .replace(/[^\w\s]/g, '')
        .toLowerCase()
        .trim();

  // Split search text into words and normalize each
  const searchWords = normalizeText(textToHighlight)
    .split(' ')
    .filter(word => word.length > 2); // Only look for words longer than 2 chars

  console.log('[multiHighlight] Search words:', {
    original: textToHighlight,
    normalized: searchWords,
    count: searchWords.length
  });

  if (searchWords.length === 0) {
    console.warn('[multiHighlight] No valid search words found');
    return false;
  }

  // Find all spans containing any search words
  const matchingSpanIndices: number[] = [];
  const matchDetails: {index: number, words: string[]}[] = [];
  
  spans.forEach((span, index) => {
    const spanText = normalizeText(span.textContent || '');
    
    // Check if this span contains any of our search words
    const matchedWords = searchWords.filter(word => spanText.includes(word));
    if (matchedWords.length > 0) {
      matchingSpanIndices.push(index);
      matchDetails.push({index, words: matchedWords});
    }
  });

  console.log('[multiHighlight] Matching spans:', {
    count: matchingSpanIndices.length,
    details: matchDetails
  });

  // Group nearby spans together
  const spanGroups: number[][] = [];
  let currentGroup: number[] = [];
  
  matchingSpanIndices.forEach((index, i) => {
    if (i === 0 || index - matchingSpanIndices[i - 1] > 5) {
      if (currentGroup.length > 0) {
        spanGroups.push(currentGroup);
      }
      currentGroup = [index];
    } else {
      // Add any spans between the last match and this one
      for (let j = matchingSpanIndices[i - 1] + 1; j <= index; j++) {
        currentGroup.push(j);
      }
    }
  });
  
  if (currentGroup.length > 0) {
    spanGroups.push(currentGroup);
  }

  console.log('[multiHighlight] Span groups:', {
    count: spanGroups.length,
    groups: spanGroups.map(group => ({
      size: group.length,
      indices: group
    }))
  });

  // Find the group with the most search words
  let bestGroup: number[] = [];
  let bestMatchCount = 0;
  let bestMatchDetails = null;

  spanGroups.forEach(group => {
    const groupText = group
      .map(index => normalizeText(spans[index].textContent || ''))
      .join(' ');
    
    const matchedWords = searchWords.filter(word => groupText.includes(word));
    const matchCount = matchedWords.length;
    
    if (matchCount > bestMatchCount) {
      bestMatchCount = matchCount;
      bestGroup = group;
      bestMatchDetails = {
        text: groupText,
        matchedWords
      };
    }
  });

  console.log('[multiHighlight] Best group:', {
    size: bestGroup.length,
    matchCount: bestMatchCount,
    details: bestMatchDetails
  });

  // Highlight the best group if it matches enough words
  if (bestMatchCount >= Math.min(2, searchWords.length)) {
    bestGroup.forEach(index => {
      const span = spans[index];
      const highlight = document.createElement('div');
      highlight.className = `highlight-wrapper ${highlightColors[color]}`;
      highlight.style.cssText = `
        position: absolute;
        left: ${span.offsetLeft}px;
        top: ${span.offsetTop}px;
        width: ${span.offsetWidth}px;
        height: ${span.offsetHeight}px;
        background-color: ${color === DocumentColorEnum.yellow ? 'rgba(253, 230, 138, 0.8)' : 'rgba(191, 219, 254, 0.8)'};
        pointer-events: none;
        z-index: 2;
      `;
      textLayer.appendChild(highlight);
    });
    console.log('[multiHighlight] Successfully added highlights');
    return true;
  }

  console.warn('[multiHighlight] Not enough matches to highlight');
  return false;
}; 