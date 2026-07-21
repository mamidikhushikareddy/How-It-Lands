/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Single-owner super-admin designation.
 *
 * This app's admin roster is meant to be controlled by one specific
 * account, not by "whoever currently holds the super_admin role" — the
 * distinction matters because a role is just a database column any
 * admin-tier account could theoretically have granted itself before this
 * guard existed, or could be granted to in a future data-migration bug.
 * Pinning it to a specific, fixed email closes that gap: only this
 * account can create new admins, strip admin status from an existing
 * admin, or delete an admin-tier account outright.
 *
 * Configurable via SUPER_ADMIN_EMAIL so this isn't hardcoded to one
 * deployment — falls back to the designated owner email if unset.
 */

export const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL || 'kiaria2514@gmail.com')
  .toLowerCase()
  .trim();

export function isSuperAdminOwner(user: { email?: string | null } | null | undefined): boolean {
  if (!user?.email) return false;
  return user.email.toLowerCase().trim() === SUPER_ADMIN_EMAIL;
}
