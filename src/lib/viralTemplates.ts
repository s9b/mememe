import { ImgflipTemplate, getAllTemplates as getImgflipTemplates } from './imgflip';
import { 
  CachedTemplate, 
  TemplateCache, 
  calculateTemplateScore,
  saveCachedTemplates,
  getCachedTemplates 
} from './templateCache';

// Enhanced Reddit API interface
interface RedditPost {
  data: {
    title: string;
    url: string;
    ups: number;
    created_utc: number;
    subreddit: string;
    author: string;
    num_comments: number;
    score: number;
    permalink: string;
  };
}

interface RedditResponse {
  data: {
    children: RedditPost[];
    after?: string;
  };
}

// Meme subreddits to fetch from (ordered by quality/popularity)
const MEME_SUBREDDITS = [
  'memes',           // 🔥 Main memes subreddit  
  'dankmemes',       // 🔥 High-quality memes
  'MemeEconomy',     // 📈 Trending meme formats
  'wholesomememes',  // ❤️ Wholesome content
  'PrequelMemes',    // 🎬 Star Wars prequel memes
  'HistoryMemes',    // 📚 History-themed memes
  'ProgrammerHumor', // 💻 Programming memes
  'AdviceAnimals',   // 🐻 Classic meme templates
  'reactiongifs',    // 😂 Reaction content
  'funny'            // 😄 General humor
];

// Template name patterns to match from Reddit titles
const TEMPLATE_PATTERNS = [
  // Drake pointing memes
  /drake.*(pointing|meme)/i,
  /drake.*template/i,
  
  // Distracted boyfriend
  /distracted.*boyfriend/i,
  /guy.*looking.*back/i,
  
  // Woman yelling at cat
  /(woman|lady).*yelling.*cat/i,
  /cat.*table.*meme/i,
  
  // This is fine dog
  /this.*is.*fine/i,
  /dog.*fire.*meme/i,
  
  // Expanding brain
  /expanding.*brain/i,
  /brain.*meme/i,
  
  // Two buttons
  /two.*buttons/i,
  /button.*meme/i,
  
  // Change my mind
  /change.*my.*mind/i,
  /crowder.*meme/i,
  
  // Common template keywords
  /template/i,
  /format/i,
  /meme.*template/i,
  /(new|fresh).*meme/i
];

