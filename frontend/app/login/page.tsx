export default function LoginPage() {
  return (
    <div className="flex items-center justify-center h-full bg-[#09090b]">
      <form action="/api/auth" method="POST" className="w-full max-w-sm space-y-6 text-center animate-in animate-in-1">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 mx-auto">
          <svg className="w-7 h-7 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-bold text-zinc-100">TVS Video Tool</h1>
          <p className="text-sm text-zinc-500 mt-1">AI Commerce Video Generator</p>
        </div>
        <input
          type="password"
          name="password"
          className="w-full h-12 px-4 rounded-2xl bg-[#121214] border border-[#27272c] text-white placeholder-zinc-600 text-center text-sm focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/10 transition-all duration-300"
          placeholder="Enter password"
          autoFocus
        />
        <button type="submit"
          className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-sm tracking-wide transition-all duration-300 shadow-lg shadow-amber-500/20">
          Enter
        </button>
      </form>
    </div>
  );
}
