import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyAo_bfivWDMhsdboWup756fzSdyK4WIa-Y",
  authDomain: "to-do-bcb51.firebaseapp.com",
  projectId: "to-do-bcb51",
  storageBucket: "to-do-bcb51.appspot.com",
  messagingSenderId: "1068599821608",
  appId: "1:1068599821608:web:94c79d4e4d4c0c5478bc1d",
  measurementId: "G-RSGB54X1DM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export { app };