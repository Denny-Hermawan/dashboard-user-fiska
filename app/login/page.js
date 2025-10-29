import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebaseConfig"; // Sesuaikan path

const provider = new GoogleAuthProvider();

const handleGoogleSignIn = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    console.log("Login berhasil:", user.uid, user.displayName);
    // Arahkan ke halaman dashboard setelah login
    // router.push('/dashboard'); // Jika menggunakan Next.js Router
  } catch (error) {
    console.error("Error login Google:", error);
    // Tampilkan pesan error ke pengguna
  }
};