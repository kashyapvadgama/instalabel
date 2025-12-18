import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { Save, Loader2, Store } from "lucide-react";

export default function Settings({ session }) {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    store_name: "",
    store_address: "",
    store_phone: ""
  });

  // Load existing profile
  useEffect(() => {
    getProfile();
  }, []);

  const getProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
        
      if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.log("No profile found, creating new.");
    }
  };

  const updateProfile = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: session.user.id,
        ...profile,
        updated_at: new Date()
      });

    if (error) {
      alert(error.message);
    } else {
      alert("Settings Updated!");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Store className="text-blue-600" /> Store Settings
      </h1>
      
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Store Name (On Label)</label>
          <input
            type="text"
            value={profile.store_name}
            onChange={(e) => setProfile({...profile, store_name: e.target.value})}
            placeholder="e.g. Riya's Closet"
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Store Address</label>
          <textarea
            rows={3}
            value={profile.store_address}
            onChange={(e) => setProfile({...profile, store_address: e.target.value})}
            placeholder="e.g. 123, MG Road, Mumbai..."
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Store Phone</label>
          <input
            type="text"
            value={profile.store_phone}
            onChange={(e) => setProfile({...profile, store_phone: e.target.value})}
            placeholder="+91 9876543210"
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <button
          onClick={updateProfile}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 flex justify-center items-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
          Save Settings
        </button>
      </div>
    </div>
  );
}