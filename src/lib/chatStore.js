import { create } from "zustand";
import { useUserStore } from "./userStore";

export const useChatStore = create((set, get) => ({
  chatId: null,
  user: null,
  isCurrentUserBlocked: false,
  isReceiverBlocked: false,
  
  changeChat: (chatId, user) => {
    const currentUser = useUserStore.getState().currentUser;

    if (!currentUser) {
      return set({
        chatId: null,
        user: null,
        isCurrentUserBlocked: false,
        isReceiverBlocked: false,
      });
    }

    // CHECK IF CURRENT USER IS BLOCKED
    if (user.blocked?.includes(currentUser.id)) {
      return set({
        chatId,
        user: user,
        isCurrentUserBlocked: true,
        isReceiverBlocked: false,
      });
    }

    // CHECK IF RECEIVER IS BLOCKED
    else if (currentUser.blocked?.includes(user.id)) {
      return set({
        chatId,
        user: user,
        isCurrentUserBlocked: false,
        isReceiverBlocked: true,
      });
    } else {
      return set({
        chatId,
        user,
        isCurrentUserBlocked: false,
        isReceiverBlocked: false,
      });
    }
  },

  changeBlock: () => {
    set((state) => ({ 
      ...state, 
      isReceiverBlocked: !state.isReceiverBlocked 
    }));
  },
  
  resetChat: () => {
    set({
      chatId: null,
      user: null,
      isCurrentUserBlocked: false,
      isReceiverBlocked: false,
    });
  },
  
  updateChatUser: (updatedUser) => {
    const state = get();
    if (state.user && state.user.id === updatedUser.id) {
      set({ ...state, user: updatedUser });
    }
  }
}));

