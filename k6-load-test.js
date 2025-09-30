/* eslint-disable no-console */
/* eslint-disable no-undef */
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend, Counter } from 'k6/metrics'

// Custom metrics
const errorRate = new Rate('errors')
const productInfoDuration = new Trend('product_info_duration')
const categoryTreeInfoDuration = new Trend('products_by_category_info_duration')
const totalRequests = new Counter('total_requests')

// Configuration
export const options = {
  stages: [
    { duration: '1m', target: 10 }, // Ramp up to 10 users
    { duration: '2m', target: 10 }, // Stay at 10 users
    { duration: '1m', target: 50 }, // Ramp up to 50 users
    { duration: '2m', target: 50 }, // Stay at 50 users
    { duration: '1m', target: 100 }, // Ramp up to 100 users
    { duration: '2m', target: 100 }, // Stay at 100 users
    { duration: '1m', target: 0 }, // Ramp down to 0 users
  ],
  thresholds: {
    // Error rate should be less than 1%
    errors: ['rate<0.01'],

    // 95% of requests should complete within 2000ms
    http_req_duration: ['p(95)<2000'],

    // Product info endpoint thresholds
    product_info_duration: ['p(95)<1500', 'p(99)<3000'],

    // Category tree information endpoint thresholds
    products_by_category_info_duration: ['p(95)<2000', 'p(99)<4000'],

    // HTTP failures should be less than 1%
    http_req_failed: ['rate<0.01'],
  },
}

// Environment variables - set these when running k6
const BASE_URL = 'https://blacksipqa.myvtex.com'

// Test data - customize with your actual product IDs and postal codes
const productIds = [
  7778144,
  7778143,
  7778142,
  7778141,
  7778140,
  7778139,
  7778138,
  7778137,
  7778136,
  7778135,
  7778134,
]

const categoryTrees = ['40', '42', '3', '1', '37', '14', '34']

export default function () {
  const productId = productIds[Math.floor(Math.random() * productIds.length)]

  // Test 1: Get Product Information
  const productInfoUrl = `${BASE_URL}/_v/products?productId=${productId}`
  const productInfoRes = http.get(productInfoUrl, {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { name: 'GetProductInfo' },
  })

  totalRequests.add(1)
  productInfoDuration.add(productInfoRes.timings.duration)

  const productInfoCheck = check(productInfoRes, {
    'product info status is 200': (r) => r.status === 200,
    'product info has data': (r) => r.json() && r.json().product !== undefined,
    'product info response time < 2000ms': (r) => r.timings.duration < 2000,
  })

  errorRate.add(!productInfoCheck)

  sleep(1)

  const categoryTree =
    categoryTrees[Math.floor(Math.random() * categoryTrees.length)]

  // Test 2: Category Tree Products
  const categoryTreeInfoUrl = `${BASE_URL}/_v/products-by-category?categoryTree=${categoryTree}`
  const categoryTreeInfoRes = http.get(categoryTreeInfoUrl, {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { name: 'GetCategoryTreeProducts' },
  })

  totalRequests.add(1)
  categoryTreeInfoDuration.add(categoryTreeInfoRes.timings.duration)

  const categoryTreeInfoCheck = check(categoryTreeInfoRes, {
    'categoryTree info status is 200': (r) => r.status === 200,
    'categoryTree info has data': (r) => r.json() && r.json().length,
    'categoryTree info response time < 2000ms': (r) =>
      r.timings.duration < 2000,
  })

  errorRate.add(!categoryTreeInfoCheck)

  sleep(1)
}
