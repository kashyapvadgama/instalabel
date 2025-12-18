import { useState, useEffect, lazy, Suspense } from 'react'; // lazy & Suspense add kiya
import { supabase } from './lib/supabaseClient';
import Navbar from './components/Navbar';
import { Loader2 } from 'lucide-react';

// 🟢 LAZY IMPORTS (Ye pages tabhi load honge jab zarurat hogi)
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const NewOrder = lazy(() => import('./pages/NewOrder'));
const Settings = lazy(() => import('./pages/Settings'));

// Loading Component
const PageLoader = () => (
  <div className="h-screen w-full flex items-center justify-center bg-gray-50">
    <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
  </div>
);

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('dashboard'); 

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) return <PageLoader />;

  if (!session) {
    // Suspense wrapper zaroori hai lazy components ke liye
    return (
      <Suspense fallback={<PageLoader />}>
        <Login />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={session.user} setView={setView} handleLogout={handleLogout} />
      
      <main>
        <Suspense fallback={<PageLoader />}>
          {view === 'dashboard' && <Dashboard session={session} />}
          {view === 'new-order' && <NewOrder session={session} setView={setView} />}
          {view === 'settings' && <Settings session={session} />}
        </Suspense>
      </main>
    </div>
  );
}

export default App;