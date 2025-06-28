import { arrayRemove, arrayUnion, doc, updateDoc } from "firebase/firestore";
import { onSnapshot } from "firebase/firestore";
import { useChatStore } from "../../lib/chatStore";
import { auth, db } from "../../lib/firebase";
import { useUserStore } from "../../lib/userStore";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import "./detail.css";
import { useTranslation } from "../../i18n";
import SupportForm from './SupportForm';
import GroupCreateModal from '../chat/GroupCreateModal';
import { debugDetailMedia } from './debugDetailMedia';

const Detail = () => {
  const { chatId, user, isCurrentUserBlocked, isReceiverBlocked, changeBlock, resetChat } = useChatStore();
  const { currentUser, clearUser } = useUserStore();
  const navigate = useNavigate();
  const [settings, setSettings] = useState({});
  const [showSettings, setShowSettings] = useState(false);
  const [showMedia, setShowMedia] = useState(false);
  const [media, setMedia] = useState({ photos: [], videos: [], files: [] });
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImage, setModalImage] = useState(null);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(user?.avatarVersion || Date.now());
  const [chatMessages, setChatMessages] = useState([]); // <-- new
  const t = useTranslation();

  // Fetch chat messages for shared media (Firestore'dan)
  useEffect(() => {
    if (!chatId) return;
    const unsub = onSnapshot(doc(db, "chats", chatId), (res) => {
      if (res.exists()) {
        setChatMessages(res.data().messages || []);
      } else {
        setChatMessages([]);
      }
    });
    return () => unsub();
  }, [chatId, showMedia]);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!chatId || !currentUser) return;
      try {
        const res = await fetch(`http://localhost:5000/api/chatSettings/get?chatId=${chatId}&userId=${currentUser.id}`);
        const data = await res.json();
        setSettings(data.settings || {});
      } catch (err) {
        setSettings({});
      }
    };
    fetchSettings();
  }, [chatId, currentUser]);

  // Medya verilerini backend'den çek (örnek endpoint, backend'de /api/chatMedia/get olmalı)
  useEffect(() => {
    if (!chatId || !currentUser) return;
    if (!showMedia) return;
    const fetchMedia = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/chatMedia/get?chatId=${chatId}`);
        const data = await res.json();
        setMedia(data.media || { photos: [], videos: [], files: [] });
      } catch (err) {
        setMedia({ photos: [], videos: [], files: [] });
      }
    };
    fetchMedia();
  }, [chatId, currentUser, showMedia]);

  useEffect(() => {
    // Update avatarVersion when user.avatarVersion changes (event-driven update)
    setAvatarVersion(user?.avatarVersion || Date.now());
  }, [user?.avatarVersion]);

  const handleBlock = async () => {
    if (!user || !currentUser) return;

    const userDocRef = doc(db, "users", currentUser.id);

    try {
      await updateDoc(userDocRef, {
        blocked: isReceiverBlocked ? arrayRemove(user.id) : arrayUnion(user.id),
      });
      changeBlock();
      toast.success(
        isReceiverBlocked 
          ? `${user.username} has been unblocked` 
          : `${user.username} has been blocked`
      );
    } catch (err) {
      console.error("Error blocking/unblocking user:", err);
      toast.error("Failed to update block status");
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      resetChat();
      clearUser();
      toast.success("Logged out successfully!");
      navigate("/");
    } catch (err) {
      console.error("Error logging out:", err);
      toast.error("Error logging out");
    }
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const saveSettings = async () => {
    if (!chatId || !currentUser) return;
    try {
      await fetch('http://localhost:5000/api/chatSettings/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, userId: currentUser.id, settings })
      });
      toast.success('Settings saved!');
      setShowSettings(false);
    } catch (err) {
      toast.error('Failed to save settings');
    }
  };

  const handleUnfriend = async () => {
    if (!currentUser || !user || user.isGroup) return; // Sadece birebir kullanıcılar için
    try {
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
        toast.success(t("unfriend_success") || "Arkadaşlıktan çıkarıldı!");
        // İsteğe bağlı: chat listesinden çıkarma veya UI güncelleme
      } else {
        toast.error(data.error || t("unfriend_failed") || "Arkadaşlıktan çıkarılamadı");
      }
    } catch (err) {
      toast.error(t("unfriend_failed") || "Arkadaşlıktan çıkarılamadı");
    }
  };

  const handleLeaveGroup = async () => {
    if (!currentUser || !user || !user.isGroup) return;
    // chatId'yi fallback olarak kullan
    const groupId = user.id || chatId;
    if (!groupId) {
      toast.error('Group ID bulunamadı!');
      return;
    }
    try {
      const res = await fetch("http://localhost:5000/api/group/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          groupId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(t("left_group_success") || "Gruptan çıkıldı!");
        // UI güncellemesi
      } else {
        toast.error(data.error || t("left_group_failed") || "Gruptan çıkılamadı");
      }
    } catch (err) {
      toast.error(t("left_group_failed") || "Gruptan çıkılamadı");
    }
  };

  // Birleştirilmiş görseller: hem media.photos hem de chatMessages içindeki img'ler
  const allPhotos = [
    ...((media.photos || []).filter(p => !!p.url)),
    ...chatMessages
      .filter(m => m.img && !(m.img.endsWith('.mp4') || m.img.endsWith('.webm') || m.img.endsWith('.mov') || m.img.endsWith('.avi')))
      .map(m => ({ url: m.img.startsWith('http') ? m.img : `http://localhost:5000${m.img}`, name: m.text || '' }))
  ];

  // Birleştirilmiş videolar: media.videos ve chatMessages içindeki video dosyaları
  const allVideos = [
    ...((media.videos || []).filter(v => !!v.url)),
    ...chatMessages
      .filter(m => m.img && (m.img.endsWith('.mp4') || m.img.endsWith('.webm') || m.img.endsWith('.mov') || m.img.endsWith('.avi')))
      .map(m => ({ url: m.img.startsWith('http') ? m.img : `http://localhost:5000${m.img}`, name: m.text || '' }))
  ];

  if (!user) {
    return (
      <div className="detail">
        <div className="no-user">
          <p>Select a chat to view details</p>
        </div>
      </div>
    );
  }

  return (
      <div className="detail">
        <div className="user">
          <img
            src={user?.avatar && typeof user.avatar === 'string' && user.avatar !== '/avatar.png'
              ? (user.avatar.startsWith('http')
                  ? `${user.avatar}?v=${avatarVersion}`
                  : `http://localhost:5000${user.avatar}?v=${avatarVersion}`)
              : '/avatar.png'}
            alt="profile"
            style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', border: '2px solid #6366f1', background: '#fff' }}
            onError={e => { e.target.onerror = null; e.target.src = '/avatar.png'; }}
          />
          <h2>{user?.username}</h2>
          <p>{user?.email || "No email available"}</p>
        </div>
        {showGroupModal && (
          <GroupCreateModal
            currentUserId={currentUser?.id}
            onClose={() => setShowGroupModal(false)}
            onGroupCreated={() => setShowGroupModal(false)}
          />
        )}
        <div className="info">
          <div className="option" style={{position:'relative'}}>
            <div className="title" onClick={() => setShowSettings(true)} style={{cursor:'pointer'}}>
              <span>{t('chat_settings')}</span>
              <img src="./arrowUp.png" alt="" />
            </div>
            {showSettings && (
              <div className="chat-settings-modal">
                <div className="chat-settings-content">
                  <h3>{t('chat_settings')}</h3>
                  <label>{t('font_family')}:
                    <select value={settings.fontFamily || "Arial"} onChange={e => handleSettingChange('fontFamily', e.target.value)}>
                      <option value="Arial">Arial</option>
                      <option value="Roboto">Roboto</option>
                      <option value="Times New Roman">Times New Roman</option>
                      <option value="Courier New">Courier New</option>
                    </select>
                  </label>
                  <label>{t('font_weight')}:
                    <select value={settings.fontWeight || "normal"} onChange={e => handleSettingChange('fontWeight', e.target.value)}>
                      <option value="normal">Normal</option>
                      <option value="bold">Bold</option>
                      <option value="bolder">Bolder</option>
                    </select>
                  </label>
                 
                  
                  <div style={{display:'flex',gap:'10px',marginTop:'10px'}}>
                    <button onClick={saveSettings}>{t('save')}</button>
                    <button onClick={()=>setShowSettings(false)}>{t('cancel')}</button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="option" style={{position:'relative'}}>
            <div className="title" onClick={() => setShowPrivacy(v => !v)} style={{cursor:'pointer'}}>
              <span>{t('privacy_help')}</span>
              <img src={showPrivacy ? "./arrowUp.png" : "./arrowDown.png"} alt="" />
            </div>
            {showPrivacy && (
              <div className="chat-settings-modal" style={{right:0, left:'unset', top:'60px', minWidth:'320px', maxWidth:'400px'}}>
                <div className="chat-settings-content">
                  <h3>{t('privacy_help')}</h3>
                  <div style={{marginBottom:'12px'}}>
                    <strong>{t('privacy')}:</strong>
                    <ul style={{margin:'8px 0 0 18px'}}>
                      <li>{t('privacy_msg1')}</li>
                      <li>{t('privacy_msg2')}</li>
                      <li>{t('privacy_msg3')}</li>
                      <li>{t('privacy_msg4')}</li>
                    </ul>
                  </div>
                  <div>
                    <strong>{t('help')}:</strong>
                    <ul style={{margin:'8px 0 0 18px'}}>
                      <li>{t('help_msg1')}</li>
                      <li>{t('help_msg2')}</li>
                      <li>{t('help_msg3')}</li>
                      <li>{t('help_msg4')}</li>
                    </ul>
                  </div>
                  <div style={{margin:'16px 0'}}>
                    <SupportForm user={currentUser} lang={currentUser?.language || 'en'} />
                  </div>
                  <div style={{display:'flex',gap:'10px',marginTop:'10px'}}>
                    <button onClick={()=>setShowPrivacy(false)}>{t('close')}</button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="option" style={{position:'relative'}}>
            <div className="title" onClick={() => setShowMedia(v => !v)} style={{cursor:'pointer'}}>
              <span>{t('shared_media')}</span>
              <img src={showMedia ? "./arrowUp.png" : "./arrowDown.png"} alt="" />
            </div>
            {showMedia && (
              <div className="chat-settings-modal" style={{right:0, left:'unset', top:'60px', minWidth:'320px', maxWidth:'400px'}}>
                <div className="chat-settings-content">
                  <h3>{t('shared_media')}</h3>
                  <div>
                    <h4>{t('photos')}</h4>
                    <div className="media-grid" style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 0fr)', // grid fix
                      gap: '2px',
                      marginBottom: '8px',
                    }}>
                      {allPhotos.length === 0 ? <div>{t('no_photos')}</div> : allPhotos.map((item, i) => (
                        <div
                          className="media-thumb"
                          key={i}
                          tabIndex={0}
                          role="button"
                          aria-label={item.name || t('photo')}
                          style={{
                            aspectRatio: '1/1',
                            width: '44px',
                            height: '44px',
                            overflow: 'hidden',
                            borderRadius: 5,
                            background: '#222',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'transform 0.18s cubic-bezier(.4,2,.6,1), z-index 0.18s',
                            position: 'relative',
                            zIndex: 1,
                            outline: 'none',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.transform = 'scale(2.2)';
                            e.currentTarget.style.zIndex = 10;
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.zIndex = 1;
                          }}
                          onClick={() => {
                            setModalImage(item.url);
                            setShowImageModal(true);
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              setModalImage(item.url);
                              setShowImageModal(true);
                            }
                          }}
                          onFocus={e => {
                            e.currentTarget.style.boxShadow = '0 0 0 2px #6366f1';
                          }}
                          onBlur={e => {
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <img src={item.url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 5 }} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4>{t('videos')}</h4>
                    <div className="media-grid" style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: '0',
                      marginBottom: '8px',
                    }}>
                      {allVideos.length === 0 ? <div>{t('no_videos')}</div> : allVideos.map((item, i) => (
                        <div className="media-thumb" key={i}
                          style={{
                            aspectRatio: '1/1',
                            width: '44px',
                            height: '44px',
                            overflow: 'hidden',
                            borderRadius: 5,
                            background: '#222',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'transform 0.18s cubic-bezier(.4,2,.6,1), z-index 0.18s',
                            position: 'relative',
                            zIndex: 1
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.transform = 'scale(2.2)';
                            e.currentTarget.style.zIndex = 10;
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.zIndex = 1;
                          }}
                        >
                          <video src={item.url} controls style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 5, background: '#222' }} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{display:'flex',gap:'10px',marginTop:'10px'}}>
                    <button onClick={()=>setShowMedia(false)}>{t('close')}</button>
                  </div>
                </div>
              </div>
            )}
            {showImageModal && (
              <div
                className="image-modal"
                tabIndex={-1}
                style={{display:'flex',alignItems:'center',justifyContent:'center',position:'fixed',top:0,left:0,right:0,bottom:0,zIndex:2000,background:'rgba(0,0,0,0.65)'}}
                onClick={e => {
                  if (e.target.className === 'image-modal') {
                    setShowImageModal(false);
                    setModalImage(null);
                  }
                }}
                onKeyDown={e => {
                  if (e.key === 'Escape') {
                    setShowImageModal(false);
                    setModalImage(null);
                  }
                }}
              >
                <img src={modalImage} alt="full" style={{maxWidth:'80vw',maxHeight:'80vh',borderRadius:12,boxShadow:'0 4px 32px #0008'}} />
              </div>
            )}
          </div>
          <div className="option">
            <div className="title">
              <span>{t('shared_files')}</span>
              <img src="./arrowUp.png" alt="" />
            </div>
            <div>
              {media.files.length === 0 ? <div>{t('no_files')}</div> : media.files.map((item, i) => (
                <div className="photoItem" key={i}>
                  <div className="photoDetail">
                    <img src="./file.png" alt="file" style={{width:40,height:40}} />
                    <span>{item.name}</span>
                  </div>
                  <a href={item.url} download><img src="./download.png" alt="download" className="icon" /></a>
                </div>
              ))}
            </div>
          </div>
          
          <div className="actions">
            {!user.isGroup && (
              <button 
                onClick={handleBlock}
                className={isReceiverBlocked ? "unblock-btn" : "block-btn"}
                disabled={isCurrentUserBlocked}
                style={{marginBottom:8}}
              >
                {isCurrentUserBlocked
                  ? t('blocked_you')
                  : isReceiverBlocked
                  ? `${t('unblock')} ${user.username}`
                  : `${t('block')} ${user.username}`}
              </button>
            )}
            {user.isGroup ? (
              <button className="leave-group" onClick={handleLeaveGroup}>
                {t('leave_group')}
              </button>
            ) : (
              <button className="unfriend" onClick={handleUnfriend}>
                {t('unfriend')}
              </button>
            )}
          </div>
        </div>
      </div>
  );
};

export default Detail;

