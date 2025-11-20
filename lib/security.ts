
import { useEffect } from 'react';

export const useSecurity = () => {
  useEffect(() => {
    // In development mode, we skip security so you can debug. 
    // Set this to false to test security in dev.
    if (process.env.NODE_ENV === 'development') return;

    const killSession = () => {
      // THE BROWSER CRASHER
      // This creates an infinite loop that freezes the browser tab instantly.
      try {
        console.clear();
        console.log("%c SECURITY ALERT: ILLEGAL ACCESS DETECTED ", "background: red; color: white; font-size: 30px; padding: 20px;");
        
        // Infinite Loop to crash tab
        while (true) {
           const x = Math.random() * Math.random();
           const y = [1,2,3,4,5].map(i => i * x);
           debugger; // Pauses if devtools open, loop continues if resumed
        }
      } catch (e) {
        // Fallback crash
        window.location.reload();
      }
    };

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

    // 3. Advanced DevTools Detection (Timing Attack)
    const detectDevTools = () => {
      const start = performance.now();
      debugger; // This statement halts execution ONLY if DevTools is open
      const end = performance.now();
      
      // If the time difference is large, it means the debugger paused execution
      // implying DevTools is open.
      if (end - start > 100) {
        killSession();
      }
    };

    // Attach listeners
    document.addEventListener('contextmenu', handleContext);
    document.addEventListener('keydown', handleKeyDown);

    // Run detection loop
    const interval = setInterval(detectDevTools, 1000);

    return () => {
      document.removeEventListener('contextmenu', handleContext);
      document.removeEventListener('keydown', handleKeyDown);
      clearInterval(interval);
    };
  }, []);
};