// Fetch trending posts from a specific subreddit
const fetchSubredditPosts = async (
  subreddit: string, 
  timeframe: 'hour' | 'day' | 'week' = 'day',
  limit = 25
): Promise<RedditPost[]> => {
  try {
    const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=${limit}&t=${timeframe}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MemeMe/1.0 (Template Fetcher)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Reddit API error: ${response.status}`);
    }
    
    const data: RedditResponse = await response.json();
    return data.data.children || [];
  } catch (error) {
    console.error(`Error fetching from r/${subreddit}:`, error);
    return [];
  }
};

// Check if a Reddit post is likely about meme templates
const isTemplateRelated = (post: RedditPost): boolean => {
  const title = post.data.title.toLowerCase();
  const url = post.data.url.toLowerCase();
  
  // Check if title matches template patterns
  const titleMatch = TEMPLATE_PATTERNS.some(pattern => pattern.test(title));
  
  // Check if URL contains image formats
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  const isImgur = /imgur\.com/i.test(url);
  const isReddit = /i\.redd\.it/i.test(url);
  
  // High priority indicators
  if (titleMatch && (isImage || isImgur || isReddit)) return true;
  
  // Medium priority indicators
  if (titleMatch && post.data.ups > 100) return true;
  if (/template|format/i.test(title) && post.data.ups > 50) return true;
  
  return false;
};

// Extract template name from Reddit post
const extractTemplateName = (post: RedditPost): string => {
  const title = post.data.title;
  
  // Remove common Reddit prefixes/suffixes
  const cleaned = title
    .replace(/^(new |fresh |hot )/i, '')
    .replace(/(template|format|meme)$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  return cleaned.substring(0, 50); // Limit length
};

// Match Reddit posts to Imgflip templates
const matchRedditToImgflip = (
  redditPosts: RedditPost[],
  imgflipTemplates: ImgflipTemplate[]
): CachedTemplate[] => {
  const matchedTemplates: CachedTemplate[] = [];
  const usedTemplateIds = new Set<string>();
  
  for (const post of redditPosts) {
    if (!isTemplateRelated(post)) continue;
    
    const extractedName = extractTemplateName(post);
    
    // Try to find matching Imgflip template by name similarity
    const match = imgflipTemplates.find(template => {
      if (usedTemplateIds.has(template.id)) return false;
      
      const templateName = template.name.toLowerCase();
      const postTitle = post.data.title.toLowerCase();
      const extractedLower = extractedName.toLowerCase();
      
      // Direct name match
      if (templateName.includes(extractedLower) || extractedLower.includes(templateName)) {
        return true;
      }
      
      // Keyword matching
      const templateWords = templateName.split(/\s+/);
      const postWords = postTitle.split(/\s+/);
      
      const commonWords = templateWords.filter(word => 
        word.length > 3 && postWords.some(postWord => 
          postWord.includes(word) || word.includes(postWord)
        )
      );
      
      return commonWords.length >= 2;
    });
    
    if (match) {
      usedTemplateIds.add(match.id);
      
      const score = calculateTemplateScore(
        match,
        post.data.ups,
        post.data.created_utc
      );
      
      matchedTemplates.push({
        ...match,
        score,
        freshness: calculateTemplateScore(match, 0, post.data.created_utc),
        redditUpvotes: post.data.ups,
        redditCreated: post.data.created_utc,
        lastUpdated: Date.now(),
        source: 'both'
      });
    } else {
      // Create a synthetic template for highly upvoted Reddit posts
      if (post.data.ups > 500) {
        const syntheticId = `reddit_${post.data.subreddit}_${Date.now()}`;
        
        matchedTemplates.push({
          id: syntheticId,
          name: extractedName,
          url: post.data.url,
          width: 0, // Unknown dimensions
          height: 0,
          box_count: 2, // Assume 2 text boxes
          captions: 0,
          score: calculateTemplateScore({}, post.data.ups, post.data.created_utc),
          freshness: calculateTemplateScore({}, 0, post.data.created_utc),
          redditUpvotes: post.data.ups,
          redditCreated: post.data.created_utc,
          lastUpdated: Date.now(),
          source: 'reddit'
        });
      }
    }
  }
  
  return matchedTemplates;
};

// Add pure Imgflip templates (not matched with Reddit)
const addImgflipOnlyTemplates = (
  imgflipTemplates: ImgflipTemplate[],
  matchedTemplates: CachedTemplate[]
): CachedTemplate[] => {
  const usedIds = new Set(matchedTemplates.map(t => t.id));
  const imgflipOnlyTemplates: CachedTemplate[] = [];
  
  // Get popular Imgflip templates that weren't matched
  const unmatchedPopular = imgflipTemplates
    .filter(template => !usedIds.has(template.id))
    .sort((a, b) => (b.captions || 0) - (a.captions || 0))
    .slice(0, 50); // Top 50 unmatched popular templates
  
  for (const template of unmatchedPopular) {
    imgflipOnlyTemplates.push({
      ...template,
      score: calculateTemplateScore(template),
      freshness: 0.3, // Lower freshness for non-Reddit templates
      lastUpdated: Date.now(),
      source: 'imgflip'
    });
  }
  
  return imgflipOnlyTemplates;
};

// Fetch and merge all viral templates
export const fetchViralTemplates = async (): Promise<TemplateCache> => {
  console.log('🔥 Fetching viral templates from Reddit and Imgflip...');
  const startTime = Date.now();
  
  try {
    // Fetch data from both sources in parallel
    const [imgflipTemplates, ...subredditResults] = await Promise.all([
      getImgflipTemplates(),
      ...MEME_SUBREDDITS.map(sub => fetchSubredditPosts(sub, 'day', 15))
    ]);
    
    // Combine all Reddit posts
    const allRedditPosts = subredditResults.flat();
    console.log(`📊 Found ${allRedditPosts.length} Reddit posts from ${MEME_SUBREDDITS.length} subreddits`);
    
    // Match Reddit posts to Imgflip templates
    const matchedTemplates = matchRedditToImgflip(allRedditPosts, imgflipTemplates);
    console.log(`🎯 Matched ${matchedTemplates.length} templates with Reddit data`);
    
    // Add popular unmatched Imgflip templates
    const imgflipOnlyTemplates = addImgflipOnlyTemplates(imgflipTemplates, matchedTemplates);
    console.log(`📋 Added ${imgflipOnlyTemplates.length} Imgflip-only templates`);
    
    // Combine and sort all templates by score
    const allTemplates = [...matchedTemplates, ...imgflipOnlyTemplates]
      .sort((a, b) => b.score - a.score)
      .slice(0, 200); // Keep top 200 templates
    
    // Calculate source statistics
    const sources = {
      reddit: allTemplates.filter(t => t.source === 'reddit').length,
      imgflip: allTemplates.filter(t => t.source === 'imgflip').length,
      both: allTemplates.filter(t => t.source === 'both').length
    };
    
    const cache: TemplateCache = {
      templates: allTemplates,
      lastUpdated: Date.now(),
      totalTemplates: allTemplates.length,
      sources
    };
    
    const duration = Date.now() - startTime;
    console.log(`✅ Viral template fetch completed in ${duration}ms:`);
    console.log(`   - ${sources.both} templates with Reddit + Imgflip data`);
    console.log(`   - ${sources.reddit} Reddit-only templates`);
    console.log(`   - ${sources.imgflip} Imgflip-only templates`);
    console.log(`   - ${cache.totalTemplates} total templates cached`);
    
    return cache;
  } catch (error) {
    console.error('❌ Error fetching viral templates:', error);
    
    // Fallback: return basic Imgflip templates
    const imgflipTemplates = await getImgflipTemplates();
    const fallbackTemplates: CachedTemplate[] = imgflipTemplates
      .slice(0, 100)
      .map(template => ({
        ...template,
        score: calculateTemplateScore(template),
        freshness: 0.3,
        lastUpdated: Date.now(),
        source: 'imgflip' as const
      }));
    
    return {
      templates: fallbackTemplates,
      lastUpdated: Date.now(),
      totalTemplates: fallbackTemplates.length,
      sources: { reddit: 0, imgflip: fallbackTemplates.length, both: 0 }
    };
  }
};

// Get viral templates (from cache if available, otherwise fetch)
export const getViralTemplates = async (forceRefresh = false): Promise<CachedTemplate[]> => {
  if (!forceRefresh) {
    const cached = await getCachedTemplates();
    if (cached && cached.templates.length > 0) {
      console.log(`📦 Using cached viral templates: ${cached.templates.length} templates`);
      return cached.templates;
    }
  }
  
  console.log('🔄 Cache miss or force refresh, fetching fresh viral templates...');
  const freshCache = await fetchViralTemplates();
  await saveCachedTemplates(freshCache);
  
  return freshCache.templates;
};

// Refresh viral template cache
export const refreshViralTemplateCache = async (): Promise<{
  success: boolean;
  templates: number;
  duration: number;
  sources: { reddit: number; imgflip: number; both: number };
  error?: string;
}> => {
  const startTime = Date.now();
  
  try {
    console.log('🔄 Refreshing viral template cache...');
    const cache = await fetchViralTemplates();
    await saveCachedTemplates(cache);
    
    const duration = Date.now() - startTime;
    
    return {
      success: true,
      templates: cache.totalTemplates,
      duration,
      sources: cache.sources
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('❌ Failed to refresh viral template cache:', errorMessage);
    
    return {
      success: false,
      templates: 0,
      duration,
      sources: { reddit: 0, imgflip: 0, both: 0 },
      error: errorMessage
    };
  }
};