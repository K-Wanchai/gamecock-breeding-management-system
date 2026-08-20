import { expect, test } from '@playwright/test'

/**
 * End-to-end happy path against the REAL backend (no mocks — see the vitest
 * integration tests for the mocked-API layer): a brand-new customer registers,
 * adds a hen, books a breeder, uploads a payment slip; then an admin approves
 * the payment and the booking, and confirms the booking shows up on the admin
 * dashboard. Requires the Django API to already be running at VITE_API_BASE_URL
 * (see playwright.config.ts) and a "Breeder Gold" active breeder with quota
 * available this month to exist in the database (seeded by prior manual testing
 * in this project's dev database).
 */

// A tiny valid 1x1 PNG — apps.core.validators.validate_image_file decodes the
// upload with Pillow to confirm it's genuine image data, so this must be real.
const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

const ADMIN_USERNAME = 'admin'
const ADMIN_PASSWORD = 'Test1234!'
const BREEDER_NAME = 'Breeder Gold'

function uniqueSuffix(): string {
  return Date.now().toString(36)
}

test('customer books and pays, admin approves, booking appears on the admin dashboard', async ({ page }) => {
  const suffix = uniqueSuffix()
  const username = `e2e_${suffix}`
  const henName = `E2E Hen ${suffix}`
  // phone is unique-per-user server-side — derive one from the current time so repeat runs don't collide.
  const phone = `0${Date.now().toString().slice(-9)}`

  // ---- Customer: register ----
  await page.goto('/register')
  await page.getByLabel('ชื่อ', { exact: true }).fill('E2E')
  await page.getByLabel('นามสกุล', { exact: true }).fill('Tester')
  await page.getByLabel('ชื่อผู้ใช้', { exact: true }).fill(username)
  await page.getByLabel('อีเมล', { exact: true }).fill(`${username}@example.com`)
  await page.getByLabel('เบอร์โทรศัพท์', { exact: true }).fill(phone)
  await page.getByLabel('รหัสผ่าน', { exact: true }).fill('Test1234!')
  await page.getByLabel('ยืนยันรหัสผ่าน', { exact: true }).fill('Test1234!')
  await page.getByRole('button', { name: 'สมัครสมาชิก' }).click()
  await expect(page).toHaveURL(/\/login$/)

  // ---- Customer: log in ----
  await page.getByLabel('ชื่อผู้ใช้').fill(username)
  await page.getByLabel('รหัสผ่าน').fill('Test1234!')
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click()
  await expect(page).toHaveURL(/\/app$/)

  // ---- Customer: add a hen ----
  await page.goto('/app/hens')
  await page.getByRole('button', { name: 'เพิ่มแม่ไก่ใหม่' }).click()
  await page.getByRole('dialog').getByLabel('ชื่อ', { exact: true }).fill(henName)
  await page.getByRole('button', { name: 'บันทึก' }).click()
  await expect(page.getByText(henName)).toBeVisible()

  // ---- Customer: book the seeded breeder ----
  await page.goto('/app/breeders')
  await page.getByPlaceholder('ค้นหาชื่อ, สายพันธุ์, สายเลือด...').fill(BREEDER_NAME)
  const breederCard = page.locator('div', { hasText: BREEDER_NAME }).filter({ has: page.getByRole('button', { name: 'จองคิว' }) }).first()
  await breederCard.getByRole('button', { name: 'จองคิว' }).click()

  await page.getByLabel('แม่ไก่ที่จะใช้จอง').click()
  await page.getByRole('option', { name: new RegExp(henName) }).click()
  await page.getByRole('button', { name: 'ยืนยันการจอง' }).click()

  await expect(page).toHaveURL(/\/app\/bookings\/\d+$/)
  const heading = page.getByRole('heading', { level: 1 })
  // Waits (with Playwright's built-in retrying) for the detail page's data fetch to
  // resolve and the booking number to actually appear, avoiding a race against the
  // loading state right after navigation.
  await expect(heading).toContainText(/BK-\S+/)
  const bookingNo = (await heading.innerText()).match(/BK-\S+/)![0]

  // ---- Customer: upload a payment slip ----
  await page.getByRole('button', { name: 'แนบสลิปชำระเงิน' }).click()
  await page.locator('input[type="file"]').setInputFiles({
    name: 'slip.png',
    mimeType: 'image/png',
    buffer: Buffer.from(TINY_PNG_BASE64, 'base64'),
  })
  await page.getByRole('button', { name: 'ส่งหลักฐานการชำระเงิน' }).click()
  await expect(page.getByText('ส่งหลักฐานการชำระเงินสำเร็จ')).toBeVisible()

  // ---- Customer: log out ----
  await page.getByRole('button').filter({ hasText: username }).click()
  await page.getByRole('menuitem', { name: 'ออกจากระบบ' }).click()
  await expect(page).toHaveURL(/\/login$/)

  // ---- Admin: log in ----
  await page.getByLabel('ชื่อผู้ใช้').fill(ADMIN_USERNAME)
  await page.getByLabel('รหัสผ่าน').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click()
  await expect(page).toHaveURL(/\/admin$/)

  // ---- Admin: approve the payment ----
  await page.goto('/admin/payments')
  await page.getByPlaceholder('ค้นหาเลขที่ชำระเงิน, เลขที่จอง...').fill(bookingNo)
  const paymentRow = page.getByRole('row', { name: new RegExp(bookingNo) })
  await expect(paymentRow).toBeVisible()
  await paymentRow.getByRole('button', { name: 'อนุมัติ' }).click()
  await page.getByRole('button', { name: 'ยืนยันอนุมัติ' }).click()
  await expect(page.getByText('อนุมัติการชำระเงิน')).toBeVisible()

  // ---- Admin: approve the booking (now PAID after the payment approval) ----
  await page.goto('/admin/bookings')
  await page.getByPlaceholder('ค้นหาเลขที่จอง, ชื่อแม่ไก่, พ่อพันธุ์...').fill(bookingNo)
  const bookingRow = page.getByRole('row', { name: new RegExp(bookingNo) })
  await expect(bookingRow).toBeVisible()
  await bookingRow.getByRole('button', { name: 'อนุมัติ' }).click()
  await page.getByRole('button', { name: 'ยืนยันอนุมัติ' }).click()
  await expect(page.getByText('อนุมัติการจอง')).toBeVisible()

  // ---- Admin: the booking shows up on the dashboard's recent bookings ----
  await page.goto('/admin')
  await expect(page.getByText('การจองล่าสุด')).toBeVisible()
  await expect(page.getByRole('cell', { name: bookingNo })).toBeVisible()
})
