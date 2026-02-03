#!/usr/bin/env node
/**
 * Post-build validation to ensure no secrets leaked into client bundle
 * Run after build: node tools/scripts/validate-build.js
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const BUILD_DIR = './apps/web/dist'
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

// Patterns that should NEVER appear in client bundles
const FORBIDDEN_PATTERNS = [
  /sk_live_[a-zA-Z0-9]+/,           // Stripe live secret key
  /sk_test_[a-zA-Z0-9]{20,}/,       // Stripe test secret key (long form)
  /AKIA[0-9A-Z]{16}/,               // AWS Access Key ID
  /whsec_[a-zA-Z0-9]+/,             // Stripe webhook secret
  /postgresql:\/\/[^:]+:[^@]+@/,    // Database connection with password
  /JWT_SECRET/,                      // JWT secret variable name
  /GROK_API_KEY/,                    // Grok API key variable name
  /REPLICATE_API_TOKEN/,            // Replicate token variable name
  /TELEGRAM_BOT_TOKEN/,             // Telegram bot token variable name
  /password['"]\s*:\s*['"][^'"]+['"]/i,  // Hardcoded passwords
]

// Patterns that are warnings (might be okay, but should be reviewed)
const WARNING_PATTERNS = [
  /api[_-]?key/i,
  /secret/i,
  /credential/i,
  /private[_-]?key/i,
]

let foundIssues = 0
let warnings = 0

function scanFile(filePath) {
  const stat = statSync(filePath)

  // Skip large files and non-JS/HTML files
  if (stat.size > MAX_FILE_SIZE) return
  if (!filePath.match(/\.(js|html|css|json)$/)) return

  const content = readFileSync(filePath, 'utf8')

  // Check forbidden patterns
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(content)) {
      console.error(`ERROR: Forbidden pattern found in ${filePath}`)
      console.error(`  Pattern: ${pattern}`)
      foundIssues++
    }
  }

  // Check warning patterns (only in JS files)
  if (filePath.endsWith('.js')) {
    for (const pattern of WARNING_PATTERNS) {
      const matches = content.match(pattern)
      if (matches && !content.includes('// safe:')) {
        // Only warn if it looks like an actual secret, not just a variable name
        const context = content.substring(
          Math.max(0, content.indexOf(matches[0]) - 20),
          Math.min(content.length, content.indexOf(matches[0]) + matches[0].length + 20)
        )
        if (context.includes('=') || context.includes(':')) {
          console.warn(`WARNING: Potential sensitive data in ${filePath}`)
          console.warn(`  Pattern: ${pattern}`)
          warnings++
        }
      }
    }
  }
}

function scanDirectory(dir) {
  try {
    const files = readdirSync(dir)
    for (const file of files) {
      const filePath = join(dir, file)
      const stat = statSync(filePath)
      if (stat.isDirectory()) {
        scanDirectory(filePath)
      } else {
        scanFile(filePath)
      }
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log(`Build directory not found: ${dir}`)
      console.log('Run this after building the client.')
      process.exit(0)
    }
    throw err
  }
}

console.log('Scanning build output for secrets...')
console.log(`Directory: ${BUILD_DIR}`)
console.log('')

scanDirectory(BUILD_DIR)

console.log('')
console.log('='.repeat(50))
console.log(`Scan complete: ${foundIssues} errors, ${warnings} warnings`)
console.log('='.repeat(50))

if (foundIssues > 0) {
  console.error('\nBUILD FAILED: Secrets detected in client bundle!')
  console.error('Remove sensitive data before deploying.')
  process.exit(1)
}

if (warnings > 0) {
  console.warn('\nWarnings found. Please review the output above.')
}

console.log('\nBuild validation passed.')
