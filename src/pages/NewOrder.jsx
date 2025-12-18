// import { useState } from 'react';
// import { model } from '../lib/geminiClient';
// import { supabase } from '../lib/supabaseClient';
// import { generateLabel } from '../lib/pdfGenerator';
// import { UploadCloud, Loader2, Printer, ArrowLeft, AlertTriangle, UserCheck, Combine, Square, CheckSquare, MapPin } from 'lucide-react';

// export default function NewOrder({ session, setView }) {
//   const [queue, setQueue] = useState([]); 
//   const [selectedIndex, setSelectedIndex] = useState(null); 
//   const [selectedIds, setSelectedIds] = useState([]); 
//   const [pincodeLoading, setPincodeLoading] = useState(false);

//   // 1. Handle Upload
//   const handleBatchUpload = async (e) => {
//     const files = Array.from(e.target.files);
//     if (files.length === 0) return;

//     const newItems = files.map(file => ({
//       id: Math.random().toString(36).substr(2, 9),
//       files: [file],
//       previews: [URL.createObjectURL(file)],
//       status: 'pending', 
//       rto_data: null,
//       data: { customer_name: '', phone: '', address: '', city: '', pincode: '', amount: '', items: '' }
//     }));

//     setQueue(prev => [...prev, ...newItems]);
//   };

//   // 2. Merge Function
//   const handleMerge = () => {
//     if (selectedIds.length < 2) return;
//     const itemsToMerge = queue.filter(item => selectedIds.includes(item.id));
    
//     const newItem = {
//       id: Math.random().toString(36).substr(2, 9),
//       files: itemsToMerge.flatMap(item => item.files),
//       previews: itemsToMerge.flatMap(item => item.previews),
//       status: 'pending',
//       rto_data: null,
//       data: { customer_name: '', phone: '', address: '', city: '', pincode: '', amount: '', items: '' }
//     };

//     setQueue(prev => [newItem, ...prev.filter(item => !selectedIds.includes(item.id))]);
//     setSelectedIds([]);
//     setSelectedIndex(0);
//     processQueueItem(newItem);
//   };

//   // 3. AI Processing (Robust Fix)
//   const processQueueItem = async (item) => {
//     try {
//       updateQueueItem(item.id, { status: 'processing' });

//       const imageParts = await Promise.all(item.files.map(async (file) => {
//         return new Promise((resolve) => {
//           const reader = new FileReader();
//           reader.readAsDataURL(file);
//           reader.onloadend = () => resolve({
//             inlineData: { data: reader.result.split(',')[1], mimeType: file.type }
//           });
//         });
//       }));

//       // Improved Prompt
//       const prompt = `Combine info from images. Extract JSON with these exact keys: customer_name, phone, address, city, pincode, amount (number), items (string). If name is not found, look for "Receiver" or top text. Return empty string if missing.`;
      
//       const result = await model.generateContent([prompt, ...imageParts]);
//       const text = result.response.text().replace(/```json|```/g, '').trim();
//       const data = JSON.parse(text);

//       // 🟢 FIX: Fallback for Customer Name if AI messes up keys
//       const extractedName = data.customer_name || data.name || data.customer || data.receiver || '';

//       let rtoInfo = null;
//       if (data.phone && data.phone.length >= 10) {
//         const { data: history } = await supabase.from('orders').select('status').eq('phone', data.phone);
//         if (history && history.length > 0) {
//            const bad = history.filter(o => o.status === 'returned').length;
//            rtoInfo = { bad, total: history.length };
//         }
//       }

//       if (data.pincode && String(data.pincode).length === 6) {
//          lookupPincode(data.pincode, item.id);
//       }

//       updateQueueItem(item.id, { 
//         status: 'done', 
//         data: {
//           customer_name: extractedName, // Uses the safe extraction
//           phone: data.phone || '',
//           address: data.address || '',
//           city: data.city || '', 
//           pincode: data.pincode || '',
//           amount: data.amount || 0,
//           items: data.items || ''
//         },
//         rto_data: rtoInfo
//       });

//     } catch (err) {
//       console.error(err);
//       updateQueueItem(item.id, { status: 'error' });
//     }
//   };

//   // 🟢 FIX: Safer State Update (Prevents typing lag/bugs)
//   const updateQueueItem = (id, updates) => {
//     setQueue(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
//   };

