import React from 'react';
import type { BettingHouse } from '../types';
import styles from './BettingCard.module.css';

interface Props {
  house: BettingHouse;
}

const categoryLabels: Record<string, string> = {
  esportes: '⚽ Esportes',
  cassino: '🎰 Cassino',
  'ao-vivo': '📡 Ao Vivo',
  ambos: '🎯 Ambos',
};

function Stars({ rating }: { rating: number }) {
  return (
    <div className={styles.stars}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={i <= rating ? styles.starFilled : styles.starEmpty}>★</span>
      ))}
    </div>
  );
}

export default function BettingCard({ house }: Props) {
  return (
    <a
      href={house.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`${styles.card} ${house.featured ? styles.featured : ''} ${house.isTrash ? styles.trash : ''}`}
      style={{ '--accent': house.color } as React.CSSProperties}
    >
      {/* Top badges */}
      <div className={styles.badges}>
        {house.featured && !house.isTrash && (
          <span className={styles.badgeFeatured}>⭐ Top Pick</span>
        )}
        {house.isTrash && (
          <span className={styles.badgeTrash}>⚠️ Evitar</span>
        )}
      </div>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.emoji}>{house.emoji}</div>
        <div className={styles.meta}>
          <h3 className={styles.name}>{house.name}</h3>
          <Stars rating={house.rating} />
        </div>
      </div>

      {/* Categories */}
      <div className={styles.categories}>
        {house.category.map(cat => (
          <span key={cat} className={styles.catTag}>{categoryLabels[cat]}</span>
        ))}
      </div>

      {/* Bonus */}
      <div className={styles.bonusBox}>
        <div className={styles.bonusLabel}>🎁 {house.bonus.label}</div>
        <div className={styles.bonusDetail}>{house.bonus.detail}</div>
      </div>

      {/* Tags */}
      <div className={styles.tags}>
        {house.tags.map(tag => (
          <span key={tag} className={styles.tag}>{tag}</span>
        ))}
      </div>

      {/* Note */}
      {house.note && (
        <div className={styles.note}>💬 {house.note}</div>
      )}

      {/* CTA */}
      <div className={styles.cta}>
        <span>Acessar</span>
        <span className={styles.arrow}>→</span>
      </div>
    </a>
  );
}
