const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const APP_URL = 'https://erp-base-eight.vercel.app';
const SS_DIR = path.join(process.env.TEMP || '/tmp', 'erp-e2e', 'screenshots');
const EMAIL = 'erptest99@gmail.com';
const PASSWORD = 'TestPass123!';

let stepNum = 0;
async function ss(page, name) {
  stepNum++;
  const f = path.join(SS_DIR, String(stepNum).padStart(2, '0') + '-' + name + '.png');
  await page.screenshot({ path: f, fullPage: true });
  console.log('  [ss] ' + f);
  return f;
}
function log(step, status, msg) {
  const icon = status === 'PASS' ? 'OK' : status === 'FAIL' ? 'FAIL' : 'WARN';
  console.log(icon + ' Step ' + step + ': ' + msg);
}

async function reactFill(page, selector, value) {
  await page.waitForSelector(selector, { timeout: 10000 });
  await page.evaluate(function(args) {
    var el = document.querySelector(args.sel);
    var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, args.val);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, { sel: selector, val: value });
}

async function callApi(page, method, apiPath, body) {
  return page.evaluate(function(a) {
    return fetch(a.path, {
      method: a.method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(a.body)
    }).then(function(r) { return r.json(); }).then(function(d) { return { ok: true, data: d }; }).catch(function(e) { return { ok: false, error: String(e) }; });
  }, { method: method, path: apiPath, body: body });
}