//   const manualRtoCheck = async (id, phone) => {
//      if (!phone || phone.length < 10) return;
//      const { data: history } = await supabase.from('orders').select('status').eq('phone', phone);
//      if (history && history.length > 0) {
//         const bad = history.filter(o => o.status === 'returned').length;
//         updateQueueItem(id, { rto_data: { bad, total: history.length } });
//      } else {
//         updateQueueItem(id, { rto_data: null });
//      }
//   };

//   const lookupPincode = async (pincode, queueId) => {
//     if (!pincode || String(pincode).length !== 6) return;
    
//     // Only show loading if this item is selected
//     if(selectedIndex !== null && queue[selectedIndex] && queue[selectedIndex].id === queueId) setPincodeLoading(true);

//     try {
//       const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
//       const data = await res.json();

//       if (data && data[0].Status === "Success") {
//         const city = data[0].PostOffice[0].District;
        
//         // Functional update to avoid stale state
//         setQueue(prev => prev.map(item => {
//           if (item.id === queueId) {
//             return { 
//                 ...item, 
//                 data: { ...item.data, city: city, pincode: pincode }
//             };
//           }
//           return item;
//         }));
//       }
//     } catch (error) {
//       console.error("Pincode API Failed", error);
//     } finally {
//       setPincodeLoading(false);
//     }
//   };

//   // 🟢 FIX: Handle Form Change properly
//   const handleFormChange = (field, value) => {
//     if (selectedIndex === null) return;
//     const id = queue[selectedIndex].id;
    
//     // Use functional update to ensure we don't lose other data while typing
//     setQueue(prev => prev.map(item => {
//       if (item.id === id) {
//         return {
//           ...item,
//           data: { ...item.data, [field]: value }
//         };
//       }
//       return item;
//     }));

//     if (field === 'phone') manualRtoCheck(id, value);
//     if (field === 'pincode' && value.length === 6) lookupPincode(value, id);
//   };

//   const toggleSelection = (id) => {
//     setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
//   };

//   const handleSaveAndPrint = async () => {
//     const currentItem = queue[selectedIndex];
//     const formData = currentItem.data;

//     if (!formData.customer_name || !formData.address) {
//       alert("Name and Address are required!");
//       return;
//     }

//     try {
//       const fileName = `${session.user.id}/${Date.now()}_${currentItem.files[0].name.replace(/\s/g, '_')}`;
//       await supabase.storage.from('receipts').upload(fileName, currentItem.files[0]);

//       const { error } = await supabase.from('orders').insert([{
//         user_id: session.user.id,
//         screenshot_url: fileName,
//         ...formData,
//         status: 'pending'
//       }]);

//       if (error) throw error;
//       generateLabel(formData);

//       const newQueue = queue.filter((_, i) => i !== selectedIndex);
//       setQueue(newQueue);
//       setSelectedIndex(newQueue.length > 0 ? 0 : null);
//       setSelectedIds([]);

//     } catch (error) {
//       alert("Error: " + error.message);
//     }
//   };

//   // Safely get current item
//   const currentItem = selectedIndex !== null ? queue[selectedIndex] : null;

//   return (
//     <div className="max-w-7xl mx-auto p-4 lg:p-6 h-[calc(100vh-80px)]">
      
//       {/* Header */}
//       <div className="flex items-center justify-between mb-4">
//         <div className="flex items-center gap-3">
//           <button onClick={() => setView('dashboard')} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
//             <ArrowLeft size={20} />
//           </button>
//           <h1 className="text-2xl font-bold text-gray-900">Batch Processor</h1>
//         </div>
        
//         <div className="flex gap-3">
//           {selectedIds.length > 1 && (
//             <button onClick={handleMerge} className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 animate-in fade-in">
//               <Combine size={18} /> Merge ({selectedIds.length})
//             </button>
//           )}
//           <div className="relative">
//             <input type="file" multiple accept="image/*" onChange={handleBatchUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
//             <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
//               <UploadCloud size={18} /> Upload
//             </button>
//           </div>
//         </div>
//       </div>

//       <div className="grid grid-cols-12 gap-6 h-full">
//           {/* LEFT SIDEBAR: Queue */}
//           <div className="col-span-12 md:col-span-4 lg:col-span-3 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
//             <div className="p-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
//               <span className="font-medium text-gray-500 text-xs uppercase">Queue ({queue.length})</span>
//             </div>
            
