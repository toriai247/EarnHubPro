
import { useEffect } from 'react';

export const useSecurity = () => {
  useEffect(() => {
    // In development mode, we skip security so you can debug. 
    if (process.env.NODE_ENV === 'development') return;

    // 1. Disable Right Click
    const handleContext = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // 2. Disable Keyboard Shortcuts for Inspection
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.keyCode === 123 || // F12
        (e.ctrlKey && e.shiftKey && e.keyCode === 73) || // Ctrl+Shift+I
        (e.ctrlKey && e.shiftKey && e.keyCode === 67) || // Ctrl+Shift+C
        (e.ctrlKey && e.shiftKey && e.keyCode === 74) || // Ctrl+Shift+J
        (e.ctrlKey && e.keyCode === 85) || // Ctrl+U (View Source)
        (e.ctrlKey && e.keyCode === 83) // Ctrl+S (Save)
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // NOTE: Advanced DevTools detection (Timing Attack) removed for Mobile/APK stability.
    // Mobile WebViews often have inconsistent timing performance which caused the app to freeze.

    // Attach listeners
    document.addEventListener('contextmenu', handleContext);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContext);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
};
