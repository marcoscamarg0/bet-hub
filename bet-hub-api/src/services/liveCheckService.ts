
import { Streamer, IStreamer } from '../models/Streamer.js';

// Requires:
// TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET
// YOUTUBE_API_KEY
// in the .env file

let twitchAccessToken: string | null = null;
let twitchTokenExpiresAt: number = 0;

async function checkTwitch(streamers: IStreamer[]) {
  if (streamers.length === 0) return;

  for (const s of streamers) {
    try {
      const query = `
        query {
          user(login: "${s.channelId}") {
            stream {
              id
              title
              type
            }
          }
        }
      `;
      const res = await fetch("https://gql.twitch.tv/gql", {
        method: "POST",
        headers: { "Client-ID": "kimne78kx3ncx6brgo4mv6wki5h1ko" },
        body: JSON.stringify({ query })
      });
      
      const data = await res.json() as any;
      const streamData = data?.data?.user?.stream;

      if (streamData && streamData.type === 'live') {
        console.log(`[LiveCheck] TWITCH: Streamer ${s.name} (${s.channelId}) ESTÁ AO VIVO!`);
        s.isLive = true;
        s.streamTitle = streamData.title;
        s.streamUrl = `https://twitch.tv/${s.channelId}`;
      } else {
        console.log(`[LiveCheck] TWITCH: Streamer ${s.name} (${s.channelId}) está OFFLINE.`);
        s.isLive = false;
        s.streamTitle = undefined;
        s.streamUrl = undefined;
      }
      
      s.lastChecked = new Date();
      await s.save();
    } catch (err) {
      console.error(`[LiveCheck] Twitch check failed for ${s.channelId}:`, err);
    }
  }
}

async function checkYouTube(streamers: IStreamer[]) {
  if (streamers.length === 0) return;

  for (const s of streamers) {
    try {
      const res = await fetch(`https://www.youtube.com/channel/${s.channelId}/live`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
      });
      const text = await res.text();
      
      const match = text.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
      let isLive = false;
      
      if (match) {
        try {
          const data = JSON.parse(match[1]);
          if (data.videoDetails?.isLiveContent) {
            isLive = true;
            s.isLive = true;
            s.streamTitle = data.videoDetails.title;
            s.streamUrl = `https://youtube.com/watch?v=${data.videoDetails.videoId}`;
            s.thumbnailUrl = data.videoDetails.thumbnail?.thumbnails?.[0]?.url || undefined;
            console.log(`[LiveCheck] YOUTUBE: Streamer ${s.name} (${s.channelId}) ESTÁ AO VIVO!`);
          }
        } catch (e) {
          console.error(`[LiveCheck] Failed to parse YouTube data for ${s.name}`, e);
        }
      }
      
      if (!isLive) {
        console.log(`[LiveCheck] YOUTUBE: Streamer ${s.name} (${s.channelId}) está OFFLINE.`);
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
  console.log(`\n[LiveCheck] Iniciando verificação às ${new Date().toISOString()}`);
  try {
    const streamers = await Streamer.find();
    if (streamers.length === 0) {
      console.log('[LiveCheck] Nenhum streamer cadastrado no banco. Encerrando check.');
      return;
    }

    const twitchStreamers = streamers.filter(s => s.platform === 'twitch');
    const youtubeStreamers = streamers.filter(s => s.platform === 'youtube');

    console.log(`[LiveCheck] Encontrados ${twitchStreamers.length} na Twitch e ${youtubeStreamers.length} no YouTube.`);

    await checkTwitch(twitchStreamers);
    await checkYouTube(youtubeStreamers);
    
    console.log(`[LiveCheck] Verificação finalizada.`);
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