//             <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
//               {queue.map((item, index) => (
//                 <div 
//                   key={item.id}
//                   onClick={() => setSelectedIndex(index)}
//                   className={`p-3 flex items-start gap-3 cursor-pointer transition-colors ${selectedIndex === index ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
//                 >
//                   <button onClick={(e) => { e.stopPropagation(); toggleSelection(item.id); }} className="mt-1 text-gray-400 hover:text-blue-600">
//                     {selectedIds.includes(item.id) ? <CheckSquare className="text-blue-600" size={20} /> : <Square size={20} />}
//                   </button>

//                   <div className="relative h-12 w-12 flex-shrink-0">
//                      <img src={item.previews[0]} className="h-12 w-12 object-cover rounded bg-gray-200" />
//                      {item.files.length > 1 && <span className="absolute -bottom-1 -right-1 bg-purple-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">{item.files.length}</span>}
//                   </div>

//                   <div className="flex-1 min-w-0">
//                     <p className={`text-sm font-medium truncate ${!item.data.customer_name ? 'text-gray-400 italic' : 'text-gray-900'}`}>
//                       {item.data.customer_name || "New Item"}
//                     </p>
                    
//                     <div className="flex items-center gap-2 mt-1">
//                         {item.status === 'pending' && <button onClick={(e)=>{e.stopPropagation(); processQueueItem(item)}} className="text-xs bg-gray-200 px-2 py-0.5 rounded text-gray-600">Scan</button>}
//                         {item.status === 'processing' && <span className="text-blue-500 text-xs flex gap-1"><Loader2 size={12} className="animate-spin"/></span>}
                        
//                         {item.status === 'done' && (
//                             item.rto_data ? (
//                                 item.rto_data.bad > 0 ? 
//                                 <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold border border-red-200">HIGH RISK</span> : 
//                                 <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold border border-green-200">SAFE</span>
//                             ) : <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-bold">NEW</span>
//                         )}
//                     </div>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>

//           {/* RIGHT SIDE: Editor */}
//           <div className="col-span-12 md:col-span-8 lg:col-span-9 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
//             {currentItem ? (
//               <div className="flex flex-col lg:flex-row h-full">
//                 <div className="lg:w-1/2 bg-gray-100 p-4 overflow-y-auto border-r border-gray-200">
//                   <div className="grid grid-cols-1 gap-4">
//                     {currentItem.previews.map((src, i) => (
//                       <div key={i} className="relative"><img src={src} className="w-full rounded-lg shadow-sm" /><span className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">Img {i+1}</span></div>
//                     ))}
//                   </div>
//                 </div>

//                 <div className="lg:w-1/2 p-6 overflow-y-auto">
//                   {/* RTO BANNER */}
//                   {currentItem.rto_data && (
//                     <div className={`mb-6 p-3 rounded-lg flex items-center gap-3 ${currentItem.rto_data.bad > 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
//                       {currentItem.rto_data.bad > 0 ? <AlertTriangle size={24}/> : <UserCheck size={24}/>}
//                       <div>
//                         <p className="font-bold text-sm">{currentItem.rto_data.bad > 0 ? "⚠️ HIGH RISK CUSTOMER" : "✅ REPEAT CUSTOMER"}</p>
//                         <p className="text-xs">History: {currentItem.rto_data.total} Orders, {currentItem.rto_data.bad} Returns.</p>
//                       </div>
//                     </div>
//                   )}

//                   <div className="space-y-4">
//                     <div><label className="text-xs font-bold text-gray-500 uppercase">Items</label><input className="w-full p-2 border rounded" value={currentItem.data.items} onChange={(e) => handleFormChange('items', e.target.value)} /></div>

//                     <div className="grid grid-cols-2 gap-4">
//                       <div><label className="text-xs font-bold text-gray-500 uppercase">Name</label><input className="w-full p-2 border rounded" value={currentItem.data.customer_name} onChange={(e) => handleFormChange('customer_name', e.target.value)} /></div>
//                       <div><label className="text-xs font-bold text-gray-500 uppercase">Phone</label><input className="w-full p-2 border rounded" value={currentItem.data.phone} onChange={(e) => handleFormChange('phone', e.target.value)} /></div>
//                     </div>

//                     <div><label className="text-xs font-bold text-gray-500 uppercase">Address</label><textarea className="w-full p-2 border rounded" rows={3} value={currentItem.data.address} onChange={(e) => handleFormChange('address', e.target.value)} /></div>

//                     <div className="grid grid-cols-3 gap-4">
//                        <div>
//                           <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
//                              Pincode {pincodeLoading && <Loader2 size={12} className="animate-spin text-blue-600"/>}
//                           </label>
//                           <input 
//                             className="w-full p-2 border rounded" 
//                             value={currentItem.data.pincode} 
//                             placeholder="6 Digits"
//                             onChange={(e) => handleFormChange('pincode', e.target.value)} 
//                           />
//                        </div>
                       
