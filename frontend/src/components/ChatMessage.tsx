// frontend/src/components/ChatMessage.tsx

import React, { useState, useEffect, useRef } from 'react';
import Badge from './Badge';
import { ChatMessage as ChatMessageType, ChannelInfo, SevenTVEmote, SevenTVCosmetics } from '../types';
import { FrontendSevenTVService } from '../services/SevenTVService';
import './ChatMessage.css';

// Utility function to convert 7TV color (BGRA format) to RGB
const convert7TVColorToRGB = (color: number): string => {
  const r = (color >> 24) & 0xFF;  // Red from bits 24-31
  const g = (color >> 16) & 0xFF;  // Green from bits 16-23
  const b = (color >> 8) & 0xFF;   // Blue from bits 8-15
  return `rgb(${r}, ${g}, ${b})`;
};

// Utility function to convert 7TV color to hex (for fallback)
const convert7TVColorToHex = (color: number): string => {
  const unsignedColor = color >>> 0;
  const colorHex = unsignedColor.toString(16).padStart(8, '0');
  return `#${colorHex.substring(2)}`; // Remove alpha channel
};

// Utility function to get gradient type based on 7TV function
const getGradientType = (functionType: string): string => {
  if (functionType === 'RADIAL_GRADIENT') {
    return 'radial-gradient(circle';
  } else if (functionType === 'LINEAR_GRADIENT') {
    return 'linear-gradient(90deg';
  }
  return 'linear-gradient(90deg'; // Default fallback
};

// Utility function to apply gradient text styles
const applyGradientTextStyles = (style: React.CSSProperties): void => {
  style.backgroundClip = 'text';
  (style as any).WebkitBackgroundClip = 'text';
  (style as any).WebkitTextFillColor = 'transparent';
  style.color = 'transparent';
  
  // Add properties to improve gradient text rendering
  style.textRendering = 'optimizeLegibility';
  (style as any).WebkitFontSmoothing = 'antialiased';
  (style as any).MozOsxFontSmoothing = 'grayscale';
};

interface ChatMessageProps {
  message: ChatMessageType;
  emotes: SevenTVEmote[];
  channelInfo: ChannelInfo | null;
}

// Shared service instance to prevent creating multiple instances
const sharedSevenTVService = new FrontendSevenTVService();

