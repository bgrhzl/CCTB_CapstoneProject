// Remove or rename this file to avoid Vite import conflict with App.jsx

// import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
// import Login from "./components/login/Login";
// import Chat from "./components/chat/Chat";
// import List from "./components/list/List";
// import Detail from "./components/detail/Detail";
// import Notification from "./components/notification/Notification";
// import { auth } from "./lib/firebase";
// import { useEffect, useState } from "react";

// function ProtectedRoute({ children }) {
//   const [loading, setLoading] = useState(true);
//   const [user, setUser] = useState(null);

//   useEffect(() => {
//     const unsubscribe = auth.onAuthStateChanged((u) => {
//       setUser(u);
//       setLoading(false);
//     });
//     return () => unsubscribe();
//   }, []);

//   if (loading) return <div>Loading...</div>;
//   if (!user) return <Navigate to="/" />;
//   return children;
// }

// function App() {
//   return (
//     <Router>
//       <Notification />
//       <Routes>
//         <Route path="/" element={<Login />} />
//         <Route
//           path="/chat"
//           element={
//             <ProtectedRoute>
//               <div className="container">
//                 <List />
//                 <Chat />
//                 <Detail />
//               </div>
//             </ProtectedRoute>
//           }
//         />
//       </Routes>
//     </Router>
//   );
// }

// export default App;