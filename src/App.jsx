import { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NewOrder from './pages/NewOrder';
import Navbar from './components/Navbar';
import { Loader2 } from 'lucide-react';
import Settings from './pages/Settings';


function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('dashboard'); // 'dashboard' or 'new-order'

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

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={session.user} setView={setView} handleLogout={handleLogout} />
      
      <main>
        {view === 'dashboard' && <Dashboard session={session} />}
        {view === 'new-order' && <NewOrder session={session} setView={setView} />}
        {view === 'settings' && <Settings session={session} />}

      </main>
    </div>
  );
}

export default App;
