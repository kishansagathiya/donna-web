import { useTheme } from "../hooks/useTheme";
import { logoForTheme, type LogoSurface } from "../lib/logo";

type Props = {
  surface?: LogoSurface;
  className?: string;
  alt?: string;
  width?: number;
  height?: number;
};

export function DonnaLogo({
  surface = "app",
  className,
  alt = "Donna",
  width,
  height,
}: Props) {
  const { theme } = useTheme();

  return (
    <img
      className={className}
      src={logoForTheme(theme, surface)}
      alt={alt}
      width={width}
      height={height}
    />
  );
}
