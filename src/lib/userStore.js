import { create } from "zustand";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

export const useUserStore = create((set, get) => ({
  currentUser: null,
  isLoading: true,
  userLanguage: 'en', // Default language
  
  fetchUserInfo: async (uid) => {
    if (!uid) return set({ currentUser: null, isLoading: false });

    try {
      const docRef = doc(db, "users", uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const userData = docSnap.data();
        set({ 
          currentUser: userData, 
          isLoading: false,
          userLanguage: userData.language || 'en'
        });
      } else {
        set({ currentUser: null, isLoading: false });
      }
    } catch (err) {
      console.log(err);
      return set({ currentUser: null, isLoading: false });
    }
  },
  
  updateUser: async (userData) => {
    set({ currentUser: userData });
    if (userData.language) {
      set({ userLanguage: userData.language });
    }
    // Firestore'da da güncelle
    if (userData.id) {
      try {
        const userRef = doc(db, "users", userData.id);
        await updateDoc(userRef, userData);
        // Firestore'dan güncel kullanıcıyı tekrar çek ve state'e yaz
        const updatedSnap = await getDoc(userRef);
        if (updatedSnap.exists()) {
          set({ currentUser: updatedSnap.data() });
          localStorage.setItem('currentUser', JSON.stringify(updatedSnap.data()));
        }
      } catch (err) {
        console.error("Firestore user update failed:", err);
      }
    }
  },
  
  updateUserLanguage: async (language) => {
    const { currentUser } = get();
    if (!currentUser) return;

    try {
      // Update in Firebase
      const userRef = doc(db, "users", currentUser.id);
      await updateDoc(userRef, { language });

      // Update local state
      set({ 
        userLanguage: language,
        currentUser: { ...currentUser, language }
      });

      // Also update via backend API for consistency
      try {
        await fetch(`http://localhost:5000/api/users/${currentUser.id}/language`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ language })
        });
      } catch (apiError) {
        console.warn('Backend language update failed:', apiError);
      }

      return true;
    } catch (error) {
      console.error('Error updating user language:', error);
      return false;
    }
  },
  
  clearUser: () => {
    set({ 
      currentUser: null, 
      isLoading: false,
      userLanguage: 'en'
    });
  }
}));

