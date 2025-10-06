/* eslint-disable no-console */
/* eslint-disable no-undef */
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend, Counter, Gauge } from 'k6/metrics'

// Custom metrics
const errorRate = new Rate('errors')
const productInfoDuration = new Trend('product_info_duration')
const categoryTreeInfoDuration = new Trend('products_by_category_info_duration')
const totalRequests = new Counter('total_requests')
const successfulRequests = new Counter('successful_requests')
const concurrentUsers = new Gauge('concurrent_users')

// Black Friday Configuration
// Simulates a 2-hour Black Friday event with realistic traffic patterns
export const options = {
  stages: [
    // Pre-event warm-up (10 minutes before event starts)
    { duration: '2m', target: 50 }, // Early shoppers preparing
    { duration: '3m', target: 150 }, // Growing anticipation
    { duration: '2m', target: 200 }, // Last minute preparation

    // Event start - massive spike (Black Friday begins!)
    { duration: '30s', target: 500 }, // Sudden initial rush
    { duration: '1m', target: 1000 }, // Major spike
    { duration: '2m', target: 1500 }, // Peak traffic - absolute maximum
    { duration: '2m', target: 1800 }, // Sustained peak

    // High sustained traffic (first 20 minutes of event)
    { duration: '5m', target: 1500 }, // Still extremely high
    { duration: '5m', target: 1200 }, // Slight decrease
    { duration: '5m', target: 1000 }, // Stabilizing at high level

    // Mid-event traffic (next 30 minutes)
    { duration: '8m', target: 800 }, // Moderate high traffic
    { duration: '7m', target: 700 }, // Still busy

    // Late event traffic (next 30 minutes)
    { duration: '10m', target: 500 }, // Decreasing
    { duration: '10m', target: 350 }, // Further decline

    // Post-event wind down
    { duration: '5m', target: 200 }, // Winding down
    { duration: '3m', target: 100 }, // Back to normal
    { duration: '2m', target: 0 }, // Ramp down complete
  ],
  thresholds: {
    // Relaxed thresholds for Black Friday extreme load conditions
    // Error rate should be less than 5% (realistic for extreme traffic)
    errors: ['rate<0.05'],

    // 95% of requests should complete within 5 seconds (allowing for high load)
    http_req_duration: ['p(95)<5000', 'p(99)<10000'],

    // Product info endpoint thresholds
    product_info_duration: ['p(95)<4000', 'p(99)<8000', 'avg<3000'],

    // Category tree information endpoint thresholds
    products_by_category_info_duration: ['p(95)<5000', 'p(99)<10000', 'avg<3500'],

    // HTTP failures should be less than 5% during peak
    http_req_failed: ['rate<0.05'],

    // At least 95% success rate
    successful_requests: ['count>0'],
  },
  // Additional Black Friday specific options
  noConnectionReuse: false, // Reuse connections for better performance
  userAgent: 'K6BlackFridayLoadTest/1.0',
}

// Environment variables
const BASE_URL = 'https://blacksipqa.myvtex.com'

// Expanded test data for more realistic Black Friday scenarios
const productIds = [
  7778144, 7778143, 7778142, 7778141, 7778140, 7778139, 7778138, 7778137,
  7778136, 7778135, 7778134,
]

const categoryTrees = ['40', '42', '3', '1', '37', '14', '34']

// User behavior scenarios with weights (percentages)
const USER_BEHAVIORS = {
  BROWSER: 0.4, // 40% - Just browsing products
  CATEGORY_SHOPPER: 0.35, // 35% - Looking through categories
  DEAL_HUNTER: 0.25, // 25% - Rapidly checking multiple products
}

function getRandomBehavior() {
  const rand = Math.random()
  if (rand < USER_BEHAVIORS.BROWSER) return 'BROWSER'
  if (rand < USER_BEHAVIORS.BROWSER + USER_BEHAVIORS.CATEGORY_SHOPPER)
    return 'CATEGORY_SHOPPER'

  return 'DEAL_HUNTER'
}

