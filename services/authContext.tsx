import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  setPersistence,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  updateProfile as firebaseUpdateProfile,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword as firebaseUpdatePassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase'; // ✅ CORRECT PATH - firebase.ts in root
import { User, UserRole } from '../types';
import { colorFromString } from '../utils/avatar';
import { logger } from '../utils/logger';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  isFirstLogin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, department: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: { displayName?: string; avatarBgColor?: string }) => Promise<void>;
  changePassword: (current: string, newPass: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  completeFirstLogin: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFirstLogin, setIsFirstLogin] = useState(false);

  const fetchUserDoc = async (email: string, uid: string) => {
    const uidDocRef = doc(db, 'users', uid);
    const uidDocSnap = await getDoc(uidDocRef);
    if (uidDocSnap.exists()) {
      return { data: uidDocSnap.data(), docId: uid };
    }
    const emailDocRef = doc(db, 'users', email);
    const emailDocSnap = await getDoc(emailDocRef);
    if (emailDocSnap.exists()) {
      return { data: emailDocSnap.data(), docId: email };
    }
    return null;
  };

  // Initialize Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (!firebaseUser) {
          setUser(null);
          setIsFirstLogin(false);
          return;
        }

        const email = firebaseUser.email?.trim().toLowerCase();
        if (!email) {
          await firebaseSignOut(auth);
          throw new Error('Invalid account: Missing email.');
        }

        let userDoc = await fetchUserDoc(email, firebaseUser.uid);
        if (!userDoc) {
          await setDoc(doc(db, 'users', firebaseUser.uid), {
            uid: firebaseUser.uid,
            email,
            displayName: firebaseUser.displayName || 'User',
            name: firebaseUser.displayName || 'User',
            role: UserRole.USER,
            status: 'PENDING',
            canApproveUsers: false,
            department: null,
            isPasswordSetup: true,
            setupCompleted: true,
            createdAt: serverTimestamp()
          });
          userDoc = await fetchUserDoc(email, firebaseUser.uid);
        }

        // Auto-heal missing/incomplete user profile docs (common when Firestore write was blocked during sign-up)
        // Strategy: ensure a uid-based doc exists and patch only missing fields (do not overwrite role/status/department).
        if (userDoc) {
          try {
            const existing = userDoc.data || {};
            const authName = (firebaseUser.displayName || '').trim();
            const existingName = (existing.displayName || existing.name || '').toString().trim();
            const shouldPatchName = (!existingName || ['user', 'unknown', '-', 'n/a'].includes(existingName.toLowerCase())) && !!authName;

            const patch: any = {
              uid: firebaseUser.uid,
              email,
              updatedAt: serverTimestamp(),
            };

            if (shouldPatchName) {
              patch.displayName = authName;
              patch.name = authName;
            }

            // Always ensure uid-based doc exists (standardize away from legacy email-doc keys)
            await setDoc(doc(db, 'users', firebaseUser.uid), patch, { merge: true });
          } catch (healErr) {
            logger.warn('[auth] Failed to auto-heal user profile doc (non-blocking):', healErr);
          }
        }

        const userData = userDoc?.data || {};
        const rawStatus = userData.status;
        const normalizedStatus = (() => {
          if (!rawStatus) return 'ACTIVE';
          const value = String(rawStatus).toUpperCase();
          if (value === 'INVITED') return 'PENDING';
          if (value === 'INACTIVE') return 'REJECTED';
          if (value === 'PENDING' || value === 'ACTIVE' || value === 'REJECTED') return value;
          return 'ACTIVE';
        })();
        const hasPasswordSetup =
          userData.isPasswordSetup === true || userData.setupCompleted === true;
        const appUser: User = {
          uid: firebaseUser.uid,
          email,
          displayName: userData.displayName || firebaseUser.displayName || 'User',
          role: userData.role || UserRole.USER,
          department: userData.department,
          status: normalizedStatus,
          avatarUrl: userData.avatarUrl,
          avatar: userData.avatar,
          canApproveUsers: userData.canApproveUsers ?? false
        };

        setUser(appUser);
        setIsFirstLogin(normalizedStatus === 'PENDING' && !hasPasswordSetup);
        setError(null);
      } catch (err: any) {
        logger.error('Error loading user:', err);
        setError(err.message);
        setUser(null);
        setIsFirstLogin(false);
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
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const loginEmail = userCredential.user.email?.trim().toLowerCase();
      if (!loginEmail) {
        await firebaseSignOut(auth);
        throw new Error('Invalid account: Missing email.');
      }

      const userDoc = await fetchUserDoc(loginEmail, userCredential.user.uid);
        if (!userDoc) {
          await setDoc(doc(db, 'users', userCredential.user.uid), {
            uid: userCredential.user.uid,
            email: loginEmail,
            displayName: userCredential.user.displayName || 'User',
            name: userCredential.user.displayName || 'User',
            role: UserRole.USER,
            status: 'PENDING',
            canApproveUsers: false,
            department: null,
            isPasswordSetup: true,
            setupCompleted: true,
            createdAt: serverTimestamp()
          });
        }
    } catch (err: any) {
      const message = err.code === 'auth/user-not-found' 
        ? 'User not found. Please check the email address.'
        : err.code === 'auth/wrong-password'
        ? 'Incorrect password.'
        : err.code === 'auth/invalid-credential'
        ? 'Invalid email or password.'
        : err.message || 'Login failed';
      
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string, department: string) => {
    setLoading(true);
    setError(null);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      // Auth user creation is the "source of truth" for sign-up success.
      // Downstream Firestore writes can fail if the browser blocks Firebase requests.
      const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      const newUser = userCredential.user;

      // Phase 1: deterministic initials avatar + color (no external dependency)
      const avatarBgColor = colorFromString(normalizedEmail);

      try {
        await firebaseUpdateProfile(newUser, { displayName: name });
      } catch (profileErr) {
        logger.warn('[register] Failed to update Firebase Auth profile (non-blocking):', profileErr);
      }

      try {
        await setDoc(doc(db, 'users', newUser.uid), {
          uid: newUser.uid,
          email: normalizedEmail,
          displayName: name,
          name,
          role: UserRole.USER,
          status: 'PENDING',
          canApproveUsers: false,
          department,
          avatar: { bgColor: avatarBgColor },
          isPasswordSetup: true,
          setupCompleted: true,
          createdAt: Date.now()
        });
      } catch (firestoreErr) {
        // Non-blocking: account is created in Auth. The user doc can be created later by retry
        // or by the auth listener fallback (when Firestore is reachable).
        logger.warn('[register] Failed to write user profile to Firestore (non-blocking):', firestoreErr);
      }
    } catch (err: any) {
      const message = err.code === 'auth/email-already-in-use'
        ? 'An account already exists for this email. Please Sign In.'
        : err.code === 'auth/weak-password'
        ? 'Password should be at least 6 characters.'
        : err.message || 'Registration failed';
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
      setIsFirstLogin(false);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (data: { displayName?: string; avatarBgColor?: string }) => {
    if (!user) throw new Error('No user logged in');

    try {
      const patch: any = {};

      if (typeof data.displayName === 'string') {
        if (!data.displayName.trim()) throw new Error('Display name cannot be empty.');
        patch.displayName = data.displayName.trim();
      }

      if (typeof data.avatarBgColor === 'string') {
        patch.avatar = { ...(user.avatar || {}), bgColor: data.avatarBgColor };
      }

      if (Object.keys(patch).length === 0) return;

      // Ensure we always write to the UID-based profile doc.
      // Some legacy users may not have a /users/{uid} doc yet, which makes updateDoc fail with "No document to update".
      const uidDocRef = doc(db, 'users', user.uid);

      // Keep Firebase Auth displayName in sync (best-effort)
      try {
        if (patch.displayName && auth.currentUser) {
          await firebaseUpdateProfile(auth.currentUser, { displayName: patch.displayName });
        }
      } catch (e) {
        // ignore auth profile sync failures; Firestore remains source of truth for app UI
      }

      await setDoc(
        uidDocRef,
        {
          uid: user.uid,
          email: user.email,
          role: user.role,
          ...patch,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      const updatedUser: User = {
        ...user,
        ...(patch.displayName ? { displayName: patch.displayName } : {}),
        ...(patch.avatar ? { avatar: patch.avatar } : {}),
      };
      setUser(updatedUser);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const changePassword = async (current: string, newPass: string) => {
    if (!auth.currentUser || !auth.currentUser.email) {
      throw new Error('No user logged in.');
    }

    try {
      // Firebase requires recent authentication before changing sensitive info like password.
      const credential = EmailAuthProvider.credential(auth.currentUser.email, current);
      await reauthenticateWithCredential(auth.currentUser, credential);

      await firebaseUpdatePassword(auth.currentUser, newPass);
    } catch (err: any) {
      const code = err?.code;
      const message = code === 'auth/wrong-password'
        ? 'Current password is incorrect.'
        : code === 'auth/too-many-requests'
        ? 'Too many attempts. Please try again later.'
        : code === 'auth/requires-recent-login'
        ? 'Please log in again and retry changing your password.'
        : err?.message || 'Failed to change password.';

      setError(message);
      throw new Error(message);
    }
  };

  const requestPasswordReset = async (email: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) throw new Error('Please enter your email address.');

    try {
      await sendPasswordResetEmail(auth, normalizedEmail);
    } catch (err: any) {
      const code = err?.code;
      // Avoid leaking whether an email exists. Keep it generic.
      const message = code === 'auth/invalid-email'
        ? 'Invalid email address.'
        : 'If an account exists for this email, a password reset link will be sent.';
      throw new Error(message);
    }
  };

  const completeFirstLogin = () => {
    setIsFirstLogin(false);
    setUser((prev) => (prev ? { ...prev, status: 'active' } : prev));
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, isFirstLogin, login, register, logout, updateProfile, changePassword, requestPasswordReset, completeFirstLogin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
