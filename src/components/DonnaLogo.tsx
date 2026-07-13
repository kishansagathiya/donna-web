import { useTheme } from "../hooks/useTheme";
import { logoForTheme } from "../lib/logo";

type Props = {
  className?: string;
  alt?: string;
  width?: number;
  height?: number;
};

export function DonnaLogo({
  className,
  alt = "Donna",
  width,
  height,
}: Props) {
  const { theme } = useTheme();

  return (
    <img
      className={className}
      src={logoForTheme(theme)}
      alt={alt}
      width={width}
      height={height}
    />
  );
}