async function main() {
  fs.mkdirSync(SS_DIR, { recursive: true });
  console.log('Screenshots dir: ' + SS_DIR);

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', function(e) { pageErrors.push(e.message); });

  try {
    // Step 1: Homepage
    await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('h1', { timeout: 10000 });
    var h1 = (await page.textContent('h1')).trim();
    await ss(page, '01-homepage');
    log(1, h1.length > 0 ? 'PASS' : 'FAIL', 'h1: "' + h1 + '"');

    // Step 2: Login
    await page.goto(APP_URL + '/login', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(500);
    await reactFill(page, 'input[placeholder="Email"]', EMAIL);
    await reactFill(page, 'input[type="password"]', PASSWORD);
    await ss(page, '02-login');
    await page.click('button:has-text("Log in")');
    await page.waitForTimeout(5000);
    var loginUrl = page.url();
    console.log('  URL after login: ' + loginUrl);
    await ss(page, '03-after-login');
    if (loginUrl.includes('/dashboard') || loginUrl.includes('/onboarding')) {
      log(2, 'PASS', 'logged in to ' + loginUrl);
    } else {
      log(2, 'FAIL', 'login failed: ' + loginUrl);
      await browser.close(); process.exit(1);
    }

    // Step 3: Onboarding
    if (page.url().includes('/onboarding')) {
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
      await reactFill(page, 'input[placeholder="Business name"]', 'Test Business');
      await page.selectOption('select', 'general');
      await ss(page, '04-onboarding');
      await page.click('button:has-text("Continue")');
      await page.waitForTimeout(5000);
      await ss(page, '05-post-onboard');
      log(3, page.url().includes('dashboard') ? 'PASS' : 'FAIL', 'after onboarding: ' + page.url());
    } else {
      log(3, 'PASS', 'existing org, direct to dashboard');
      await ss(page, '04-dashboard');
    }

    // Step 4: Dashboard sidebar
    await page.waitForSelector('aside nav', { timeout: 10000 });
    var nav = await page.textContent('aside nav');
    await ss(page, '06-sidebar');
    log(4, (nav.includes('Billing') && nav.includes('Payments') && nav.includes('Inventory')) ? 'PASS' : 'FAIL',
      'Billing:' + nav.includes('Billing') + ' Payments:' + nav.includes('Payments') + ' Inventory:' + nav.includes('Inventory'));

    // Step 5: Create invoice via direct API call
    await page.goto(APP_URL + '/dashboard/billing/new', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(800);
    await ss(page, '07-new-invoice');
    var issueDate = new Date().toISOString().split('T')[0];
    console.log('  Creating invoice via /api/invoices...');
    var ir = await callApi(page, 'POST', '/api/invoices', {
      customer_name: 'Acme Corp',
      customer_email: '',
      customer_gstin: '',
      billing_address: '',
      issue_date: issueDate,
      due_date: '',
      notes: '',
      items: [{ description: 'Consulting', quantity: 1, unit_price: 5000, gst_rate: 18 }]
    });
    console.log('  Invoice result: ' + JSON.stringify(ir));
    if (!ir.ok || (ir.data && ir.data.error)) {
      log(5, 'FAIL', JSON.stringify(ir));
      await browser.close(); process.exit(1);
    }
    var invoiceId = ir.data.id;
    log(5, 'PASS', 'Invoice created: ' + invoiceId);

    // Step 6: Invoice detail
    var invUrl = APP_URL + '/dashboard/billing/' + invoiceId;
    await page.goto(invUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);
    await ss(page, '08-invoice-detail');
    var ib = await page.textContent('body');
    log(6, /INV-\d{4}-\d{4}/.test(ib) ? 'PASS' : 'FAIL', 'invoice number visible: ' + (/INV-\d{4}-\d{4}/.exec(ib) || ['(none)'])[0]);
    log(6, (ib.includes('5,900') || ib.includes('5900')) ? 'PASS' : 'WARN', 'total 5900 visible');
    log(6, (ib.includes('GST') || ib.includes('gst')) ? 'PASS' : 'WARN', 'GST visible');

    // Step 7: Mark as Sent
    var sentBtn = page.locator('button:has-text("Mark as Sent")');
    if (await sentBtn.count() > 0) {
      log(7, 'PASS', 'Mark as Sent button found');
      await sentBtn.click();
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(function() {});
      await page.waitForTimeout(3000);
      var st = await page.textContent('body');
      await ss(page, '09-sent');
      log(7, st.toLowerCase().includes('sent') ? 'PASS' : 'WARN', 'sent in body: ' + st.toLowerCase().includes('sent'));
    } else {
      log(7, 'FAIL', 'Mark as Sent button not found');
      await ss(page, '09-no-sent-btn');
    }

    // Step 8: Collect Payment link
    var cLink = page.locator('a:has-text("Collect Payment")');
    if (await cLink.count() > 0) {
      var href = await cLink.getAttribute('href');
      log(8, 'PASS', 'Collect Payment link: ' + href);
      await cLink.click();
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(function() {});
      await page.waitForTimeout(2000);
      await ss(page, '10-payment-form');
      log(8, page.url().includes('payments/new') ? 'PASS' : 'FAIL', 'payment form url: ' + page.url());
    } else {
      log(8, 'FAIL', 'Collect Payment link not found');
      await ss(page, '10-no-collect');
    }

    // Step 9: Record payment via direct API call
    console.log('  Recording payment via /api/payments...');
    var pr = await callApi(page, 'POST', '/api/payments', {
      invoiceId: invoiceId,
      amount: 5900,
      method: 'cash',
      paidAt: issueDate
    });
    console.log('  Payment result: ' + JSON.stringify(pr));
    await ss(page, '11-payment-done');
    log(9, (pr.ok && !(pr.data && pr.data.error)) ? 'PASS' : 'FAIL', JSON.stringify(pr.data));

    // Step 10: Invoice marked paid
    await page.goto(invUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);
    var pb = await page.textContent('body');
    await ss(page, '12-invoice-paid');
    log(10, pb.toLowerCase().includes('paid') ? 'PASS' : 'FAIL', 'paid status visible');

    // Step 11: Add product via direct API call
    await page.goto(APP_URL + '/dashboard/inventory/new', { waitUntil: 'networkidle', timeout: 30000 });
    await ss(page, '13-new-product');
    console.log('  Creating product via /api/products...');
    var prod = await callApi(page, 'POST', '/api/products', {
      name: 'Coffee Beans',
      sku: 'CB-001',
      unit: 'kg',
      selling_price: 800,
      gst_rate: 5,
      opening_stock: 50,
      low_stock_threshold: 10
    });
    console.log('  Product result: ' + JSON.stringify(prod));
    log(11, (prod.ok && !(prod.data && prod.data.error)) ? 'PASS' : 'FAIL', JSON.stringify(prod.data));

    // Step 12: Inventory list + stock adjuster
    await page.goto(APP_URL + '/dashboard/inventory', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);
    var invListBody = await page.textContent('body');
    await ss(page, '14-inventory');
    log(12, invListBody.includes('Coffee Beans') ? 'PASS' : 'FAIL', 'Coffee Beans in list');
    log(12, invListBody.includes('50') ? 'PASS' : 'WARN', 'stock 50 visible');

    var minus = page.locator('button[title="Remove 1"]').first();
    if (await minus.count() > 0) {
      await minus.click();
      await page.waitForTimeout(4000);
      var adjBody = await page.textContent('body');
      await ss(page, '15-adjusted');
      log(12, adjBody.includes('49') ? 'PASS' : 'WARN', 'stock adjusted to 49: ' + adjBody.includes('49'));
    } else {
      log(12, 'WARN', 'Remove 1 button not found');
      await ss(page, '15-inventory');
    }

    if (pageErrors.length) {
      console.log('\nJS errors:');
      pageErrors.forEach(function(e) { console.log('  - ' + e); });
    } else {
      console.log('\nNo JS errors.');
    }
    console.log('\nDone. Screenshots: ' + SS_DIR);

  } catch (e) {
    console.error('FATAL: ' + e.message);
    console.error(e.stack);
    await ss(page, 'fatal').catch(function() {});
    await browser.close();
    process.exit(1);
  }

  await browser.close();
  process.exit(0);
}

main();
