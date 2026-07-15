import fetch from 'node-fetch';
import { Streamer, IStreamer } from '../models/Streamer.js';

// Requires:
// TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET
// YOUTUBE_API_KEY
// in the .env file

let twitchAccessToken: string | null = null;
let twitchTokenExpiresAt: number = 0;

/** Retrieves and caches a Twitch App Access Token */
async function getTwitchToken(): Promise<string | null> {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) return null;

  if (twitchAccessToken && Date.now() < twitchTokenExpiresAt) {
    return twitchAccessToken;
  }

  try {
    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
    });
    const res = await fetch(`https://id.twitch.tv/oauth2/token`, {
      method: 'POST',
      body: params,
    });
    if (!res.ok) throw new Error('Failed to fetch twitch token');
    
    const data = await res.json() as { access_token: string, expires_in: number };
    twitchAccessToken = data.access_token;
    twitchTokenExpiresAt = Date.now() + (data.expires_in - 300) * 1000;
    return twitchAccessToken;
  } catch (error) {
    console.error('[LiveCheck] Error getting Twitch Token:', error);
    return null;
  }
}

async function checkTwitch(streamers: IStreamer[]) {
  if (streamers.length === 0) return;
  const token = await getTwitchToken();
  const clientId = process.env.TWITCH_CLIENT_ID;
  
  if (!token || !clientId) {
    console.warn('[LiveCheck] Missing Twitch credentials, skipping.');
    return;
  }

  try {
    const logins = streamers.map(s => s.channelId).join('&user_login=');
    const res = await fetch(`https://api.twitch.tv/helix/streams?user_login=${logins}`, {
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) throw new Error(`Twitch API error: ${res.status}`);
    const data = await res.json() as { data: any[] };
    const liveLogins = new Map<string, any>();
    
    for (const stream of data.data) {
      liveLogins.set(stream.user_login.toLowerCase(), stream);
    }

    for (const s of streamers) {
      const streamData = liveLogins.get(s.channelId.toLowerCase());
      if (streamData) {
        s.isLive = true;
        s.streamTitle = streamData.title;
        s.streamUrl = `https://twitch.tv/${streamData.user_login}`;
        s.thumbnailUrl = streamData.thumbnail_url.replace('{width}', '320').replace('{height}', '180');
      } else {
        s.isLive = false;
        s.streamTitle = undefined;
        s.streamUrl = undefined;
        s.thumbnailUrl = undefined;
      }
      s.lastChecked = new Date();
      await s.save();
    }
  } catch (err) {
    console.error('[LiveCheck] Twitch check failed:', err);
  }
}

async function checkYouTube(streamers: IStreamer[]) {
  if (streamers.length === 0) return;
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.warn('[LiveCheck] Missing YouTube API Key, skipping.');
    return;
  }

  for (const s of streamers) {
    try {
      const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${s.channelId}&eventType=live&type=video&key=${apiKey}`);
      if (!res.ok) throw new Error(`YouTube API error: ${res.status}`);
      const data = await res.json() as { items: any[] };

      if (data.items && data.items.length > 0) {
        const streamData = data.items[0];
        s.isLive = true;
        s.streamTitle = streamData.snippet.title;
        s.streamUrl = `https://youtube.com/watch?v=${streamData.id.videoId}`;
        s.thumbnailUrl = streamData.snippet.thumbnails?.medium?.url;
      } else {
        s.isLive = false;
        s.streamTitle = undefined;
        s.streamUrl = undefined;
        s.thumbnailUrl = undefined;
      }
      s.lastChecked = new Date();
      await s.save();
    } catch (err) {
      console.error(`[LiveCheck] YouTube check failed for ${s.channelId}:`, err);
    }
  }
}

export async function checkAllStreamers() {
  try {
    const streamers = await Streamer.find();
    if (streamers.length === 0) return;

    const twitchStreamers = streamers.filter(s => s.platform === 'twitch');
    const youtubeStreamers = streamers.filter(s => s.platform === 'youtube');

    await checkTwitch(twitchStreamers);
    await checkYouTube(youtubeStreamers);
  } catch (err) {
    console.error('[LiveCheck] General error:', err);
  }
}

// Start polling
let intervalId: NodeJS.Timeout;

export function startLiveCheckService() {
  console.log('[LiveCheck] Service started');
  // Check immediately
  checkAllStreamers();
  // Check every 3 minutes
  intervalId = setInterval(checkAllStreamers, 3 * 60 * 1000);
}

export function stopLiveCheckService() {
  if (intervalId) clearInterval(intervalId);
}
