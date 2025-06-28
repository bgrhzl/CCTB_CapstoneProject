import { useState, useEffect } from "react";
import "./login.css";
import { toast } from "react-toastify";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "../../lib/firebase";
import upload from "../../lib/upload";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import LanguageSelector from "../languageSelector/LanguageSelector";

const Login = () => {
  const [avatar, setAvatar] = useState({ file: null, url: "" });
  const [loading, setLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [activeTab, setActiveTab] = useState('login');
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) navigate("/chat");
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleAvatar = (e) => {
    if (e.target.files[0]) {
      setAvatar({ file: e.target.files[0], url: URL.createObjectURL(e.target.files[0]) });
    }
  };
  const handleLanguageChange = (language) => setSelectedLanguage(language);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.target);
    const { username, email, password } = Object.fromEntries(formData);
    if (!username || !email || !password) {
      toast.warn("Please enter all fields!");
      setLoading(false);
      return;
    }
    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      let retry = 0;
      while (!auth.currentUser && retry < 10) { await new Promise(r => setTimeout(r, 200)); retry++; }
      if (!auth.currentUser) {
        toast.error('Kullanıcı oturumu açılamadı, lütfen tekrar deneyin.');
        setLoading(false); return;
      }
      let imgUrl = "./avatar.png";
      if (avatar.file) {
        try { imgUrl = await upload(avatar.file); } catch { toast.warn("Avatar upload failed, using default avatar"); }
      }
      try {
        const registerRes = await fetch('http://localhost:5000/api/register', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: res.user.uid, username, email, avatar: imgUrl, language: selectedLanguage })
        });
        const registerData = await registerRes.json();
        if (!registerData.success) throw new Error(registerData.error || 'Backend kayıt hatası');
      } catch {
        toast.error('Kullanıcı backend kaydı başarısız!');
        setLoading(false); return;
      }
      toast.success("Account created! Logging you in...");
      navigate("/chat");
    } catch (err) {
      toast.error(err.message);
    } finally { setLoading(false); }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.target);
    const { email, password } = Object.fromEntries(formData);
    if (!email || !password) {
      toast.warn("Please enter both email and password!");
      setLoading(false); return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success("Logged in successfully!");
      navigate("/chat");
    } catch (err) {
      toast.error(err.message);
    } finally { setLoading(false); }
  };

  const handleForgotPassword = async () => {
    const email = prompt("Please enter your email address to reset your password:");
    if (!email) return;
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success("Password reset email sent! Lütfen e-posta kutunuzu kontrol edin.");
    } catch (err) {
      toast.error(err.message || "Failed to send reset email");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-tabs">
          <button className={activeTab === 'login' ? 'active' : ''} onClick={() => setActiveTab('login')}>Login</button>
          <button className={activeTab === 'signup' ? 'active' : ''} onClick={() => setActiveTab('signup')}>Signup</button>
        </div>
        {activeTab === 'login' ? (
          <form className="auth-form" onSubmit={handleLogin}>
            <h2>Login</h2>
            <input type="email" placeholder="Email Address" name="email" autoComplete="username" />
            <input type="password" placeholder="Password" name="password" autoComplete="current-password" />
            <div className="auth-links">
              <span style={{ fontSize: 14, color: '#1f8ef1', cursor: 'pointer' }} onClick={handleForgotPassword}>Forgot password?</span>
            </div>
            <button className="auth-btn" disabled={loading}>{loading ? "Loading" : "Login"}</button>
            <div className="auth-switch">Not a member? <span className="switch-link" onClick={() => setActiveTab('signup')}>Signup now</span></div>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleRegister}>
            <h2>Signup</h2>
            <label htmlFor="file" className="avatar-label">
              <img src={avatar.url || "./avatar.png"} alt="avatar" />
              <span>Upload an image (optional)</span>
            </label>
            <input type="file" id="file" style={{ display: "none" }} onChange={handleAvatar} />
            <input type="text" placeholder="Username" name="username" autoComplete="username" />
            <input type="email" placeholder="Email Address" name="email" autoComplete="email" />
            <input type="password" placeholder="Password" name="password" autoComplete="new-password" />
            <div className="language-selection">
              <label>Choose your language:</label>
              <LanguageSelector currentLanguage={selectedLanguage} onLanguageChange={handleLanguageChange} showLabel={false} />
            </div>
            <button className="auth-btn" disabled={loading}>{loading ? "Loading" : "Signup"}</button>
            <div className="auth-switch">Already have an account? <span className="switch-link" onClick={() => setActiveTab('login')}>Login</span></div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;

