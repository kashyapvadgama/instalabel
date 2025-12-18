import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { generateLabel } from "../lib/pdfGenerator";
import { Package, RefreshCw, Printer, Search, Calendar, TrendingUp, MessageCircle } from "lucide-react";

export default function Dashboard({ session }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    if (data) setOrders(data);
    setLoading(false);
  };

  const filteredOrders = orders.filter(order => 
    order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalRevenue = orders.reduce((sum, order) => sum + (Number(order.amount) || 0), 0);
  const totalOrders = orders.length;

const sendWhatsApp = (order) => {
  let phone = order.phone.replace(/[^0-9]/g, ''); 
  
  if (phone.length === 10) {
      phone = '91' + phone;
  }
  const text = `Hi ${order.customer_name}! 📦\n\nThanks for your order of ${order.items || "items"}.\nYour parcel is packed and ready to ship!\n\nTotal COD Amount: ₹${order.amount}\n\nThanks for shopping with us!`;
  
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
};

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <header>
        <div className="flex justify-between items-end mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500">Welcome back, {session.user.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg"><Package size={24} /></div>
            <div><p className="text-sm text-gray-500 font-medium">Total Orders</p><h3 className="text-2xl font-bold text-gray-900">{totalOrders}</h3></div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-lg"><TrendingUp size={24} /></div>
            <div><p className="text-sm text-gray-500 font-medium">Total Revenue</p><h3 className="text-2xl font-bold text-gray-900">₹{totalRevenue.toLocaleString()}</h3></div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-lg"><Calendar size={24} /></div>
            <div><p className="text-sm text-gray-500 font-medium">Today's Date</p><h3 className="text-lg font-bold text-gray-900">{new Date().toLocaleDateString()}</h3></div>
          </div>
        </div>
      </header>

      <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900">Order History</h2>
          <div className="flex gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="text" placeholder="Search customer..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            
            {/* 🟢 FIX: Added aria-label for Refresh Button */}
            <button 
              onClick={fetchOrders} 
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Refresh Orders"
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
                      
                      {/* 🟢 FIX: Added aria-label for WhatsApp */}
                      <button 
                        onClick={() => sendWhatsApp(order)} 
                        className="text-green-600 hover:bg-green-50 p-2 rounded-lg transition-colors" 
                        title="Send WhatsApp"
                        aria-label={`Send WhatsApp to ${order.customer_name}`}
                      >
                        <MessageCircle size={18} />
                      </button>

                      {/* 🟢 FIX: Added aria-label for Print */}
                      <button 
                        onClick={() => generateLabel(order)} 
                        className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors" 
                        title="Print Label"
                        aria-label={`Print Label for ${order.customer_name}`}
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
      </section>
    </div>
  );
}