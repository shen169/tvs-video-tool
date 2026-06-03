export default function LoginPage() {
  return (
    <div className="flex items-center justify-center h-full">
      <form action="/api/auth" method="POST" className="w-full max-w-sm space-y-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center text-xl font-bold text-white mx-auto">T</div>
        <h1 className="text-xl font-bold text-zinc-200">TVS Video Tool</h1>
        <p className="text-sm text-zinc-500">AI 带货视频生成</p>
        <input
          type="password"
          name="password"
          className="w-full h-12 px-4 rounded-xl bg-[#131316] border border-[#1f1f24] text-white placeholder-zinc-600 text-center text-sm focus:outline-none focus:border-emerald-600/50 transition-all"
          placeholder="请输入访问密码"
          autoFocus
        />
        <button type="submit"
          className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm tracking-wide transition-all duration-200">
          进入
        </button>
      </form>
    </div>
  );
}
