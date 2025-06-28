import React, { useState, useEffect } from 'react';
import './adminPanel.css';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const API_BASE = 'http://localhost:5000/api';

  // Fetch system statistics
  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/admin/stats`);
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError('Failed to fetch statistics');
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/admin/users`);
      const data = await response.json();
      setUsers(data.users || []);
    } catch (err) {
      setError('Failed to fetch users');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all chats
  const fetchChats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/admin/chats`);
      const data = await response.json();
      setChats(data.chats || []);
    } catch (err) {
      setError('Failed to fetch chats');
      console.error('Error fetching chats:', err);
    } finally {
      setLoading(false);
    }
  };

  // Delete user
  const deleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setUsers(users.filter(user => user.id !== userId));
        alert('User deleted successfully');
      } else {
        throw new Error('Failed to delete user');
      }
    } catch (err) {
      setError('Failed to delete user');
      console.error('Error deleting user:', err);
    }
  };

  // Export data
  const exportData = async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/export`);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `firebase-chat-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Failed to export data');
      console.error('Error exporting data:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchStats();
    } else if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'chats') {
      fetchChats();
    }
  }, [activeTab]);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    let date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      date = new Date(timestamp);
    }
    
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getLanguageFlag = (langCode) => {
    const flags = {
      'tr': '🇹🇷',
      'en': '🇺🇸',
      'ja': '🇯🇵',
      'de': '🇩🇪',
      'fr': '🇫🇷',
      'es': '🇪🇸',
      'it': '🇮🇹',
      'ru': '🇷🇺',
      'zh': '🇨🇳',
      'ko': '🇰🇷',
      'ar': '🇸🇦',
      'pt': '🇵🇹',
      'nl': '🇳🇱',
      'sv': '🇸🇪',
      'da': '🇩🇰'
    };
    return flags[langCode] || '🌍';
  };

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>🔥 Firebase Chat - Admin Panel</h1>
        <div className="admin-actions">
          <button onClick={exportData} className="export-btn">
            📥 Export Data
          </button>
        </div>
      </div>

      <div className="admin-tabs">
        <button 
          className={activeTab === 'dashboard' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('dashboard')}
        >
          📊 Dashboard
        </button>
        <button 
          className={activeTab === 'users' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('users')}
        >
          👥 Users
        </button>
        <button 
          className={activeTab === 'chats' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('chats')}
        >
          💬 Chats
        </button>
      </div>

      {error && (
        <div className="error-message">
          ❌ {error}
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {loading && <div className="loading">🔄 Loading...</div>}

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && stats && (
        <div className="dashboard">
          <div className="stats-grid">
            <div className="stat-card">
              <h3>👥 Total Users</h3>
              <div className="stat-number">{stats.users.total}</div>
              <div className="stat-detail">
                Active 24h: {stats.users.active24h || 0}
              </div>
            </div>

            <div className="stat-card">
              <h3>💬 Total Chats</h3>
              <div className="stat-number">{stats.chats.total}</div>
              <div className="stat-detail">
                Messages: {stats.chats.totalMessages}
              </div>
            </div>

            <div className="stat-card">
              <h3>🌍 Translations</h3>
              <div className="stat-number">{stats.chats.translationPercentage}%</div>
              <div className="stat-detail">
                {stats.chats.translatedMessages} / {stats.chats.totalMessages}
              </div>
            </div>

            <div className="stat-card">
              <h3>📈 Recent Activity</h3>
              <div className="stat-number">{stats.activity.recentMessages}</div>
              <div className="stat-detail">Messages last 24h</div>
            </div>
          </div>

          <div className="charts-grid">
            <div className="chart-card">
              <h3>🌍 Language Distribution</h3>
              <div className="language-stats">
                {Object.entries(stats.users.languageDistribution).map(([lang, count]) => (
                  <div key={lang} className="language-item">
                    <span className="language-flag">{getLanguageFlag(lang)}</span>
                    <span className="language-code">{lang.toUpperCase()}</span>
                    <span className="language-count">{count} users</span>
                    <div className="language-bar">
                      <div 
                        className="language-fill" 
                        style={{ width: `${(count / stats.users.total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="chart-card">
              <h3>📝 Translation Languages</h3>
              <div className="translation-stats">
                {Object.entries(stats.activity.translationLanguages).map(([lang, count]) => (
                  <div key={lang} className="translation-item">
                    <span className="language-flag">{getLanguageFlag(lang)}</span>
                    <span className="language-code">{lang.toUpperCase()}</span>
                    <span className="message-count">{count} messages</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="users-section">
          <div className="section-header">
            <h2>👥 Users ({users.length})</h2>
          </div>
          
          <div className="users-table">
            <table>
              <thead>
                <tr>
                  <th>Avatar</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Language</th>
                  <th>Chats</th>
                  <th>Messages</th>
                  <th>Last Activity</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>
                      <img 
                        src={user.avatar || '/avatar.png'} 
                        alt="Avatar" 
                        className="user-avatar"
                      />
                    </td>
                    <td className="username">{user.username}</td>
                    <td className="email">{user.email}</td>
                    <td className="language">
                      {getLanguageFlag(user.language)} {user.language?.toUpperCase()}
                    </td>
                    <td className="chat-count">{user.chatCount || 0}</td>
                    <td className="message-count">{user.messageCount || 0}</td>
                    <td className="last-activity">
                      {formatDate(user.lastActivity)}
                    </td>
                    <td className="actions">
                      <button 
                        onClick={() => deleteUser(user.id)}
                        className="delete-btn"
                        title="Delete User"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Chats Tab */}
      {activeTab === 'chats' && (
        <div className="chats-section">
          <div className="section-header">
            <h2>💬 Chats ({chats.length})</h2>
          </div>
          
          <div className="chats-grid">
            {chats.map(chat => (
              <div key={chat.id} className="chat-card">
                <div className="chat-header">
                  <h4>Chat #{chat.id.slice(-6)}</h4>
                  <span className="message-count">{chat.messageCount} messages</span>
                </div>
                
                <div className="chat-participants">
                  <h5>Participants:</h5>
                  {chat.participants.map(participant => (
                    <div key={participant.id} className="participant">
                      <span className="participant-flag">
                        {getLanguageFlag(participant.language)}
                      </span>
                      <span className="participant-name">{participant.username}</span>
                    </div>
                  ))}
                </div>
                
                {chat.lastMessage && (
                  <div className="last-message">
                    <h5>Last Message:</h5>
                    <p>"{chat.lastMessage.text?.slice(0, 50)}..."</p>
                    <small>{formatDate(chat.lastMessage.createdAt)}</small>
                  </div>
                )}
                
                <div className="chat-languages">
                  <h5>Languages:</h5>
                  <div className="language-tags">
                    {chat.languages.map(lang => (
                      <span key={lang} className="language-tag">
                        {getLanguageFlag(lang)} {lang.toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;

