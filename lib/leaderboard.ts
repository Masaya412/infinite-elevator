import { signInAnonymously } from 'firebase/auth';
import { addDoc, collection, limit, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { auth, db, firebaseReady } from './firebase';

export type RankingEntry = {
  id?: string;
  uid?: string;
  name: string;
  score: number;
  floor: number;
  money: number;
  luck: number;
  createdAt?: unknown;
};

export async function ensureAnonymousUser() {
  if (!firebaseReady || !auth) return null;
  if (auth.currentUser) return auth.currentUser;
  const credential = await signInAnonymously(auth);
  return credential.user;
}

export async function submitRanking(entry: Omit<RankingEntry, 'uid' | 'createdAt'>) {
  if (!firebaseReady || !auth || !db) throw new Error('Firebase is not configured');
  const user = await ensureAnonymousUser();
  if (!user) throw new Error('Anonymous sign-in failed');
  await addDoc(collection(db, 'rankings'), {
    ...entry,
    uid: user.uid,
    createdAt: serverTimestamp(),
  });
}

export function subscribeTopRankings(
  onData: (rows: RankingEntry[]) => void,
  onError?: (error: Error) => void,
) {
  if (!firebaseReady || !db) return () => {};
  const q = query(collection(db, 'rankings'), orderBy('score', 'desc'), limit(50));
  return onSnapshot(
    q,
    (snapshot) => {
      onData(snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as RankingEntry) })));
    },
    (error) => onError?.(error),
  );
}
