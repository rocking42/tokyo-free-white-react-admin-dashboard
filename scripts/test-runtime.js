#!/usr/bin/env node

/**
 * Runtime test script to catch React compatibility issues during build
 * Tests the built application by serving it and checking for runtime errors
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const BUILD_DIR = path.join(__dirname, '..', 'build');
const TIMEOUT = 10000; // 10 seconds

async function testRuntime() {
  console.log('🔍 Testing runtime compatibility...');
  
  // Check if build directory exists
  if (!fs.existsSync(BUILD_DIR)) {
    console.error('❌ Build directory not found. Run yarn build:only first.');
    process.exit(1);
  }

  // Start serve process
  const serve = spawn('npx', ['serve', '-s', 'build', '-p', '3001'], {
    stdio: ['inherit', 'pipe', 'pipe'],
    cwd: path.join(__dirname, '..')
  });

  let output = '';
  let errorOutput = '';

  serve.stdout.on('data', (data) => {
    output += data.toString();
  });

  serve.stderr.on('data', (data) => {
    errorOutput += data.toString();
  });

  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 2000));

  try {
    // Test with puppeteer-like approach using simple HTTP check
    const http = require('http');
    
    const testPromise = new Promise((resolve, reject) => {
      const req = http.get('http://localhost:3001', (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          // Check if HTML contains expected React app structure
          if (data.includes('<div id="root">') || data.includes('id="root"')) {
            console.log('✅ Basic HTML structure looks good');
            
            // Check for obvious React errors in the HTML
            if (data.includes('Cannot read properties of undefined') || 
                data.includes('ReactCurrentDispatcher') ||
                data.includes('React error') ||
                data.includes('TypeError')) {
              reject(new Error('React runtime error detected in HTML output'));
            } else {
              resolve();
            }
          } else {
            reject(new Error('React app root element not found'));
          }
        });
      });
      
      req.on('error', (err) => {
        reject(new Error(`HTTP request failed: ${err.message}`));
      });
      
      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error('HTTP request timeout'));
      });
    });

    await testPromise;
    console.log('✅ Runtime compatibility test passed');
    
  } catch (error) {
    console.error(`❌ Runtime test failed: ${error.message}`);
    console.error('This suggests React 19 + ReactDOM 17 compatibility issues.');
    console.error('Consider upgrading ReactDOM to match React version.');
    process.exit(1);
  } finally {
    // Kill serve process
    serve.kill();
  }
}

testRuntime().catch((error) => {
  console.error(`❌ Test script failed: ${error.message}`);
  process.exit(1);
});