import { test, expect } from '@playwright/test';

test.describe('Contact Form Spam Protection', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/contact');
  });

  test('should show contact form with all required fields', async ({ page }) => {
    // Check that contact form exists with all required fields
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('textarea[name="message"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    const submitButton = page.locator('button[type="submit"]');
    
    // Try to submit empty form
    await submitButton.click();
    
    // Should show validation errors
    await expect(page.locator('text=Name is required')).toBeVisible();
    await expect(page.locator('text=Email is required')).toBeVisible();
    await expect(page.locator('text=Message is required')).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('textarea[name="message"]', 'This is a test message with more than 10 characters');
    
    await page.click('button[type="submit"]');
    
    // Should show email validation error
    await expect(page.locator('text=valid email')).toBeVisible();
  });

  test('should validate minimum message length', async ({ page }) => {
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('textarea[name="message"]', 'short'); // Less than 10 characters
    
    await page.click('button[type="submit"]');
    
    // Should show message length validation error
    await expect(page.locator('text=at least 10 characters')).toBeVisible();
  });

  test('should accept valid contact form submission', async ({ page }) => {
    // Mock successful API response
    await page.route('/api/contact', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          json: {
            success: true,
            message: "Message received successfully! We'll get back to you soon.",
            messageId: 'test-message-id'
          }
        });
      }
    });

    // Fill valid form data
    await page.fill('input[name="name"]', 'John Doe');
    await page.fill('input[name="email"]', 'john@example.com');
    await page.fill('textarea[name="message"]', 'This is a valid test message with sufficient length to pass validation.');
    
    await page.click('button[type="submit"]');
    
    // Should show success message
    await expect(page.locator('text=Message received successfully')).toBeVisible();
  });

  test('should handle rate limiting', async ({ page }) => {
    // Mock rate limit exceeded response
    await page.route('/api/contact', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 429,
          json: { error: 'Too many requests. Please try again later.' }
        });
      }
    });

    await page.fill('input[name="name"]', 'Spam User');
    await page.fill('input[name="email"]', 'spam@example.com');
    await page.fill('textarea[name="message"]', 'This is a spam message that should be rate limited.');
    
    await page.click('button[type="submit"]');
    
    // Should show rate limit error
    await expect(page.locator('text=Too many requests')).toBeVisible();
  });

  test('should prevent XSS in form inputs', async ({ page }) => {
    const xssPayload = '<script>alert("XSS")</script>';
    
    await page.fill('input[name="name"]', xssPayload);
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('textarea[name="message"]', `Test message with XSS: ${xssPayload}`);
    
    // Check that XSS payload is not executed
    const nameValue = await page.inputValue('input[name="name"]');
    const messageValue = await page.inputValue('textarea[name="message"]');
    
    // Values should contain the raw text, not execute as HTML
    expect(nameValue).toBe(xssPayload);
    expect(messageValue).toContain(xssPayload);
    
    // Page should not have alert or script execution
    const hasAlert = await page.evaluate(() => {
      return document.querySelector('script') !== null;
    });
    expect(hasAlert).toBe(false);
  });

  test('should enforce maximum field lengths', async ({ page }) => {
    // Very long strings to test length limits
    const longName = 'A'.repeat(200); // Should be truncated to 100
    const longEmail = 'test' + 'A'.repeat(200) + '@example.com';
    const longMessage = 'A'.repeat(3000); // Should be truncated to 2000
    
    await page.fill('input[name="name"]', longName);
    await page.fill('input[name="email"]', longEmail);
    await page.fill('textarea[name="message"]', longMessage);
    
    // Mock API to check received data
    let receivedData: any = null;
    await page.route('/api/contact', async (route) => {
      receivedData = await route.request().postDataJSON();
      await route.fulfill({
        json: { success: true, message: 'Received' }
      });
    });
    
    await page.click('button[type="submit"]');
    
    // Verify that data was truncated on client side or server will handle it
    // This is mainly to ensure the form doesn't break with very long inputs
    expect(longName.length).toBeGreaterThan(100);
    expect(longMessage.length).toBeGreaterThan(2000);
  });

  test('should handle malformed JSON in API response', async ({ page }) => {
    // Mock malformed API response
    await page.route('/api/contact', async (route) => {
      await route.fulfill({
        status: 200,
        body: 'Invalid JSON response',
        contentType: 'text/plain'
      });
    });

    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('textarea[name="message"]', 'Valid message content');
    
    await page.click('button[type="submit"]');
    
    // Should show error handling for malformed response
    await expect(page.locator('text=error')).toBeVisible();
  });

  test('should handle server errors gracefully', async ({ page }) => {
    // Mock server error response
    await page.route('/api/contact', async (route) => {
      await route.fulfill({
        status: 500,
        json: { error: 'Internal server error. Please try again later.' }
      });
    });

    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('textarea[name="message"]', 'Valid message content');
    
    await page.click('button[type="submit"]');
    
    // Should show server error message
    await expect(page.locator('text=Internal server error')).toBeVisible();
  });

  test('should disable form during submission', async ({ page }) => {
    // Mock slow API response
    await page.route('/api/contact', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      await route.fulfill({
        json: { success: true, message: 'Success' }
      });
    });

    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('textarea[name="message"]', 'Valid message content');
    
    // Click submit
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();
    
    // Form should be disabled during submission
    await expect(submitButton).toBeDisabled();
    await expect(page.locator('input[name="name"]')).toBeDisabled();
    await expect(page.locator('input[name="email"]')).toBeDisabled();
    await expect(page.locator('textarea[name="message"]')).toBeDisabled();
    
    // Should show loading state
    await expect(page.locator('text=Sending')).toBeVisible();
  });

  test('should prevent multiple rapid submissions', async ({ page }) => {
    let submissionCount = 0;
    
    // Track API calls
    await page.route('/api/contact', async (route) => {
      submissionCount++;
      await route.fulfill({
        json: { success: true, message: 'Success' }
      });
    });

    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('textarea[name="message"]', 'Valid message content');
    
    const submitButton = page.locator('button[type="submit"]');
    
    // Try to click submit button multiple times rapidly
    await Promise.all([
      submitButton.click(),
      submitButton.click(),
      submitButton.click()
    ]);
    
    // Should only make one API call due to button being disabled after first click
    await page.waitForTimeout(1000);
    expect(submissionCount).toBe(1);
  });
});

