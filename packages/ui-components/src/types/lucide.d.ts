// Type augmentation for lucide-react to fix React 18 compatibility
declare module 'lucide-react' {
  import { ForwardRefExoticComponent, RefAttributes, SVGProps } from 'react'
  
  interface LucideProps extends Omit<SVGProps<SVGSVGElement>, 'ref'> {
    size?: string | number
    absoluteStrokeWidth?: boolean
  }
  
  type LucideIcon = ForwardRefExoticComponent<
    LucideProps & RefAttributes<SVGSVGElement>
  >
  
  export const QrCode: LucideIcon
  export const ShoppingCart: LucideIcon
  export const X: LucideIcon
  export const Plus: LucideIcon
  export const Minus: LucideIcon
}