const ChatMessage: React.FC<ChatMessageProps> = React.memo(({ message, emotes, channelInfo }) => {
  const [frontendCosmetics, setFrontendCosmetics] = useState<SevenTVCosmetics | null>(null);
  const [paintData, setPaintData] = useState<any>(null);
  const [cosmeticsLoaded, setCosmeticsLoaded] = useState(false);
  const isLoadingRef = useRef(false);
  const paintDataLoadingRef = useRef(false);
  const usernameRef = useRef<HTMLSpanElement>(null);

  // Set CSS custom property for glow color when cosmetics change
  useEffect(() => {
    if (usernameRef.current && (message.user.cosmetics || frontendCosmetics)) {
      const cosmetics = message.user.cosmetics || frontendCosmetics;
      
      if (cosmetics?.paint?.stops && cosmetics.paint.stops.length > 0) {
        const glowColor = cosmetics.paint.stops[0];
        const glowColorHex = convert7TVColorToHex(glowColor.color);
        usernameRef.current.style.setProperty('--glow-color', glowColorHex);
      }
    }
  }, [message.user.cosmetics, frontendCosmetics, message.username]);

  // Fetch paint data using shared cached service
  const fetchPaintData = async (paintId: string) => {
    return sharedSevenTVService.fetchPaintData(paintId);
  };

  // Cache stats logging removed - too noisy even in development

  // Load 7TV cosmetics from frontend if backend didn't provide them (with rate limiting)
  useEffect(() => {
    if (!message.user.cosmetics && !cosmeticsLoaded && !isLoadingRef.current) {
      isLoadingRef.current = true;
      
      // Add timeout to prevent hanging during spam
      const timeoutPromise = new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('Frontend 7TV timeout')), 3000)
      );
      
      // Race the cosmetics fetch with timeout
      Promise.race([
        sharedSevenTVService.getUserCosmetics(message.username, message.user.id),
        timeoutPromise
      ]).then(cosmetics => {
        if (cosmetics) {
          setFrontendCosmetics(cosmetics);
          setCosmeticsLoaded(true);
          
          // If user has a paint, fetch paint data via GraphQL
          if (cosmetics.user.style.paint_id) {
            fetchPaintData(cosmetics.user.style.paint_id).then(paint => {
              if (paint) {
                setPaintData(paint);
              }
            }).catch(() => {
              // Silently fail paint fetch during spam
            });
          }
        }
        isLoadingRef.current = false;
      }).catch(() => {
        // Silently fail during spam - cosmetics are optional
        isLoadingRef.current = false;
      });
    }
  }, [message.username, message.user.cosmetics, message.user.id, cosmeticsLoaded]);

  // Fetch paint data when cosmetics are available (either from backend or frontend)
  useEffect(() => {
    const cosmetics = message.user.cosmetics || frontendCosmetics;
    
    if (cosmetics && cosmetics.user.style.paint_id && !paintDataLoadingRef.current) {
      paintDataLoadingRef.current = true;
      fetchPaintData(cosmetics.user.style.paint_id).then(paint => {
        if (paint) {
          setPaintData(paint);
        }
        paintDataLoadingRef.current = false;
      }).catch(error => {
        // Don't log paint data fetch errors - they're expected when users don't have paints
        paintDataLoadingRef.current = false;
      });
    }
  }, [message.user.cosmetics, frontendCosmetics, message.username]);

  const parseMessageContent = (content: string): string => {
    let parsedContent = content;

    // Debug logging for development
    if (process.env.NODE_ENV !== 'production' && emotes.length > 0) {
      console.log(`Parsing message: "${content}" with ${emotes.length} emotes:`, 
        emotes.slice(0, 5).map(e => e.name) // Show first 5 emote names
      );
    }

    // Parse Kick emotes with [emote:id:name] format
    const emoteRegex = /\[emote:(\d+):(\w+)\]/g;
    parsedContent = parsedContent.replace(emoteRegex, (match, emoteId, emoteName) => {
      const emoteUrl = `https://files.kick.com/emotes/${emoteId}/fullsize`;
      return `<img src="${emoteUrl}" class="emote kick-emote" alt="${emoteName}" title="${emoteName}" loading="lazy">`;
    });

    // Parse 7TV emotes
    let replacementCount = 0;
    emotes.forEach(emote => {
      const regex = new RegExp(`\\b${escapeRegExp(emote.name)}\\b`, 'g');
      const emoteClass = `emote seventv-emote ${emote.type}-emote ${emote.animated ? 'animated' : 'static'}`;
      const emoteHtml = `<img src="${emote.url}" class="${emoteClass}" alt="${emote.name}" title="${emote.name} (7TV ${emote.type})" loading="lazy">`;
      
      const beforeReplace = parsedContent;
      parsedContent = parsedContent.replace(regex, emoteHtml);
      
      if (beforeReplace !== parsedContent && process.env.NODE_ENV !== 'production') {
        console.log(`✅ Replaced 7TV emote: ${emote.name} in message`);
        replacementCount++;
      }
    });

    if (process.env.NODE_ENV !== 'production' && replacementCount > 0) {
      console.log(`🎭 Total 7TV emotes replaced: ${replacementCount}`);
    }

    return parsedContent;
  };

  const escapeRegExp = (string: string): string => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  const getUsernameStyle = (): React.CSSProperties => {
    const style: React.CSSProperties = {};
    
    // Check for 7TV cosmetics first (backend) - only if user actually has cosmetics
    if (message.user.cosmetics && hasActualCosmetics(message.user.cosmetics)) {
      const cosmetics = message.user.cosmetics;
      
      // Apply 7TV color if available - prefer paint color over base color
      if (cosmetics.paint) {
         // For gradient paints, create CSS gradient with better rendering
         if (cosmetics.paint.stops && cosmetics.paint.stops.length > 0) {
           
           // Convert stops to CSS gradient (original colors)
           const gradientStops = cosmetics.paint.stops.map((stop: any) => {
             const unsignedColor = stop.color >>> 0;
             const colorHex = unsignedColor.toString(16).padStart(8, '0');
             const hexColor = `#${colorHex.substring(2)}`;
             const percentage = Math.round(stop.at * 100);
             return `${hexColor} ${percentage}%`;
           }).join(', ');
           
           // Create gradient based on function type
           const gradientType = getGradientType(cosmetics.paint.function);
           
           const gradient = `${gradientType}, ${gradientStops})`;
           style.background = gradient;
           applyGradientTextStyles(style);
           
         }
        // For solid paints, use the color field
        else if (cosmetics.paint.color) {
          style.color = convert7TVColorToRGB(cosmetics.paint.color);
        }
      }
      
       // Fallback to base color if no paint color found
       if (!style.color && cosmetics.user.style.color && cosmetics.user.style.color !== 0) {
         style.color = convert7TVColorToHex(cosmetics.user.style.color);
       }
       
       // If we still don't have a color, use Kick color as fallback
       if (!style.color && message.user.identity.color) {
         style.color = message.user.identity.color;
       }
      
       // Add special effects if user has paint
       if (cosmetics.user.style.paint_id) {
         // Enhanced effects for gradient paints
         if (cosmetics.paint && cosmetics.paint.stops && cosmetics.paint.stops.length > 0) {
           // Create glow using the first color from the gradient
           const firstColor = cosmetics.paint.stops[0];
           const firstColorHex = `#${(firstColor.color >>> 0).toString(16).padStart(8, '0').substring(2)}`;
           
           // Set glow color as CSS custom property using paintData
           
           if (paintData && paintData.stops && paintData.stops.length > 0) {
             const glowColor = paintData.stops[0];
             const glowColorHex = convert7TVColorToHex(glowColor.color);
             // Set the CSS custom property on the actual DOM element
             if (usernameRef.current) {
               usernameRef.current.style.setProperty('--glow-color', glowColorHex);
             }
             // Note: CSS custom property is set on the DOM element via usernameRef
           } else {
           }
           style.fontWeight = '800';
         } else {
           // Standard effects for solid paints
           style.textShadow = '0 0 8px currentColor, 0 0 16px currentColor, 0 0 24px currentColor';
           style.fontWeight = '700';
         }
       }
    } 
    // Check for frontend 7TV cosmetics (fallback) - only if user actually has cosmetics
    else if (frontendCosmetics && hasActualCosmetics(frontendCosmetics)) {
      const cosmetics = frontendCosmetics;
      
      // Apply 7TV color if available - prefer paint color over base color
      if (paintData) {
        
         // For gradient paints, create CSS gradient with better rendering
         if (paintData.stops && paintData.stops.length > 0) {
           
            // Convert stops to CSS gradient (original colors)
            const gradientStops = paintData.stops.map((stop: any) => {
              const rgbColor = convert7TVColorToRGB(stop.color);
              const percentage = Math.round(stop.at * 100);
              return `${rgbColor} ${percentage}%`;
            }).join(', ');
           
           // Create gradient based on function type
           const gradientType = getGradientType(paintData.function);
           
           const gradient = `${gradientType}, ${gradientStops})`;
           style.background = gradient;
           applyGradientTextStyles(style);
           
         }
        // For solid paints, use the color field
        else if (paintData.color) {
          style.color = convert7TVColorToRGB(paintData.color);
        }
      }
      
       // Fallback to base color if no paint color found
       if (!style.color && cosmetics.user.style.color && cosmetics.user.style.color !== 0) {
         style.color = convert7TVColorToRGB(cosmetics.user.style.color);
       }
       
       // If we still don't have a color, use Kick color as fallback
       if (!style.color && message.user.identity.color) {
         style.color = message.user.identity.color;
       }
      
       // Add special effects if user has paint
       if (cosmetics.user.style.paint_id) {
         // Enhanced effects for gradient paints
         if (paintData && paintData.stops && paintData.stops.length > 0) {
           // Create glow using the first color from the gradient
           const firstColor = paintData.stops[0];
           const firstColorHex = `#${(firstColor.color >>> 0).toString(16).padStart(8, '0').substring(2)}`;
           
           // Set glow color as CSS custom property using paintData
           
           if (paintData && paintData.stops && paintData.stops.length > 0) {
             const glowColor = paintData.stops[0];
             const glowColorHex = convert7TVColorToHex(glowColor.color);
             // Set the CSS custom property on the actual DOM element
             if (usernameRef.current) {
               usernameRef.current.style.setProperty('--glow-color', glowColorHex);
             }
             // Note: CSS custom property is set on the DOM element via usernameRef
           } else {
           }
           style.fontWeight = '800';
         } else {
           // Standard effects for solid paints
           style.textShadow = '0 0 8px currentColor, 0 0 16px currentColor, 0 0 24px currentColor';
           style.fontWeight = '700';
         }
       }
    } 
    else if (message.user.identity.color) {
      // Fallback to Kick color if no 7TV cosmetics
      style.color = message.user.identity.color;
    } else {
    // Generate a consistent color based on username
    const hash = message.username.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const hue = Math.abs(hash) % 360;
      style.color = `hsl(${hue}, 90%, 70%)`;
    }
    
    // Ensure we always have a color (better fallback than white)
    if (!style.color) {
      // Generate a nice color based on username instead of white
      const hash = message.username.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      
      const hue = Math.abs(hash) % 360;
      style.color = `hsl(${hue}, 85%, 65%)`;
    }
    
    return style;
  };

  // Helper function to check if user actually has 7TV cosmetics
  const hasActualCosmetics = (cosmetics: any): boolean => {
    if (!cosmetics) return false;
    
    
    return !!(
      cosmetics.user.style.paint_id ||
      cosmetics.user.style.badge_id ||
      (cosmetics.user.style.color && cosmetics.user.style.color !== 0) ||
      (cosmetics.roles && cosmetics.roles.length > 0)
    );
  };

  const getUsernameClassName = (): string => {
    // Add 7TV cosmetics class only if user has actual cosmetics
    if (hasActualCosmetics(message.user.cosmetics) || hasActualCosmetics(frontendCosmetics)) {
      return 'username username-seventv';
    }
    return 'username';
  };

  return (
    <div className="chat-message">
      {/* Badges */}
      {message.badges.length > 0 && (
        <div className="badge-container">
          {message.badges.map((badge, index) => (
            <Badge 
              key={`${badge.type}-${index}`} 
              badge={badge} 
              channelInfo={channelInfo}
            />
          ))}
        </div>
      )}

      {/* Username */}
       <span 
         ref={usernameRef}
         className={getUsernameClassName()} 
         style={getUsernameStyle()}
         data-has-paint={(message.user.cosmetics?.user.style.paint_id || frontendCosmetics?.user.style.paint_id) ? 'true' : 'false'}
         data-text={`${message.username}:`}
       >
        {message.username}:
      </span>

      {/* Message content */}
      <span 
        className="message-content"
        dangerouslySetInnerHTML={{ 
          __html: parseMessageContent(message.content) 
        }}
      />
    </div>
  );
});

export default ChatMessage;