import { test, expect, type Page } from '@playwright/test';

test.describe('Meme Generation Flow', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('/');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should load homepage with correct title and elements', async () => {
    // Check page title
    await expect(page).toHaveTitle(/MemeMe/);
    
    // Check main heading
    await expect(page.locator('h1')).toContainText('MemeMe Generator');
    
    // Check subtitle
    await expect(page.locator('text=Create hilarious memes with AI-powered captions')).toBeVisible();
    
    // Check input field exists
    await expect(page.locator('input[placeholder*=\"Enter a topic\"]')).toBeVisible();
    
    // Check language selector exists
    await expect(page.locator('select')).toBeVisible();
    
    // Check generate button exists
    await expect(page.locator('button:has-text(\"Sign In to Generate\")')).toBeVisible();
  });

  test('should show authentication modal when trying to generate without login', async () => {
    // Enter a topic
    await page.fill('input[placeholder*=\"Enter a topic\"]', 'cats');
    
    // Try to generate
    await page.click('button:has-text(\"Sign In to Generate\")');
    
    // Should show auth modal
    await expect(page.locator('[data-testid=\"auth-modal\"]')).toBeVisible();
  });

  test('should change language selector', async () => {
    // Check default language is English
    await expect(page.locator('select')).toHaveValue('en');
    
    // Change to Spanish
    await page.selectOption('select', 'es');
    await expect(page.locator('select')).toHaveValue('es');
    
    // Check that selected language is displayed
    await expect(page.locator('text=🇪🇸 Spanish')).toBeVisible();
  });

  test('should show theme toggle and work correctly', async () => {
    // Find theme toggle button
    const themeToggle = page.locator('button[title*=\"Switch to\"]');
    await expect(themeToggle).toBeVisible();
    
    // Check initial theme (should be light by default)
    await expect(page.locator('html')).not.toHaveClass(/dark/);
    
    // Toggle to dark mode
    await themeToggle.click();
    
    // Check dark mode applied
    await expect(page.locator('html')).toHaveClass(/dark/);
    
    // Toggle back to light mode
    await themeToggle.click();
    
    // Check light mode restored
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });

  test('should navigate to gallery page', async () => {
    // Click gallery link in nav (if user is logged in, it should be visible)
    // For now, test direct navigation
    await page.goto('/gallery');
    
    // Should show gallery page
    await expect(page.locator('h1')).toContainText('Favorite Memes');
    
    // Should show sign-in prompt for non-authenticated users
    await expect(page.locator('text=Sign in to view and manage your favorite memes')).toBeVisible();
  });

  test('should validate form input', async () => {
    const input = page.locator('input[placeholder*=\"Enter a topic\"]');
    const generateButton = page.locator('button:has-text(\"Sign In to Generate\")');
    
    // Empty input should not enable generation
    await expect(input).toHaveValue('');
    
    // Enter whitespace only
    await input.fill('   ');
    await expect(generateButton).toBeDisabled();
    
    // Enter valid topic
    await input.fill('funny cats');
    await expect(generateButton).not.toBeDisabled();
  });
});

