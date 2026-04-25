import { AuthProvider } from "./context/AuthContext";
import AppRouter from "./Router";

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-slate-950 text-white">
        <AppRouter />
      </div>
    </AuthProvider>
  );
}
