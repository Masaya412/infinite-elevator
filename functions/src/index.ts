import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';

initializeApp();

/**
 * A ranking is first written by the authenticated web client.
 * After every new entry, remove every document below the current Top 50.
 * Admin SDK bypasses Firestore Security Rules, so users never receive delete permission.
 */
export const trimRankingsToTop50 = onDocumentCreated('rankings/{rankingId}', async () => {
  const db = getFirestore();

  // Delete in batches. Firestore batches support at most 500 writes.
  while (true) {
    const overflow = await db
      .collection('rankings')
      .orderBy('score', 'desc')
      .offset(50)
      .limit(450)
      .get();

    if (overflow.empty) break;

    const batch = db.batch();
    overflow.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    if (overflow.size < 450) break;
  }
});
