import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function App() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm your kind AI buddy. How are you feeling today?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [moodLog, setMoodLog] = useState([]);
  const [suggestion, setSuggestion] = useState('');
  const [copingOpen, setCopingOpen] = useState(false);
  const chatRef = useRef(null);

  const getMoodStats = () => {
    const userMessages = messages.filter(m => m.role === 'user');
    const allMoods = ['😭', '🔴', '😠', '😐', '🟡', '🟢', '😎'];
    const stats = Object.fromEntries(allMoods.map(m => [m, 0]));
    userMessages.forEach(m => {
      if (m.mood && stats[m.mood] !== undefined) {
        stats[m.mood]++;
      }
    });
    const total = userMessages.length;
    const avgMood = Object.entries(stats).reduce(
      (acc, [mood, count]) => (count > acc.count ? { mood, count } : acc),
      { mood: '🟡', count: 0 }
    );
    return { ...stats, total, average: avgMood.count > 0 ? avgMood.mood : '🟡' };
  };

  const moodSuggestions = {
    '😭': "Take a deep breath and know it's okay to feel this way. Want to try a breathing exercise?",
    '🔴': "Try stepping away for a few minutes and doing something calming.",
    '😠': "Anger is valid. Maybe vent in a journal or squeeze a pillow.",
    '😐': "Not feeling much? A quick walk or short playlist might help shift things.",
    '🟡': "You're doing alright. Keep checking in with yourself. 😊",
    '🟢': "That's lovely to hear! Spread those good vibes!",
    '😎': "You're on fire! Keep it up, superstar! 🌟"
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const newMessages = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages })
      });
      const data = await res.json();
      if (data.reply) {
        const updatedMessages = [...newMessages];
        const mood = data.mood;
        updatedMessages[updatedMessages.length - 1].mood = mood;
        setMessages([...updatedMessages, { role: 'assistant', content: data.reply }]);

        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setMoodLog(prev => [...prev, { time: timestamp, mood }]);
        setSuggestion(moodSuggestions[mood] || '');
        if (['😭', '🔴', '😠', '😐'].includes(mood)) {
          setCopingOpen(true);
        }
      }
    } catch {
      alert('Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') sendMessage();
  };

  useEffect(() => {
    chatRef.current?.scrollTo(0, chatRef.current.scrollHeight);
  }, [messages]);

  const stats = getMoodStats();

  const chartData = {
    labels: Object.keys(stats).filter(m => m !== 'total' && m !== 'average'),
    datasets: [{
      label: 'Mood Frequency',
      data: Object.entries(stats)
        .filter(([key]) => !['total', 'average'].includes(key))
        .map(([, value]) => value),
      backgroundColor: '#36a2eb'
    }]
  };

  return (
    <div className="chat-wrapper">
      <button className="toggle-coping" onClick={() => setCopingOpen(!copingOpen)}>
        {copingOpen ? '❌ Close Tools' : '🧘 Coping Tools'}
      </button>

      <div className={`coping-slide-wrapper ${copingOpen ? 'open' : ''}`}>
        <h3>🧘 Coping Toolkit</h3>
        <ul>
          <li>🫁 <a href="https://www.youtube.com/watch?v=wfDTp2GogaQ" target="_blank" rel="noreferrer">Breathing exercise</a></li>
          <li>🎧 <a href="https://open.spotify.com/playlist/37i9dQZF1DX3rxVfibe1L0" target="_blank" rel="noreferrer">Calming playlist</a></li>
          <li>📓 Journal your feelings</li>
          <li>🕯️ Light a candle, dim lights</li>
        </ul>
        {suggestion && (
          <div className="coping-suggestion">
            <strong>🌿 Tip:</strong> {suggestion}
          </div>
        )}
      </div>

      <div className="chat-header">💬 FeelGoodBot</div>

      <div className="chat-box" ref={chatRef}>
        {messages.map((msg, i) => (
          <div key={i} className={`chat-bubble ${msg.role}`}>
            {msg.role === 'user' && msg.mood ? (
              <span>{msg.content} <span className="mood emoji-bounce">{msg.mood}</span></span>
            ) : (
              msg.content
            )}
          </div>
        ))}
        {loading && <div className="chat-bubble assistant">Typing...</div>}
      </div>

      <div className="chat-input">
        <input
          type="text"
          placeholder="Type something..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button onClick={sendMessage}>📤</button>
      </div>

      <div className="mood-stats">
        <h4>🧠 Mood Stats</h4>
        <Bar
          data={chartData}
          options={{
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
          }}
        />
        <p>✨ Avg Mood: <span className="emoji-bounce">{stats.average}</span></p>
      </div>

      <div className="mood-timeline">
        <h4>📅 Mood Timeline</h4>
        <ul>
          {moodLog.map((entry, idx) => (
            <li key={idx}><span>{entry.time}</span><span className="emoji-bounce">{entry.mood}</span></li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;