//                        <div className="col-span-2">
//                           <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><MapPin size={12}/> City / District</label>
//                           <input 
//                              className="w-full p-2 border rounded bg-gray-50" 
//                              value={currentItem.data.city} 
//                              onChange={(e) => handleFormChange('city', e.target.value)} 
//                           />
//                        </div>
//                        <div><label className="text-xs font-bold text-gray-500 uppercase">Amount</label><input type="number" className="w-full p-2 border rounded text-green-700 font-bold" value={currentItem.data.amount} onChange={(e) => handleFormChange('amount', e.target.value)} /></div>
//                     </div>
//                   </div>

//                   <button onClick={handleSaveAndPrint} className="w-full mt-6 bg-blue-600 text-white py-3 rounded-lg shadow-md flex justify-center items-center gap-2 hover:bg-blue-700">
//                     <Printer size={18} /> Save & Print
//                   </button>
//                 </div>
//               </div>
//             ) : (
//               <div className="h-full flex items-center justify-center text-gray-400 bg-gray-50"><p>Select items on the left.</p></div>
//             )}
//           </div>
//       </div>
//     </div>
//   );
// }

import { useState } from 'react';
import { model } from '../lib/geminiClient';
import { supabase } from '../lib/supabaseClient';
import { generateLabel } from '../lib/pdfGenerator';
import { UploadCloud, Loader2, Printer, ArrowLeft, AlertTriangle, UserCheck, Combine, Square, CheckSquare, MapPin } from 'lucide-react';

