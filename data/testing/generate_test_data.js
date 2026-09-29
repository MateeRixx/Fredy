import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const outputDir = dirname(fileURLToPath(import.meta.url))

let seed = 20260929
function random() {
  seed = (1664525 * seed + 1013904223) >>> 0
  return seed / 2 ** 32
}

function pick(values) {
  return values[Math.floor(random() * values.length)]
}

function normal() {
  // Deterministic approximation of a standard normal distribution.
  let total = 0
  for (let i = 0; i < 12; i += 1) total += random()
  return total - 6
}

function csvEscape(value) {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function writeCsv(name, columns, rows) {
  const lines = [columns.join(',')]
  for (const row of rows) {
    lines.push(columns.map((column) => csvEscape(row[column])).join(','))
  }
  writeFileSync(join(outputDir, name), `${lines.join('\n')}\n`, 'utf8')
}

function syntheticRows(count = 500) {
  const categories = ['grocery', 'restaurant', 'electronics', 'travel', 'online_retail', 'utilities']
  const cities = ['Mumbai', 'Delhi', 'Bengaluru', 'Pune', 'Hyderabad']
  const rows = []
  const start = Date.parse('2025-01-01T00:00:00Z')

  for (let i = 0; i < count; i += 1) {
    const fraud = i % 10 === 0
    const customerNumber = i % 25
    const timestamp = new Date(start + i * 60 * 60 * 1000)
    if (fraud) timestamp.setUTCHours(2 + (i % 3))

    rows.push({
      transaction_id: `TEST-TXN-${String(i).padStart(5, '0')}`,
      customer_id: `TEST-CUST-${String(customerNumber).padStart(3, '0')}`,
      amount: fraud
        ? (5000 + random() * 15000).toFixed(2)
        : (10 + random() * 490).toFixed(2),
      timestamp: timestamp.toISOString().replace('.000Z', ''),
      merchant_category: fraud ? pick(['travel', 'electronics', 'online_retail']) : pick(categories),
      transaction_type: fraud ? pick(['transfer', 'refund']) : 'purchase',
      channel: fraud ? 'online' : pick(['pos', 'mobile_app', 'atm']),
      location: fraud ? 'International' : cities[customerNumber % cities.length],
      is_fraud: fraud ? 1 : 0,
    })
  }
  return rows
}

function ulbRows(count = 1000) {
  const rows = []
  for (let i = 0; i < count; i += 1) {
    const fraud = i % 20 === 0
    const row = {
      Time: (i * 172.8).toFixed(3),
      Amount: fraud
        ? (1000 + random() * 5000).toFixed(2)
        : Math.abs(25 + normal() * 20).toFixed(2),
      Class: fraud ? 1 : 0,
    }

    for (let feature = 1; feature <= 28; feature += 1) {
      let value = normal()
      if (fraud && [1, 3, 5, 14, 17].includes(feature)) value -= 3
      if (fraud && [2, 4].includes(feature)) value += 2
      row[`V${feature}`] = value.toFixed(6)
    }
    rows.push(row)
  }
  return rows
}

function buildApiExamples() {
  const ulbTransaction = { transaction_id: 'LIVE-ULB-SUSPICIOUS', Time: 140000, Amount: 4200 }
  for (let feature = 1; feature <= 28; feature += 1) {
    ulbTransaction[`V${feature}`] = [1, 3, 5, 14, 17].includes(feature)
      ? -4
      : [2, 4].includes(feature) ? 3 : 0
  }

  return {
    note: 'Use synthetic requests after training synthetic_transactions.csv and ULB requests after training ulb_transactions.csv.',
    synthetic_legitimate: {
      method: 'POST',
      path: '/api/score/transaction',
      body: {
        transaction: {
          transaction_id: 'LIVE-SYNTH-LEGITIMATE',
          customer_id: 'TEST-CUST-001',
          amount: 84.5,
          timestamp: '2025-02-01T14:30:00',
          merchant_category: 'grocery',
          transaction_type: 'purchase',
          channel: 'pos',
          location: 'Delhi',
        },
      },
    },
    synthetic_suspicious: {
      method: 'POST',
      path: '/api/score/transaction',
      body: {
        transaction: {
          transaction_id: 'LIVE-SYNTH-SUSPICIOUS',
          customer_id: 'TEST-CUST-001',
          amount: 18000,
          timestamp: '2025-02-01T02:15:00',
          merchant_category: 'travel',
          transaction_type: 'transfer',
          channel: 'online',
          location: 'International',
        },
      },
    },
    ulb_suspicious: {
      method: 'POST',
      path: '/api/score/transaction',
      body: { transaction: ulbTransaction },
    },
  }
}

mkdirSync(outputDir, { recursive: true })

writeCsv(
  'synthetic_transactions.csv',
  ['transaction_id', 'customer_id', 'amount', 'timestamp', 'merchant_category', 'transaction_type', 'channel', 'location', 'is_fraud'],
  syntheticRows(),
)

writeCsv(
  'ulb_transactions.csv',
  ['Time', ...Array.from({ length: 28 }, (_, i) => `V${i + 1}`), 'Amount', 'Class'],
  ulbRows(),
)

writeCsv(
  'invalid_missing_columns.csv',
  ['transaction_id', 'amount', 'is_fraud'],
  [
    { transaction_id: 'INVALID-001', amount: 100, is_fraud: 0 },
    { transaction_id: 'INVALID-002', amount: 9000, is_fraud: 1 },
  ],
)

writeCsv(
  'invalid_single_class.csv',
  ['transaction_id', 'customer_id', 'amount', 'timestamp', 'merchant_category', 'transaction_type', 'channel', 'location', 'is_fraud'],
  syntheticRows(100).map((row) => ({ ...row, is_fraud: 0 })),
)

writeFileSync(
  join(outputDir, 'api_requests.json'),
  `${JSON.stringify(buildApiExamples(), null, 2)}\n`,
  'utf8',
)

console.log(`Testing data generated in ${outputDir}`)
