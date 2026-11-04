
import Image from "next/image";

interface LogoProps {
  size?: number;
  className?: string;
  alt?: string;
  priority?: boolean;
}

export default function Logo({
  size = 72,
  className = "",
  alt = "NusantaraGift",
  priority = false,
}: LogoProps) {
  return (
    <Image
      src="/images/brand/LOGO.svg"
      alt={alt}
      width={size}
      height={size}
      priority={priority}
      className={`object-contain ${className}`}
    />
  );
}
