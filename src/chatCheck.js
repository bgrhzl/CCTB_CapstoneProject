import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

const chatId = "X0h3Y1H9zN5XIeJpZvPT";

async function kontrolEt(chatId) {
  if (!chatId) {
    console.log("Chat ID girilmedi.");
    return;
  }
  const chatRef = doc(db, "chats", chatId);
  const chatSnap = await getDoc(chatRef);
  if (chatSnap.exists()) {
    console.log("Chat dokümanı:", chatSnap.data());
  } else {
    console.log("Chat dokümanı bulunamadı.");
  }
}

kontrolEt(chatId);
