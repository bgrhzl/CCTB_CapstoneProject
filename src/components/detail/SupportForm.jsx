import React, { useState } from 'react';

const SupportForm = ({ user, lang }) => {
  const [email, setEmail] = useState(user?.email || '');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch('http://localhost:5000/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, message, lang, userId: user?.id })
      });
      const data = await res.json();
      if (data.success) {
        setStatus('success');
        setMessage('');
      } else {
        setStatus('error');
      }
    } catch (err) {
      setStatus('error');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <label>Email:
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
      </label>
      <label>Message:
        <textarea value={message} onChange={e => setMessage(e.target.value)} required rows={4} />
      </label>
      <button type="submit" disabled={status === 'loading'}>Send</button>
      {status === 'success' && <span style={{ color: 'green' }}>Message sent!</span>}
      {status === 'error' && <span style={{ color: 'red' }}>Failed to send. Try again.</span>}
    </form>
  );
};

export default SupportForm;
