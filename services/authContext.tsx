import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  EmailAuthProvider,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updatePassword as firebaseUpdatePassword,
  updateProfile as firebaseUpdateProfile,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { AppUser, SignupInput } from '../types';
import {
  fetchApprovedEmailInviteByEmail,
  normalizeInviteEmail,
} from './inviteService';
import { fetchUserById } from './userService';

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: SignupInput) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: {
    displayName?: string;
    avatarBgColor?: string;
    phoneNumber?: string;
    organization?: string;
  }) => Promise<void>;
  changePassword: (current: string, newPass: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (!firebaseUser) {
          setUser(null);
          return;
        }

        const userProfile = await fetchUserById(firebaseUser.uid);

        if (!userProfile) {
          await firebaseSignOut(auth);
          setUser(null);
          setError('Account is not provisioned for this application.');
          return;
        }

        if (userProfile.isActive === false) {
          await firebaseSignOut(auth);
          setUser(null);
          setError('Your account has been deactivated. Please contact the administrator.');
          return;
        }

        setUser(userProfile);
        setError(null);
      } catch (err: any) {
        console.error('Error loading user:', err);
        setError(err?.message || 'Unable to load account.');
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      await setPersistence(auth, browserLocalPersistence);
      const credential = await signInWithEmailAndPassword(auth, normalizeEmail(email), password);
      const userProfile = await fetchUserById(credential.user.uid);

      if (!userProfile) {
        await firebaseSignOut(auth);
        throw new Error('Account is not provisioned for this application.');
      }

      if (userProfile.isActive === false) {
        await firebaseSignOut(auth);
        throw new Error('Your account has been deactivated. Please contact the administrator.');
      }
    } catch (err: any) {
      const message =
        err?.code === 'auth/user-not-found'
          ? 'User not found.'
          : err?.code === 'auth/wrong-password'
            ? 'Incorrect password.'
            : err?.code === 'auth/invalid-credential'
              ? 'Invalid email or password.'
              : err?.message || 'Login failed.';

      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const signup = async (data: SignupInput) => {
    const normalizedEmail = normalizeInviteEmail(data.email);
    const invite = await fetchApprovedEmailInviteByEmail(normalizedEmail);

    if (!invite) {
      throw new Error('This email address has not been invited yet.');
    }

    if (invite.claimedAt) {
      throw new Error('This invite has already been claimed.');
    }

    setLoading(true);
    setError(null);

    let createdUser: Awaited<ReturnType<typeof createUserWithEmailAndPassword>> | null = null;

    try {
      await setPersistence(auth, browserLocalPersistence);
      createdUser = await createUserWithEmailAndPassword(auth, normalizedEmail, data.password);

      if (data.displayName.trim()) {
        await firebaseUpdateProfile(createdUser.user, {
          displayName: data.displayName.trim(),
        });
      }

      const timestamp = Date.now();
      const batch = writeBatch(db);
      const userDocRef = doc(db, 'users', createdUser.user.uid);
      const inviteRef = doc(db, 'approvedEmails', normalizedEmail);

      batch.set(userDocRef, {
        uid: createdUser.user.uid,
        email: normalizedEmail,
        displayName: data.displayName.trim(),
        role: invite.role,
        isActive: true,
        phoneNumber: data.phoneNumber?.trim() || '',
        organization: data.organization?.trim() || '',
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      batch.set(
        inviteRef,
        {
          claimedAt: timestamp,
        },
        { merge: true }
      );

      await batch.commit();
    } catch (err: any) {
      if (createdUser?.user) {
        try {
          await deleteUser(createdUser.user);
        } catch {
          // Ignore cleanup failures; auth listener will handle invalid state.
        }
      }

      const message =
        err?.code === 'auth/email-already-in-use'
          ? 'An account already exists for this email.'
          : err?.code === 'auth/weak-password'
            ? 'Password must be at least 6 characters.'
            : err?.message || 'Unable to create account.';

      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);

    try {
      await firebaseSignOut(auth);
      setUser(null);
    } catch (err: any) {
      const message = err?.message || 'Failed to sign out.';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (data: {
    displayName?: string;
    avatarBgColor?: string;
    phoneNumber?: string;
    organization?: string;
  }) => {
    if (!user) {
      throw new Error('No user logged in.');
    }

    const patch: Record<string, unknown> = {};

    if (typeof data.displayName === 'string') {
      if (!data.displayName.trim()) {
        throw new Error('Display name cannot be empty.');
      }

      patch.displayName = data.displayName.trim();

      if (auth.currentUser) {
        try {
          await firebaseUpdateProfile(auth.currentUser, {
            displayName: data.displayName.trim(),
          });
        } catch {
          // Ignore Firebase Auth profile sync failures for now.
        }
      }
    }

    if (typeof data.avatarBgColor === 'string') {
      patch.avatar = {
        ...(user.avatar || {}),
        bgColor: data.avatarBgColor,
      };
    }

    if (typeof data.phoneNumber === 'string') {
      patch.phoneNumber = data.phoneNumber.trim();
    }

    if (typeof data.organization === 'string') {
      patch.organization = data.organization.trim();
    }

    if (Object.keys(patch).length === 0) {
      return;
    }

    await setDoc(
      doc(db, 'users', user.uid),
      {
        ...patch,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    setUser((current) =>
      current
        ? {
            ...current,
            ...(patch as Partial<AppUser>),
          }
        : current
    );
  };

  const changePassword = async (current: string, newPass: string) => {
    if (!auth.currentUser || !auth.currentUser.email) {
      throw new Error('No user logged in.');
    }

    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, current);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await firebaseUpdatePassword(auth.currentUser, newPass);
    } catch (err: any) {
      const message =
        err?.code === 'auth/wrong-password'
          ? 'Current password is incorrect.'
          : err?.code === 'auth/too-many-requests'
            ? 'Too many attempts. Please try again later.'
            : err?.code === 'auth/requires-recent-login'
              ? 'Please log in again and retry.'
              : err?.message || 'Failed to change password.';

      setError(message);
      throw new Error(message);
    }
  };

  const requestPasswordReset = async (email: string) => {
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      throw new Error('Please enter your email address.');
    }

    try {
      await sendPasswordResetEmail(auth, normalizedEmail);
    } catch (err: any) {
      const message =
        err?.code === 'auth/invalid-email'
          ? 'Invalid email address.'
          : 'If an account exists for this email, a password reset link will be sent.';

      throw new Error(message);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        signup,
        logout,
        updateProfile,
        changePassword,
        requestPasswordReset,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
