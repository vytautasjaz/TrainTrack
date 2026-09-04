/**
 * Grant ADMIN role to an existing user by email.
 *
 * Usage:
 *   npx tsx scripts/grant-admin.ts you@example.com
 *
 * Or set ADMIN_EMAILS in env — matching emails get ADMIN on account create.
 */
import { PrismaClient, UserRole } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2]?.trim().toLowerCase()
  if (!email) {
    console.error('Usage: npx tsx scripts/grant-admin.ts email@example.com')
    process.exit(1)
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    console.error(`No user found for ${email}`)
    process.exit(1)
  }

  const roles = Array.from(new Set([...user.roles, UserRole.ADMIN]))
  await prisma.user.update({
    where: { id: user.id },
    data: { roles },
  })

  console.log(`Granted ADMIN to ${user.name} <${user.email}>`)
  console.log(`Roles: ${roles.join(', ')}`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
