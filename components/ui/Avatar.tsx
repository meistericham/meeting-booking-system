import React from 'react';
import { User } from '../../types';
import { colorFromString, getInitials } from '../../utils/avatar';

type AvatarSize = 'sm' | 'md' | 'lg';

const sizeClasses: Record<AvatarSize, string> = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base',
};

interface AvatarProps {
  user?: Partial<User> | null;
  displayName?: string;
  email?: string;
  bgColor?: string | null;
  size?: AvatarSize;
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({
  user,
  displayName,
  email,
  bgColor,
  size = 'md',
  className = '',
}) => {
  const name = displayName ?? user?.displayName;
  const mail = email ?? user?.email;
  const resolvedBg =
    bgColor ??
    (user as any)?.avatar?.bgColor ??
    (user as any)?.avatarBgColor ??
    colorFromString(mail || name || 'user');

  const initials = getInitials(name, mail);

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold text-white select-none ${className}`}
      style={{ backgroundColor: resolvedBg }}
      aria-label={name || mail || 'User'}
      title={name || mail || ''}
    >
      {initials}
    </div>
  );
};

export default Avatar;
