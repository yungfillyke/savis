"use client";

import Link from "next/link";

export default function MessagesPage() {
  return (
    <main className="savis-internal min-h-screen pb-24">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-[rgba(34,43,49,0.86)] px-4 py-3 backdrop-blur-md">
        <Link href="/consumer" className="text-sm font-bold text-[#B9C3C9]">← Home</Link>
        <h1 className="font-extrabold">Messages</h1>
        <span className="w-12" />
      </header>
      <div className="mx-auto max-w-lg px-4 pt-6">
        <div className="rounded-[20px] border border-white/10 bg-[rgba(34,43,49,0.72)] p-5">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(226,34,39,0.15)] text-xl">💬</div>
          <h2 className="font-extrabold">Your conversations</h2>
          <p className="mt-1 text-sm leading-relaxed text-[#B9C3C9]">Messaging is part of the SAVIS roadmap. This area is ready for provider and customer conversations.</p>
        </div>
      </div>
    </main>
  );
}
