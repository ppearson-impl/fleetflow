import { ToastProvider } from '@/lib/toast-context'

export const metadata = {
  title: 'FleetFlow Driver',
  description: 'Driver delivery app',
}

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-sm mx-auto min-h-screen bg-gray-50">
      <ToastProvider>
        {children}
      </ToastProvider>
    </div>
  )
}
