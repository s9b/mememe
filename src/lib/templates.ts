/**
 * Template selection and management system
 * Automatically selects the best meme template based on topic and trending data
 */

import cache from './cache';
import { generateCaptionsWithGemini } from './gemini';

export interface MemeTemplate {
  id: string;
  name: string;
  url: string;
  width: number;
  height: number;
  box_count: number;
  captions?: number;
}

interface ImgflipMemeResponse {
  success: boolean;
  data: {
    memes: MemeTemplate[];
  };
  error_message?: string;
}

interface RedditPost {
  data: {
    title: string;
    url: string;
    thumbnail: string;
    score: number;
    num_comments: number;
    created_utc: number;
    is_video: boolean;
  };
}

interface RedditResponse {
  data: {
    children: RedditPost[];
  };
}

// Popular meme templates with their common use cases and keywords
const TEMPLATE_KEYWORDS = {
  '181913649': ['approve', 'disapprove', 'no', 'yes', 'choice', 'prefer', 'like', 'dislike', 'drake'],
  '87743020': ['wait', 'actually', 'realize', 'think', 'brain', 'mind', 'smart', 'dumb'],
  '93895088': ['expanding', 'evolution', 'upgrade', 'progress', 'better', 'improvement'],
  '188390779': ['woman', 'yelling', 'cat', 'dinner', 'argument', 'confused', 'angry'],
  '178591752': ['tuxedo', 'fancy', 'classy', 'sophisticated', 'gentleman', 'elegant'],
  '131087935': ['running', 'away', 'escape', 'flee', 'avoid', 'scared', 'panic'],
  '4087833': ['waiting', 'skeleton', 'still', 'forever', 'long', 'time', 'patience'],
  '61579': ['wonka', 'tell', 'me', 'more', 'sarcastic', 'condescending'],
  '101470': ['ancient', 'aliens', 'conspiracy', 'theory', 'explanation', 'because'],
  '135256802': ['epic', 'handshake', 'agreement', 'alliance', 'partnership', 'unity'],
  '114585149': ['inhaling', 'seagull', 'deep', 'breath', 'preparing', 'about'],
  '91538330': ['x', 'doubt', 'suspicious', 'question', 'unsure', 'skeptical'],
  '80707627': ['sad', 'pablo', 'escobar', 'waiting', 'alone', 'melancholy'],
  '1035805': ['boardroom', 'meeting', 'suggestion', 'idea', 'thrown', 'out', 'window'],
  '27813981': ['hide', 'pain', 'harold', 'awkward', 'uncomfortable', 'forced', 'smile'],
  '8072285': ['doge', 'wow', 'such', 'very', 'much', 'shiba'],
  '61520': ['futurama', 'fry', 'not', 'sure', 'if', 'uncertain'],
  '61532': ['most', 'interesting', 'man', 'world', 'i', 'dont', 'always'],
  '563423': ['success', 'kid', 'yes', 'winning', 'achievement', 'celebration'],
  '21735': ['the', 'rock', 'driving', 'eyebrow', 'raise', 'suspicious']
};

// Fallback templates for different categories
const CATEGORY_TEMPLATES = {
  reaction: ['181913649', '87743020', '27813981', '61520'],
  comparison: ['181913649', '93895088', '135256802'],
  frustration: ['188390779', '80707627', '4087833'],
  success: ['563423', '178591752', '93895088'],
  confusion: ['87743020', '61520', '91538330'],
  waiting: ['4087833', '80707627', '114585149'],
  animals: ['8072285', '188390779'],
  default: ['181913649', '61579', '101470', '87743020']
};

/**
 * Fetch popular meme template names from Reddit r/memes
 * Extracts template names from popular meme titles
 * @returns Promise resolving to array of popular template names
 */
