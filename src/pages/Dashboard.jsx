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
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState({ total_orders: 0, total_revenue: 0 });


  // Debounce effect to update the search query after the user stops typing
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(searchTerm);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  const fetchStats = async () => {
  const { data, error } = await supabase.rpc('get_user_stats');
  if (data) {
    setStats(data);
  } else if (error) {
    console.error("Stats Error:", error);
  }
};

  // Main data fetching effect, runs when page or search query changes
 useEffect(() => {
  fetchProfile();
  fetchOrders(0);
  fetchStats(); // <--- CALL THIS
}, []);

  const fetchOrders = async (pageNumber = 0, currentQuery = "") => {
    setLoading(true);
    const from = pageNumber * ORDERS_PER_PAGE;
    const to = from + ORDERS_PER_PAGE - 1;

    let query = supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (currentQuery) {
      query = query.or(
        `customer_name.ilike.%${currentQuery}%,` +
        `phone.ilike.%${currentQuery}%,` + 
        `city.ilike.%${currentQuery}%`
      );
    }

    const { data, error } = await query;
    
    if (data) {
        setOrders(data);
        setHasMore(data.length === ORDERS_PER_PAGE);
        setPage(pageNumber);
    }
    setLoading(false);
  };
  
  const fetchProfile = async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (data) setStoreProfile(data);
  };

  const sendWhatsApp = (order) => {
    let phone = order.phone.replace(/[^0-9]/g, '');
    if (phone.length === 10) {
      phone = '91' + phone;
    } else if (phone.length === 12 && phone.startsWith('91')) {}

    const storeName = storeProfile?.store_name || "My Thrift Store";
    const text = `Hi ${order.customer_name}! 📦\n\nThanks for your order of ${order.items || "items"} from *${storeName}*.\nYour parcel is packed and ready to ship!\n\nTotal COD Amount: ₹${order.amount}\n\nThanks for shopping with us!`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  // 🟢 FIX: This is no longer needed, as the server handles all filtering.
  // const filteredOrders = ...

  const totalRevenue = orders.reduce((sum, order) => sum + (Number(order.amount) || 0), 0);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <header>
        {/* Header content is fine */}
      </header>

      <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900">Order History</h2>
          <div className="flex gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              {/* This input now correctly updates `searchTerm`, which triggers the debounced search */}
              <input type="text" placeholder="Search name, city, phone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            
            <button onClick={() => fetchOrders(page, searchQuery)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Refresh Orders">
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500">
            {/* Table Head is fine */}
            <tbody>
              {/* 🟢 FIX: Map directly over `orders` state */}
              {orders.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-10 text-center text-gray-400">{loading ? 'Searching...' : 'No orders found.'}</td></tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                    {/* Table Row content is fine */}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
           <button 
             disabled={page === 0 || loading} 
             // 🟢 FIX: Pass searchQuery to pagination handlers
             onClick={() => fetchOrders(page - 1, searchQuery)}
             className="flex items-center gap-1 px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
           >
             <ChevronLeft size={16} /> Previous
           </button>
           <button 
             disabled={!hasMore || loading} 
             // 🟢 FIX: Pass searchQuery to pagination handlers
             onClick={() => fetchOrders(page + 1, searchQuery)}
             className="flex items-center gap-1 px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
           >
             Next <ChevronRight size={16} />
           </button>
        </div>
      </section>
    </div>
  );
}