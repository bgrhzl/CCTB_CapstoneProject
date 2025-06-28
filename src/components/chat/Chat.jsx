import { useEffect, useRef, useState, useMemo } from "react";
import "./chat.css";
import EmojiPicker from "emoji-picker-react";
import {
  arrayUnion,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useChatStore } from "../../lib/chatStore";
import { useUserStore } from "../../lib/userStore";
import upload from "../../lib/upload";
import { format } from "timeago.js";
import { toast } from "react-toastify";
import translationService from "../../lib/translationService";
import FriendRequests from "../list/chatList/FriendRequests";
import GroupCreateModal from "./GroupCreateModal";
import GroupInfoModal from "./GroupInfoModal";

// Web Speech API desteği kaldırıldı, MediaRecorder ile ses kaydı
// const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const Chat = ({ showFriendRequests, setShowFriendRequests }) => {
  const [chat, setChat] = useState();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [img, setImg] = useState({
    file: null,
    url: "",
  });
  const [loading, setLoading] = useState(false);
  const [translatedMessages, setTranslatedMessages] = useState({});
  const [showOriginal, setShowOriginal] = useState({});
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const [audioError, setAudioError] = useState("");
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
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
            if (user && user.id === parsed.id) {
              user.avatar = parsed.avatar;
            }
          }
        } catch {}
      }
    };
    window.addEventListener('avatar-updated', handler);
    return () => window.removeEventListener('avatar-updated', handler);
  }, []);

  const { currentUser, userLanguage } = useUserStore();
  const { chatId, user: selectedUser, isCurrentUserBlocked, isReceiverBlocked } = useChatStore();

  // If selectedUser is a group, create a pseudo-user object for consistent rendering
  const user = selectedUser?.isGroup
    ? {
        id: chatId, // use chatId as id for group
        username: selectedUser.name,
        avatar: selectedUser.groupAvatar || "./avatar.png",
        isGroup: true,
        users: selectedUser.users,
        name: selectedUser.name,
        groupAvatar: selectedUser.groupAvatar,
      }
    : selectedUser;

  const endRef = useRef(null);
  const recognitionRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (chat?.messages) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
      // Yeni mesaj geldiğinde preview'ı temizle
      setImg({ file: null, url: "" });
    }
  }, [chat?.messages]);

  useEffect(() => {
    if (!chatId) return;
    console.log('Aktif chatId:', chatId);
    const unSub = onSnapshot(
      doc(db, "chats", chatId), 
      (res) => {
        if (res.exists()) {
          console.log('Firestore chat snapshot:', res.data());
          setChat(res.data());
        }
      },
      (error) => {
        console.error("Error listening to chat:", error);
        toast.error("Error connecting to chat");
      }
    );

    return () => {
      unSub();
    };
  }, [chatId]);

  // Manual refresh chat data for debugging
  const refreshChat = async () => {
    if (!chatId) return;
    try {
      const response = await fetch(`http://localhost:5000/api/chat/${chatId}`);
      const data = await response.json();
      if (data.chat) {
        console.log('Manual refresh chat data:', data.chat);
        setChat(data.chat);
      } else {
        console.warn('No chat data returned from manual refresh');
      }
    } catch (error) {
      console.error('Error refreshing chat data:', error);
    }
  };

  // Translate messages when chat or user language changes
  useEffect(() => {
    if (!chat?.messages || !userLanguage) return;

    const translateMessages = async () => {
      const newTranslations = {};
      
      for (const [index, message] of chat.messages.entries()) {
        if (!message.text) continue;
        
        const messageKey = `${index}-${message.text}`;
        
        // Skip if already translated
        if (translatedMessages[messageKey]) {
          newTranslations[messageKey] = translatedMessages[messageKey];
          continue;
        }

        // Check if message has pre-translated versions
        if (message.translations && message.translations[userLanguage]) {
          newTranslations[messageKey] = {
            translatedText: message.translations[userLanguage],
            originalLanguage: message.originalLanguage || 'auto',
            isTranslated: message.originalLanguage !== userLanguage
          };
          continue;
        }

        // Check if translation is needed
        const originalLang = message.originalLanguage || 'auto';
        if (originalLang === userLanguage) {
          newTranslations[messageKey] = {
            translatedText: message.text,
            originalLanguage: originalLang,
            isTranslated: false
          };
          continue;
        }

        // Translate the message
        try {
          const translatedText = await translationService.translateText(
            message.text,
            userLanguage,
            originalLang
          );
          
          newTranslations[messageKey] = {
            translatedText,
            originalLanguage: originalLang,
            isTranslated: translatedText !== message.text
          };
        } catch (error) {
          console.error('Error translating message:', error);
          newTranslations[messageKey] = {
            translatedText: message.text,
            originalLanguage: originalLang,
            isTranslated: false
          };
        }
      }
      
      setTranslatedMessages(prev => ({ ...prev, ...newTranslations }));
    };

    translateMessages();
  }, [chat?.messages, userLanguage]);

  const handleEmoji = (e) => {
    setText((prev) => prev + e.emoji);
    setOpen(false);
  };

  const handleImg = (e) => {
    if (e.target.files[0]) {
      setImg({
        file: e.target.files[0],
        url: URL.createObjectURL(e.target.files[0]),
      });
    }
  };

  // Sesli mesaj başlat/durdur (MediaRecorder)
  const handleMicClick = async () => {
    if (isRecording) {
      if (mediaRecorder) mediaRecorder.stop();
      setIsRecording(false);
    } else {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error("Tarayıcınız ses kaydını desteklemiyor.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const chunks = [];
        const recorder = new window.MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
        setMediaRecorder(recorder);
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data);
          }
        };
        recorder.onstop = async () => {
          stream.getTracks().forEach(track => track.stop());
          const audioBlob = new Blob(chunks, { type: 'audio/webm' });
          if (audioBlob.size < 1000) {
            setAudioError('Ses kaydı alınamadı.');
            toast.error('Ses kaydı alınamadı.');
            return;
          }
          const formData = new FormData();
          formData.append('audio', audioBlob, 'voice-message.webm');
          formData.append('chatId', chatId);
          formData.append('senderId', currentUser.id);
          let userIDs;
          if (user?.isGroup) {
            userIDs = user.users || chat?.users || [];
          } else {
            userIDs = [currentUser.id, user.id];
          }
          formData.append('userIds', JSON.stringify(userIDs));
          try {
            const response = await fetch('http://localhost:5000/api/message/send-audio', {
              method: 'POST',
              body: formData
            });
            const result = await response.json();
            if (!result.success) {
              setAudioError(result.error || 'Sesli mesaj gönderilemedi');
              throw new Error(result.error || 'Failed to send audio message');
            }
            setAudioError("");
          } catch (err) {
            setAudioError('Sesli mesaj gönderilemedi. Sunucuya ulaşılamıyor.');
            toast.error('Sesli mesaj gönderilemedi');
          }
        };
        recorder.start();
        setIsRecording(true);
      } catch (err) {
        toast.error('Mikrofona erişilemiyor');
      }
    }
  };

  // handleSend fonksiyonunu güncelle: dışarıdan text parametresi alabilsin
  const handleSend = async (overrideText) => {
    // Eğer yanlışlıkla event objesi gelirse hiçbir şey yapma
    if (overrideText && (overrideText.nativeEvent || overrideText.target)) return;
    const sendText = overrideText !== undefined ? overrideText : text.trim();
    if (sendText === "" && !img.file) return;
    if (loading) return;
    setLoading(true);
    let imgUrl = null;

    try {
      console.log('handleSend started');
      if (img.file) {
        console.log('Uploading image to Cloudinary...');
        imgUrl = await upload(img.file);
        console.log('Uploaded image URL:', imgUrl);
        if (!imgUrl) {
          toast.error('Image upload failed');
          setLoading(false);
          return;
        }
      }

      // Detect language and pre-translate
      const detectedLang = await translationService.detectLanguage(sendText);
      // Pre-translate to popular languages
      const popularLanguages = ['en', 'tr', 'ja', 'de', 'fr', 'es'];
      const targetLanguages = popularLanguages.filter(lang => lang !== detectedLang);
      const translations = {};
      for (const targetLang of targetLanguages) {
        try {
          translations[targetLang] = await translationService.translateText(
            sendText,
            targetLang,
            detectedLang
          );
        } catch (error) {
          console.error(`Error translating to ${targetLang}:`, error);
        }
      }

      // Backend API'ye mesaj gönder
      let userIDs;
      if (user?.isGroup) {
        userIDs = user.users || chat?.users || [];
      } else {
        userIDs = [currentUser.id, user.id];
      }
      console.log('Sending message to backend with payload:', {
        chatId,
        senderId: currentUser.id,
        text: sendText,
        originalLanguage: detectedLang,
        translations,
        imgUrl,
        userIds: userIDs
      });
      const response = await fetch('http://localhost:5000/api/message/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          senderId: currentUser.id,
          text: sendText,
          originalLanguage: detectedLang,
          translations,
          imgUrl, // imgUrl her zaman doğru şekilde gönderilecek
          userIds: userIDs
        })
      });
      const result = await response.json();
      console.log('Send message API response:', result);
      if (!result.success) {
        throw new Error(result.error || 'Failed to send message');
      }
      // Avatar güncellendiyse, versiyonu artır
      if (user && user.id === currentUser.id) {
        setAvatarVersion(Date.now());
      }
    } catch (err) {
      console.error("Error sending message:", err);
      toast.error("Failed to send message");
    } finally {
      setLoading(false);
      setImg({
        file: null,
        url: "",
      });
      setText("");
      setRecordedText("");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(); // event objesi gönderilmesin
    }
  };

  const toggleOriginalText = (messageKey) => {
    setShowOriginal(prev => ({
      ...prev,
      [messageKey]: !prev[messageKey]
    }));
  };

  const getMessageText = (message, index) => {
    const messageKey = `${index}-${message.text}`;
    const translation = translatedMessages[messageKey];
    
    if (!translation) return message.text;
    
    if (showOriginal[messageKey]) {
      return message.text;
    }
    
    return translation.translatedText;
  };

  const isMessageTranslated = (message, index) => {
    const messageKey = `${index}-${message.text}`;
    const translation = translatedMessages[messageKey];
    return translation?.isTranslated || false;
  };

  // Grup üyeleri için username'leri çek (id ise Firestore'dan getir)
  const [groupUsernames, setGroupUsernames] = useState([]);
  useEffect(() => {
    async function fetchUsernames() {
      if (!user?.isGroup) return;
      const members = chat?.users || user?.users || [];
      // Eğer üyeler zaten {username, id} objesi ise, doğrudan kullan
      if (members.length > 0 && typeof members[0] === "object" && members[0].username) {
        setGroupUsernames(members.map(u => u.username));
        return;
      }
      // Aksi halde Firestore'dan çek
      const usernames = await Promise.all(
        members.map(async (uid) => {
          if (typeof uid === "object" && uid.username) return uid.username;
          try {
            const userDoc = await getDoc(doc(db, "users", uid));
            return userDoc.exists() ? userDoc.data().username : uid;
          } catch {
            return uid;
          }
        })
      );
      setGroupUsernames(usernames);
    }
    fetchUsernames();
  }, [user, chat]);

  // Unfriend logic for Chat header (optional, for quick access)
  const handleUnfriend = async () => {
    if (!currentUser || !user || user.isGroup) return;
    // Debug: log the payload
    console.log("Unfriend payload:", { userId: currentUser.id, friendId: user.id });
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
        toast.success("Arkadaşlıktan çıkarıldı!");
        setChat(undefined);
        // Sohbetten çıkınca chatStore'u da sıfırla
        if (typeof useChatStore === 'function' && useChatStore.getState().resetChat) {
          useChatStore.getState().resetChat();
        }
      } else {
        toast.error(data.error || "Arkadaşlıktan çıkarılamadı");
      }
    } catch (err) {
      toast.error("Arkadaşlıktan çıkarılamadı");
    }
  };

  if (!user) {
    return (
      <div className="chat flex items-center justify-center min-h-full bg-gradient-to-br from-blue-50 to-purple-100">
        <div className="no-chat-content flex flex-col items-center justify-center p-8 bg-white rounded-xl shadow-lg border border-gray-200">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-blue-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 01-4-.8l-4.28 1.07a1 1 0 01-1.22-1.22l1.07-4.28A8.96 8.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <h3 className="text-2xl font-semibold text-gray-700 mb-2">Select a chat to start messaging</h3>
          <p className="text-gray-500 text-center max-w-xs">Choose from your existing conversations or start a new one to begin chatting securely and instantly.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat">
      <div className="top">
        <div className="user" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {/* Sadece profil/grup fotoğrafı, animasyon yok */}
          <div className="profile-card">
            <img
              src={
                user?.isGroup
                  ? user?.groupAvatar && typeof user.groupAvatar === 'string' && user.groupAvatar !== './avatar.png'
                    ? user.groupAvatar.startsWith('http')
                      ? `${user.groupAvatar}${user.groupAvatar.includes('?') ? '&' : '?'}v=${avatarVersion}`
                      : `http://localhost:5000${user.groupAvatar}${user.groupAvatar.includes('?') ? '&' : '?'}v=${avatarVersion}`
                    : './avatar.png'
                  : user?.avatar && typeof user.avatar === 'string' && user.avatar !== './avatar.png'
                    ? user.avatar.startsWith('http')
                      ? `${user.avatar}${user.avatar.includes('?') ? '&' : '?'}v=${avatarVersion}`
                      : `http://localhost:5000${user.avatar}${user.avatar.includes('?') ? '&' : '?'}v=${avatarVersion}`
                    : './avatar.png'
              }
              alt="profile"
              className="profile-photo"
              onError={e => {
                e.target.onerror = null;
                e.target.src = './avatar.png';
              }}
            />
          </div>
          <div className="texts">
            <span>{user?.isGroup ? user?.name : user?.username}</span>
            <p>
              {user?.isGroup
                ? (() => {
                    // Grup üyelerinin adlarını göster (en fazla 3 username)
                    const memberUsernames = groupUsernames;
                    if (memberUsernames.length === 0) return "";
                    const shown = memberUsernames.slice(0, 3).join(", ");
                    const more = memberUsernames.length > 3 ? "..." : "";
                    return `${shown}${more}`;
                  })()
                : (isCurrentUserBlocked || isReceiverBlocked
                  ? "User is blocked"
                  : `Language: ${user?.language?.toUpperCase() || 'EN'} • Auto-translate enabled`)
              }
            </p>
            {/* Grup üyeleri için arkadaş ekle butonları kaldırıldı, sadece username'ler yazıyor */}
          </div>
        </div>
        <div className="icons">
          {/* Info button only for group */}
          {user?.isGroup && (
            <img
              src="./info.png"
              alt="Info"
              title="Group info"
              style={{ cursor: 'pointer' }}
              onClick={() => setShowGroupInfo(true)}
            />
          )}
        </div>
        {showGroupInfo && user?.isGroup && (
          <GroupInfoModal
            group={{
              id: user.id,
              users: chat?.users || user.users || [],
              adminId: chat?.adminId || user.adminId || user.users?.[0],
            }}
            currentUser={currentUser}
            onClose={() => setShowGroupInfo(false)}
            onUserAdded={() => setShowGroupInfo(false)}
          />
        )}
      </div>
      {/* Group Create Modal */}
      {showGroupModal && (
        <GroupCreateModal
          currentUserId={currentUser?.id}
          onClose={() => setShowGroupModal(false)}
          onGroupCreated={() => setShowGroupModal(false)}
        />
      )}
      {/* Friend Requests Modal Centered */}
      {showFriendRequests && (
        <div className="friend-requests-modal-overlay" onClick={() => setShowFriendRequests(false)}>
          <FriendRequests onAccept={() => setShowFriendRequests(false)} />
        </div>
      )}
      
      <div className="center">
        {chat?.messages?.length === 0 ? (
          <div className="no-messages">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          chat?.messages?.map((message, index) => {
            const messageKey = `${index}-${message.text}`;
            const isTranslated = isMessageTranslated(message, index);
            const displayText = getMessageText(message, index);
            
            return (
              <div
                className={
                  message.senderId === currentUser?.id ? "message own" : "message"
                }
                key={index}
              >
                <div className="texts">
                  {message.img && (
                    <img
                      src={message.img.startsWith('http') ? message.img : `http://localhost:5000${message.img}`}
                      alt=""
                      style={{ maxWidth: '320px', maxHeight: '320px', borderRadius: 10, objectFit: 'contain', display: 'block', background: '#222', margin: '0 auto', zIndex: 1 }}
                    />
                  )}
                  {message.text && (
                    <div className="message-content">
                      <p>{displayText}</p>
                      {isTranslated && (
                        <div className="translation-info">
                          <span className="translation-badge">
                            🌐 Translated from {message.originalLanguage?.toUpperCase() || 'AUTO'}
                          </span>
                          <button 
                            className="show-original-btn"
                            onClick={() => toggleOriginalText(messageKey)}
                          >
                            {showOriginal[messageKey] ? 'Show Translation' : 'Show Original'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {/* Sesli mesaj */}
                  {message.audio && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <audio controls style={{ width: '220px', margin: '8px 0' }}>
                        <source src={message.audio.startsWith('http') ? message.audio : `http://localhost:5000${message.audio}`} type="audio/webm" />
                        <source src={message.audio.startsWith('http') ? message.audio : `http://localhost:5000${message.audio}`} type="audio/ogg" />
                        Tarayıcınız ses oynatmayı desteklemiyor.
                      </audio>
                      {/* Transkript ve çeviri gösterimi */}
                      {message.transcript && (
                        <div className="audio-transcript">
                          <span className="translation-badge">📝 Speech-to-text:</span>
                          <span style={{ fontSize: 13, color: '#666', marginLeft: 4 }}>{message.transcript}</span>
                        </div>
                      )}
                      {/* Kullanıcı diline çeviri */}
                      {message.transcript && userLanguage && message.transcriptLang !== userLanguage && (
                        <AudioTranscriptTranslation transcript={message.transcript} transcriptLang={message.transcriptLang} userLanguage={userLanguage} />
                      )}
                    </div>
                  )}
                  <span className="timestamp">
                    {message.createdAt?.toDate 
                      ? format(message.createdAt.toDate()) 
                      : format(new Date())
                    }
                  </span>
                </div>
              </div>
            );
          })
        )}
        
        {img.url && (
          <div className="message own">
            <div className="texts">
              <img src={img.url} alt="" />
              <span>Preview</span>
            </div>
          </div>
        )}
        <div ref={endRef}></div>
      </div>
      
      <div className="bottom">
        <div className="icons">
          <label htmlFor="file">
            <img src="./img.png" alt="Image" title="Send image" />
          </label>
          <input
            type="file"
            id="file"
            style={{ display: "none" }}
            onChange={handleImg}
            accept="image/*"
          />
          <img src="./camera.png" alt="Camera" title="Take photo" />
          <button
            type="button"
            className={isRecording ? "mic-btn recording" : "mic-btn"}
            onClick={handleMicClick}
            title={isRecording ? "Kaydı durdur" : "Sesli mesaj gönder"}
            style={{ background: "none", border: "none", padding: 0 }}
          >
            <img src="./mic.png" alt="Microphone" />
          </button>
        </div>
        
        <input
          ref={inputRef}
          type="text"
          placeholder={
            isCurrentUserBlocked || isReceiverBlocked
              ? "You cannot send a message"
              : `Type a message in ${userLanguage?.toUpperCase() || 'EN'}...`
          }
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isCurrentUserBlocked || isReceiverBlocked || loading}
        />
        
        <div className="emoji">
          <img
            src="./emoji.png"
            alt="Emoji"
            onClick={() => setOpen((prev) => !prev)}
            title="Add emoji"
          />
          <div className="picker">
            <EmojiPicker open={open} onEmojiClick={handleEmoji} />
          </div>
        </div>
        
        <button
          className="sendButton"
          onClick={() => handleSend()}
          disabled={isCurrentUserBlocked || isReceiverBlocked || loading}
          title="Send message"
        >
          {loading ? "..." : "Send"}
        </button>

        {isRecording && (
          <div className="recording-indicator">Dinleniyor...</div>
        )}

        {audioError && (
          <div className="chat-error">{audioError}</div>
        )}
      </div>

      {/* Arkadaşlıktan çıkar butonu kaldırıldı, sadece user settings/details panelinde olacak */}
    </div>
  );
};

// Sesli mesaj transcript çevirisi için küçük bir bileşen
function AudioTranscriptTranslation({ transcript, transcriptLang, userLanguage }) {
  const [translated, setTranslated] = useState("");
  useEffect(() => {
    let cancelled = false;
    async function translate() {
      if (!transcript || !userLanguage) return;
      try {
        const result = await translationService.translateText(transcript, userLanguage, transcriptLang || 'auto');
        if (!cancelled) setTranslated(result);
      } catch {
        setTranslated("");
      }
    }
    translate();
    return () => { cancelled = true; };
  }, [transcript, userLanguage, transcriptLang]);
  if (!translated) return null;
  return (
    <div className="audio-transcript-translation">
      <span className="translation-badge">🌐 Çeviri:</span>
      <span style={{ fontSize: 13, color: '#007bff', marginLeft: 4 }}>{translated}</span>
    </div>
  );
}

export default Chat;