export async function getPopularRedditTemplates(): Promise<string[]> {
  try {
    // Check cache first
    const cached = await cache.get('reddit_templates');
    if (cached) {
      console.log('Cache hit for Reddit templates');
      return JSON.parse(cached);
    }

    console.log('Fetching popular templates from Reddit...');
    
    const response = await fetch('https://www.reddit.com/r/memes/top.json?limit=50&t=week', {
      headers: {
        'User-Agent': 'MemeMe-Generator/1.0 (Educational Project)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Reddit API error: ${response.status}`);
    }

    const data: RedditResponse = await response.json();
    
    // Extract template names from titles
    const templateNames: string[] = [];
    const templateKeywords = [
      'drake', 'expanding brain', 'distracted boyfriend', 'woman yelling at cat',
      'change my mind', 'two buttons', 'this is fine', 'surprised pikachu',
      'stonks', 'leonardo dicaprio', 'hide the pain harold', 'ancient aliens',
      'one does not simply', 'most interesting man', 'success kid', 'bad luck brian',
      'disaster girl', 'overly attached girlfriend', 'scumbag steve', 'good guy greg',
      'first world problems', 'third world success', 'confession bear', 'advice animals',
      'grumpy cat', 'doge', 'pepe', 'wojak', 'chad', 'virgin', 'big brain',
      'galaxy brain', 'spongebob', 'patrick', 'squidward', 'mr krabs', 'plankton',
      'tom and jerry', 'bugs bunny', 'daffy duck', 'tweety', 'sylvester',
      'looney tunes', 'cartoon', 'anime', 'manga', 'simpson', 'homer', 'bart',
      'lisa', 'marge', 'maggie', 'ned flanders', 'moe', 'barney'
    ];
    
    data.data.children.forEach(post => {
      const title = post.data.title.toLowerCase();
      
      // Look for template keywords in titles
      templateKeywords.forEach(keyword => {
        if (title.includes(keyword) && !templateNames.includes(keyword)) {
          templateNames.push(keyword);
        }
      });
      
      // Extract "[Template Name] meme" patterns
      const templateMatch = title.match(/\[(.*?)\]/g);
      if (templateMatch) {
        templateMatch.forEach(match => {
          const clean = match.replace(/[\[\]]/g, '').toLowerCase().trim();
          if (clean.length > 2 && clean.length < 50 && !templateNames.includes(clean)) {
            templateNames.push(clean);
          }
        });
      }
    });
    
    // Cache for 30 minutes (Reddit content changes frequently)
    await cache.set('reddit_templates', JSON.stringify(templateNames), 1800);
    
    console.log(`Extracted ${templateNames.length} template names from Reddit`);
    return templateNames;
    
  } catch (error) {
    console.error('Error fetching Reddit templates:', error);
    // Return popular fallback template names
    return [
      'drake', 'expanding brain', 'woman yelling at cat', 'distracted boyfriend',
      'change my mind', 'two buttons', 'this is fine', 'surprised pikachu'
    ];
  }
}

/**
 * Get combined trending templates from both Imgflip and Reddit
 * Deduplicates and prioritizes based on popularity
 * @returns Promise resolving to array of trending meme templates
 */
export async function getCombinedTrendingTemplates(): Promise<MemeTemplate[]> {
  try {
    // Check cache first
    const cached = await cache.get('combined_templates');
    if (cached) {
      console.log('Cache hit for combined trending templates');
      return JSON.parse(cached);
    }

    console.log('Fetching and combining templates from multiple sources...');
    
    // Fetch from both sources simultaneously
    const [imgflipTemplates, redditTemplateNames] = await Promise.all([
      getTrendingTemplatesFromImgflip(),
      getPopularRedditTemplates()
    ]);
    
    // Create a map for deduplication and scoring
    const templateMap = new Map<string, MemeTemplate & { score: number }>();
    
    // Add Imgflip templates with base scores
    imgflipTemplates.forEach((template, index) => {
      const score = Math.max(100 - index, 1); // Higher score for top templates
      templateMap.set(template.id, { ...template, score });
    });
    
    // Boost scores for templates mentioned on Reddit
    redditTemplateNames.forEach(redditName => {
      // Find matching Imgflip templates by name similarity
      for (const [id, template] of templateMap.entries()) {
        const templateName = template.name.toLowerCase();
        
        if (
          templateName.includes(redditName) ||
          redditName.includes(templateName.split(' ')[0]) ||
          templateName.includes(redditName.split(' ')[0])
        ) {
          template.score += 50; // Boost score for Reddit popularity
          console.log(`Boosted ${template.name} (${id}) score due to Reddit popularity`);
        }
      }
    });
    
    // Sort by score and return top templates
    const combinedTemplates = Array.from(templateMap.values())
      .sort((a, b) => b.score - a.score)
      .map(({ score, ...template }) => template); // Remove score from final result
    
    // Cache for 45 minutes (compromise between freshness and API limits)
    await cache.set('combined_templates', JSON.stringify(combinedTemplates), 2700);
    
    console.log(`Combined ${combinedTemplates.length} templates from Imgflip and Reddit`);
    return combinedTemplates;
    
  } catch (error) {
    console.error('Error getting combined templates:', error);
    // Fallback to Imgflip only
    return getTrendingTemplatesFromImgflip();
  }
}

/**
 * Fetch trending meme templates from Imgflip API only
 * @returns Promise resolving to array of meme templates
 */
export async function getTrendingTemplatesFromImgflip(): Promise<MemeTemplate[]> {
  return getTrendingTemplates();
}

/**
 * Fetch trending meme templates from Imgflip API
 * @returns Promise resolving to array of meme templates
 */
export async function getTrendingTemplates(): Promise<MemeTemplate[]> {
  try {
    // Check cache first
    const cached = await cache.get('trending_templates');
    if (cached) {
      console.log('Cache hit for trending templates');
      return JSON.parse(cached);
    }

    console.log('Fetching trending templates from Imgflip...');
    
    const response = await fetch('https://api.imgflip.com/get_memes');
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data: ImgflipMemeResponse = await response.json();
    
    if (!data.success) {
      throw new Error(data.error_message || 'Failed to fetch memes from Imgflip');
    }

    const templates = data.data.memes;
    
    // Cache for 1 hour (templates don't change frequently)
    await cache.set('trending_templates', JSON.stringify(templates), 3600);
    
    console.log(`Fetched ${templates.length} trending templates`);
    return templates;
    
  } catch (error) {
    console.error('Error fetching trending templates:', error);
    
    // Return fallback templates if API fails
    return getFallbackTemplates();
  }
}

/**
 * Get fallback templates when API is unavailable
 */
function getFallbackTemplates(): MemeTemplate[] {
  return [
    { id: '181913649', name: 'Drake Hotline Bling', url: '', width: 1200, height: 1200, box_count: 2 },
    { id: '87743020', name: 'Expanding Brain', url: '', width: 857, height: 1202, box_count: 4 },
    { id: '93895088', name: 'Expanding Brain', url: '', width: 857, height: 1202, box_count: 4 },
    { id: '188390779', name: 'Woman Yelling At Cat', url: '', width: 680, height: 438, box_count: 2 },
    { id: '61579', name: 'One Does Not Simply', url: '', width: 568, height: 335, box_count: 2 }
  ];
}

/**
 * Shuffle an array using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Select a random template from trending list
 * @param availableTemplates - Array of available templates
 * @param excludeIds - Template IDs to exclude from selection
 * @returns Random template ID
 */
export function selectRandomTemplate(availableTemplates: MemeTemplate[], excludeIds: string[] = []): string {
  const eligibleTemplates = availableTemplates.filter(t => !excludeIds.includes(t.id));
  
  if (eligibleTemplates.length === 0) {
    return availableTemplates[0]?.id || '181913649';
  }
  
  // Shuffle and pick from top 20 for better variety while maintaining quality
  const topTemplates = eligibleTemplates.slice(0, Math.min(20, eligibleTemplates.length));
  const shuffled = shuffleArray(topTemplates);
  
  const selected = shuffled[0];
  console.log(`Randomly selected template ${selected.id} (${selected.name}) from ${topTemplates.length} options`);
  
  return selected.id;
}

/**
 * Select the best template based on topic keywords
 * @param topic - The meme topic
 * @param availableTemplates - Array of available templates
 * @returns Best matching template ID
 */
export function selectBestTemplate(topic: string, availableTemplates: MemeTemplate[]): string {
  const topicLower = topic.toLowerCase();
  const topicWords = topicLower.split(/\s+/);
  
  // Score each template based on keyword matches
  let bestTemplate = '181913649'; // Default to Drake
  let bestScore = 0;
  
  // Check each template for keyword matches
  for (const [templateId, keywords] of Object.entries(TEMPLATE_KEYWORDS)) {
    // Verify template exists in available templates
    const templateExists = availableTemplates.some(t => t.id === templateId);
    if (!templateExists) continue;
    
    let score = 0;
    
    // Score based on exact keyword matches
    keywords.forEach(keyword => {
      if (topicWords.includes(keyword)) {
        score += 10; // Exact word match
      } else if (topicLower.includes(keyword)) {
        score += 5; // Partial match
      }
    });
    
    // Bonus for template name matches
    const template = availableTemplates.find(t => t.id === templateId);
    if (template && template.name.toLowerCase().includes(topicLower)) {
      score += 15;
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestTemplate = templateId;
    }
  }
  
  // If no good match found, use category-based selection
  if (bestScore === 0) {
    bestTemplate = selectByCategory(topicLower, availableTemplates);
  }
  
  console.log(`Selected template ${bestTemplate} for topic "${topic}" with score ${bestScore}`);
  return bestTemplate;
}

/**
 * Use Gemini AI to select the best template based on topic and available templates
 * @param topic - The meme topic
 * @param availableTemplates - Array of available templates
 * @param fallbackTemplateId - Fallback template ID if AI selection fails
 * @returns AI-selected template ID
 */
export async function selectTemplateWithAI(
  topic: string, 
  availableTemplates: MemeTemplate[], 
  fallbackTemplateId?: string
): Promise<string> {
  try {
    // Get top 10 templates for AI to choose from (reduce complexity)
    const topTemplates = availableTemplates.slice(0, 10);
    
    const templateList = topTemplates
      .map((t, i) => `${i + 1}. ${t.name} (ID: ${t.id})`)
      .join('\n');
    
    const prompt = `Given these popular meme templates and the topic "${topic}", which template would be the BEST fit?

Available templates:
${templateList}

Topic: "${topic}"

Consider:
- Which template format works best with this topic
- What kind of humor or message this topic suggests
- Popular meme formats and their typical use cases

Respond with ONLY the template ID (like "181913649"). No explanation, just the ID.`;
    
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('Gemini API key not found, using fallback template selection');
      return fallbackTemplateId || selectBestTemplate(topic, availableTemplates);
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.3, // Lower temperature for more consistent choices
          maxOutputTokens: 20,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response from Gemini');
    }

    const aiChoice = data.candidates[0].content.parts[0].text.trim();
    
    // Validate AI choice
    const selectedTemplate = availableTemplates.find(t => t.id === aiChoice);
    
    if (selectedTemplate) {
      console.log(`🤖 AI selected template: ${selectedTemplate.name} (${aiChoice}) for topic "${topic}"`);
      return aiChoice;
    } else {
      console.warn(`AI returned invalid template ID: ${aiChoice}, using fallback`);
      return fallbackTemplateId || selectBestTemplate(topic, availableTemplates);
    }
    
  } catch (error) {
    console.error('Error in AI template selection:', error);
    return fallbackTemplateId || selectBestTemplate(topic, availableTemplates);
  }
}

/**
 * Smart template selection that combines AI and randomization
 * @param topic - The meme topic
 * @param availableTemplates - Array of available templates
 * @param useAI - Whether to use AI selection (default: true)
 * @param excludeIds - Template IDs to exclude from selection
 * @returns Selected template ID
 */
export async function selectSmartTemplate(
  topic: string,
  availableTemplates: MemeTemplate[],
  useAI: boolean = true,
  excludeIds: string[] = []
): Promise<string> {
  const eligibleTemplates = availableTemplates.filter(t => !excludeIds.includes(t.id));
  
  if (eligibleTemplates.length === 0) {
    return '181913649'; // Ultimate fallback
  }
  
  if (useAI && process.env.GOOGLE_GEMINI_API_KEY) {
    // Try AI selection first
    const randomFallback = selectRandomTemplate(eligibleTemplates);
    return selectTemplateWithAI(topic, eligibleTemplates, randomFallback);
  } else {
    // Fallback to keyword-based selection with random element
    const keywordMatch = selectBestTemplate(topic, eligibleTemplates);
    
    // 70% chance to use keyword match, 30% chance to use random
    if (Math.random() < 0.7) {
      return keywordMatch;
    } else {
      return selectRandomTemplate(eligibleTemplates, [keywordMatch]);
    }
  }
}

/**
 * Select template based on topic category
 */
function selectByCategory(topic: string, availableTemplates: MemeTemplate[]): string {
  // Define category keywords
  const categories = {
    reaction: ['feel', 'when', 'me', 'my', 'reaction', 'face'],
    comparison: ['vs', 'versus', 'better', 'worse', 'compare', 'than'],
    frustration: ['angry', 'mad', 'annoying', 'hate', 'frustrated', 'why'],
    success: ['win', 'success', 'achieve', 'great', 'awesome', 'perfect'],
    confusion: ['what', 'how', 'why', 'confused', 'understand', 'explain'],
    waiting: ['wait', 'still', 'taking', 'forever', 'long', 'slow'],
    animals: ['cat', 'dog', 'animal', 'pet', 'bird', 'fish']
  };
  
  // Score each category
  let bestCategory = 'default';
  let bestCategoryScore = 0;
  
  for (const [category, keywords] of Object.entries(categories)) {
    let score = 0;
    keywords.forEach(keyword => {
      if (topic.includes(keyword)) {
        score += 1;
      }
    });
    
    if (score > bestCategoryScore) {
      bestCategoryScore = score;
      bestCategory = category;
    }
  }
  
  // Select random template from category
  const categoryTemplates = CATEGORY_TEMPLATES[bestCategory as keyof typeof CATEGORY_TEMPLATES] || CATEGORY_TEMPLATES.default;
  
  // Find available template from category
  for (const templateId of categoryTemplates) {
    const templateExists = availableTemplates.some(t => t.id === templateId);
    if (templateExists) {
      console.log(`Selected template ${templateId} from category "${bestCategory}"`);
      return templateId;
    }
  }
  
  // Final fallback
  return '181913649';
}

/**
 * Get template information by ID
 */
export async function getTemplateInfo(templateId: string): Promise<MemeTemplate | null> {
  try {
    const templates = await getTrendingTemplates();
    return templates.find(t => t.id === templateId) || null;
  } catch (error) {
    console.error('Error getting template info:', error);
    return null;
  }
}

/**
 * Get multiple template suggestions for a topic
 */
export async function getTemplateSuggestions(topic: string, count: number = 3): Promise<MemeTemplate[]> {
  try {
    const allTemplates = await getTrendingTemplates();
    const suggestions: MemeTemplate[] = [];
    
    // Get the best template
    const bestTemplateId = selectBestTemplate(topic, allTemplates);
    const bestTemplate = allTemplates.find(t => t.id === bestTemplateId);
    if (bestTemplate) {
      suggestions.push(bestTemplate);
    }
    
    // Add more suggestions based on different criteria
    const topicLower = topic.toLowerCase();
    
    // Add templates with similar keywords
    const scoredTemplates = allTemplates
      .filter(t => t.id !== bestTemplateId)
      .map(template => {
        let score = 0;
        
        // Score by name similarity
        if (template.name.toLowerCase().includes(topicLower)) {
          score += 10;
        }
        
        // Score by box count (prefer 2-box templates for most topics)
        if (template.box_count === 2) {
          score += 3;
        } else if (template.box_count <= 4) {
          score += 1;
        }
        
        return { template, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, count - 1)
      .map(item => item.template);
    
    suggestions.push(...scoredTemplates);
    
    // Fill remaining slots with popular templates
    while (suggestions.length < count && suggestions.length < allTemplates.length) {
      const popularTemplate = allTemplates.find(t => 
        !suggestions.some(s => s.id === t.id)
      );
      if (popularTemplate) {
        suggestions.push(popularTemplate);
      } else {
        break;
      }
    }
    
    return suggestions.slice(0, count);
    
  } catch (error) {
    console.error('Error getting template suggestions:', error);
    return getFallbackTemplates().slice(0, count);
  }
}

export default {
  getTrendingTemplates,
  getCombinedTrendingTemplates,
  getPopularRedditTemplates,
  selectBestTemplate,
  selectRandomTemplate,
  selectTemplateWithAI,
  selectSmartTemplate,
  getTemplateInfo,
  getTemplateSuggestions
};
