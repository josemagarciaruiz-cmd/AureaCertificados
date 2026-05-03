import { ReactNode } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

interface LayoutProps {
  children: ReactNode
  onLock: () => void
}

export default function Layout({ children, onLock }: LayoutProps) {
  return (
    <div className="flex h-full bg-bg-primary overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar onLock={onLock} />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
