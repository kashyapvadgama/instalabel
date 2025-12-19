import { useState, useEffect, useRef } from 'react';
import { model } from '../lib/geminiClient';
import { supabase } from '../lib/supabaseClient';
import { generateLabel } from '../lib/pdfGenerator';
import { UploadCloud, Loader2, Printer, ArrowLeft, AlertTriangle, UserCheck, Combine, Square, CheckSquare, MapPin, ChevronLeft, CreditCard, Banknote } from 'lucide-react';

export default function NewOrder({ session, setView }) {
  const [queue, setQueue] = useState([]); 
  const [selectedIndex, setSelectedIndex] = useState(null); 
  const [selectedIds, setSelectedIds] = useState([]); 
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [storeProfile, setStoreProfile] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (data) setStoreProfile(data);
    };
    fetchProfile();
  }, [session.user.id]);

  const activeUrls = useRef(new Set());
  useEffect(() => {
    queue.forEach(item => {
      item.previews.forEach(url => activeUrls.current.add(url));
    });
  }, [queue]);

  useEffect(() => {
    return () => {
      activeUrls.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const handleBatchUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const newItems = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      files: [file],
      previews: [URL.createObjectURL(file)],
      status: 'pending', 
      rto_data: null,
      // 🟢 Added payment_mode default 'COD'
      data: { customer_name: '', phone: '', address: '', city: '', pincode: '', amount: '', items: '', payment_mode: 'COD' }
    }));

    setQueue(prev => [...prev, ...newItems]);
    newItems.forEach(item => processQueueItem(item));
  };

  const handleMerge = () => {
    if (selectedIds.length < 2) return;
    const itemsToMerge = queue.filter(item => selectedIds.includes(item.id));
    
    const newItem = {
      id: Math.random().toString(36).substr(2, 9),
      files: itemsToMerge.flatMap(item => item.files),
      previews: itemsToMerge.flatMap(item => item.previews),
      status: 'pending',
      rto_data: null,
      data: { customer_name: '', phone: '', address: '', city: '', pincode: '', amount: '', items: '', payment_mode: 'COD' }
    };

    setQueue(prev => [newItem, ...prev.filter(item => !selectedIds.includes(item.id))]);
    setSelectedIds([]);
    setSelectedIndex(0);
    processQueueItem(newItem);
  };

  const processQueueItem = async (item) => {
    try {
      updateQueueItem(item.id, { status: 'processing' });

      const imageParts = await Promise.all(item.files.map(async (file) => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onloadend = () => resolve({
            inlineData: { data: reader.result.split(',')[1], mimeType: file.type }
          });
        });
      }));

      // 🟢 Prompt now asks to detect Payment Mode
      const prompt = `Combine info. Extract JSON keys: customer_name, phone, address, city, pincode, amount (number), items (string). 
      IMPORTANT: Check for payment keywords like "UPI", "Paid", "Success", "Paytm", "GPay". 
      If found, add key "is_prepaid": true. Otherwise false. Fallback name: receiver.`;
      
      const result = await model.generateContent([prompt, ...imageParts]);
      const text = result.response.text().replace(/```json|```/g, '').trim();
      const data = JSON.parse(text);
      const extractedName = data.customer_name || data.name || data.customer || data.receiver || '';

      // 🟢 Auto-detect Payment Mode
      const paymentMode = data.is_prepaid ? 'Prepaid' : 'COD';

      let rtoInfo = null;
      if (data.phone && data.phone.length >= 10) {
        const { data: history } = await supabase.from('orders').select('status').eq('phone', data.phone);
        if (history && history.length > 0) {
           const bad = history.filter(o => o.status === 'returned').length;
           rtoInfo = { bad, total: history.length };
        }
      }

      if (data.pincode && String(data.pincode).length === 6) {
         lookupPincode(data.pincode, item.id);
      }

      updateQueueItem(item.id, { 
        status: 'done', 
        data: {
          customer_name: extractedName,
          phone: data.phone || '',
          address: data.address || '',
          city: data.city || '', 
          pincode: data.pincode || '',
          amount: data.amount || 0,
          items: data.items || '',
          payment_mode: paymentMode // Set detected mode
        },
        rto_data: rtoInfo
      });

    } catch (err) {
      console.error(err);
      updateQueueItem(item.id, { status: 'error' });
    }
  };

  const updateQueueItem = (id, updates) => {
    setQueue(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const manualRtoCheck = async (id, phone) => {
     if (!phone || phone.length < 10) return;
     const { data: h } = await supabase.from('orders').select('status').eq('phone', phone);
     if (h && h.length > 0) {
        updateQueueItem(id, { rto_data: { bad: h.filter(o => o.status === 'returned').length, total: h.length } });
     } else {
        updateQueueItem(id, { rto_data: null });
     }
  };

  const lookupPincode = async (pincode, queueId) => {
    if (!pincode || String(pincode).length !== 6) return;
    
    if(selectedIndex !== null && queue[selectedIndex] && queue[selectedIndex].id === queueId) setPincodeLoading(true);

    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
      const data = await res.json();

      if (data && data[0].Status === "Success") {
        const city = data[0].PostOffice[0].District;
        setQueue(prev => prev.map(item => {
          if (item.id === queueId) {
            return { ...item, data: { ...item.data, city: city, pincode: pincode } };
          }
          return item;
        }));
      }
    } catch (error) {
      console.error("Pincode API Failed", error);
    } finally {
      setPincodeLoading(false);
    }
  };

  const handleFormChange = (field, value) => {
    if (selectedIndex === null) return;
    const id = queue[selectedIndex].id;
    
    setQueue(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, data: { ...item.data, [field]: value } };
      }
      return item;
    }));

    if (field === 'phone') manualRtoCheck(id, value);
    if (field === 'pincode' && value.length === 6) lookupPincode(value, id);
  };

  const toggleSelection = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };
  
  const handleSaveAndPrint = async () => {
    const currentItem = queue[selectedIndex];
    const formData = currentItem.data;
    
    if (!formData.customer_name || !formData.address) {
      alert("Name and Address are required!");
      return;
    }
    
    try {
      const uploadedPaths = [];
      for (const file of currentItem.files) {
         const fileName = `${session.user.id}/${Date.now()}_${file.name.replace(/\s/g, '_')}`;
         const { error } = await supabase.storage.from('receipts').upload(fileName, file);
         if (error) throw error;
         uploadedPaths.push(fileName);
      }

      const { error } = await supabase.from('orders').insert([{ 
          user_id: session.user.id, 
          screenshot_url: uploadedPaths, 
          ...formData, 
          status: 'pending' 
      }]);
      
      if (error) throw error; 
      
      generateLabel(formData, storeProfile); 

      const newQueue = queue.filter((_, i) => i !== selectedIndex);
      setQueue(newQueue);
      setSelectedIndex(newQueue.length > 0 ? 0 : null);
      setSelectedIds([]);
    } catch (error) {
      alert("Error: " + error.message);
    }
  };
  
  const currentItem = selectedIndex !== null ? queue[selectedIndex] : null;

  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-6 h-[calc(100vh-80px)] flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4 md:gap-0 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setView('dashboard')} className="p-2 hover:bg-gray-100 rounded-full text-gray-500" aria-label="Go Back to Dashboard">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Batch Processor</h1>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          {selectedIds.length > 1 && (
            <button onClick={handleMerge} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 animate-in fade-in text-sm font-medium">
              <Combine size={18} /> Merge ({selectedIds.length})
            </button>
          )}
          <div className="relative flex-1 md:flex-none">
            <input type="file" multiple accept="image/*" onChange={handleBatchUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            <button className="w-full md:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium shadow-sm">
              <UploadCloud size={18} /> Upload
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-0 md:gap-6 flex-1 min-h-0 relative">
          
          {/* LEFT COLUMN */}
          <div className={`col-span-12 md:col-span-4 lg:col-span-3 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col ${selectedIndex !== null ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <span className="font-medium text-gray-500 text-xs uppercase">Queue ({queue.length})</span>
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
              {queue.map((item, index) => (
                <div key={item.id} onClick={() => setSelectedIndex(index)} className={`p-3 flex items-start gap-3 cursor-pointer transition-colors ${selectedIndex === index ? 'bg-blue-50 border-l-4 border-blue-600' : 'hover:bg-gray-50 border-l-4 border-transparent'}`}>
                  <button onClick={(e) => { e.stopPropagation(); toggleSelection(item.id); }} className="mt-1 text-gray-400 hover:text-blue-600 p-1" aria-label="Select">
                    {selectedIds.includes(item.id) ? <CheckSquare className="text-blue-600" size={20} /> : <Square size={20} />}
                  </button>
                  <div className="relative h-12 w-12 flex-shrink-0">
                    <img src={item.previews[0]} className="h-12 w-12 object-cover rounded bg-gray-200" alt="Thumb" />
                    {item.files.length > 1 && <span className="absolute -bottom-1 -right-1 bg-purple-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">{item.files.length}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${!item.data.customer_name ? 'text-gray-400 italic' : 'text-gray-900'}`}>{item.data.customer_name || "New Item"}</p>
                    <div className="flex items-center gap-2 mt-1">
                        {item.status === 'pending' && <span className="text-xs bg-gray-200 px-2 py-0.5 rounded text-gray-600">Pending</span>}
                        {item.status === 'processing' && <span className="text-blue-500 text-xs flex gap-1"><Loader2 size={12} className="animate-spin"/> AI...</span>}
                        {item.status === 'error' && <button onClick={(e) => { e.stopPropagation(); processQueueItem(item); }} className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded border border-red-200 flex items-center gap-1 hover:bg-red-200"><AlertTriangle size={10} /> Retry?</button>}
                        {item.status === 'done' && (item.rto_data ? (item.rto_data.bad > 0 ? <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">RISK</span> : <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">SAFE</span>) : <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">NEW</span>)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT COLUMN: EDITOR */}
          <div className={`col-span-12 md:col-span-8 lg:col-span-9 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col absolute md:static inset-0 z-20 ${selectedIndex !== null ? 'flex' : 'hidden md:flex'}`}>
            {currentItem ? (
              <div className="flex flex-col lg:flex-row h-full">
                {/* Mobile Header */}
                <div className="md:hidden flex items-center gap-2 p-3 border-b bg-gray-50 text-gray-600 font-medium cursor-pointer" onClick={() => setSelectedIndex(null)}>
                   <ChevronLeft size={20} /> Back to Queue
                </div>

                {/* Images */}
                <div className="lg:w-1/2 bg-gray-100 p-4 overflow-y-auto border-r border-gray-200 h-64 lg:h-auto shrink-0">
                  <div className="grid grid-cols-1 gap-4">
                    {currentItem.previews.map((src, i) => (
                      <div key={i} className="relative">
                        <img src={src} className="w-full rounded-lg shadow-sm" alt="Preview" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Form */}
                <div className="lg:w-1/2 p-4 lg:p-6 overflow-y-auto flex-1">
                  
                  {/* Payment Mode Toggles */}
                  <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
                    <button 
                      onClick={() => handleFormChange('payment_mode', 'COD')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${currentItem.data.payment_mode === 'COD' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      <Banknote size={16} /> COD
                    </button>
                    <button 
                      onClick={() => handleFormChange('payment_mode', 'Prepaid')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${currentItem.data.payment_mode === 'Prepaid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      <CreditCard size={16} /> Prepaid
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div><label className="text-xs font-bold text-gray-500 uppercase">Items</label><input className="w-full p-2 border rounded" value={currentItem.data.items} onChange={(e) => handleFormChange('items', e.target.value)} /></div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><label className="text-xs font-bold text-gray-500 uppercase">Name</label><input className="w-full p-2 border rounded" value={currentItem.data.customer_name} onChange={(e) => handleFormChange('customer_name', e.target.value)} /></div>
                      <div><label className="text-xs font-bold text-gray-500 uppercase">Phone</label><input className="w-full p-2 border rounded" type="tel" value={currentItem.data.phone} onChange={(e) => handleFormChange('phone', e.target.value)} /></div>
                    </div>

                    <div><label className="text-xs font-bold text-gray-500 uppercase">Address</label><textarea className="w-full p-2 border rounded" rows={3} value={currentItem.data.address} onChange={(e) => handleFormChange('address', e.target.value)} /></div>

                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                       <div className="col-span-1"><label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">Pincode {pincodeLoading && <Loader2 size={12} className="animate-spin text-blue-600"/>}</label><input className="w-full p-2 border rounded" value={currentItem.data.pincode} placeholder="6 Digits" type="tel" onChange={(e) => handleFormChange('pincode', e.target.value)} /></div>
                       <div className="col-span-1 lg:col-span-1"><label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><MapPin size={12}/> City</label><input className="w-full p-2 border rounded bg-gray-50" value={currentItem.data.city} onChange={(e) => handleFormChange('city', e.target.value)} /></div>
                       <div className="col-span-2 lg:col-span-1"><label className="text-xs font-bold text-gray-500 uppercase">Amount</label><input type="number" className="w-full p-2 border rounded text-green-700 font-bold" value={currentItem.data.amount} onChange={(e) => handleFormChange('amount', e.target.value)} /></div>
                    </div>
                  </div>

                  <button onClick={handleSaveAndPrint} className="w-full mt-6 bg-blue-600 text-white py-3 rounded-lg shadow-md flex justify-center items-center gap-2 hover:bg-blue-700 font-medium">
                    <Printer size={18} /> Save & Print Label
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 bg-gray-50 p-6 text-center"><p>Select an item from the queue.</p></div>
            )}
          </div>
      </div>
    </div>
  );
}