import { signInAnonymously } from 'firebase/auth';
import { addDoc, collection, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, writeBatch } from 'firebase/firestore';
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

  // Spark無料プラン向け: 登録後にクライアント側でTop 50だけ残す。
  // Cloud Functionsを使わないため、Security Rulesでは認証済みユーザーのdeleteを許可する必要がある。
  const rankingQuery = query(collection(db, 'rankings'), orderBy('score', 'desc'));
  const snapshot = await getDocs(rankingQuery);
  const extras = snapshot.docs.slice(50);
  if (extras.length > 0) {
    // Firestoreのbatch上限（500件）を超えないよう分割する。
    for (let i = 0; i < extras.length; i += 450) {
      const batch = writeBatch(db);
      extras.slice(i, i + 450).forEach((docSnap) => batch.delete(docSnap.ref));
      await batch.commit();
    }
  }
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
