import { LogOut, Package, PlusCircle, Settings } from 'lucide-react';

export default function Navbar({ user, setView, handleLogout }) {
  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center shadow-sm sticky top-0 z-50">
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('dashboard')}>
        <div className="bg-blue-600 text-white p-1 rounded-lg">
          <Package size={20} />
        </div>
        {/* Hide text on very small screens to save space */}
        <span className="font-bold text-lg md:text-xl tracking-tight hidden sm:block">InstaLabel</span>
      </div>
      
      <div className="flex items-center gap-2 md:gap-4">
        <button 
          onClick={() => setView('new-order')}
          className="flex items-center gap-1 md:gap-2 bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 transition-colors text-xs md:text-sm font-medium"
        >
          <PlusCircle size={16} />
          <span className="hidden sm:inline">New Label</span>
          <span className="inline sm:hidden">New</span>
        </button>
        
        <button onClick={() => setView('settings')} className="p-2 text-gray-500 hover:text-blue-600" title="Settings" aria-label="Settings">
          <Settings size={20} />
        </button>
        
        <button onClick={handleLogout} className="p-2 text-gray-500 hover:text-red-600" title="Sign Out" aria-label="Sign Out">
          <LogOut size={20} />
        </button>
      </div>
    </nav>
  );
}