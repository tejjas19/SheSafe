
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — SafeVoice" },
      {
        name: "description",
        content:
          "Create your SafeVoice account or log in to manage your safety circle.",
      },
      { property: "og:title", content: "Sign in — SafeVoice" },
      {
        property: "og:description",
        content: "Log in to your SafeVoice safety dashboard.",
      },
    ],
  }),
  component: AuthPage,
});
function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate({ to: "/dashboard" });
    }
  }, [user, navigate]);

  async function submit(e: FormEvent) {
    e.preventDefault();

    if (busy) return;

    setBusy(true);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: {
              full_name: name,
            },
          },
        });

        if (error) {
          toast.error(error.message);
        } else {
          toast.success("Check your inbox to confirm your email.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          toast.error(error.message);
        }
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong."
      );
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    if (busy) return;

    setBusy(true);

    try {
     const { error } = await supabase.auth.signInWithOAuth({
  provider: "google",
  options: {
    redirectTo: `${window.location.origin}/dashboard`,
    queryParams: {
      access_type: "offline",
      prompt: "select_account",
    },
  },
});

      if (error) {
        toast.error(error.message);
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Google sign-in failed. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-10">
      <div className="glass w-full max-w-md rounded-3xl p-8">
        <Logo />

        <h1 className="mt-6 text-3xl font-extrabold">
          {mode === "login" ? "Welcome back" : "Join SafeVoice"}
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "login"
            ? "Your circle is one sentence away."
            : "Set up your safety circle in 2 minutes."}
        </p>

        <Button
          variant="outline"
          className="mt-6 w-full"
          onClick={google}
          disabled={busy}
        >
          {busy ? "Connecting..." : "Continue with Google"}
        </Button>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="n">Full name</Label>
              <Input
                id="n"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="e">Email</Label>
            <Input
              id="e"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="p">Password</Label>
            <Input
              id="p"
              type="password"
              minLength={6}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <Button
            type="submit"
            variant="hero"
            size="lg"
            className="w-full"
            disabled={busy}
          >
            {busy
              ? "Please wait..."
              : mode === "login"
                ? "Log in"
                : "Create account"}
          </Button>
        </form>

        <button
          type="button"
          className="mt-5 w-full text-center text-sm text-muted-foreground hover:text-foreground"
          onClick={() =>
            setMode(mode === "login" ? "signup" : "login")
          }
          disabled={busy}
        >
          {mode === "login"
            ? "New here? Create an account"
            : "Already have an account? Log in"}
        </button>
      </div>
    </div>
  );
}
