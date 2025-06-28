import "./userInfo.css";
import { useUserStore } from "../../../lib/userStore";
import { auth } from "../../../lib/firebase";
import { signOut } from "firebase/auth";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import LanguageSelector from "../../languageSelector/LanguageSelector";
import { useRef, useState, useEffect } from "react";
import upload from "../../../lib/upload";
import { useTranslation } from "react-i18next";
import GroupCreateModal from '../../chat/GroupCreateModal';

// Userinfo now accepts a 'user' prop (the user to display info for). If not provided, shows currentUser (yourself).
const Userinfo = ({ user }) => {
  const { t } = useTranslation();
  const { currentUser, userLanguage, updateUserLanguage, clearUser, updateUser, fetchUserInfo } = useUserStore();
  const navigate = useNavigate();
  const fileInputRef = useRef();
  const [avatarVersion, setAvatarVersion] = useState(Date.now());
  const [showGroupModal, setShowGroupModal] = useState(false);
  // Avatar versiyonu güncellendiğinde global olarak güncellenmesi için event listener
  useEffect(() => {
    const handler = () => setAvatarVersion(Date.now());
    window.addEventListener('avatar-updated', handler);
    return () => window.removeEventListener('avatar-updated', handler);
  }, []);

  useEffect(() => {
    if (currentUser?.avatarVersion) {
      setAvatarVersion(currentUser.avatarVersion);
    }
  }, [currentUser?.avatarVersion]);

  // If no user prop, show currentUser (yourself)
  const displayUser = user || currentUser;
  if (!displayUser) {
    return null;
  }

  const handleLogout = async () => {
    try {
      // Clear user state first
      clearUser();
      
      // Sign out from Firebase
      await signOut(auth);
      
      toast.success("Logged out successfully!");
      navigate("/");
    } catch (err) {
      console.log(err);
      toast.error("Error logging out");
    }
  };

  const handleLanguageChange = async (language) => {
    try {
      const success = await updateUserLanguage(language);
      if (success) {
        toast.success(`Language changed to ${language.toUpperCase()}`);
      } else {
        toast.error("Failed to update language");
      }
    } catch (error) {
      console.error('Error changing language:', error);
      toast.error("Error changing language");
    }
  };

  const handleAvatarEditClick = () => {
    fileInputRef.current.click();
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Check file type and set extension accordingly
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      toast.error('Only PNG, JPG, and JPEG files are allowed');
      return;
    }
    try {
      const url = await upload(file);
      // Update Firestore user avatar and avatarVersion
      const newAvatarVersion = Date.now();
      await updateUser({ ...currentUser, avatar: url, avatarVersion: newAvatarVersion });
      // LocalStorage'a da yaz
      localStorage.setItem('currentUser', JSON.stringify({ ...currentUser, avatar: url, avatarVersion: newAvatarVersion }));
      // Fetch latest user info to update UI
      if (currentUser?.id && typeof fetchUserInfo === 'function') {
        await fetchUserInfo(currentUser.id);
        setAvatarVersion(newAvatarVersion);
        window.dispatchEvent(new Event('avatar-updated'));
      }
      else {
        setAvatarVersion(newAvatarVersion);
        window.dispatchEvent(new Event('avatar-updated'));
      }
      // Aktif chat'teki user güncelleniyorsa, chatStore'daki user'ı da güncelle
      try {
        const { updateChatUser } = require("../../../lib/chatStore").useChatStore.getState();
        if (typeof updateChatUser === "function") {
          updateChatUser({ ...currentUser, avatar: url, avatarVersion: newAvatarVersion });
        }
      } catch (e) { /* ignore */ }
      toast.success("Profile photo updated!");
    } catch (err) {
      toast.error("Failed to update avatar");
    }
  };

  return (
    <div className='userInfo'>
      <div className="user">
        <img
          src={
            displayUser?.avatar && typeof displayUser.avatar === 'string' && displayUser.avatar !== './avatar.png'
              ? `${displayUser.avatar.startsWith('http') ? displayUser.avatar : 'http://localhost:5000' + displayUser.avatar}${displayUser.avatar.includes('?') ? '&' : '?'}v=${avatarVersion}`
              : './avatar.png'
          }
          alt=""
          onError={e => { e.target.onerror = null; e.target.src = './avatar.png'; }}
        />
        <h2>{displayUser?.username}</h2>
      </div>
      <div className="language-section">
        <LanguageSelector 
          currentLanguage={userLanguage}
          onLanguageChange={handleLanguageChange}
          showLabel={false}
        />
      </div>
      <div className="icons" style={{ position: 'relative' }}>
        <img
          src="./more.png"
          alt="New Group Chat"
          style={{ width: 24, height: 24, cursor: 'pointer', marginLeft: 8 }}
          title={t('create_group') || 'Create Group'}
          onClick={() => setShowGroupModal(true)}
        />
        {showGroupModal && (
          <GroupCreateModal
            currentUserId={currentUser?.id}
            onClose={() => setShowGroupModal(false)}
            onGroupCreated={() => setShowGroupModal(false)}
          />
        )}
        <img src="./video.png" alt="" />
        {/* Edit avatar button */}
        <button
          className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-1 shadow-md border-2 border-white flex items-center justify-center"
          style={{ width: 32, height: 32 }}
          onClick={handleAvatarEditClick}
          title="Change profile photo"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6-6m2 2l-6 6m-2 2h6" />
          </svg>
        </button>
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleAvatarChange}
        />
        {/* Arkadaşlıktan Çıkar butonu: sadece başka bir kullanıcı ve arkadaşsa göster */}
        {user && currentUser && currentUser.friends && currentUser.friends.includes(user.id) && (
          <button
            className="unfriend-btn"
            style={{ background: '#f87171', color: '#fff', margin: '8px 0' }}
            onClick={async () => {
              try {
                // Debug: log the payload
                console.log("Unfriend payload (Userinfo):", { userId: currentUser.id, friendId: user.id });
                const res = await fetch("http://localhost:5000/api/unfriend", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    userId: currentUser.id,
                    friendId: user.id,
                  }),
                });
                const data = await res.json();
                if (data.success) {
                  toast.success("Arkadaşlıktan çıkarıldı!");
                  // Remove user from local friends list for instant UI update
                  if (typeof updateUser === 'function') {
                    updateUser({
                      ...currentUser,
                      friends: currentUser.friends.filter(fid => fid !== user.id)
                    });
                  }
                  // Optionally refresh user info
                  if (typeof fetchUserInfo === 'function') await fetchUserInfo(currentUser.id);
                  // Reset chat if the unfriended user is currently open
                  try {
                    const chatStore = require('../../../lib/chatStore');
                    if (chatStore && chatStore.useChatStore && chatStore.useChatStore.getState().user?.id === user.id) {
                      chatStore.useChatStore.getState().resetChat();
                    }
                  } catch (e) { /* ignore */ }
                } else {
                  toast.error(data.error || "Arkadaşlıktan çıkarılamadı");
                }
              } catch (err) {
                toast.error("Arkadaşlıktan çıkarılamadı");
              }
            }}
          >
            Arkadaşlıktan Çıkar
          </button>
        )}
        <button onClick={handleLogout} className="logout-btn">
          {t("logout")}
        </button>
      </div>
    </div>
  );
};

export default Userinfo;

