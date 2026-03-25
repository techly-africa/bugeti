import Image from "next/image";
import { cn } from "@/lib/utils";
import logoSrc from "@/assets/bugeti-logo.png";

interface LogoProps {
  /** "full" = full logo (default), "icon" = square crop of the checkmark+wordmark */
  variant?: "full" | "icon";
  className?: string;
  /** Height in px — width scales proportionally */
  height?: number;
}

export function Logo({ variant = "full", className, height = 40 }: LogoProps) {
  if (variant === "icon") {
    // Square crop: show just the logo at 1:1 ratio
    return (
      <span
        className={cn("inline-flex items-center justify-center", className)}
        style={{ height, width: height }}
      >
        <Image
          src={logoSrc}
          alt="Bugeti"
          height={height}
          width={height}
          style={{ objectFit: "contain" }}
          priority
        />
      </span>
    );
  }

  // Full logo — natural aspect ratio
  const naturalWidth = 1024;
  const naturalHeight = 1024;
  const width = Math.round((height * naturalWidth) / naturalHeight);

  return (
    <span className={cn("inline-flex items-center", className)}>
      <Image
        src={logoSrc}
        alt="Bugeti"
        height={height}
        width={width}
        style={{ objectFit: "contain" }}
        priority
      />
    </span>
  );
}
