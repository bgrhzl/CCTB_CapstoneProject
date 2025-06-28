import { doc, getDoc, onSnapshot, updateDoc, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import AddUser from "./addUser/addUser";
import GroupCreateModal from "../../chat/GroupCreateModal";
import { db } from "../../../lib/firebase";
import { useChatStore } from "../../../lib/chatStore";
import { useUserStore } from "../../../lib/userStore";
import { useTranslation } from "react-i18next";
import "./chatList.css";

const ChatList = ({ showFriendRequests, setShowFriendRequests }) => {
  const { t } = useTranslation();
  const [chats, setChats] = useState([]);
  const [addMode, setAddMode] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requestCount, setRequestCount] = useState(0);
  const [showGroupModal, setShowGroupModal] = useState(false);

  const { currentUser } = useUserStore();
  const { chatId, changeChat } = useChatStore();
  const [avatarVersion, setAvatarVersion] = useState(Date.now());

  useEffect(() => {
    const handler = () => {
      setAvatarVersion(Date.now());
      // currentUser'ı localStorage'dan güncelle
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.avatar) {
            // Eğer güncel avatar varsa, state'i güncelle
            if (currentUser && currentUser.id === parsed.id) {
              currentUser.avatar = parsed.avatar;
            }
          }
        } catch {}
      }
    };
    window.addEventListener('avatar-updated', handler);
    return () => window.removeEventListener('avatar-updated', handler);
  }, []);

  useEffect(() => {
    if (!currentUser?.id) {
      console.log("No current user, stopping loading");
      setLoading(false);
      setChats([]);
      return;
    }

    console.log("Setting up chat listener for user:", currentUser.id);
    setLoading(true);
    setError(null);

    const unSub = onSnapshot(
      doc(db, "userchats", currentUser.id),
      async (res) => {
        try {
          console.log("Firestore snapshot received, exists:", res.exists());

          if (!res.exists()) {
            // Create userchats document if it doesn't exist
            console.log("Creating userchats document for user:", currentUser.id);
            try {
              await setDoc(doc(db, "userchats", currentUser.id), {
                chats: [],
              });
              console.log("Created empty userchats document");
            } catch (createError) {
              console.error("Error creating userchats document:", createError);
            }
            setChats([]);
            setLoading(false);
            return;
          }

          const data = res.data();
          console.log("Userchats data:", data);

          const items = data?.chats || [];
          console.log("Chat items found:", items.length);

          if (items.length === 0) {
            console.log("No chats found, showing empty state");
            setChats([]);
            setLoading(false);
            return;
          }

          console.log("Processing", items.length, "chat items");
          const promises = items.map(async (item, index) => {
            try {
              if (item.isGroup) {
                // Grup sohbeti için user objesi oluştur
                return {
                  ...item,
                  user: {
                    id: item.chatId,
                    username: item.name,
                    avatar: item.groupAvatar || "./avatar.png",
                    isGroup: true,
                    users: item.users,
                    name: item.name,
                    groupAvatar: item.groupAvatar,
                  },
                };
              }
              // Birebir sohbet için mevcut kullanıcıyı çek
              const userDocRef = doc(db, "users", item.receiverId);
              const userDocSnap = await getDoc(userDocRef);

              if (userDocSnap.exists()) {
                const user = userDocSnap.data();
                return { ...item, user };
              } else {
                console.warn(`User not found: ${item.receiverId}`);
                return null;
              }
            } catch (error) {
              console.error(`Error fetching user ${item.receiverId}:`, error);
              return null;
            }
          });

          const chatData = await Promise.all(promises);
          const validChats = chatData.filter((chat) => chat !== null);
          console.log("Valid chats processed:", validChats.length);

          setChats(validChats.sort((a, b) => b.updatedAt - a.updatedAt));
          setError(null);
        } catch (error) {
          console.error("Error in snapshot handler:", error);
          setError("Error loading chats");
          toast.error("Error loading chats");
        } finally {
          console.log("Setting loading to false");
          setLoading(false);
        }
      },
      (error) => {
        console.error("Firestore listener error:", error);
        setError("Error connecting to chat service");
        toast.error("Error connecting to chat service");
        setLoading(false);
      }
    );

    return () => {
      console.log("Cleaning up chat listener");
      unSub();
    };
  }, [currentUser?.id]);

  const handleSelect = async (chat) => {
    if (!chat.isGroup && (!chat.user || !chat.user.id)) {
      toast.error("Kullanıcı bilgisi eksik!");
      return;
    }

    try {
      const userChats = chats.map((item) => {
        const { user, ...rest } = item;
        return rest;
      });

      const chatIndex = userChats.findIndex(
        (item) => item.chatId === chat.chatId
      );

      if (chatIndex !== -1) {
        userChats[chatIndex].isSeen = true;

        const userChatsRef = doc(db, "userchats", currentUser.id);

        await updateDoc(userChatsRef, {
          chats: userChats,
        });
      }

      if (chat.isGroup) {
        changeChat(chat.chatId, {
          isGroup: true,
          name: chat.name,
          groupAvatar: chat.groupAvatar,
          users: chat.users, // member IDs
        });
      } else {
        changeChat(chat.chatId, chat.user);
      }
    } catch (err) {
      console.error("Error selecting chat:", err);
      toast.error("Error opening chat");
    }
  };

  const filteredChats = chats
    .filter((c) => {
      if (c.isGroup) return true; // Always show group chats
      return c.user && c.user.username && c.user.id;
    })
    .filter((c) => {
      if (c.isGroup) {
        return c.name?.toLowerCase().includes(input.toLowerCase());
      }
      return c.user?.username?.toLowerCase().includes(input.toLowerCase());
    });

  console.log(
    "Render state - loading:",
    loading,
    "error:",
    error,
    "chats:",
    chats.length
  );

  // Friend request count fetcher
  useEffect(() => {
    if (!currentUser?.id) return;
    fetch(`http://localhost:5000/api/friendRequest/list/${currentUser.id}`)
      .then((res) => res.json())
      .then((data) => setRequestCount((data.requests || []).length))
      .catch(() => setRequestCount(0));
  }, [currentUser?.id, addMode]);

  if (loading) {
    return (
      <div className="chatList">
        <div className="search">
          <div className="searchBar">
            <img src="./search.png" alt="" />
            <input
              type="text"
              placeholder={t("Search")}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled
            />
          </div>
          <img
            src="./plus.png"
            alt=""
            className="add disabled"
            title={t("Loading...")}
          />
        </div>
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>{t("Loading chats...")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="chatList">
        <div className="search">
          <div className="searchBar">
            <img src="./search.png" alt="" />
            <input
              type="text"
              placeholder={t("Search")}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled
            />
          </div>
          <img
            src="./plus.png"
            alt=""
            className="add disabled"
            title={t("Error occurred")}
          />
        </div>
        <div className="error">
          <p>{t("Error loading chats")}</p>
          <button onClick={() => window.location.reload()}>{t("Retry")}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="chatList">
      <div className="search">
        <div className="searchBar">
          <img src="./search.png" alt="" />
          <input
            type="text"
            placeholder={t("Search")}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </div>
        <img
          src={addMode ? "./minus.png" : "./plus.png"}
          alt=""
          className="add"
          onClick={() => setAddMode((prev) => !prev)}
          title={addMode ? t("Close") : t("Add new chat")}
        />
        <div className="friend-req-btn-wrapper">
          <button
            className="friend-req-btn"
            onClick={() => setShowFriendRequests(true)}
            title={t("Friend Requests")}
          >
            <img src="./user.png" alt="User" style={{ width: 24, height: 24 }} />
            {/* Only show notif-dot if there are requests */}
            {requestCount > 0 ? (
              <span className="notif-dot">{requestCount}</span>
            ) : null}
          </button>
        </div>
      </div>
      {showGroupModal && (
        <GroupCreateModal
          currentUserId={currentUser?.id}
          onClose={() => setShowGroupModal(false)}
          onGroupCreated={() => setShowGroupModal(false)}
        />
      )}
      {filteredChats.length === 0 && !addMode ? (
        <div className="no-chats">
          <div className="no-chats-content">
            <img src="./chat.png" alt="No chats" className="no-chats-icon" />
            <p>{t("No chats yet")}</p>
            <small>{t("Click the + button to start a new conversation!")}</small>
          </div>
        </div>
      ) : (
        filteredChats.map((chat) => (
          <div
            className="item"
            key={chat.chatId}
            onClick={() => handleSelect(chat)}
            style={{
              backgroundColor: chat?.isSeen ? "transparent" : "#5183fe",
            }}
          >
            {chat.isGroup ? (
              <div style={{position:'relative', display:'inline-block'}}>
                <img
                  src={chat.groupAvatar && typeof chat.groupAvatar === 'string' && chat.groupAvatar !== './avatar.png'
                    ? chat.groupAvatar.startsWith('http')
                      ? `${chat.groupAvatar}${chat.groupAvatar.includes('?') ? '&' : '?'}v=${avatarVersion}`
                      : `http://localhost:5000${chat.groupAvatar}${chat.groupAvatar.includes('?') ? '&' : '?'}v=${avatarVersion}`
                    : './avatar.png'}
                  alt="Group"
                  width={50}
                  height={50}
                  style={{ width: 50, height: 50, borderRadius: '50%', objectFit: 'cover', objectPosition: 'center', background: '#222', display: 'block' }}
                  onError={e => { e.target.onerror = null; e.target.src = "./avatar.png"; }}
                />
              </div>
            ) : (
              <div style={{position:'relative', display:'inline-block'}}>
                <img
                  src={
                    chat.user?.blocked?.includes(currentUser.id)
                      ? './avatar.png'
                      : chat.user?.avatar && typeof chat.user.avatar === 'string' && chat.user.avatar !== './avatar.png'
                        ? `${chat.user.avatar.startsWith('http') ? chat.user.avatar : 'http://localhost:5000' + chat.user.avatar}${chat.user.avatar.includes('?') ? '&' : '?'}v=${avatarVersion}`
                        : './avatar.png'
                  }
                  alt={chat.isGroup ? 'Group' : ''}
                  width={50}
                  height={50}
                  style={{ width: 50, height: 50, borderRadius: '50%', objectFit: 'cover', objectPosition: 'center', background: '#222', display: 'block' }}
                  onError={e => { e.target.onerror = null; e.target.src = './avatar.png'; }}
                />
                {/* Çevrimiçi ise yeşil dot */}
                {chat.user && chat.user.isOnline && (
                  <span style={{
                    position: 'absolute',
                    right: 4,
                    bottom: 4,
                    width: 13,
                    height: 13,
                    background: '#22c55e',
                    border: '2px solid #fff',
                    borderRadius: '50%',
                    boxShadow: '0 0 0 2px #222',
                    zIndex: 2
                  }} />
                )}
              </div>
            )}
            <div className="texts">
              <span>
                {chat.isGroup
                  ? chat.name || t("Group Chat")
                  : chat.user?.blocked?.includes(currentUser.id)
                    ? t("User")
                    : chat.user?.username || t("Unknown User")}
              </span>
              <p>{chat.lastMessage || t("No messages yet")}</p>
            </div>
          </div>
        ))
      )}

      {addMode && <AddUser setAddMode={setAddMode} />}
    </div>
  );
};

export default ChatList;

