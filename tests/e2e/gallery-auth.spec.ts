import { test, expect } from '@playwright/test';

test.describe('Gallery and Authentication Flow', () => {
  test('should show unauthenticated gallery page', async ({ page }) => {
    await page.goto('/gallery');
    
    // Should show authentication prompt
    await expect(page.locator('h1')).toContainText('Your Favorite Memes Gallery');
    await expect(page.locator('text=Sign in to view and manage your favorite memes')).toBeVisible();
    await expect(page.locator('button:has-text(\"Sign In to View Gallery\")')).toBeVisible();
  });

  test('should open auth modal from gallery', async ({ page }) => {
    await page.goto('/gallery');
    
    // Click sign in button
    await page.click('button:has-text(\"Sign In to View Gallery\")');
    
    // Should open auth modal (assuming it has a data-testid)
    await expect(page.locator('[role=\"dialog\"], [data-testid=\"auth-modal\"]')).toBeVisible();
  });

  test.describe('Gallery with Mock Authentication', () => {
    test.beforeEach(async ({ page }) => {
      // Mock authenticated user
      await page.addInitScript(() => {
        window.localStorage.setItem('mockUser', JSON.stringify({
          uid: 'test-user-id',
          email: 'test@example.com',
          displayName: 'Test User'
        }));
      });
    });

    test('should show empty gallery state', async ({ page }) => {
      // Mock empty favorites response
      await page.route('/api/favorites/list*', async (route) => {
        await route.fulfill({
          json: { success: true, favorites: [], total: 0 }
        });
      });

      await page.goto('/gallery');
      
      // Should show authenticated gallery page
      await expect(page.locator('h1')).toContainText('My Favorite Memes');
      
      // Should show empty state
      await expect(page.locator('text=No Favorites Yet')).toBeVisible();
      await expect(page.locator('text=Start generating memes and click the heart button')).toBeVisible();
      await expect(page.locator('a:has-text(\"Create Your First Meme\")')).toBeVisible();
    });

    test('should display favorite memes in gallery', async ({ page }) => {
      // Mock favorites response
      await page.route('/api/favorites/list*', async (route) => {
        await route.fulfill({
          json: {
            success: true,
            favorites: [
              {
                id: 'fav1',
                memeUrl: 'https://via.placeholder.com/400x400?text=Meme+1',
                prompt: 'cats',
                caption: 'When cats rule the internet',
                templateName: 'Drake Pointing',
                createdAt: new Date().toISOString()
              },
              {
                id: 'fav2', 
                memeUrl: 'https://via.placeholder.com/400x400?text=Meme+2',
                prompt: 'dogs',
                caption: 'Dogs are the best friends',
                templateName: 'Distracted Boyfriend',
                createdAt: new Date().toISOString()
              }
            ],
            total: 2
          }
        });
      });

      await page.goto('/gallery');
      
      // Should show gallery with favorites
      await expect(page.locator('text=2 favorites saved')).toBeVisible();
      
      // Should show meme cards
      await expect(page.locator('img[alt*=\"When cats rule\"]')).toBeVisible();
      await expect(page.locator('img[alt*=\"Dogs are the best\"]')).toBeVisible();
      
      // Should show captions and metadata
      await expect(page.locator('text=When cats rule the internet')).toBeVisible();
      await expect(page.locator('text=Topic: cats')).toBeVisible();
      await expect(page.locator('text=Template: Drake Pointing')).toBeVisible();
      
      // Should show action buttons
      await expect(page.locator('button:has-text(\"Favorited\")')).toHaveCount(2);
      await expect(page.locator('button:has-text(\"Download\")')).toHaveCount(2);
      await expect(page.locator('button:has-text(\"Reddit\")')).toHaveCount(2);
    });

    test('should handle favorite removal from gallery', async ({ page }) => {
      // Mock initial favorites
      await page.route('/api/favorites/list*', async (route) => {
        await route.fulfill({
          json: {
            success: true,
            favorites: [{
              id: 'fav1',
              memeUrl: 'https://via.placeholder.com/400x400?text=Test+Meme',
              prompt: 'test',
              caption: 'Test meme caption',
              templateName: 'Test Template',
              createdAt: new Date().toISOString()
            }],
            total: 1
          }
        });
      });

      // Mock remove favorite API
      await page.route('/api/favorites/remove', async (route) => {
        await route.fulfill({
          json: { success: true, message: 'Removed from favorites' }
        });
      });

      await page.goto('/gallery');
      
      // Should show favorite
      await expect(page.locator('img[alt*=\"Test meme caption\"]')).toBeVisible();
      
      // Click remove favorite
      const favoriteButton = page.locator('button:has-text(\"Favorited\")').first();
      await favoriteButton.click();
      
      // Should show removal confirmation
      await expect(page.locator('text=Removed from favorites')).toBeVisible();
      
      // Meme should be removed from DOM (in real app)
      // This would require state management to work properly
    });

    test('should handle pagination in gallery', async ({ page }) => {
      // Mock initial page
      await page.route('/api/favorites/list?limit=12&offset=0', async (route) => {
        const favorites = Array.from({ length: 12 }, (_, i) => ({
          id: `fav${i + 1}`,
          memeUrl: `https://via.placeholder.com/400x400?text=Meme+${i + 1}`,
          prompt: `topic${i + 1}`,
          caption: `Test caption ${i + 1}`,
          templateName: 'Test Template',
          createdAt: new Date().toISOString()
        }));
        
        await route.fulfill({
          json: { success: true, favorites, total: 25 }
        });
      });

      // Mock second page
      await page.route('/api/favorites/list?limit=12&offset=12', async (route) => {
        const favorites = Array.from({ length: 12 }, (_, i) => ({
          id: `fav${i + 13}`,
          memeUrl: `https://via.placeholder.com/400x400?text=Meme+${i + 13}`,
          prompt: `topic${i + 13}`,
          caption: `Test caption ${i + 13}`,
          templateName: 'Test Template',
          createdAt: new Date().toISOString()
        }));
        
        await route.fulfill({
          json: { success: true, favorites, total: 25 }
        });
      });

      await page.goto('/gallery');
      
      // Should show first page
      await expect(page.locator('text=25 favorites saved')).toBeVisible();
      await expect(page.locator('img[alt*=\"Test caption 1\"]')).toBeVisible();
      await expect(page.locator('img[alt*=\"Test caption 12\"]')).toBeVisible();
      
      // Should show load more button
      await expect(page.locator('button:has-text(\"Load More Favorites\")')).toBeVisible();
      
      // Click load more
      await page.click('button:has-text(\"Load More Favorites\")');
      
      // Should show second page items
      await expect(page.locator('img[alt*=\"Test caption 13\"]')).toBeVisible();
    });

    test('should handle meme download from gallery', async ({ page }) => {
      // Mock favorites
      await page.route('/api/favorites/list*', async (route) => {
        await route.fulfill({
          json: {
            success: true,
            favorites: [{
              id: 'fav1',
              memeUrl: 'https://via.placeholder.com/400x400?text=Download+Test',
              prompt: 'download test',
              caption: 'Test download meme',
              templateName: 'Test Template',
              createdAt: new Date().toISOString()
            }],
            total: 1
          }
        });
      });

      await page.goto('/gallery');
      
      // Mock download response
      await page.route('https://via.placeholder.com/400x400?text=Download+Test', async (route) => {
        const buffer = Buffer.from('fake image data');
        await route.fulfill({
          contentType: 'image/jpeg',
          body: buffer
        });
      });

      // Set up download handling
      const downloadPromise = page.waitForEvent('download');
      
      // Click download button
      await page.click('button:has-text(\"Download\")');
      
      // Should trigger download
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/meme-.*\.jpg/);
    });

    test('should navigate between gallery and home', async ({ page }) => {
      await page.route('/api/favorites/list*', async (route) => {
        await route.fulfill({
          json: { success: true, favorites: [], total: 0 }
        });
      });

      await page.goto('/gallery');
      
      // Should show gallery
      await expect(page.locator('h1')).toContainText('My Favorite Memes');
      
      // Click "Generate More Memes" button
      await page.click('a:has-text(\"Generate More Memes\")');
      
      // Should navigate to home
      await expect(page.locator('h1')).toContainText('MemeMe Generator');
      
      // Navigate back to gallery via nav
      await page.click('a:has-text(\"My Gallery\")');
      
      // Should be back in gallery
      await expect(page.locator('h1')).toContainText('My Favorite Memes');
    });
  });

  test.describe('Social Sharing from Gallery', () => {
    test.beforeEach(async ({ page }) => {
      // Mock authenticated user and favorites
      await page.addInitScript(() => {
        window.localStorage.setItem('mockUser', JSON.stringify({
          uid: 'test-user-id',
          email: 'test@example.com'
        }));
      });

      await page.route('/api/favorites/list*', async (route) => {
        await route.fulfill({
          json: {
            success: true,
            favorites: [{
              id: 'fav1',
              memeUrl: 'https://example.com/meme.jpg',
              prompt: 'sharing test',
              caption: 'Test sharing meme',
              templateName: 'Test Template',
              createdAt: new Date().toISOString()
            }],
            total: 1
          }
        });
      });
    });

    test('should handle Reddit sharing', async ({ page }) => {
      await page.goto('/gallery');
      
      // Mock window.open
      await page.addInitScript(() => {
        window.open = () => null;
      });

      // Click Reddit share
      await page.click('button:has-text(\"Reddit\")');
      
      // Should show success toast
      await expect(page.locator('text=Opening Reddit share')).toBeVisible();
    });

    test('should handle Twitter sharing', async ({ page }) => {
      await page.goto('/gallery');
      
      // Mock window.open
      await page.addInitScript(() => {
        window.open = () => null;
      });

      // Click Twitter share
      await page.click('button:has-text(\"Twitter\")');
      
      // Should show success toast
      await expect(page.locator('text=Opening Twitter share')).toBeVisible();
    });

    test('should handle copy link', async ({ page }) => {
      await page.goto('/gallery');
      
      // Mock clipboard API
      await page.addInitScript(() => {
        Object.assign(navigator, {
          clipboard: {
            writeText: () => Promise.resolve()
          }
        });
      });

      // Click copy button
      await page.click('button:has-text(\"Copy\")');
      
      // Should show success toast
      await expect(page.locator('text=Meme link copied to clipboard')).toBeVisible();
    });
  });
});