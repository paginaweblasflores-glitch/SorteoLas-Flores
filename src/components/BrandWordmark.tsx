export default function BrandWordmark({ compact = false, src = '/umaru.svg', alt = 'Logotipo del sorteo' }: {
  compact?: boolean;
  src?: string;
  alt?: string;
}) {
  return (
    <img
      src={src}
      alt={alt}
      className={compact ? 'h-11 w-auto object-contain' : 'h-14 w-auto object-contain'}
      draggable={false}
    />
  );
}