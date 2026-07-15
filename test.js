async function check() {
  const channelId = 'UCwMAj7T9AklzXiVN5E3QYjQ';
  const res = await fetch(`https://www.youtube.com/channel/${channelId}/live`, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const text = await res.text();
  
  // Extract ytInitialPlayerResponse
  const match = text.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
  if (match) {
    try {
      const data = JSON.parse(match[1]);
      const isLive = data.videoDetails?.isLiveContent;
      console.log('isLiveContent:', isLive);
      console.log('VideoId:', data.videoDetails?.videoId);
      console.log('Thumbnail:', data.videoDetails?.thumbnail?.thumbnails?.[0]?.url);
    } catch(e) {
      console.error(e);
    }
  } else {
    console.log('No player response found');
  }
}
check();
