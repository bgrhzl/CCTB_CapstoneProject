import { useEffect, useState } from "react";
import { useUserStore } from "../../../lib/userStore";
import { toast } from "react-toastify";

const FriendRequests = ({ onAccept }) => {
  const { currentUser, fetchUserInfo } = useUserStore();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentUser?.id) return;
    setLoading(true);
    fetch(`http://localhost:5000/api/friendRequest/list/${currentUser.id}`)
      .then((res) => res.json())
      .then((data) => {
        setRequests(data.requests || []);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load friend requests");
        setLoading(false);
      });
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id || requests.length === 0) return;
    // Fetch user info for each request
    const fetchUsers = async () => {
      const userInfos = await Promise.all(
        requests.map(async (req) => {
          try {
            const res = await fetch(`http://localhost:5000/api/searchUser?userId=${req.fromUserId}`);
            const data = await res.json();
            return data.user || { id: req.fromUserId, username: req.fromUserId };
          } catch {
            return { id: req.fromUserId, username: req.fromUserId };
          }
        })
      );
      setRequests((prev) => prev.map((r, i) => ({ ...r, user: userInfos[i] })));
    };
    fetchUsers();
    // eslint-disable-next-line
  }, [requests.length]);

  const handleAccept = async (requestId, fromUserId) => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/friendRequest/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Friend request accepted!");
        setRequests((prev) => prev.filter((r) => r.id !== requestId));
        // Refresh current user info to update friends list instantly
        if (currentUser?.id && fetchUserInfo) {
          fetchUserInfo(currentUser.id);
        }
        if (onAccept) onAccept(fromUserId);
      } else {
        toast.error(data.error || "Failed to accept request");
      }
    } catch (err) {
      toast.error("Failed to accept request");
    }
    setLoading(false);
  };

  const handleDecline = async (requestId) => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/friendRequest/decline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId })
      });
      const data = await res.json();
      if (data.success) {
        toast.info("Friend request declined");
        setRequests((prev) => prev.filter((r) => r.id !== requestId));
      } else {
        toast.error(data.error || "Failed to decline request");
      }
    } catch (err) {
      toast.error("Failed to decline request");
    }
    setLoading(false);
  };

  if (!currentUser?.id) return null;

  return (
    <div className="friendRequests modern-popup">
      <div className="modern-popup-header">
        <h3>Friend Requests</h3>
        <button className="close-btn" onClick={() => onAccept && onAccept()}>&times;</button>
      </div>
      <div className="modern-popup-content">
        {loading && <p>Loading...</p>}
        {!loading && requests.length === 0 && <p>No friend requests</p>}
        <ul>
          {requests.map((req) => (
            <li key={req.id} className="modern-popup-user-row">
              <img src={req.fromUser?.avatar || './avatar.png'} alt="avatar" className="modern-popup-avatar" />
              <span className="modern-popup-username">{req.fromUser?.username || req.fromUserId}</span>
              <div className="modern-popup-btns">
                <button className="modern-btn accept" onClick={() => handleAccept(req.id, req.fromUserId)} disabled={loading}>Accept</button>
                <button className="modern-btn decline" onClick={() => handleDecline(req.id)} disabled={loading}>Decline</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default FriendRequests;
