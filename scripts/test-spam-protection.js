/**
 * Contact Form Spam Protection Test Script
 * Tests various spam detection scenarios
 * 
 * Usage: node scripts/test-spam-protection.js
 */

const fetch = require('node-fetch');

class SpamProtectionTester {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      error: '\x1b[31m',
      warning: '\x1b[33m'
    };
    const reset = '\x1b[0m';
    
    console.log(`${colors[type]}[${timestamp}] ${message}${reset}`);
  }

  async testContactFormSubmission(testData, expectedStatus = 200, expectedResult = 'success') {
    try {
      const response = await fetch(`${this.baseUrl}/api/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testData)
      });

      const responseData = await response.json();
      
      if (response.status === expectedStatus) {
        if (expectedResult === 'success' && responseData.success) {
          return { success: true, data: responseData };
        } else if (expectedResult === 'error' && responseData.error) {
          return { success: true, data: responseData };
        } else if (expectedResult === 'spam' && responseData.error && responseData.error.includes('spam')) {
          return { success: true, data: responseData };
        }
      }
      
      return { 
        success: false, 
        data: responseData, 
        actualStatus: response.status,
        expectedStatus
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async runTest(testName, testData, expectedStatus, expectedResult) {
    this.log(`Testing: ${testName}`, 'info');
    
    const result = await this.testContactFormSubmission(testData, expectedStatus, expectedResult);
    
    if (result.success) {
      this.log(`✅ ${testName}: PASSED`, 'success');
      this.results.passed++;
      this.results.tests.push({
        name: testName,
        status: 'PASSED',
        details: result.data?.message || result.data?.error || 'Success'
      });
    } else {
      this.log(`❌ ${testName}: FAILED`, 'error');
      this.log(`   Expected status: ${expectedStatus}, Got: ${result.actualStatus}`, 'error');
      this.log(`   Response: ${JSON.stringify(result.data)}`, 'error');
      this.results.failed++;
      this.results.tests.push({
        name: testName,
        status: 'FAILED',
        details: result.error || `Status: ${result.actualStatus}, Data: ${JSON.stringify(result.data)}`
      });
    }
  }

  async runAllTests() {
    this.log('🛡️  Starting Contact Form Spam Protection Tests', 'info');
    this.log('================================================', 'info');

    // Test 1: Valid submission (should pass)
    await this.runTest(
      'Valid Contact Form Submission',
      {
        name: 'John Doe',
        email: 'john@example.com',
        message: 'This is a legitimate message asking about your services and how I can get started.'
      },
      200,
      'success'
    );

    // Test 2: Spam keywords (should be blocked)
    await this.runTest(
      'Spam Keywords Detection',
      {
        name: 'Spammer',
        email: 'spam@example.com',
        message: 'Get viagra and cialis cheap! Casino poker loans available now! Buy now with limited time offer!'
      },
      400,
      'spam'
    );

    // Test 3: SEO spam (should be blocked)
    await this.runTest(
      'SEO Spam Detection',
      {
        name: 'SEO Expert',
        email: 'seo@example.com',
        message: 'I can provide backlinks and link building services to improve your website traffic and SEO rankings!'
      },
      400,
      'spam'
    );

    // Test 4: Excessive links (should be blocked)
    await this.runTest(
      'Excessive Links Detection',
      {
        name: 'Link Spammer',
        email: 'links@example.com',
        message: 'Check out these sites: https://example1.com https://example2.com https://example3.com https://example4.com'
      },
      400,
      'spam'
    );

    // Test 5: Suspicious email domain (should be blocked)
    await this.runTest(
      'Suspicious Email Domain',
      {
        name: 'Temp User',
        email: 'test@10minutemail.com',
        message: 'This is a test message from a temporary email service.'
      },
      400,
      'spam'
    );

    // Test 6: Excessive capitalization (should be blocked)
    await this.runTest(
      'Excessive Caps Detection',
      {
        name: 'CAPS USER',
        email: 'caps@example.com',
        message: 'THIS IS A MESSAGE WITH TOO MANY CAPITAL LETTERS WHICH LOOKS LIKE SPAM!'
      },
      400,
      'spam'
    );

    // Test 7: Bot indicators (should be blocked)
    await this.runTest(
      'Bot Indicators Detection',
      {
        name: 'Bot Crawler',
        email: 'bot@example.com',
        message: 'This is a message from a bot crawler spider that scrapes websites.'
      },
      400,
      'spam'
    );

    // Test 8: Repeated characters (should be blocked)
    await this.runTest(
      'Repeated Characters Detection',
      {
        name: 'User',
        email: 'user@example.com',
        message: 'Heeeeeelllllllooooooo this message has toooooo many repeated characters!'
      },
      400,
      'spam'
    );

    // Test 9: Input validation - short name (should be blocked)
    await this.runTest(
      'Short Name Validation',
      {
        name: 'A',
        email: 'valid@example.com',
        message: 'This is a valid message but the name is too short.'
      },
      400,
      'error'
    );

    // Test 10: Input validation - invalid email (should be blocked)
    await this.runTest(
      'Invalid Email Validation',
      {
        name: 'Valid User',
        email: 'invalid-email-format',
        message: 'This is a valid message but the email is invalid.'
      },
      400,
      'error'
    );

    // Test 11: Input validation - short message (should be blocked)
    await this.runTest(
      'Short Message Validation',
      {
        name: 'Valid User',
        email: 'valid@example.com',
        message: 'Short'
      },
      400,
      'error'
    );

    // Test 12: Rate limiting simulation (test multiple rapid requests)
    await this.testRateLimit();

    // Test 13: XSS attempt (should be sanitized)
    await this.runTest(
      'XSS Prevention Test',
      {
        name: 'Test User',
        email: 'test@example.com',
        message: 'This is a message with <script>alert("XSS")</script> attempt.'
      },
      200,
      'success'
    );

    // Test 14: SQL injection attempt (should be handled safely)
    await this.runTest(
      'SQL Injection Prevention',
      {
        name: 'Test User',
        email: 'test@example.com',
        message: "This message contains '; DROP TABLE users; -- SQL injection attempt."
      },
      200,
      'success'
    );

    // Test 15: Very long inputs (should be truncated)
    await this.runTest(
      'Long Input Truncation',
      {
        name: 'A'.repeat(200),
        email: 'test@example.com',
        message: 'This is a very long message. ' + 'A'.repeat(2000)
      },
      200,
      'success'
    );

    this.printResults();
  }

  async testRateLimit() {
    this.log('Testing Rate Limiting...', 'info');
    
    const requests = [];
    for (let i = 0; i < 5; i++) {
      requests.push(
        this.testContactFormSubmission({
          name: `Rate Test User ${i}`,
          email: `ratetest${i}@example.com`,
          message: `Rate limiting test message ${i} with sufficient length.`
        })
      );
    }

    try {
      const results = await Promise.all(requests);
      const rateLimitedCount = results.filter(r => !r.success && r.actualStatus === 429).length;
      
      if (rateLimitedCount > 0) {
        this.log(`✅ Rate Limiting: PASSED (${rateLimitedCount} requests blocked)`, 'success');
        this.results.passed++;
        this.results.tests.push({
          name: 'Rate Limiting',
          status: 'PASSED',
          details: `${rateLimitedCount} out of 5 rapid requests were rate limited`
        });
      } else {
        this.log(`❌ Rate Limiting: FAILED (No requests were rate limited)`, 'error');
        this.results.failed++;
        this.results.tests.push({
          name: 'Rate Limiting',
          status: 'FAILED',
          details: 'All rapid requests were allowed through'
        });
      }
    } catch (error) {
      this.log(`❌ Rate Limiting: ERROR (${error.message})`, 'error');
      this.results.failed++;
    }
  }

  printResults() {
    this.log('\n📊 SPAM PROTECTION TEST RESULTS', 'info');
    this.log('================================', 'info');
    
    this.results.tests.forEach(test => {
      const icon = test.status === 'PASSED' ? '✅' : '❌';
      this.log(`${icon} ${test.name}: ${test.status}`, test.status === 'PASSED' ? 'success' : 'error');
      if (test.details) {
        this.log(`   Details: ${test.details}`, 'info');
      }
    });

    this.log(`\n📈 Summary: ${this.results.passed} passed, ${this.results.failed} failed`, 'info');
    
    const successRate = (this.results.passed / (this.results.passed + this.results.failed)) * 100;
    
    if (this.results.failed === 0) {
      this.log('🎉 All spam protection tests passed!', 'success');
    } else if (successRate >= 80) {
      this.log(`⚠️  Most tests passed (${successRate.toFixed(1)}% success rate)`, 'warning');
    } else {
      this.log(`🚨 Many tests failed (${successRate.toFixed(1)}% success rate) - review spam protection!`, 'error');
    }

    this.log('\n📋 Recommendations:', 'info');
    this.log('- Review failed tests and strengthen spam detection', 'info');
    this.log('- Monitor contact form submissions for new spam patterns', 'info');
    this.log('- Consider implementing CAPTCHA for additional protection', 'info');
    this.log('- Set up alerts for high spam detection rates', 'info');
  }
}

// Main execution
async function main() {
  const baseUrl = process.argv[2] || 'http://localhost:3000';
  const tester = new SpamProtectionTester(baseUrl);
  
  console.log(`Testing spam protection on: ${baseUrl}`);
  console.log('Make sure your development server is running!\n');
  
  try {
    await tester.runAllTests();
  } catch (error) {
    console.error('Test execution failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = SpamProtectionTester;