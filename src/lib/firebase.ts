import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  "projectId": "trackguinea",
  "appId": "1:870790440395:web:552a79ce5837ca73ed424e",
  "storageBucket": "trackguinea.appspot.com",
  "apiKey": "AIzaSyCMa7MDCo8HdeJOPpb4xqrKIVMGkzKgUqs",
  "authDomain": "trackguinea.firebaseapp.com",
  "messagingSenderId": "870790440395"
};

// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app, `gs://${firebaseConfig.storageBucket}`);
const firestore = getFirestore(app);

export { app, auth, db, storage, firestore };
