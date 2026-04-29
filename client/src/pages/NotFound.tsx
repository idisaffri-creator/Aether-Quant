import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-primary mx-auto" />
        <h1 className="text-5xl font-display font-bold text-foreground">404</h1>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link href="/">
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-display">
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
