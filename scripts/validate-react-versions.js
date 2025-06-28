#!/usr/bin/env node

/**
 * CI-safe React version compatibility validator
 * Detects React/ReactDOM version mismatches that cause runtime errors
 * Runs before webpack build to catch issues early
 */

const fs = require('fs');
const path = require('path');

function validateReactVersions() {
  console.log('🔍 Validating React version compatibility...');
  
  try {
    // Read package.json
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    const reactVersion = packageJson.dependencies?.react;
    const reactDomVersion = packageJson.dependencies?.['react-dom'];
    
    if (!reactVersion || !reactDomVersion) {
      throw new Error('React or ReactDOM not found in dependencies');
    }
    
    console.log(`📦 React version: ${reactVersion}`);
    console.log(`📦 ReactDOM version: ${reactDomVersion}`);
    
    // Parse version numbers
    const getVersionNumber = (versionString) => {
      const match = versionString.match(/(\d+)\.(\d+)\.(\d+)/);
      if (!match) return null;
      return {
        major: parseInt(match[1]),
        minor: parseInt(match[2]),
        patch: parseInt(match[3])
      };
    };
    
    const reactVer = getVersionNumber(reactVersion);
    const reactDomVer = getVersionNumber(reactDomVersion);
    
    if (!reactVer || !reactDomVer) {
      throw new Error('Unable to parse React version numbers');
    }
    
    // Check for the specific problematic combination
    if (reactVer.major === 19 && reactDomVer.major === 17) {
      console.error('❌ CRITICAL: React 19 + ReactDOM 17 detected!');
      console.error('❌ This causes runtime error: "Cannot read properties of undefined (reading \'ReactCurrentDispatcher\')"');
      console.error('❌ React 19 internal APIs are incompatible with ReactDOM 17');
      console.error('');
      console.error('🔧 SOLUTION OPTIONS:');
      console.error('   1. Upgrade react-dom to 19.x.x (recommended)');
      console.error('   2. Downgrade react to 17.x.x');
      console.error('');
      console.error('🚨 BUILD FAILED: Fix React version compatibility before proceeding');
      process.exit(1);
    }
    
    // Check for major version mismatches
    if (reactVer.major !== reactDomVer.major) {
      console.warn(`⚠️  WARNING: React major version mismatch detected`);
      console.warn(`   React: v${reactVer.major}.x.x, ReactDOM: v${reactDomVer.major}.x.x`);
      console.warn(`   This may cause compatibility issues`);
    }
    
    // Check installed versions in node_modules
    try {
      const installedReactPath = path.join(__dirname, '..', 'node_modules', 'react', 'package.json');
      const installedReactDomPath = path.join(__dirname, '..', 'node_modules', 'react-dom', 'package.json');
      
      if (fs.existsSync(installedReactPath) && fs.existsSync(installedReactDomPath)) {
        const installedReact = JSON.parse(fs.readFileSync(installedReactPath, 'utf8'));
        const installedReactDom = JSON.parse(fs.readFileSync(installedReactDomPath, 'utf8'));
        
        console.log(`📦 Installed React: ${installedReact.version}`);
        console.log(`📦 Installed ReactDOM: ${installedReactDom.version}`);
        
        // Check the specific error case
        if (installedReact.version.startsWith('19.') && installedReactDom.version.startsWith('17.')) {
          console.error('❌ RUNTIME ERROR DETECTED IN INSTALLED PACKAGES!');
          console.error('❌ React 19 + ReactDOM 17 will cause ReactCurrentDispatcher error');
          console.error('❌ This is the exact error condition you reported');
          process.exit(1);
        }
      }
    } catch (nodeModulesError) {
      console.log('⚠️  Could not check installed versions in node_modules');
    }
    
    console.log('✅ React version compatibility check passed');
    
  } catch (error) {
    console.error(`❌ React version validation failed: ${error.message}`);
    process.exit(1);
  }
}

validateReactVersions();