import "./addUser.css";
import { db } from "../../../../lib/firebase";
import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { useState } from "react";
import { useUserStore } from "../../../../lib/userStore";
import { toast } from "react-toastify";

const AddUser = ({ setAddMode }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");

  const { currentUser } = useUserStore();

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    const username = searchInput.trim();
    if (!username) {
      toast.warn("Please enter a username");
      setLoading(false);
      return;
    }
    try {
      // Backend üzerinden kullanıcı ara
      const res = await fetch(`http://localhost:5000/api/searchUser?username=${encodeURIComponent(username)}`);
      const data = await res.json();
      if (!data.user) {
        toast.warn("User not found");
        setUser(null);
        setLoading(false);
        return;
      }
      const foundUser = data.user;
      
      // Check if user is trying to add themselves
      if (foundUser.id === currentUser.id) {
        toast.warn("You cannot add yourself!");
        setUser(null);
        setLoading(false);
        return;
      }
      
      // Check if user is already in chat list
      const userChatsRef = doc(db, "userchats", currentUser.id);
      const userChatsSnap = await getDoc(userChatsRef);
      
      if (userChatsSnap.exists()) {
        const userChatsData = userChatsSnap.data();
        const existingChat = userChatsData.chats?.find(chat => chat.receiverId === foundUser.id);
        
        if (existingChat) {
          toast.warn("User already in your chat list!");
          setUser(null);
          setLoading(false);
          return;
        }
      }
      
      setUser(foundUser);
      toast.success("User found!");
    } catch (err) {
      console.error(err);
      toast.error("Search failed");
      setUser(null);
    }
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Arkadaşlık isteği gönder
      const res = await fetch('http://localhost:5000/api/friendRequest/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromUserId: currentUser.id,
          toUserId: user.id
        })
      });
      const data = await res.json();
      if (!data.success) {
        if (data.error === 'Request already sent') {
          toast.warn('Friend request already sent!');
        } else if (data.error === 'Already friends') {
          toast.warn('You are already friends!');
        } else {
          throw new Error(data.error || 'Friend request could not be sent');
        }
      } else {
        toast.success('Friend request sent!');
      }
      setUser(null);
      setSearchInput("");
      if (setAddMode) {
        setAddMode(false);
      }
    } catch (err) {
      console.log(err);
      toast.error('Error sending friend request');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setUser(null);
    setSearchInput("");
    if (setAddMode) {
      setAddMode(false);
    }
  };

  return (
    <div className="addUser">
      <div className="addUser-header">
        <h3>Add New Chat</h3>
        <button className="close-btn" onClick={handleCancel}>×</button>
      </div>
      
      <form onSubmit={handleSearch}>
        <input 
          type="text" 
          placeholder="Enter username" 
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          disabled={loading}
        />
        <button type="submit" disabled={loading || !searchInput.trim()}>
          {loading ? "Searching..." : "Search"}
        </button>
      </form>
      
      {user && (
        <div className="user">
          <div className="detail">
            <img
              src={user.avatar && typeof user.avatar === 'string' && user.avatar !== './avatar.png'
                ? user.avatar.startsWith('http')
                  ? user.avatar
                  : 'http://localhost:5000' + user.avatar
                : './avatar.png'}
              alt=""
              width={50}
              height={50}
              style={{ width: 50, height: 50, borderRadius: '50%', objectFit: 'cover', objectPosition: 'center', background: '#222', display: 'block' }}
              onError={e => { e.target.onerror = null; e.target.src = './avatar.png'; }}
            />
            <div className="user-info">
              <span className="username">{user.username}</span>
              <span className="email">{user.email}</span>
            </div>
          </div>
          <div className="actions">
            <button onClick={handleAdd} disabled={loading} className="add-btn">
              {loading ? "Adding..." : "Add User"}
            </button>
            <button onClick={() => setUser(null)} className="cancel-btn">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddUser;