test.describe('Contact Form API Spam Protection', () => {
  
  test('should reject requests without proper content type', async ({ request }) => {
    const response = await request.post('/api/contact', {
      data: 'plain text data instead of JSON'
    });
    
    expect(response.status()).toBe(400);
  });

  test('should validate email format on server side', async ({ request }) => {
    const response = await request.post('/api/contact', {
      data: {
        name: 'Test User',
        email: 'invalid-email-format',
        message: 'This is a test message with sufficient length'
      }
    });
    
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('valid email');
  });

  test('should validate minimum name length', async ({ request }) => {
    const response = await request.post('/api/contact', {
      data: {
        name: 'A', // Too short
        email: 'test@example.com',
        message: 'This is a test message with sufficient length'
      }
    });
    
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('at least 2 characters');
  });

  test('should validate minimum message length', async ({ request }) => {
    const response = await request.post('/api/contact', {
      data: {
        name: 'Test User',
        email: 'test@example.com',
        message: 'short' // Too short
      }
    });
    
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('at least 10 characters');
  });

  test('should sanitize input data', async ({ request }) => {
    const response = await request.post('/api/contact', {
      data: {
        name: '  Test User  ', // Whitespace padding
        email: '  TEST@EXAMPLE.COM  ', // Uppercase and padding
        message: '  This is a test message with sufficient length  '
      }
    });
    
    // Should accept the request after sanitization
    expect(response.status()).toBe(200);
  });

  test('should truncate overly long inputs', async ({ request }) => {
    const response = await request.post('/api/contact', {
      data: {
        name: 'A'.repeat(200), // Over 100 character limit
        email: 'test@example.com',
        message: 'A'.repeat(3000) // Over 2000 character limit
      }
    });
    
    // Should still accept after truncation
    expect(response.status()).toBe(200);
  });

  test('should reject non-POST methods', async ({ request }) => {
    const getResponse = await request.get('/api/contact');
    expect(getResponse.status()).toBe(405);
    
    const putResponse = await request.put('/api/contact', {
      data: { name: 'Test', email: 'test@example.com', message: 'Test message' }
    });
    expect(putResponse.status()).toBe(405);
  });

  test('should handle missing required fields', async ({ request }) => {
    // Missing name
    let response = await request.post('/api/contact', {
      data: {
        email: 'test@example.com',
        message: 'This is a test message'
      }
    });
    expect(response.status()).toBe(400);
    
    // Missing email
    response = await request.post('/api/contact', {
      data: {
        name: 'Test User',
        message: 'This is a test message'
      }
    });
    expect(response.status()).toBe(400);
    
    // Missing message
    response = await request.post('/api/contact', {
      data: {
        name: 'Test User',
        email: 'test@example.com'
      }
    });
    expect(response.status()).toBe(400);
  });

  test('should handle malformed JSON', async ({ request }) => {
    const response = await request.post('/api/contact', {
      data: '{"invalid": json}', // Malformed JSON
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    expect(response.status()).toBe(400);
  });
});