export default function NewOrder({ session, setView }) {
  const [queue, setQueue] = useState([]); 
  const [selectedIndex, setSelectedIndex] = useState(null); 
  const [selectedIds, setSelectedIds] = useState([]); 
  const [pincodeLoading, setPincodeLoading] = useState(false);

  // ... (Baaki logic functions same rahenge, sirf UI update kar raha hu)
  // Logic helpers wapis likh raha hu taaki copy-paste me error na aaye
  const handleBatchUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    const newItems = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      files: [file], previews: [URL.createObjectURL(file)], status: 'pending', rto_data: null,
      data: { customer_name: '', phone: '', address: '', city: '', pincode: '', amount: '', items: '' }
    }));
    setQueue(prev => [...prev, ...newItems]);
  };

  const handleMerge = () => {
    if (selectedIds.length < 2) return;
    const itemsToMerge = queue.filter(item => selectedIds.includes(item.id));
    const newItem = {
      id: Math.random().toString(36).substr(2, 9),
      files: itemsToMerge.flatMap(item => item.files), previews: itemsToMerge.flatMap(item => item.previews),
      status: 'pending', rto_data: null,
      data: { customer_name: '', phone: '', address: '', city: '', pincode: '', amount: '', items: '' }
    };
    setQueue(prev => [newItem, ...prev.filter(item => !selectedIds.includes(item.id))]);
    setSelectedIds([]); setSelectedIndex(0); processQueueItem(newItem);
  };

  const processQueueItem = async (item) => {
    try {
      updateQueueItem(item.id, { status: 'processing' });
      const imageParts = await Promise.all(item.files.map(async (file) => {
        return new Promise((resolve) => {
          const reader = new FileReader(); reader.readAsDataURL(file); reader.onloadend = () => resolve({ inlineData: { data: reader.result.split(',')[1], mimeType: file.type } });
        });
      }));
      const prompt = `Combine info. Extract JSON: customer_name, phone, address, city, pincode, amount (number), items (string). Fallback for name: receiver.`;
      const result = await model.generateContent([prompt, ...imageParts]);
      const text = result.response.text().replace(/```json|```/g, '').trim();
      const data = JSON.parse(text);
      const extractedName = data.customer_name || data.name || data.customer || data.receiver || '';

      let rtoInfo = null;
      if (data.phone && data.phone.length >= 10) {
        const { data: history } = await supabase.from('orders').select('status').eq('phone', data.phone);
        if (history && history.length > 0) { rtoInfo = { bad: history.filter(o => o.status === 'returned').length, total: history.length }; }
      }
      if (data.pincode && String(data.pincode).length === 6) lookupPincode(data.pincode, item.id);

      updateQueueItem(item.id, { status: 'done', data: { customer_name: extractedName, phone: data.phone || '', address: data.address || '', city: data.city || '', pincode: data.pincode || '', amount: data.amount || 0, items: data.items || '' }, rto_data: rtoInfo });
    } catch (err) { updateQueueItem(item.id, { status: 'error' }); }
  };

  const updateQueueItem = (id, updates) => setQueue(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  const manualRtoCheck = async (id, phone) => {
     if (!phone || phone.length < 10) return;
     const { data: h } = await supabase.from('orders').select('status').eq('phone', phone);
     if (h && h.length > 0) updateQueueItem(id, { rto_data: { bad: h.filter(o => o.status === 'returned').length, total: h.length } });
     else updateQueueItem(id, { rto_data: null });
  };
  const lookupPincode = async (pincode, queueId) => {
    if (!pincode || String(pincode).length !== 6) return;
    if(selectedIndex !== null && queue[selectedIndex] && queue[selectedIndex].id === queueId) setPincodeLoading(true);
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`); const data = await res.json();
      if (data && data[0].Status === "Success") {
        const city = data[0].PostOffice[0].District;
        setQueue(prev => prev.map(item => item.id === queueId ? { ...item, data: { ...item.data, city: city, pincode: pincode } } : item));
      }
    } catch (error) { console.error("API Fail", error); } finally { setPincodeLoading(false); }
  };
  const handleFormChange = (field, value) => {
    if (selectedIndex === null) return; const id = queue[selectedIndex].id;
    setQueue(prev => prev.map(item => item.id === id ? { ...item, data: { ...item.data, [field]: value } } : item));
    if (field === 'phone') manualRtoCheck(id, value); if (field === 'pincode' && value.length === 6) lookupPincode(value, id);
  };
  const toggleSelection = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const handleSaveAndPrint = async () => {
    const currentItem = queue[selectedIndex]; const formData = currentItem.data;
    if (!formData.customer_name || !formData.address) { alert("Name/Address missing!"); return; }
    try {
      const fileName = `${session.user.id}/${Date.now()}_${currentItem.files[0].name.replace(/\s/g, '_')}`;
      await supabase.storage.from('receipts').upload(fileName, currentItem.files[0]);
      const { error } = await supabase.from('orders').insert([{ user_id: session.user.id, screenshot_url: fileName, ...formData, status: 'pending' }]);
      if (error) throw error; generateLabel(formData);
      const newQueue = queue.filter((_, i) => i !== selectedIndex); setQueue(newQueue); setSelectedIndex(newQueue.length > 0 ? 0 : null); setSelectedIds([]);
    } catch (error) { alert("Error: " + error.message); }
  };
  const currentItem = selectedIndex !== null ? queue[selectedIndex] : null;

  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-6 h-[calc(100vh-80px)]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          
          {/* 🟢 FIX: Added aria-label for Back Button */}
          <button 
            onClick={() => setView('dashboard')} 
            className="p-2 hover:bg-gray-100 rounded-full text-gray-500"
            aria-label="Go Back to Dashboard"
          >
            <ArrowLeft size={20} />
          </button>
          
          <h1 className="text-2xl font-bold text-gray-900">Batch Processor</h1>
        </div>
        
        <div className="flex gap-3">
          {selectedIds.length > 1 && (
            <button onClick={handleMerge} className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 animate-in fade-in">
              <Combine size={18} /> Merge ({selectedIds.length})
            </button>
          )}
          <div className="relative">
            <input type="file" multiple accept="image/*" onChange={handleBatchUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              <UploadCloud size={18} /> Upload
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 h-full">
          <div className="col-span-12 md:col-span-4 lg:col-span-3 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <span className="font-medium text-gray-500 text-xs uppercase">Queue ({queue.length})</span>
            </div>
            
            <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
              {queue.map((item, index) => (
                <div 
                  key={item.id}
                  onClick={() => setSelectedIndex(index)}
                  className={`p-3 flex items-start gap-3 cursor-pointer transition-colors ${selectedIndex === index ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                >
                  {/* 🟢 FIX: Added aria-label for Checkbox */}
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleSelection(item.id); }} 
                    className="mt-1 text-gray-400 hover:text-blue-600"
                    aria-label={selectedIds.includes(item.id) ? "Deselect item" : "Select item for merge"}
                  >
                    {selectedIds.includes(item.id) ? <CheckSquare className="text-blue-600" size={20} /> : <Square size={20} />}
                  </button>

                  <div className="relative h-12 w-12 flex-shrink-0">
                     <img src={item.previews[0]} className="h-12 w-12 object-cover rounded bg-gray-200" alt="Thumbnail" />
                     {item.files.length > 1 && <span className="absolute -bottom-1 -right-1 bg-purple-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">{item.files.length}</span>}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${!item.data.customer_name ? 'text-gray-400 italic' : 'text-gray-900'}`}>
                      {item.data.customer_name || "New Item"}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                        {item.status === 'pending' && <button onClick={(e)=>{e.stopPropagation(); processQueueItem(item)}} className="text-xs bg-gray-200 px-2 py-0.5 rounded text-gray-600">Scan</button>}
                        {item.status === 'processing' && <span className="text-blue-500 text-xs flex gap-1"><Loader2 size={12} className="animate-spin"/></span>}
                        {item.status === 'done' && (
                            item.rto_data ? (item.rto_data.bad > 0 ? <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded border border-red-200">RISK</span> : <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded border border-green-200">SAFE</span>) : <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">NEW</span>
                        )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-12 md:col-span-8 lg:col-span-9 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
            {currentItem ? (
              <div className="flex flex-col lg:flex-row h-full">
                <div className="lg:w-1/2 bg-gray-100 p-4 overflow-y-auto border-r border-gray-200">
                  <div className="grid grid-cols-1 gap-4">
                    {currentItem.previews.map((src, i) => (
                      <div key={i} className="relative"><img src={src} className="w-full rounded-lg shadow-sm" alt={`Screenshot ${i+1}`} /><span className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">Img {i+1}</span></div>
                    ))}
                  </div>
                </div>
                <div className="lg:w-1/2 p-6 overflow-y-auto">
                  {currentItem.rto_data && (
                    <div className={`mb-6 p-3 rounded-lg flex items-center gap-3 ${currentItem.rto_data.bad > 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                      {currentItem.rto_data.bad > 0 ? <AlertTriangle size={24}/> : <UserCheck size={24}/>}
                      <div><p className="font-bold text-sm">{currentItem.rto_data.bad > 0 ? "⚠️ HIGH RISK" : "✅ SAFE"}</p><p className="text-xs">{currentItem.rto_data.bad} Returns / {currentItem.rto_data.total} Orders</p></div>
                    </div>
                  )}
                  <div className="space-y-4">
                    <div><label className="text-xs font-bold text-gray-500 uppercase">Items</label><input className="w-full p-2 border rounded" value={currentItem.data.items} onChange={(e) => handleFormChange('items', e.target.value)} /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="text-xs font-bold text-gray-500 uppercase">Name</label><input className="w-full p-2 border rounded" value={currentItem.data.customer_name} onChange={(e) => handleFormChange('customer_name', e.target.value)} /></div>
                      <div><label className="text-xs font-bold text-gray-500 uppercase">Phone</label><input className="w-full p-2 border rounded" value={currentItem.data.phone} onChange={(e) => handleFormChange('phone', e.target.value)} /></div>
                    </div>
                    <div><label className="text-xs font-bold text-gray-500 uppercase">Address</label><textarea className="w-full p-2 border rounded" rows={3} value={currentItem.data.address} onChange={(e) => handleFormChange('address', e.target.value)} /></div>
                    <div className="grid grid-cols-3 gap-4">
                       <div><label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">Pincode {pincodeLoading && <Loader2 size={12} className="animate-spin text-blue-600"/>}</label><input className="w-full p-2 border rounded" value={currentItem.data.pincode} placeholder="6 Digits" onChange={(e) => handleFormChange('pincode', e.target.value)} /></div>
                       <div className="col-span-2"><label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><MapPin size={12}/> City</label><input className="w-full p-2 border rounded bg-gray-50" value={currentItem.data.city} onChange={(e) => handleFormChange('city', e.target.value)} /></div>
                       <div><label className="text-xs font-bold text-gray-500 uppercase">Amount</label><input type="number" className="w-full p-2 border rounded text-green-700 font-bold" value={currentItem.data.amount} onChange={(e) => handleFormChange('amount', e.target.value)} /></div>
                    </div>
                  </div>
                  <button onClick={handleSaveAndPrint} className="w-full mt-6 bg-blue-600 text-white py-3 rounded-lg shadow-md flex justify-center items-center gap-2 hover:bg-blue-700">
                    <Printer size={18} /> Save & Print
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 bg-gray-50"><p>Select items on the left.</p></div>
            )}
          </div>
      </div>
    </div>
  );
}