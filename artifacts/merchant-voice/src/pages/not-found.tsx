import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center animate-in fade-in duration-700">
      <div className="text-center space-y-8 max-w-md">
        <h1 className="text-[110px] leading-[0.85] tracking-[-5.5px] font-medium">404</h1>
        <p className="text-[18px] text-ink-muted tracking-[-0.18px] leading-relaxed">
          This path doesn't exist in the product operations directory.
        </p>
        <Link href="/" className="inline-block bg-primary text-primary-foreground rounded-full py-[14px] px-[28px] text-[15px] font-medium active:scale-[0.98] transition-transform shadow-xl">
          Return to Overview
        </Link>
      </div>
    </div>
  );
}
