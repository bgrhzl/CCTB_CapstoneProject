import FriendRequests from "./components/list/chatList/FriendRequests";

export function FriendRequestsModal({ show, onClose }) {
  if (!show) return null;
  return (
    <div className="friend-requests-modal-overlay" onClick={onClose}>
      <FriendRequests onAccept={onClose} />
    </div>
  );
}
