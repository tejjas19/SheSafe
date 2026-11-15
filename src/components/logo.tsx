import { Link } from "@tanstack/react-router";
import { AudioWaveform } from "lucide-react";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <span className="sos-orb flex size-9 items-center justify-center rounded-xl">
        <AudioWaveform className="size-5 text-primary-foreground" />
      </span>
      <span className="font-display text-xl font-extrabold">SafeVoice</span>
    </Link>
  );
}
