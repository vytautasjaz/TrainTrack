import { ProductBacklogView } from '@/components/admin/product-backlog-view'
import { loadTodoBacklog } from '@/lib/todo-backlog'
import { requireAdmin } from '@/lib/session'

export const metadata = {
  title: 'Product backlog · Admin',
}

export default async function AdminTodosPage() {
  await requireAdmin()
  const backlog = await loadTodoBacklog()

  return (
    <ProductBacklogView
      backlog={backlog}
      navLinks={[
        { href: '/admin/tools', label: 'All tools →' },
        { href: '/style-guide', label: 'Style guide →' },
      ]}
    />
  )
}
