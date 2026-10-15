import { IconImage } from './icons';
import clsx from 'clsx';

/** Small product/service image with a styled placeholder fallback. */
export function ProductThumb({
  src,
  alt,
  size = 36,
  className,
}: {
  src?: string;
  alt: string;
  size?: number;
  className?: string;
}) {
  if (!src) {
    return (
      <span
        className={clsx(
          'flex shrink-0 items-center justify-center rounded-lg bg-paper text-stone-300',
          className,
        )}
        style={{ width: size, height: size }}
        aria-hidden
      >
        <IconImage width={size * 0.5} height={size * 0.5} />
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      className={clsx('shrink-0 rounded-lg border border-stone-200 object-cover', className)}
      style={{ width: size, height: size }}
    />
  );
}
