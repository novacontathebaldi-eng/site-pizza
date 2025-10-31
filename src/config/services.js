// ✅ FIREBASE AUTHENTICATION + DATABASE
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
apiKey: "AIzaSyAWVI9VHvxARMSM3JV-bXs_73UjKh25mn4",
authDomain: "thebaldi-me.firebaseapp.com",
projectId: "thebaldi-me",
databaseURL: "https://thebaldi-me.firebaseio.com",
messagingSenderId: "794996190135",
appId: "1:794996190135:web:ec7ac21c07fc58847d5632"
}

const firebaseApp = initializeApp(firebaseConfig)

// Exporta Firebase Auth
export const firebaseAuth = getAuth(firebaseApp)

// Exporta Firebase Firestore Database
export const firebaseDB = getFirestore(firebaseApp)

// ✅ SUPABASE STORAGE (NOVO)
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://lwkfyvprbhkphoxkorjq.supabase.co"
const supabaseKey = "sb_publishable_FfE6ZD2msjpRA0o8f1HTmA_Hfvl9bUn"

export const supabase = createClient(supabaseUrl, supabaseKey)
