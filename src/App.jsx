import { AuthProvider, useAuth } from "./context/AuthContext";
import Auth from "./components/Auth/Auth";
import MainApp from "./MainApp";

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <p className="text-sm text-slate-400">Initializing session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return <MainApp />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
