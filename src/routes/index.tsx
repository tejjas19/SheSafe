import { createFileRoute, Link } from "@tanstack/react-router";
import { Mic, MapPin, Bluetooth, ShieldCheck, Brain, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SafeVoice — Your voice is your SOS" },
      { name: "description", content: "AI + NLP women's safety app: say your secret code word, shout for help, or tap a wearable — SafeVoice alerts your circle with live GPS." },
      { property: "og:title", content: "SafeVoice — Your voice is your SOS" },
      { property: "og:description", content: "Hands-free emergency alerts powered by speech recognition and AI intent detection." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Mic, title: "Speak, don't tap", body: "Always-on voice guard hears “help”, “bachao” or your secret phrase." },
  { icon: Brain, title: "AI that gets context", body: "On-device NLP + an AI classifier tell real danger from everyday chat." },
  { icon: MapPin, title: "Live location", body: "GPS link, your details and message go straight to your circle." },
  { icon: Users, title: "Your circle + helplines", body: "Family, friends, 112 and 1091 — all alerted in one go." },
  { icon: Bluetooth, title: "Wearable-ready", body: "Jewellery, belts or hair clips can trigger SOS over Bluetooth." },
  { icon: ShieldCheck, title: "Private by design", body: "Your data is locked to your account. Only you see your history." },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <Button asChild variant="ghost"><Link to="/auth">Log in</Link></Button>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-10 md:grid-cols-2 md:pt-20">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground">
            <span className="size-2 rounded-full bg-safe" /> AI-powered personal safety
          </span>
          <h1 className="mt-5 text-5xl font-extrabold leading-[0.95] md:text-7xl">
            Your voice is your <span className="text-primary">SOS.</span>
          </h1>
          <p className="mt-5 max-w-md text-lg text-muted-foreground">
            Say your secret code — “I'm coming home” — and SafeVoice quietly sends your live location to the people who matter.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="hero" size="lg"><Link to="/auth">Get protected — free</Link></Button>
            <Button asChild variant="outline" size="lg"><a href="#how">How it works</a></Button>
          </div>
        </div>
        <div className="relative mx-auto flex size-72 items-center justify-center md:size-96">
          <span className="absolute inset-8 rounded-full bg-primary/30 animate-sos-ring" />
          <span className="absolute inset-8 rounded-full bg-primary/20 animate-sos-ring [animation-delay:0.9s]" />
          <div className="sos-orb relative flex size-48 flex-col items-center justify-center rounded-full md:size-64">
            <Mic className="size-12 text-primary-foreground" />
            <span className="mt-2 font-display text-3xl font-extrabold text-primary-foreground">SOS</span>
          </div>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-5 pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="glass rounded-2xl p-6">
              <f.icon className="size-6 text-primary" />
              <h3 className="mt-4 text-xl font-bold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        SafeVoice is a support tool. In immediate danger, always call 112.
      </footer>
    </div>
  );
}
