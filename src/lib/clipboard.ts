/**
 * Robust copy-to-clipboard helper that works in all browsers, webviews, and iframe contexts.
 * Automatically falls back to standard text selection and document.execCommand('copy')
 * if the modern navigator.clipboard API is blocked or unavailable.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // 1. Try modern navigator.clipboard API first (requires secure context HTTPS in some browsers)
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('Modern clipboard copy failed, trying fallback:', err);
    }
  }

  // 2. Fallback: Create a hidden textarea and execute command
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    
    // Prevent zooming and scrolling on mobile devices when focused
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    textArea.style.fontSize = '16px'; // iOS prevents auto-zoom for fonts >= 16px
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    // For iOS devices, we need a specific selection range to guarantee success
    const range = document.createRange();
    range.selectNodeContents(textArea);
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
    textArea.setSelectionRange(0, 999999);
    
    const successful = document.execCommand('copy');
    
    // Clean up
    if (selection) {
      selection.removeAllRanges();
    }
    document.body.removeChild(textArea);
    
    return successful;
  } catch (err) {
    console.error('Fallback clipboard copy failed:', err);
    return false;
  }
}
