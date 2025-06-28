import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import "../list/chatList/addUser/addUser.css";
import { useUserStore } from "../../lib/userStore";
import { useTranslation } from "../../i18n";
import upload from '../../lib/upload';

const GroupCreateModal = ({ currentUserId, onClose, onGroupCreated }) => {
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [groupAvatar, setGroupAvatar] = useState({ file: null, url: "" });
  const [loading, setLoading] = useState(false);
  const userLanguage = useUserStore((state) => state.userLanguage) || 'en';
  const t = useTranslation();
  const { currentUser } = useUserStore();

  useEffect(() => {
    fetch("http://localhost:5000/api/users")
      .then((res) => res.json())
      .then((data) => {
        // Arkadaş olmayanları filtrele
        const friends = currentUser?.friends || [];
        const filtered = data.users.filter(u => u.id !== currentUserId && friends.includes(u.id));
        setUsers(filtered);
      })
      .catch(() => toast.error(t("users_load_failed")));
  }, [currentUserId, t, currentUser]);

  const handleInvite = (id) => {
    if (!selected.includes(id)) setSelected(prev => [...prev, id]);
  };
  const handleRemove = (id) => {
    setSelected(prev => prev.filter(uid => uid !== id));
  };
  const handleCreate = async () => {
    if (!groupName.trim() || selected.length < 1) {
      toast.error(t("group_create_requirements") || "Grup adı ve en az 1 kişi seçmelisiniz");
      return;
    }
    setLoading(true);
    let groupAvatarUrl = '';
    try {
      if (groupAvatar.file) {
        try {
          groupAvatarUrl = await upload(groupAvatar.file);
        } catch (uploadErr) {
          console.error('Group avatar upload failed:', uploadErr);
          toast.error(t('avatar_upload_failed') || 'Grup avatarı yüklenemedi, varsayılan kullanılacak.');
          groupAvatarUrl = '';
        }
      }
      // Ensure userIds is unique and at least 2
      const userIds = Array.from(new Set([currentUserId, ...selected]));
      if (userIds.length < 2) {
        toast.error(t('group_create_requirements') || 'Grup adı ve en az 1 kişi seçmelisiniz');
        setLoading(false);
        return;
      }
      const payload = {
        name: groupName,
        userIds,
        groupAvatar: groupAvatarUrl || '/avatar.png',
      };
      console.log('Group create payload:', payload);
      const res = await fetch("http://localhost:5000/api/group/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      console.log('Group create response:', data);
      if (data.success) {
        toast.success(t("group_created") || "Grup oluşturuldu");
        onGroupCreated && onGroupCreated(data.chatId);
        onClose();
      } else {
        toast.error(data.error || t("group_create_failed") || "Grup oluşturulamadı");
        if (data.error) console.error("Group create failed:", data.error);
      }
    } catch (err) {
      console.error('Group create exception:', err);
      toast.error(t("group_create_failed") || "Grup oluşturulamadi");
    }
    setLoading(false);
  };

  return (
    <div className="group-modal-overlay-centered" onClick={onClose}>
      <div className="addUser-modal-card group-modal-centered" onClick={e => e.stopPropagation()} style={{minWidth: 340, maxWidth: 400, position: 'relative'}}>
        {/* Current user profile card */}
        <div className="user" style={{display:'flex', alignItems:'center', gap:16, marginBottom:18}}>
          <img
            src={currentUser?.avatar && typeof currentUser.avatar === 'string' && currentUser.avatar !== '/avatar.png'
              ? (currentUser.avatar.startsWith('http') ? currentUser.avatar : 'http://localhost:5000' + currentUser.avatar)
              : '/avatar.png'}
            alt="profile"
            style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2px solid #6366f1', background: '#fff' }}
            onError={e => { e.target.onerror = null; e.target.src = '/avatar.png'; }}
          />
          <span style={{fontWeight:600, fontSize:17, color:'#6366f1'}}>{currentUser?.username}</span>
        </div>
        {/* Close button in top right */}
        <button className="close-btn" onClick={onClose} style={{position:'absolute', top:12, right:12, zIndex:2, background:'rgba(17,25,40,0.12)', color:'#fff', border:'none', borderRadius:'50%', width:32, height:32, fontSize:22, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 8px rgba(81,131,254,0.10)'}}>×</button>
        <h2 className="addUser-title">{t("create_group") || "Grup Oluştur"}</h2>
        {/* Modern group name & avatar card yatay */}
        <div style={{background:'rgba(255,255,255,0.08)', borderRadius:12, padding:'18px 16px 10px 16px', margin:'18px 0 18px 0', boxShadow:'0 2px 8px rgba(81,131,254,0.08)', display:'flex', flexDirection:'row', alignItems:'center', gap:18, minHeight:90, minWidth:260, maxWidth:360, width:'100%'}}>
          <label htmlFor="groupAvatar" style={{ cursor: 'pointer', margin:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minWidth:80 }}>
            <img
              src={groupAvatar.url || '/avatar.png'}
              alt="group avatar preview"
              style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid #6366f1', background: '#fff', marginBottom: 4 }}
            />
            <div style={{ fontSize: 12, color: '#6366f1', textAlign: 'center', fontWeight: 500 }}>{t("choose_photo") || "Fotoğraf Seç"}</div>
            <input
              id="groupAvatar"
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => {
                if (e.target.files[0]) {
                  setGroupAvatar({ file: e.target.files[0], url: URL.createObjectURL(e.target.files[0]) });
                }
              }}
            />
          </label>
          <div style={{display:'flex', flexDirection:'column', flex:1, alignItems:'center', justifyContent:'center', gap:8}}>
            <label htmlFor="groupName" style={{color:'#6366f1', fontWeight:600, fontSize:15, marginBottom:4, letterSpacing:0.2}}>{t("group_name") || "Grup Adı"}</label>
            <input
              id="groupName"
              type="text"
              className="addUser-input"
              placeholder={t("group_name") || "Grup adı"}
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              style={{width:'100%', maxWidth:180, background:'rgba(255,255,255,0.13)', color:'#fff', border:'1.5px solid #6366f1', borderRadius:8, fontSize:15, fontWeight:500, padding:'10px 12px', outline:'none', boxShadow:'none', textAlign:'center'}}
            />
          </div>
        </div>
        <div className="addUser-list" style={{maxHeight: 220, overflowY: 'auto'}}>
          {users.filter(u => !selected.includes(u.id)).map(u => (
            <div key={u.id} className={`addUser-row`}>
              <img 
                src={u.avatar && typeof u.avatar === 'string' && u.avatar !== '/avatar.png'
                  ? (u.avatar.startsWith('http') ? u.avatar : 'http://localhost:5000' + u.avatar)
                  : '/avatar.png'}
                alt="avatar"
                className="addUser-avatar"
                style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid #6366f1', background: '#fff', marginRight: 12 }}
                onError={e => { e.target.onerror = null; e.target.src = '/avatar.png'; }}
              />
              <span className="addUser-name">{u.username}</span>
              <button className="modern-btn addUser-btn" onClick={() => handleInvite(u.id)}>
                {t("invite") || "Davet Et"}
              </button>
            </div>
          ))}
        </div>
        {selected.length > 0 && (
          <div className="invited-list" style={{marginTop:10, marginBottom:4}}>
            <h4 style={{fontSize:14, marginBottom:4, color:'#6366f1'}}>{t("selected") || "Seçilenler:"}</h4>
            <div style={{
              display:'flex', flexWrap:'wrap', gap:8, minHeight:44, padding:'4px 0',
              background:'rgba(30,41,59,0.10)', borderRadius:12, boxShadow:'0 2px 8px rgba(81,131,254,0.10)'
            }}>
              {users.filter(u => selected.includes(u.id)).map(u => (
                <div className="addUser-row" key={u.id} style={{margin:0, width:'100%', maxWidth:'100%'}}>
                  <img 
                    src={u.avatar && typeof u.avatar === 'string' && u.avatar !== '/avatar.png'
                      ? (u.avatar.startsWith('http') ? u.avatar : 'http://localhost:5000' + u.avatar)
                      : '/avatar.png'}
                    alt="avatar"
                    className="addUser-avatar"
                    style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid #6366f1', background: '#fff', marginRight: 12 }}
                    onError={e => { e.target.onerror = null; e.target.src = '/avatar.png'; }}
                  />
                  <span className="addUser-name">{u.username}</span>
                  <button className="modern-btn addUser-btn" onClick={() => handleRemove(u.id)} style={{background:'#f43f5e', color:'#fff', fontWeight:600, fontSize:13, borderRadius:6, padding:'6px 14px', border:'none', marginLeft:2, cursor:'pointer', height:32, minWidth:60}}>{t("remove") || "Çıkart"}</button>
                </div>
              ))}
            </div>
          </div>
        )}
        <button className="group-create-btn" onClick={handleCreate} disabled={loading}>
          {loading ? "..." : t("create_group") || "Grup Oluştur"}
        </button>
      </div>
    </div>
  );
};

export default GroupCreateModal;

/*
CSS (add to chat.css or a global style):
.group-modal-overlay-centered {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.18);
  z-index: 1002;
  display: flex;
  align-items: center;
  justify-content: center;
}
.group-modal-centered {
  box-shadow: 0 8px 32px rgba(0,0,0,0.18);
  border-radius: 18px;
  background: #fff;
  padding: 32px 24px 24px 24px;
  position: relative;
  max-width: 400px;
  width: 100%;
  animation: popIn .18s cubic-bezier(.4,2,.6,1) 1;
}
*/
