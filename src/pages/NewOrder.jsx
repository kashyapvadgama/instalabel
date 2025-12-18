import { useState, useEffect } from 'react';
import { model } from '../lib/geminiClient';
import { supabase } from '../lib/supabaseClient';
import { generateLabel } from '../lib/pdfGenerator';
import { UploadCloud, Loader2, Printer, CheckCircle, ArrowLeft, AlertTriangle, UserCheck } from 'lucide-react';

export default function NewOrder({ session, setView }) {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  
  // New: RTO / Customer History State
  const [customerHistory, setCustomerHistory] = useState({ exists: false, total_orders: 0, bad_orders: 0 });

  const [formData, setFormData] = useState({
    customer_name: '',
    phone: '',
    address: '',
    city: '',
    pincode: '',
    amount: '',
    items: '' // New Field: What did they buy?
  });

  // Function to check Customer History (RTO Guard)
  const checkCustomerHistory = async (phone) => {
    if (!phone || phone.length < 10) return;
    
    // Search for this phone number in past orders
    const { data, error } = await supabase
      .from('orders')
      .select('status')
      .eq('phone', phone); // Assuming phone numbers are exact matches

    if (data && data.length > 0) {
      // Calculate stats
      const bad = data.filter(o => o.status === 'returned').length;
      setCustomerHistory({
        exists: true,
        total_orders: data.length,
        bad_orders: bad
      });
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setPreview(URL.createObjectURL(file));
    setImage(file);
    setLoading(true);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64Data = reader.result.split(',')[1];

        // 🟢 UPGRADED PROMPT: Now extracts 'items' too
        const prompt = `
          Extract these details from the screenshot in valid JSON: 
          customer_name, phone (10 digits only), address, city, pincode, amount (number), 
          items (string summary of what they bought, e.g., "2x Blue Denim Jeans").
          If field is missing, return empty string.
        `;
        
        const result = await model.generateContent([
            prompt,
            { inlineData: { data: base64Data, mimeType: file.type } }
        ]);

        const response = result.response;
        const text = response.text();
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(cleanJson);

        setFormData({
            customer_name: data.customer_name || '',
            phone: data.phone || '',
            address: data.address || '',
            city: data.city || '',
            pincode: data.pincode || '',
            amount: data.amount || 0,
            items: data.items || ''
        });

        // Trigger History Check immediately
        if (data.phone) checkCustomerHistory(data.phone);

        setLoading(false);
        setStep(2);
      };
    } catch (error) {
      console.error("AI Error:", error);
      alert("AI Scan failed. Please enter details manually.");
      setLoading(false);
      setStep(2);
    }
  };

  const handleSaveAndPrint = async () => {
    if (!formData.customer_name || !formData.address) {
      alert("Name and Address are required!");
      return;
    }

    setLoading(true);
    let screenshotPath = null;

    try {
      if (image) {
        const fileName = `${session.user.id}/${Date.now()}_${image.name.replace(/\s/g, '_')}`;
        const { error: uploadError } = await supabase.storage.from('receipts').upload(fileName, image);
        if (!uploadError) screenshotPath = fileName;
      }

      const { error: dbError } = await supabase.from('orders').insert([
        {
          user_id: session.user.id,
          screenshot_url: screenshotPath,
          ...formData,
          status: 'pending' 
        }
      ]);

      if (dbError) throw dbError;

      generateLabel(formData);
      setStep(3);

    } catch (error) {
      alert("Error saving order: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setFormData({customer_name: '', phone: '', address: '', city: '', pincode: '', amount: '', items: ''});
    setImage(null);
    setPreview(null);
    setCustomerHistory({ exists: false, total_orders: 0, bad_orders: 0 });
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => setView('dashboard')} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Create New Label</h1>
      </div>

      {step === 1 && (
        <div className="border-2 border-dashed border-gray-300 rounded-2xl p-16 text-center hover:bg-blue-50/50 hover:border-blue-400 transition-all relative cursor-pointer group">
           <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
            {loading ? (
                <div className="flex flex-col items-center">
                    <Loader2 className="animate-spin h-12 w-12 text-blue-600 mb-4" />
                    <p className="text-gray-500 font-medium">Scanning for Items & Address...</p>
                </div>
            ) : (
                <div className="flex flex-col items-center transform group-hover:-translate-y-2 transition-transform">
                    <div className="bg-blue-100 p-4 rounded-full mb-4 group-hover:bg-blue-200">
                      <UploadCloud className="h-10 w-10 text-blue-600" />
                    </div>
                    <p className="text-xl font-semibold text-gray-700">Click or Drag Screenshot</p>
                </div>
            )}
        </div>
      )}

      {step === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-gray-100 rounded-xl p-4 border border-gray-200 h-fit">
                <p className="text-xs font-bold text-gray-500 uppercase mb-3 tracking-wider">Original Screenshot</p>
                <img src={preview} alt="Upload" className="w-full rounded-lg shadow-sm" />
            </div>

            <div className="space-y-5">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-800">Verify Details</h3>
                </div>

                {/* 🟢 RTO GUARD: Warning Banner */}
                {customerHistory.exists && (
                  <div className={`p-3 rounded-lg flex items-center gap-3 ${customerHistory.bad_orders > 0 ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'}`}>
                    {customerHistory.bad_orders > 0 ? <AlertTriangle size={20}/> : <UserCheck size={20}/>}
                    <div>
                      <p className="font-bold text-sm">{customerHistory.bad_orders > 0 ? "High Risk Customer!" : "Repeat Customer"}</p>
                      <p className="text-xs">Ordered {customerHistory.total_orders} times. Returned {customerHistory.bad_orders} times.</p>
                    </div>
                  </div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-500 font-medium ml-1">Items Bought</label>
                    <input className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" value={formData.items} onChange={e => setFormData({...formData, items: e.target.value})} placeholder="e.g. 1 Red Saree" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium ml-1">Customer Name</label>
                    <input className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" value={formData.customer_name} onChange={e => setFormData({...formData, customer_name: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium ml-1">Phone</label>
                    <input className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" value={formData.phone} onChange={e => {setFormData({...formData, phone: e.target.value}); checkCustomerHistory(e.target.value)}} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium ml-1">Address</label>
                    <textarea className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" rows={3} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div><label className="text-xs text-gray-500 font-medium ml-1">City</label><input className="w-full p-3 border border-gray-300 rounded-lg" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} /></div>
                      <div><label className="text-xs text-gray-500 font-medium ml-1">Pincode</label><input className="w-full p-3 border border-gray-300 rounded-lg" value={formData.pincode} onChange={e => setFormData({...formData, pincode: e.target.value})} /></div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium ml-1">Amount (₹)</label>
                    <input className="w-full p-3 border border-gray-300 rounded-lg font-semibold text-green-700" type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-100">
                    <button onClick={() => setStep(1)} className="w-1/3 px-4 py-3 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 font-medium">Back</button>
                    <button onClick={handleSaveAndPrint} disabled={loading} className="w-2/3 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 font-medium shadow-lg">{loading ? <Loader2 className="animate-spin h-5 w-5" /> : <Printer size={20} />} Save & Print Label</button>
                </div>
            </div>
        </div>
      )}

      {step === 3 && (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="mx-auto h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Success!</h2>
            <button onClick={resetForm} className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium shadow-lg hover:shadow-xl transition-all">Create Next Label</button>
        </div>
      )}
    </div>
  );
}