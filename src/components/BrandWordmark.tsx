export default function BrandWordmark({ compact = false }: {
  compact?: boolean;
}) {
  return (
    <img
      src="/umaru.png"
      alt="Logotipo Umaru"
      className={compact ? 'h-11 w-auto object-contain' : 'h-14 w-auto object-contain'}
      draggable={false}
    />
  );
}