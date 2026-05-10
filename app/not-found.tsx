import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
      <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-4">
        <Compass className="w-5 h-5 text-muted-foreground" strokeWidth={2.2} />
      </div>
      <h2 className="text-lg font-semibold mb-1">Lost in the pipeline</h2>
      <p className="text-sm text-muted-foreground max-w-md mb-4">
        That page doesn&apos;t exist. Head back to your Flow.
      </p>
      <Button asChild size="sm">
        <Link href="/">Take me home</Link>
      </Button>
    </div>
  );
}
