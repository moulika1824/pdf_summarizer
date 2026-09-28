import React, { useState, useRef, useEffect } from 'react';

function App() {
  const [question, setQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const chatEndRef = useRef(null);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setChatHistory([{ sender: 'system', text: '📄 Analyzing your document... This might take a minute.' }]);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://127.0.0.1:5000/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      setChatHistory([{ sender: 'system', text: `${data.message || 'File processed successfully!'}` }]);
    } catch (error) {
      setChatHistory([{ sender: 'system', text: 'Failed to connect to the backend server.' }]);
    } finally {
      setIsUploading(false);
    }
  };

  const askQuestion = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    const newChat = [...chatHistory, { sender: 'user', text: question }];
    setChatHistory(newChat);
    setQuestion('');
    setIsLoading(true);

    try {
      const response = await fetch('http://127.0.0.1:5000/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: newChat[newChat.length - 1].text }),
      });

      const data = await response.json();

      let imageUrl = null;
      if (data.image) {
        const filename = data.image.split('/').pop().split('\\').pop(); 
        imageUrl = `http://127.0.0.1:5000/api/images/${filename}`;
      }

      setChatHistory((prev) => [
        ...prev,
        { sender: 'ai', text: data.answer, image: imageUrl },
      ]);
    } catch (error) {
      setChatHistory((prev) => [...prev, { sender: 'system', text: 'Sorry, I lost connection to the server.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.appContainer}>
        
        {/* --- HEADER --- */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.headerTitle}>PDF Assistant ✨</h2>
            <p style={styles.headerSubtitle}>Chat intelligently with your documents</p>
          </div>
          <label style={isUploading ? styles.uploadBtnDisabled : styles.uploadBtn}>
            {isUploading ? "Processing..." : "+ Upload PDF"}
            <input 
              type="file" 
              accept=".pdf" 
              onChange={handleFileUpload} 
              disabled={isUploading}
              style={{ display: 'none' }} 
            />
          </label>
        </div>

        {/* --- CHAT WINDOW --- */}
        <div style={styles.chatWindow}>
          {chatHistory.length === 0 && (
            <div style={styles.emptyState}>
              <h3 style={{ color: '#2c3e50', marginBottom: '8px' }}>Ready to start</h3>
              <p style={{ color: '#7f8c8d', margin: 0 }}>Upload a PDF document to begin extracting insights.</p>
            </div>
          )}
          
          {chatHistory.map((msg, index) => (
            <div key={index} style={
              msg.sender === 'user' ? styles.userRow : 
              msg.sender === 'system' ? styles.systemRow : styles.aiRow
            }>
              <div style={
                msg.sender === 'user' ? styles.userBubble : 
                msg.sender === 'system' ? styles.systemBubble : styles.aiBubble
              }>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{msg.text}</p>
                {msg.image && (
                  <img src={msg.image} alt="Context" style={styles.chatImage} />
                )}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div style={styles.aiRow}>
              <div style={{...styles.aiBubble, opacity: 0.7}}>
                <div style={styles.typingIndicator}>Thinking...</div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* --- INPUT AREA --- */}
        <form onSubmit={askQuestion} style={styles.inputArea}>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={isUploading ? "Please wait for PDF to process..." : "Ask a question about your document..."}
            style={styles.input}
            disabled={isUploading}
          />
          <button type="submit" disabled={isLoading || isUploading || !question.trim()} style={styles.sendButton}>
            Send
          </button>
        </form>

      </div>
    </div>
  );
}

// --- FULLY OVERHAULED STYLES ---
const styles = {
  // We force the page to take up 100vw/100vh and center everything perfectly
  page: {
    minHeight: '100vh',
    width: '100vw', 
    margin: 0,
    padding: 0,
    background: 'linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%)', // Sleek soft blue gradient
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    boxSizing: 'border-box'
  },
  appContainer: {
    width: '90%',
    maxWidth: '900px',
    height: '90vh',
    backgroundColor: '#ffffff',
    borderRadius: '24px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.15)', // Deep floating shadow
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  header: {
    backgroundColor: '#1a1b26',
    color: '#ffffff',
    padding: '24px 32px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #2f334d'
  },
  headerTitle: {
    margin: 0,
    fontSize: '22px',
    fontWeight: '700',
    letterSpacing: '0.5px'
  },
  headerSubtitle: {
    margin: '4px 0 0 0',
    fontSize: '13px',
    color: '#a9b1d6'
  },
  uploadBtn: {
    backgroundColor: '#4ade80', // Modern green
    color: '#14532d',
    padding: '10px 20px',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: '700',
    transition: 'transform 0.2s',
    boxShadow: '0 4px 6px rgba(74, 222, 128, 0.2)'
  },
  uploadBtnDisabled: {
    backgroundColor: '#cbd5e1',
    color: '#64748b',
    padding: '10px 20px',
    borderRadius: '12px',
    cursor: 'not-allowed',
    fontWeight: '700',
  },
  chatWindow: {
    flex: 1,
    padding: '30px',
    overflowY: 'auto',
    backgroundColor: '#f8fafc', // Very subtle off-white/blue
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  emptyState: {
    margin: 'auto',
    textAlign: 'center',
    backgroundColor: 'white',
    padding: '40px 60px',
    borderRadius: '16px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
    border: '1px solid #e2e8f0'
  },
  userRow: { display: 'flex', justifyContent: 'flex-end' },
  aiRow: { display: 'flex', justifyContent: 'flex-start' },
  systemRow: { display: 'flex', justifyContent: 'center' },
  
  userBubble: {
    backgroundColor: '#3b82f6', // Bright modern blue
    color: '#ffffff',
    padding: '16px 24px',
    borderRadius: '24px 24px 6px 24px',
    maxWidth: '75%',
    fontSize: '15px',
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)',
    wordBreak: 'break-word'
  },
  aiBubble: {
    backgroundColor: '#ffffff',
    color: '#334155',
    padding: '16px 24px',
    borderRadius: '24px 24px 24px 6px',
    maxWidth: '75%',
    fontSize: '15px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
    border: '1px solid #e2e8f0',
    wordBreak: 'break-word'
  },
  systemBubble: {
    backgroundColor: '#fef3c7',
    color: '#b45309',
    padding: '10px 24px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600',
    border: '1px solid #fde68a'
  },
  chatImage: {
    width: '100%',
    borderRadius: '12px',
    marginTop: '16px',
    border: '1px solid #e2e8f0'
  },
  inputArea: {
    display: 'flex',
    padding: '24px 32px',
    backgroundColor: '#ffffff',
    borderTop: '1px solid #e2e8f0',
    gap: '16px'
  },
  input: {
    flex: 1,
    padding: '16px 24px',
    borderRadius: '32px',
    border: '1px solid #cbd5e1',
    fontSize: '15px',
    outline: 'none',
    backgroundColor: '#f8fafc',
    color: '#334155',
    transition: 'all 0.2s ease',
  },
  sendButton: {
    padding: '0 32px',
    backgroundColor: '#1e293b', // Deep slate color
    color: 'white',
    border: 'none',
    borderRadius: '32px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '700',
    transition: 'background 0.2s',
  },
  typingIndicator: {
    color: '#94a3b8',
    fontStyle: 'italic',
    fontWeight: '500'
  }
};

export default App;