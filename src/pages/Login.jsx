import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Sparkles, Mail, Lock, Loader2, ArrowRight, UserPlus, LogIn } from "lucide-react";
import { motion } from "framer-motion";

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false); // Toggle between Login & Signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setErrorMsg(null);

    try {
      if (isSignUp) {
        // --- SIGN UP LOGIC ---
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage("Account created! Check your email to confirm.");
      } else {
        // --- LOGIN LOGIC ---
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        // Successful login will auto-redirect via App.jsx state change
      }
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-slate-950 font-sans">
      
      {/* --- BACKGROUND ANIMATION --- */}
      <div className="absolute inset-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/20 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[120px] animate-pulse delay-75" />
      </div>
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

      {/* --- GLASS CARD --- */}
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md p-8"
      >
        <div className="absolute inset-0 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl" />
        
        <div className="relative z-20">
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ rotate: -10, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              className="mx-auto h-14 w-14 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30 mb-4"
            >
              <Sparkles className="h-7 w-7 text-white" />
            </motion.div>
            
            <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
              {isSignUp ? "Create Account" : "Welcome Back"}
            </h2>
            <p className="mt-2 text-sm text-gray-400">
              {isSignUp ? "Start automating your logistics today." : "Login to access your dashboard."}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleAuth} className="space-y-5">
            
            {/* Email Input */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Email</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                  placeholder="store@example.com"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>
            </div>

            {/* Error / Success Messages */}
            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                {errorMsg}
              </div>
            )}
            {message && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm text-center">
                {message}
              </div>
            )}

            {/* Submit Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="animate-spin h-5 w-5" />
              ) : (
                <>
                  {isSignUp ? "Sign Up" : "Sign In"} 
                  {isSignUp ? <UserPlus className="ml-2 h-4 w-4" /> : <ArrowRight className="ml-2 h-4 w-4" />}
                </>
              )}
            </motion.button>
          </form>

          {/* Toggle Login/Signup */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setMessage(null);
                  setErrorMsg(null);
                }}
                className="font-medium text-blue-400 hover:text-blue-300 transition-colors underline decoration-blue-400/30 underline-offset-4"
              >
                {isSignUp ? "Log In" : "Sign Up"}
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}