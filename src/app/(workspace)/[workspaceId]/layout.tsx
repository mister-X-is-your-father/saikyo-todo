import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    template: '%s | 最強TODO',
    default: 'Workspace | 最強TODO',
  },
}

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return children
}
