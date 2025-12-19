import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { generateLabel } from "../lib/pdfGenerator";
import { Package, RefreshCw, Printer, Search, Calendar, TrendingUp, MessageCircle, ChevronLeft, ChevronRight } from "lucide-react";

const ORDERS_PER_PAGE = 20;

export default function Dashboard({ session }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [storeProfile, setStoreProfile] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  
  // Stats State (fetched via RPC for accuracy)
  const [stats, setStats] = useState({ total_orders: 0, total_revenue: 0 });

  // 1. Initial Data Fetch
  useEffect(() => {
    fetchProfile();
    fetchOrders(0);
    fetchStats(); // Fetch total revenue/count from DB
  }, []);

  const fetchProfile = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    if (data) setStoreProfile(data);
  };

  // 2. Efficient Pagination Fetch
  const fetchOrders = async (pageNumber = 0) => {
    setLoading(true);
    
    const from = pageNumber * ORDERS_PER_PAGE;
    const to = from + ORDERS_PER_PAGE - 1;

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (data) {
      setOrders(data);
      setHasMore(data.length === ORDERS_PER_PAGE);
      setPage(pageNumber);
    }
    setLoading(false);
  };

  // 3. Fetch Accurate Stats (RPC Call)
  const fetchStats = async () => {
    // Calls the SQL function we created to sum up everything
    const { data, error } = await supabase.rpc('get_user_stats');
    if (data) {
      setStats(data);
    }
  };

  // 4. Smart WhatsApp Logic
  const sendWhatsApp = (order) => {
    let phone = order.phone.replace(/[^0-9]/g, ''); // Keep digits only

    // Robust Country Code Logic
    if (phone.length === 10) {
      phone = '91' + phone;
    } else if (phone.length === 12 && phone.startsWith('91')) {
      // Perfect format
    }
    // If it's something else (e.g. 11 digits), we leave it as is to avoid breaking it

    const storeName = storeProfile?.store_name || "My Thrift Store";
    
    const text = `Hi ${order.customer_name}! 📦\n\nThanks for your order of ${order.items || "items"} from *${storeName}*.\nYour parcel is packed and ready to ship!\n\nTotal COD Amount: ₹${order.amount}\n\nThanks for shopping with us!`;
    
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Client-side search (for current page orders)
  const filteredOrders = orders.filter(order => 
    order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <header>
        <div className="flex justify-between items-end mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500">Welcome back, {session.user.email}</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg"><Package size={24} /></div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Orders</p>
              {/* Uses RPC Stats if available, else 0 */}
              <h3 className="text-2xl font-bold text-gray-900">{stats.total_orders || 0}</h3>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-lg"><TrendingUp size={24} /></div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Revenue</p>
              {/* Uses RPC Stats */}
              <h3 className="text-2xl font-bold text-gray-900">₹{(stats.total_revenue || 0).toLocaleString()}</h3>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-lg"><Calendar size={24} /></div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Today's Date</p>
              <h3 className="text-lg font-bold text-gray-900">{new Date().toLocaleDateString()}</h3>
            </div>
          </div>
        </div>
      </header>

      <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900">Order History</h2>
          <div className="flex gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search on this page..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
            </div>
            
            <button 
              onClick={() => { fetchOrders(0); fetchStats(); }} 
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Refresh Data"
            >
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Item</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-10 text-center text-gray-400">No orders found.</td></tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">{new Date(order.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {order.customer_name}
                      <div className="text-xs text-gray-400">{order.phone}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-500 truncate max-w-[150px]">{order.items || "-"}</td>
                    <td className="px-6 py-4 text-green-600 font-semibold">₹{order.amount}</td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <button 
                        onClick={() => sendWhatsApp(order)} 
                        className="text-green-600 hover:bg-green-50 p-2 rounded-lg transition-colors" 
                        title="Send WhatsApp" 
                        aria-label={`WhatsApp ${order.customer_name}`}
                      >
                        <MessageCircle size={18} />
                      </button>
                      <button 
                        onClick={() => generateLabel(order, storeProfile)} 
                        className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors" 
                        title="Print Label" 
                        aria-label={`Print ${order.customer_name}`}
                      >
                        <Printer size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
           <button 
             disabled={page === 0 || loading} 
             onClick={() => fetchOrders(page - 1)}
             className="flex items-center gap-1 px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors text-sm font-medium"
           >
             <ChevronLeft size={16} /> Previous
           </button>
           <button 
             disabled={!hasMore || loading} 
             onClick={() => fetchOrders(page + 1)}
             className="flex items-center gap-1 px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors text-sm font-medium"
           >
             Next <ChevronRight size={16} />
           </button>
        </div>
      </section>
    </div>
  );
}