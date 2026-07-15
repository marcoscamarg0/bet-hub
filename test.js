async function check() {
  const channelId = 'UCjUEpKIbeykJxCi2i-m3gbg'; // Davi Green
  const res = await fetch(`https://www.youtube.com/channel/${channelId}/live`, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const text = await res.text();
  
  const match = text.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
  if (match) {
    try {
      const data = JSON.parse(match[1]);
      const isLive = data.videoDetails?.isLiveContent;
      console.log('isLiveContent:', isLive);
      console.log('VideoId:', data.videoDetails?.videoId);
      console.log('Title:', data.videoDetails?.title);
    } catch(e) {
      console.error(e);
    }
  } else {
    console.log('No player response found');
  }
}
check();
