import * as React from 'react';
import { cn } from '@/lib/utils';

/** Select nativo com o visual do shadcn: no celular abre o seletor do próprio sistema. */
export const NativeSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      'flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 md:text-sm',
      className,
    )}
    {...props}
  />
));
NativeSelect.displayName = 'NativeSelect';
