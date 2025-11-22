// Debug Error Catcher - Fängt alle Fehler und loggt sie sichtbar
// Füge dies in index.tsx ein, um alle Fehler zu sehen

// Globaler Error Handler
window.addEventListener('error', (event) => {
  console.error('❌ GLOBAL ERROR:', event.error);
  console.error('Message:', event.message);
  console.error('Filename:', event.filename);
  console.error('Line:', event.lineno, 'Col:', event.colno);
  
  // Zeige Fehler auch im DOM
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = 'position:fixed;top:0;left:0;right:0;background:red;color:white;padding:20px;z-index:99999;font-family:monospace;';
  errorDiv.innerHTML = `
    <h2>❌ JavaScript Error</h2>
    <p><strong>Message:</strong> ${event.message}</p>
    <p><strong>File:</strong> ${event.filename}:${event.lineno}:${event.colno}</p>
    <pre>${event.error?.stack || 'No stack trace'}</pre>
  `;
  document.body.appendChild(errorDiv);
});

// Unhandled Promise Rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('❌ UNHANDLED PROMISE REJECTION:', event.reason);
  
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = 'position:fixed;top:0;left:0;right:0;background:orange;color:white;padding:20px;z-index:99999;font-family:monospace;';
  errorDiv.innerHTML = `
    <h2>⚠️ Unhandled Promise Rejection</h2>
    <pre>${event.reason?.stack || event.reason || 'Unknown error'}</pre>
  `;
  document.body.appendChild(errorDiv);
});

// React Error Boundary Fallback - Muss in .tsx Datei verwendet werden
export const getErrorFallbackHTML = (error: Error) => {
  return `
    <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:#ff0000;color:white;padding:40px;font-family:monospace;overflow:auto;z-index:99999">
      <h1>❌ React Error</h1>
      <h2>${error.message}</h2>
      <pre style="background:rgba(0,0,0,0.3);padding:20px;border-radius:8px">${error.stack}</pre>
    </div>
  `;
};

console.log('✅ Debug error catcher loaded');
