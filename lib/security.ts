
import { useEffect } from 'react';

export const useSecurity = () => {
  useEffect(() => {
    // In development mode, we might skip strict security for debugging, 
    // but for High Security production requirements, we keep it active.
    // Uncomment the line below if you want to allow devtools in local dev.
    // if (process.env.NODE_ENV === 'development') return;

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

    // 3. High Security: DevTools Detection & Debugger Trap
    const antiDebug = () => {
      const start = Date.now();
      // This statement pauses execution if devtools is open
      debugger; 
      const end = Date.now();
      
      // If the time difference is significant, it means execution was paused by devtools
      if (end - start > 100) {
        document.body.innerHTML = '<div style="background:black;color:red;height:100vh;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:bold;text-align:center;">Security Alert: DevTools Detected.<br/>Access Denied.</div>';
        window.location.href = "about:blank"; // Redirect away
      }
    };

    // Run checks periodically
    const intervalId = setInterval(() => {
        antiDebug();
        // Console Clearing
        // console.clear(); 
    }, 1000);

    // Attach listeners
    document.addEventListener('contextmenu', handleContext);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContext);
      document.removeEventListener('keydown', handleKeyDown);
      clearInterval(intervalId);
    };
  }, []);
};