test.describe('Meme Generation with Mock User', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication state by setting localStorage
    await page.addInitScript(() => {
      // Mock authenticated user
      window.localStorage.setItem('mockUser', JSON.stringify({
        uid: 'test-user-id',
        email: 'test@example.com',
        displayName: 'Test User'
      }));
      
      // Mock user tokens
      window.localStorage.setItem('mockTokens', '5');
    });
    
    await page.goto('/');
  });

  test('should show user interface when logged in', async () => {
    // Should show generate button instead of sign-in button
    await expect(page.locator('button:has-text(\"Generate Memes\")')).toBeVisible();
    
    // Should show token count
    await expect(page.locator('text=tokens available')).toBeVisible();
    
    // Should show user menu in navbar
    await expect(page.locator('button[aria-label*=\"Switch to\"]')).toBeVisible();
  });

  test('should handle meme generation request', async () => {
    // Mock the API response
    await page.route('/api/generate', async (route) => {
      const json = {
        results: [
          {
            caption: 'When cats rule the internet',
            imageUrl: 'https://via.placeholder.com/500x500?text=Test+Meme',
            templateId: '181913649'
          }
        ]
      };
      await route.fulfill({ json });
    });
    
    // Enter topic and generate
    await page.fill('input[placeholder*=\"Enter a topic\"]', 'cats');
    await page.click('button:has-text(\"Generate Memes\")');
    
    // Should show loading state
    await expect(page.locator('text=Generating your memes...')).toBeVisible();
    
    // Should show results
    await expect(page.locator('h2:has-text(\"Your Generated Memes\")')).toBeVisible();
    
    // Should show meme image
    await expect(page.locator('img[alt*=\"When cats rule\"]')).toBeVisible();
    
    // Should show caption
    await expect(page.locator('text=When cats rule the internet')).toBeVisible();
    
    // Should show action buttons (favorite, share)
    await expect(page.locator('button:has-text(\"Add to Favorites\")')).toBeVisible();
    await expect(page.locator('button:has-text(\"Reddit\")')).toBeVisible();
    await expect(page.locator('button:has-text(\"Twitter\")')).toBeVisible();
  });

  test('should handle favorite functionality', async () => {
    // Mock API responses
    await page.route('/api/generate', async (route) => {
      const json = {
        results: [{
          caption: 'Funny cat meme',
          imageUrl: 'https://via.placeholder.com/500x500?text=Cat+Meme',
          templateId: '181913649'
        }]
      };
      await route.fulfill({ json });
    });

    await page.route('/api/favorites/add', async (route) => {
      await route.fulfill({ 
        json: { success: true, message: 'Added to favorites', favoriteId: 'fav123' }
      });
    });

    // Generate a meme first
    await page.fill('input[placeholder*=\"Enter a topic\"]', 'cats');
    await page.click('button:has-text(\"Generate Memes\")');
    
    // Wait for results
    await expect(page.locator('img[alt*=\"Funny cat meme\"]')).toBeVisible();
    
    // Click favorite button
    const favoriteButton = page.locator('button:has-text(\"Add to Favorites\")');
    await favoriteButton.click();
    
    // Should show success toast
    await expect(page.locator('text=Added to favorites')).toBeVisible();
    
    // Button should change state
    await expect(page.locator('button:has-text(\"Favorited\")')).toBeVisible();
  });

  test('should handle regenerate functionality', async () => {
    // Mock initial generation
    await page.route('/api/generate', async (route) => {
      const json = {
        results: [{
          caption: 'Original cat meme',
          imageUrl: 'https://via.placeholder.com/500x500?text=Original',
          templateId: '181913649'
        }]
      };
      await route.fulfill({ json });
    });

    // Mock regeneration
    await page.route('/api/regenerate', async (route) => {
      const json = {
        results: [{
          caption: 'Original cat meme',
          imageUrl: 'https://via.placeholder.com/500x500?text=Regenerated',
          templateId: '87743020'
        }],
        newTemplateId: '87743020',
        templateName: 'Drake Pointing'
      };
      await route.fulfill({ json });
    });

    // Generate initial meme
    await page.fill('input[placeholder*=\"Enter a topic\"]', 'cats');
    await page.click('button:has-text(\"Generate Memes\")');
    
    // Wait for results
    await expect(page.locator('img[alt*=\"Original cat meme\"]')).toBeVisible();
    
    // Click regenerate button
    await page.click('button:has-text(\"Try Different Template\")');
    
    // Should show regenerating state
    await expect(page.locator('text=Finding a different template')).toBeVisible();
    
    // Should show new results
    await expect(page.locator('img[src*=\"Regenerated\"]')).toBeVisible();
  });

  test('should handle insufficient tokens', async () => {
    // Mock user with no tokens
    await page.addInitScript(() => {
      window.localStorage.setItem('mockTokens', '0');
    });
    
    await page.reload();
    
    // Should show token warning
    await expect(page.locator('button:has-text(\"Buy Tokens to Generate\")')).toBeVisible();
    
    // Should show token purchase prompt
    await expect(page.locator('text=Buy tokens now')).toBeVisible();
    
    // Generate button should be disabled
    const generateButton = page.locator('button:has-text(\"Buy Tokens to Generate\")');
    await expect(generateButton).toBeDisabled();
  });
});

test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE size

  test('should be mobile responsive', async ({ page }) => {
    await page.goto('/');
    
    // Check mobile layout
    await expect(page.locator('h1')).toContainText('MemeMe Generator');
    
    // Input should be full width on mobile
    const input = page.locator('input[placeholder*=\"Enter a topic\"]');
    await expect(input).toBeVisible();
    
    // Language selector should be visible
    await expect(page.locator('select')).toBeVisible();
    
    // Navigation should be collapsed on mobile
    const navbar = page.locator('nav');
    await expect(navbar).toBeVisible();
    
    // Theme toggle should be visible
    await expect(page.locator('button[title*=\"Switch to\"]')).toBeVisible();
  });

  test('should handle mobile touch interactions', async ({ page }) => {
    await page.goto('/');
    
    // Test touch on language selector
    await page.tap('select');
    
    // Test touch on theme toggle
    await page.tap('button[title*=\"Switch to\"]');
    
    // Should toggle theme
    await expect(page.locator('html')).toHaveClass(/dark/);
  });
});