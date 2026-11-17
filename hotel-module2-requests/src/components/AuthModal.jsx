import React, { useState } from 'react';

export function AuthModal({ supabase, onAuthSuccess, t, isOpen = true }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!supabase) {
      setErrorMsg("Please configure Supabase connection first.");
      return;
    }

    if (!email || !password) {
      setErrorMsg(t.auth.fillAllFields);
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim() || undefined,
              phone: phone.trim() || undefined
            }
          }
        });

        if (error) throw error;
        if (data.session) {
          onAuthSuccess(data.session.user);
        } else {
          setErrorMsg("Account created! Please sign in.");
          setIsSignUp(false);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });

        if (error) throw error;
        if (data.user) {
          onAuthSuccess(data.user);
        }
      }
    } catch (err) {
      console.error("Auth error:", err);
      setErrorMsg(err.message || t.auth.authError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 border border-[#E2E8F0]">
        
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-[#16324F] text-white flex items-center justify-center mx-auto mb-3 shadow-md">
            <svg className="w-6 h-6 text-[#267C83]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[#16324F]">
            {isSignUp ? t.auth.signUpTitle : t.auth.signInTitle}
          </h2>
          <p className="text-xs text-[#64748B] mt-1">
            {t.hotelName} — {t.portalTitle}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          
          {isSignUp && (
            <>
              <div>
                <label className="block text-xs font-semibold text-[#263445] mb-1">
                  {t.auth.fullName}
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Eyad Mostafa"
                  className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#267C83]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#263445] mb-1">
                  {t.auth.phone}
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+20 100 123 4567"
                  className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#267C83]"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#263445] mb-1">
              {t.auth.email}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="guest@example.com"
              className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#267C83]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#263445] mb-1">
              {t.auth.password}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#267C83]"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-[#16324F] hover:bg-[#16324F]/90 text-white font-medium text-sm rounded-lg transition shadow disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : null}
            <span>{isSignUp ? t.auth.submitSignUp : t.auth.submitSignIn}</span>
          </button>

        </form>

        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={() => { setIsSignUp(!isSignUp); setErrorMsg(null); }}
            className="text-xs text-[#267C83] hover:underline font-semibold"
          >
            {isSignUp ? t.auth.haveAccount : t.auth.noAccount}
          </button>
        </div>

      </div>
    </div>
  );
}
