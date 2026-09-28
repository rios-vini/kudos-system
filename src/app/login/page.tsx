import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import LoginForm from "@/components/LoginForm";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/");

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-white to-blue-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-3xl shadow-lg shadow-blue-600/20">
            🎉
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Kudos
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Recognise your colleagues for the great work they do.
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
