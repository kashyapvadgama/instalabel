import { LogOut, Package, PlusCircle } from 'lucide-react';
import { Settings as SettingsIcon } from 'lucide-react';


export default function Navbar({ user, setView, handleLogout }) {
  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center shadow-sm">
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('dashboard')}>
        <div className="bg-blue-600 text-white p-1 rounded-lg">
          <Package size={20} />
        </div>
        <span className="font-bold text-xl tracking-tight">InstaLabel</span>
      </div>
      
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setView('new-order')}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <PlusCircle size={16} />
          New Label
        </button>
        
        <button 
          onClick={handleLogout}
          className="text-gray-500 hover:text-red-600 transition-colors"
          title="Sign Out"
        >
          <LogOut size={20} />
        </button>
        <button onClick={() => setView('settings')} className="text-gray-500 hover:text-blue-600" title="Settings">
  <SettingsIcon size={20} />
</button>
      </div>
    </nav>
  );
}
