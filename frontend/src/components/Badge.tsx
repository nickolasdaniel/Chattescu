// frontend/src/components/Badge.tsx

import React from 'react';
import { Badge as BadgeType, ChannelInfo } from '../types';
import './Badge.css';

interface BadgeProps {
  badge: BadgeType;
  channelInfo: ChannelInfo | null;
}

const Badge: React.FC<BadgeProps> = ({ badge }) => {
  const renderBadgeContent = () => {
    // More flexible SVG detection
    if (badge.image.includes('<svg')) {
      // SVG badge
      return (
        <div 
          className="badge-svg"
          dangerouslySetInnerHTML={{ __html: badge.image }}
        />
      );
    } else if (badge.image.startsWith('http')) {
      // Image URL
      return (
        <img 
          src={badge.image} 
          alt={badge.alt} 
          className="badge-img"
          onError={(e) => {
            // Fallback to emoji if image fails
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            target.parentElement!.textContent = getBadgeEmoji(badge.type);
          }}
        />
      );
    } else {
      // Emoji or text fallback
      return <span className="badge-emoji">{badge.image}</span>;
    }
  };

  const getBadgeEmoji = (badgeType: string): string => {
    const emojiMap: Record<string, string> = {
      'moderator': '🛡️',
      'vip': '💎',
      'subscriber': '⭐',
      'verified': '✅',
      'founder': '🏆',
      'og': '🔥',
      'broadcaster': '👑',
      'sub_gifter': '🎁',
      'staff': '⚡',
      'admin': '🔧'
    };
    return emojiMap[badgeType] || '🎖️';
  };

  const getBadgeClasses = (): string => {
    const classes = ['badge', `badge-${badge.type}`];
    
    if (badge.isCustom) {
      classes.push('badge-custom');
    }
    
    if (badge.is7TV) {
      classes.push('badge-7tv');
    }
    
    return classes.join(' ');
  };

  return (
    <div 
      className={getBadgeClasses()}
      title={badge.alt}
    >
      {renderBadgeContent()}
    </div>
  );
};

export default Badge;