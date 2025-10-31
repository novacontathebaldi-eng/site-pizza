// ✅ FIREBASE AUTHENTICATION + DATABASE
import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
    apiKey: "AIzaSyCTMHlUCGOpU7VRIdbP2VADzUF9n1lI88A",
    authDomain: "site-pizza-a2930.firebaseapp.com",
    projectId: "site-pizza-a2930",
    storageBucket: "site-pizza-a2930.appspot.com",
    messagingSenderId: "914255031241",
    appId: "1:914255031241:web:84ae273b22cb7d04499618"
}

const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();


// Exporta Firebase Auth
export const firebaseAuth = getAuth(firebaseApp)

// Exporta Firebase Firestore Database
export const firebaseDB = getFirestore(firebaseApp)

// ✅ SUPABASE STORAGE (NOVO)
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://lwkfyvprbhkphoxkorjq.supabase.co"
const supabaseKey = "sb_publishable_FfE6ZD2msjpRA0o8f1HTmA_Hfvl9bUn"

export const supabase = createClient(supabaseUrl, supabaseKey)