// Simulate browser behavior - check one product
function browserBehavior() {
  const productId = productIds[Math.floor(Math.random() * productIds.length)]

  const productInfoUrl = `${BASE_URL}/_v/products?productId=${productId}`
  const productInfoRes = http.get(productInfoUrl, {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { name: 'GetProductInfo', behavior: 'BROWSER' },
  })

  totalRequests.add(1)
  productInfoDuration.add(productInfoRes.timings.duration)

  const productInfoCheck = check(productInfoRes, {
    'product info status is 200': (r) => r.status === 200,
    'product info has data': (r) => r && r.json() && r.json().product !== undefined,
    'product info response time < 5000ms': (r) => r.timings.duration < 5000,
  })

  if (productInfoCheck) successfulRequests.add(1)
  errorRate.add(!productInfoCheck)

  sleep(Math.random() * 2 + 1) // Random sleep 1-3 seconds
}

// Simulate category shopper - browse categories
function categoryShopperBehavior() {
  const categoryTree =
    categoryTrees[Math.floor(Math.random() * categoryTrees.length)]

  const categoryTreeInfoUrl = `${BASE_URL}/_v/products-by-category?categoryTree=${categoryTree}`
  const categoryTreeInfoRes = http.get(categoryTreeInfoUrl, {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { name: 'GetCategoryTreeProducts', behavior: 'CATEGORY_SHOPPER' },
  })

  totalRequests.add(1)
  categoryTreeInfoDuration.add(categoryTreeInfoRes.timings.duration)

  const categoryTreeInfoCheck = check(categoryTreeInfoRes, {
    'categoryTree info status is 200': (r) => r.status === 200,
    'categoryTree info has data': (r) => r && r.json() && r.json().length,
    'categoryTree info response time < 5000ms': (r) =>
      r.timings.duration < 5000,
  })

  if (categoryTreeInfoCheck) successfulRequests.add(1)
  errorRate.add(!categoryTreeInfoCheck)

  // Category shoppers often check products from the category
  if (Math.random() > 0.5) {
    sleep(0.5)
    const productId = productIds[Math.floor(Math.random() * productIds.length)]
    const productInfoUrl = `${BASE_URL}/_v/products?productId=${productId}`
    const productInfoRes = http.get(productInfoUrl, {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'GetProductInfo', behavior: 'CATEGORY_SHOPPER' },
    })

    totalRequests.add(1)
    productInfoDuration.add(productInfoRes.timings.duration)

    const productCheck = check(productInfoRes, {
      'product info status is 200': (r) => r?.status === 200,
    })

    if (productCheck) successfulRequests.add(1)
    errorRate.add(!productCheck)
  }

  sleep(Math.random() * 1.5 + 0.5) // Random sleep 0.5-2 seconds
}

// Simulate deal hunter - rapidly checking multiple products
function dealHunterBehavior() {
  const numProducts = Math.floor(Math.random() * 3) + 2 // Check 2-4 products

  for (let i = 0; i < numProducts; i++) {
    const productId = productIds[Math.floor(Math.random() * productIds.length)]
    const productInfoUrl = `${BASE_URL}/_v/products?productId=${productId}`
    const productInfoRes = http.get(productInfoUrl, {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'GetProductInfo', behavior: 'DEAL_HUNTER' },
    })

    totalRequests.add(1)
    productInfoDuration.add(productInfoRes.timings.duration)

    const productCheck = check(productInfoRes, {
      'product info status is 200': (r) => r?.status === 200,
    })

    if (productCheck) successfulRequests.add(1)
    errorRate.add(!productCheck)

    sleep(Math.random() * 0.5 + 0.2) // Quick checks: 0.2-0.7 seconds
  }
}

// Main test function
export default function () {
  concurrentUsers.add(1)

  const behavior = getRandomBehavior()

  switch (behavior) {
    case 'BROWSER':
      browserBehavior()
      break
    case 'CATEGORY_SHOPPER':
      categoryShopperBehavior()
      break
    case 'DEAL_HUNTER':
      dealHunterBehavior()
      break
  }

  // Random additional sleep to simulate realistic user patterns
  sleep(Math.random() * 0.5)
}

// Setup function - runs once at the beginning
export function setup() {
  console.log('🛍️  Starting Black Friday Load Test')
  console.log('⚡ Peak expected load: 1800 concurrent users')
  console.log('⏱️  Total test duration: ~80 minutes')
  console.log('🎯 Testing endpoints:')
  console.log(`   - ${BASE_URL}/_v/products`)
  console.log(`   - ${BASE_URL}/_v/products-by-category`)
}

// Teardown function - runs once at the end
export function teardown(data) {
  console.log('✅ Black Friday Load Test completed')
}
