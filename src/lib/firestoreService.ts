import { db } from './firebase';
import { doc, setDoc, getDoc, collection, getDocs, deleteDoc, updateDoc, query, orderBy } from 'firebase/firestore';
import { User, UserProfile, Analysis } from '../types';

export async function saveUserToFirestore(uid: string, userData: Partial<User>) {
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, {
    id: uid,
    ...userData,
    updated_at: new Date().toISOString()
  }, { merge: true });
}

export async function getUserFromFirestore(uid: string): Promise<User | null> {
  const userRef = doc(db, 'users', uid);
  const docSnap = await getDoc(userRef);
  if (docSnap.exists()) {
    return docSnap.data() as User;
  }
  return null;
}

export async function saveProfileToFirestore(uid: string, profileData: Partial<UserProfile>) {
  const profileRef = doc(db, 'users', uid, 'profiles', 'main');
  await setDoc(profileRef, {
    user_id: uid,
    ...profileData,
    updated_at: new Date().toISOString()
  }, { merge: true });
}

export async function getProfileFromFirestore(uid: string): Promise<UserProfile | null> {
  const profileRef = doc(db, 'users', uid, 'profiles', 'main');
  const docSnap = await getDoc(profileRef);
  if (docSnap.exists()) {
    return docSnap.data() as UserProfile;
  }
  return null;
}

export async function saveAnalysisToFirestore(uid: string, analysis: Analysis) {
  const analysisRef = doc(db, 'users', uid, 'analyses', analysis.id);
  await setDoc(analysisRef, analysis);
}

export async function getAnalysesFromFirestore(uid: string): Promise<Analysis[]> {
  const analysesCol = collection(db, 'users', uid, 'analyses');
  const q = query(analysesCol, orderBy('created_at', 'desc'));
  const querySnapshot = await getDocs(q);
  const results: Analysis[] = [];
  querySnapshot.forEach((doc) => {
    results.push(doc.data() as Analysis);
  });
  return results;
}

export async function deleteAnalysisFromFirestore(uid: string, analysisId: string) {
  const analysisRef = doc(db, 'users', uid, 'analyses', analysisId);
  await deleteDoc(analysisRef);
}
