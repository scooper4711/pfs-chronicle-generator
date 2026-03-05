#!/usr/bin/env node

/**
 * Check code duplication and fail if it exceeds acceptable thresholds
 * 
 * Thresholds (based on coding standards):
 * - 0-5%: Excellent
 * - 5-10%: Acceptable
 * - 10-20%: Needs attention (warning)
 * - >20%: Requires immediate refactoring (error)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const THRESHOLDS = {
  excellent: 5,
  acceptable: 10,
  warning: 20
};

try {
  // Run jscpd
  console.log('Running code duplication analysis...\n');
  execSync('npx jscpd scripts/', { stdio: 'inherit' });
  
  // Read the JSON report
  const reportPath = path.join(__dirname, '../debug/jscpd-report/jscpd-report.json');
  
  if (!fs.existsSync(reportPath)) {
    console.error('Error: jscpd report not found');
    process.exit(1);
  }
  
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const statistics = report.statistics?.total;
  
  if (!statistics) {
    console.error('Error: Could not read statistics from report');
    process.exit(1);
  }
  
  const duplicationPercentage = statistics.percentage || 0;
  const duplicatedLines = statistics.duplicatedLines || 0;
  const totalLines = statistics.lines || 0;
  
  console.log('\n' + '='.repeat(60));
  console.log('CODE DUPLICATION REPORT');
  console.log('='.repeat(60));
  console.log(`Total Lines:       ${totalLines}`);
  console.log(`Duplicated Lines:  ${duplicatedLines}`);
  console.log(`Duplication:       ${duplicationPercentage.toFixed(2)}%`);
  console.log('='.repeat(60));
  
  // Determine status
  let status = 'EXCELLENT';
  let exitCode = 0;
  
  if (duplicationPercentage > THRESHOLDS.warning) {
    status = 'FAILED';
    exitCode = 1;
    console.log(`\n❌ FAILED: Duplication (${duplicationPercentage.toFixed(2)}%) exceeds ${THRESHOLDS.warning}%`);
    console.log('   Immediate refactoring required!');
  } else if (duplicationPercentage > THRESHOLDS.acceptable) {
    status = 'WARNING';
    console.log(`\n⚠️  WARNING: Duplication (${duplicationPercentage.toFixed(2)}%) exceeds ${THRESHOLDS.acceptable}%`);
    console.log('   Consider refactoring to reduce duplication.');
  } else if (duplicationPercentage > THRESHOLDS.excellent) {
    status = 'ACCEPTABLE';
    console.log(`\n✓ ACCEPTABLE: Duplication (${duplicationPercentage.toFixed(2)}%) is within acceptable range.`);
  } else {
    status = 'EXCELLENT';
    console.log(`\n✓ EXCELLENT: Duplication (${duplicationPercentage.toFixed(2)}%) is minimal.`);
  }
  
  console.log('\nThresholds:');
  console.log(`  0-${THRESHOLDS.excellent}%:   Excellent`);
  console.log(`  ${THRESHOLDS.excellent}-${THRESHOLDS.acceptable}%:  Acceptable`);
  console.log(`  ${THRESHOLDS.acceptable}-${THRESHOLDS.warning}%: Needs attention (warning)`);
  console.log(`  >${THRESHOLDS.warning}%:  Requires refactoring (error)`);
  console.log('='.repeat(60) + '\n');
  
  process.exit(exitCode);
  
} catch (error) {
  console.error('Error running duplication check:', error.message);
  process.exit(1);
}
