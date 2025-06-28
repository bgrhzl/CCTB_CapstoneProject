// Debug utility for Detail.jsx shared_media photo logic
// This script will log the chatMessages and media objects to help debug why images are not showing.

export function debugDetailMedia(chatMessages, media) {
  console.log('DEBUG: chatMessages', chatMessages);
  console.log('DEBUG: media.photos', media.photos);
  const chatImgs = chatMessages.filter(m => m.img);
  console.log('DEBUG: chatMessages with img:', chatImgs);
  const allPhotos = [
    ...((media.photos || []).filter(p => !!p.url)),
    ...chatImgs.map(m => ({ url: m.img && m.img.startsWith('http') ? m.img : `http://localhost:5000${m.img}`, name: m.text || '' }))
  ];
  console.log('DEBUG: allPhotos', allPhotos);
  return allPhotos;
}
