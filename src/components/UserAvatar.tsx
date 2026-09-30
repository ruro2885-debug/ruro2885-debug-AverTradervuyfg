import React, { useState } from 'react';
import { motion } from 'motion/react';
import { generateAvatarSvg } from '../utils/avatarGenerator';

interface UserAvatarProps {
  user: {
    uid: string;
    username?: string;
    email?: string;
    profilePhotoURL?: string;
    avatarUrl?: string;
    avatarSeed?: string;
    hasCustomPhoto?: boolean;
  } | null;
  sizeClass?: string; // e.g. "w-8 h-8" or "w-24 h-24"
  fontSizeClass?: string; // e.g. "text-xs" or "text-3xl"
  isDark?: boolean;
}

export default function UserAvatar({ user, sizeClass = "w-8 h-8", fontSizeClass = "text-xs", isDark = true }: UserAvatarProps) {
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const getCachedPhoto = () => {
    if (typeof window === 'undefined') return null;
    try {
      if (user?.uid) {
        const byUid = localStorage.getItem(`aver_custom_photo_${user.uid}`);
        if (byUid) return byUid;
      }
      return localStorage.getItem('aver_last_custom_photo');
    } catch (e) {
      return null;
    }
  };

  const cachedPhoto = getCachedPhoto();
  const rawPhoto = user?.avatarUrl || user?.profilePhotoURL || cachedPhoto || undefined;
  const isSvgAvatar = rawPhoto ? rawPhoto.startsWith('data:image/svg+xml') : false;
  
  // A custom photo is valid if:
  // 1. Raw photo exists and is not the default procedural SVG avatar
  // 2. OR user explicitly has hasCustomPhoto set to true
  // 3. No permanent load error
  const hasPhoto = !!(rawPhoto && (!isSvgAvatar || user?.hasCustomPhoto) && !hasError);
  const photoUrl = hasPhoto ? rawPhoto : undefined;
  
  if (photoUrl && hasPhoto) {
    console.log("[UserAvatar] Rendering custom photoUrl:", photoUrl.startsWith('data:') ? `data:URL(${photoUrl.length} chars)` : photoUrl);
  }

  const handleImageError = () => {
    if (retryCount < 3) {
      // Automatic retry with backoff
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
      }, (retryCount + 1) * 1000);
    } else {
      setHasError(true);
    }
  };

  if (!user) {
    return (
      <div className={`${sizeClass} rounded-full bg-slate-700 animate-pulse`} />
    );
  }

  return (
    <div className={`relative ${sizeClass} rounded-full overflow-hidden flex items-center justify-center select-none shadow-lg group transition-all duration-300`}>
      {hasPhoto ? (
        <motion.img
          key={`${photoUrl}-${retryCount}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          src={photoUrl}
          alt={user.username || "User"}
          className="w-full h-full object-cover rounded-full"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={handleImageError}
        />
      ) : (
        <div 
          className="w-full h-full rounded-full overflow-hidden flex items-center justify-center"
          dangerouslySetInnerHTML={{ 
            __html: generateAvatarSvg(user.avatarSeed || user.uid || user.username || user.email || 'aver_user') 
          }}
        />
      )}
    </div>
  );
}
