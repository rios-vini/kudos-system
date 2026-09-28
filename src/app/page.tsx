import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import KudosFeed from "@/components/KudosFeed";
import ComposeKudos from "@/components/ComposeKudos";
import type { FeedItem } from "@/components/KudosFeed";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  // Server-rendered initial feed (per spec 3.5: avoid client loading flash)
  const initial = await prisma.kudos.findMany({
    where: { isVisible: true },
    include: {
      sender: { select: { id: true, displayName: true } },
      recipient: { select: { id: true, displayName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const initialItems: FeedItem[] = initial.map((k) => ({
    id: k.id,
    message: k.message,
    createdAt: k.createdAt.toISOString(),
    isVisible: k.isVisible,
    sender: k.sender,
    recipient: k.recipient,
  }));

  return (
    <div className="min-h-screen">
      <Navbar user={user} />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <header className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Kudos feed
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Recent recognition from across the company.
          </p>
        </header>

        <ComposeKudos />

        <section aria-label="Recent kudos" className="mt-8">
          <KudosFeed
            currentUser={user}
            initialItems={initialItems}
            initialCursor={
              initial.length === 20
                ? initial[initial.length - 1].createdAt.toISOString()
                : null
            }
          />
        </section>
      </main>
    </div>
  );
}
