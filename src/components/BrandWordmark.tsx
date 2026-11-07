import { getBrand, type BrandId } from '../assets/raffleLogos';

export default function BrandWordmark({ brand = 'umaru', onDark = false, compact = false, src, alt }: {
  brand?: BrandId;
  onDark?: boolean;
  compact?: boolean;
  /** Logo explícito; si se omite se usa el de la marca. */
  src?: string | null;
  alt?: string;
}) {
  const info = getBrand(brand);
  return (
    <img
      src={src ?? (onDark ? info.logoOnDark : info.logo)}
      alt={alt ?? info.label}
      className={compact ? 'h-11 w-auto object-contain' : 'h-14 w-auto object-contain'}
      draggable={false}
    />
  );
}
