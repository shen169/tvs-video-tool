export default function LoginPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-8">
      <form
        action="/api/auth"
        method="POST"
        className="w-full max-w-sm space-y-6 text-center"
      >
        <h1 className="text-3xl font-bold">🎬 TVS Video Tool</h1>
        <p className="text-zinc-400">AI 带货视频生成</p>
        <input
          type="password"
          name="password"
          className="w-full p-4 rounded-xl bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 text-center"
          placeholder="请输入访问密码"
          autoFocus
        />
        <button
          type="submit"
          className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition"
        >
          进入
        </button>
      </form>
    </main>
  );
}
