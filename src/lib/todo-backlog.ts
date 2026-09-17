import { readFile } from 'node:fs/promises'
import path from 'node:path'

export type TodoBacklogItem = {
  id: string
  title: string
  status: string
  related: string | null
  body: string
  highPriority: boolean
}

export type TodoBacklogSection = {
  id: string
  title: string
  items: TodoBacklogItem[]
}

export type TodoBacklog = {
  title: string
  intro: string
  sections: TodoBacklogSection[]
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function extractMeta(body: string): {
  status: string
  related: string | null
  rest: string
} {
  const lines = body.split('\n')
  let status = 'idea'
  let related: string | null = null
  let i = 0

  while (i < lines.length) {
    const line = lines[i]!.trim()
    if (!line) {
      i += 1
      continue
    }
    const statusMatch = line.match(/^\*\*Status:\*\*\s*(.+)$/i)
    if (statusMatch) {
      status = statusMatch[1]!.trim()
      i += 1
      continue
    }
    const relatedMatch = line.match(/^\*\*Related:\*\*\s*(.+)$/i)
    if (relatedMatch) {
      related = relatedMatch[1]!.trim()
      i += 1
      continue
    }
    break
  }

  return {
    status,
    related,
    rest: lines.slice(i).join('\n').trim(),
  }
}

export function parseTodoBacklogMarkdown(markdown: string): TodoBacklog {
  const normalized = markdown.replace(/\r\n/g, '\n').trim()
  const sectionParts = normalized.split(/\n(?=## )/g)

  let title = 'Backlog'
  let intro = ''
  const sections: TodoBacklogSection[] = []

  for (const part of sectionParts) {
    if (part.startsWith('# ')) {
      const [headingLine, ...rest] = part.split('\n')
      title = headingLine!.replace(/^#\s+/, '').trim()
      intro = rest.join('\n').replace(/^---\s*$/gm, '').trim()
      continue
    }

    if (!part.startsWith('## ')) continue

    const [sectionHeading, ...sectionRest] = part.split('\n')
    const sectionTitle = sectionHeading!.replace(/^##\s+/, '').trim()
    const sectionBody = sectionRest.join('\n').trim()
    const itemParts = sectionBody.split(/\n(?=### )/g).filter((chunk) => chunk.trim())

    const items: TodoBacklogItem[] = []
    for (const itemPart of itemParts) {
      if (!itemPart.startsWith('### ')) continue
      const [itemHeading, ...itemRest] = itemPart.split('\n')
      const itemTitle = itemHeading!.replace(/^###\s+/, '').trim()
      const meta = extractMeta(itemRest.join('\n'))
      items.push({
        id: slugify(itemTitle),
        title: itemTitle,
        status: meta.status,
        related: meta.related,
        body: meta.rest,
        highPriority: /high priority|required before/i.test(meta.status),
      })
    }

    sections.push({
      id: slugify(sectionTitle),
      title: sectionTitle,
      items,
    })
  }

  return { title, intro, sections }
}

export async function loadTodoBacklog(): Promise<TodoBacklog> {
  const filePath = path.join(process.cwd(), 'docs', 'TODO.md')
  const markdown = await readFile(filePath, 'utf8')
  return parseTodoBacklogMarkdown(markdown)
}
