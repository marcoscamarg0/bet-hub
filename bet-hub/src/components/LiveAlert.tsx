import { useEffect, useState } from 'react';
import { api, ApiStreamer } from '../api';
import './LiveAlert.css';

export function LiveAlert({ onGoToGorjetas }: { onGoToGorjetas: () => void }) {
  const [liveStreamer, setLiveStreamer] = useState<ApiStreamer | null>(null);
  const [visible, setVisible] = useState(false);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    if (closed) return;
    api.getLiveStreamers()
      .then((data) => {
        if (data.streamers.length > 0) {
          // just pick the first one to alert
          setLiveStreamer(data.streamers[0]);
          setVisible(true);
          
          // auto close after 10s
          setTimeout(() => {
            setVisible(false);
          }, 10000);
        }
      })
      .catch(() => {});
  }, [closed]);

  if (!visible || !liveStreamer) return null;

  return (
    <div className="live-alert-container">
      <div className="live-alert">
        <div className="live-alert-icon">
          <span className="live-pulse">🔴</span>
        </div>
        <div className="live-alert-content">
          <h4 className="live-alert-title">{liveStreamer.name} está ao vivo!</h4>
          <p className="live-alert-desc">
            Assistindo na {liveStreamer.platform === 'twitch' ? 'Twitch' : 'YouTube'}? Vá para a aba Gorjetas!
          </p>
          <div className="live-alert-actions">
            {liveStreamer.tipUrl ? (
              <a
                href={liveStreamer.tipUrl}
                target="_blank"
                rel="noreferrer"
                className="live-alert-btn primary"
                style={{ textDecoration: 'none', display: 'inline-block' }}
                onClick={() => {
                  setVisible(false);
                }}
              >
                Enviar Gorjeta
              </a>
            ) : (
              <button
                className="live-alert-btn primary"
                onClick={() => {
                  setVisible(false);
                  onGoToGorjetas();
                }}
              >
                Ver Gorjetas
              </button>
            )}
            
            {liveStreamer.streamUrl && (
              <a
                href={liveStreamer.streamUrl}
                target="_blank"
                rel="noreferrer"
                className="live-alert-btn secondary"
                style={{ textDecoration: 'none', display: 'inline-block' }}
                onClick={() => {
                  setVisible(false);
                }}
              >
                Assistir
              </a>
            )}
            {!liveStreamer.streamUrl && (
              <button 
                className="live-alert-btn secondary" 
                onClick={() => {
                  setVisible(false);
                  setClosed(true);
                }}
              >
                Fechar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
