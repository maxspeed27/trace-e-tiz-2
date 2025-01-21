export function getAvailableMemory(): number | null {
  if (typeof performance !== 'undefined' && 'memory' in performance) {
    // @ts-ignore - memory is not in the standard TS types
    return performance.memory.jsHeapSizeLimit - performance.memory.usedJSHeapSize;
  }
  
  if (typeof navigator !== 'undefined' && 'deviceMemory' in navigator) {
    // @ts-ignore - deviceMemory is not in the standard TS types
    return navigator.deviceMemory * 1024 * 1024 * 1024; // Convert GB to bytes
  }
  
  return null;
}

export function canPreloadDocuments(docsCount: number): boolean {
  const availableMemory = getAvailableMemory();
  if (!availableMemory) return false;
  
  // Assume average PDF size of 5MB
  const estimatedMemoryNeeded = docsCount * 5 * 1024 * 1024;
  
  // Only preload if we have 4x the estimated memory needed
  return availableMemory > estimatedMemoryNeeded * 4;
} 