import ChatList from "./chatList/ChatList"
import "./list.css"
import Userinfo from "./userInfo/Userinfo"

const List = ({ showFriendRequests, setShowFriendRequests }) => {
  return (
    <div className='list'>
      <Userinfo/>
      <ChatList showFriendRequests={showFriendRequests} setShowFriendRequests={setShowFriendRequests} />
    </div>
  )
}

export default List