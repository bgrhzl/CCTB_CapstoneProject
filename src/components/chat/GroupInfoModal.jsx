import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import "./GroupInfoModal.css";

const GroupInfoModal = ({ group, currentUser, onClose, onUserAdded }) => {
  const [addUserInput, setAddUserInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState([]);
  const [freshCurrentUser, setFreshCurrentUser] = useState(currentUser); // NEW: freshest user
  const isAdmin = group.adminId === currentUser.id;

  // Fetch full user info (including friends) for all group members
  useEffect(() => {
    async function fetchMembers() {
      try {
        // group.users can be [id] or [{id, username, avatar}]
        const ids = group.users.map(u => (typeof u === "object" ? u.id : u));
        // Fetch each user by ID to get up-to-date friends array
        const memberPromises = ids.map(async (id) => {
          const res = await fetch(`http://localhost:5000/api/users/${id}`);
          const data = await res.json();
          return data.user || null;
        });
        const memberObjs = (await Promise.all(memberPromises)).filter(Boolean);
        setMembers(memberObjs);
      } catch {
        setMembers([]);
      }
    }
    fetchMembers();
  }, [group.users]);

  // Fetch latest currentUser info for robust friend check
  useEffect(() => {
    async function fetchCurrentUser() {
      try {
        const res = await fetch(`http://localhost:5000/api/users/${currentUser.id}`);
        const data = await res.json();
        if (data.user) setFreshCurrentUser(data.user);
      } catch {
        setFreshCurrentUser(currentUser); // fallback
      }
    }
    fetchCurrentUser();
  }, [currentUser.id]);

  // Search user by username
  const handleSearch = async () => {
    setLoading(true);
    setSearchResult(null);
    try {
      const res = await fetch(`http://localhost:5000/api/searchUser?username=${addUserInput}`);
      const data = await res.json();
      if (data.user && data.user.id !== currentUser.id) {
        setSearchResult(data.user);
      } else {
        setSearchResult(null);
        toast.error("User not found");
      }
    } catch {
      toast.error("Search failed");
    }
    setLoading(false);
  };

  // Add user to group
  const handleAddUser = async () => {
    if (!searchResult) return;
    setAdding(true);
    try {
      const res = await fetch("http://localhost:5000/api/group/addUser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: group.id, userId: searchResult.id }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("User added to group!");
        onUserAdded && onUserAdded(searchResult);
      } else {
        toast.error(data.error || "Failed to add user");
      }
    } catch {
      toast.error("Failed to add user");
    }
    setAdding(false);
  };

  // Send friend request
  const handleSendFriendRequest = async (userId) => {
    try {
      const res = await fetch("http://localhost:5000/api/friendRequest/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromUserId: currentUser.id, toUserId: userId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Friend request sent!");
      } else {
        toast.error(data.error || "Failed to send request");
      }
    } catch {
      toast.error("Failed to send request");
    }
  };

  // Check if currentUser is friends with member
  const isFriend = (member) => {
    // Check both directions for robustness, using freshest user
    return (
      (freshCurrentUser.friends || []).includes(member.id) ||
      (member.friends || []).includes(freshCurrentUser.id)
    );
  };

  return (
    <div className="group-info-modal-overlay" onClick={onClose}>
      <div className="group-info-modal" onClick={e => e.stopPropagation()}>
        <h2>Group Members</h2>
        {isAdmin && (
          <div style={{marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8}}>
            <span className="group-admin-badge" style={{background:'#222c', color:'#fff', borderRadius:6, padding:'3px 12px', fontWeight:600, fontSize:14, letterSpacing:0.5}}>You are the Admin</span>
          </div>
        )}
        <div className="group-members-grid">
          {members.map((u) => (
            <div key={u.id} className="group-member-card">
              <img
                src={u.avatar && typeof u.avatar === 'string' && u.avatar !== './avatar.png' ? u.avatar : './avatar.png'}
                alt="avatar"
                className="group-member-avatar"
                onError={e => { e.target.onerror = null; e.target.src = './avatar.png'; }}
              />
              <div className="group-member-content">
                <span className="group-member-username">{u.username}
                  {u.id === group.adminId && (
                    <span style={{marginLeft:8, color:'#facc15', fontWeight:600, fontSize:13, background:'rgba(250,204,21,0.12)', borderRadius:5, padding:'2px 8px'}}>Admin</span>
                  )}
                </span>
                {u.id !== freshCurrentUser.id && (
                  isFriend(u) ? (
                    <span className="group-member-badge">Friends</span>
                  ) : (
                    <span style={{display:'flex',alignItems:'center',gap:4}}>
                      <img
                        src="./plus.png"
                        alt="Add friend"
                        title="Arkadaş ekle"
                        style={{ width: 18, height: 18, cursor: 'pointer' }}
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const res = await fetch('http://localhost:5000/api/friend-request', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ from: freshCurrentUser.id, to: u.id })
                            });
                            const data = await res.json();
                            if (data.success) {
                              toast.success('Arkadaşlık isteği gönderildi!');
                            } else {
                              toast.error(data.error || 'İstek gönderilemedi');
                            }
                          } catch {
                            toast.error('İstek gönderilemedi');
                          }
                        }}
                      />
                      {/* İstek gönderildiyse göster */}
                      {(freshCurrentUser.sentRequests || []).includes(u.id) && (
                        <span style={{ color: '#888', fontSize: 12 }}>İstek gönderildi</span>
                      )}
                    </span>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
        {isAdmin && (
          <div className="add-user-section">
            <h4>Add User to Group</h4>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <input
                type="text"
                placeholder="Username"
                value={addUserInput}
                onChange={e => setAddUserInput(e.target.value)}
                disabled={adding}
                style={{ flex: 1 }}
              />
              <button onClick={handleSearch} disabled={loading || !addUserInput}>
                Search
              </button>
            </div>
            {searchResult && (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{searchResult.username}</span>
                <button onClick={handleAddUser} disabled={adding}>
                  Add to Group
                </button>
              </div>
            )}
          </div>
        )}
        <button className="close-btn" onClick={onClose} style={{ marginTop: 16 }}>Close</button>
      </div>
    </div>
  );
};

export default GroupInfoModal;
