import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { auth } from "./lib/firebase";
import { useUserStore } from "./lib/userStore";
import { LanguageContext } from "./i18n";
import Login from "./components/login/Login";
import Chat from "./components/chat/Chat";
import Notification from "./components/notification/Notification";
import List from "./components/list/List";
import Detail from "./components/detail/Detail";
import AdminPanel from "./components/admin/AdminPanel";
import { FriendRequestsModal } from "./FriendRequestsModal";

function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const { fetchUserInfo } = useUserStore();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      if (u) {
        await fetchUserInfo(u.uid);
      }
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [fetchUserInfo]);

  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return <Navigate to="/" />;
  return children;
}

function App() {
  const { currentUser } = useUserStore();
  const [lang, setLang] = useState('en');
  const [showFriendRequests, setShowFriendRequests] = useState(false);

  useEffect(() => {
    if (currentUser?.language) {
      setLang(currentUser.language);
    }
  }, [currentUser]);

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      <Router>
        <Notification />
        <FriendRequestsModal show={showFriendRequests} onClose={() => setShowFriendRequests(false)} />
        <Routes>
          <Route path="/" element={<Login />} />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <div className="container">
                  <List showFriendRequests={showFriendRequests} setShowFriendRequests={setShowFriendRequests} />
                  <Chat showFriendRequests={showFriendRequests} setShowFriendRequests={setShowFriendRequests} />
                  <Detail />
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminPanel />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </LanguageContext.Provider>
  );
}

export default App;

