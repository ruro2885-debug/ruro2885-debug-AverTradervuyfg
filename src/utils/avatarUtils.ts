export const getInitials = (name?: string, email?: string): string => {
  if (name && name.trim()) {
    return name.trim().charAt(0).toUpperCase();
  }
  if (email && email.trim()) {
    return email.trim().charAt(0).toUpperCase();
  }
  return 'U';
};

const GRADIENTS = [
  'from-emerald-500 to-teal-600',
  'from-blue-600 to-cyan-500',
  'from-violet-600 to-indigo-600',
  'from-pink-500 to-rose-600',
  'from-amber-500 to-orange-600',
  'from-fuchsia-600 to-purple-600'
];

export const getAvatarGradient = (seed?: string): string => {
  if (!seed) return GRADIENTS[0];
  const charSum = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const index = charSum % GRADIENTS.length;
  return GRADIENTS[index];
};

// Keeping this function signature for backward compatibility but making it return empty string or null 
// so that components render the initials fallback instead of an image.
export const getDefaultAvatarURL = (uid: string): string => {
  return '';
};
