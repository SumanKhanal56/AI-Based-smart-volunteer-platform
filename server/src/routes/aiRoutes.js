// This file handles chatbot, onboarding, and AI summary requests.
import express from 'express';
import { answerQuestion, generateOnboarding, summarizeDescription } from '../utils/ai.js';
import { allow, optionalProtect, protect } from '../middleware/auth.js';
import Application from '../models/Application.js';
import Opportunity from '../models/Opportunity.js';
import User from '../models/User.js';
import { NEPAL_DISTRICTS } from '../utils/nepalLocations.js';

const router = express.Router();

const CATEGORY_ALIASES = {
  Environment: ['environment', 'environmental', 'climate', 'cleanup', 'clean-up', 'river', 'tree', 'waste'],
  Education: ['education', 'teaching', 'teach', 'school', 'literacy', 'mentor', 'mentoring'],
  Health: ['health', 'medical', 'wellbeing', 'blood', 'clinic'],
  'Disaster Response': ['disaster', 'flood', 'earthquake', 'landslide', 'relief', 'emergency'],
  Fundraising: ['fundraising', 'fundraiser', 'donation', 'campaign'],
  'Social Work': ['social work', 'societal', 'senior', 'elderly', 'inclusion'],
  Community: ['community', 'neighbourhood', 'neighborhood', 'local'],
  'Animal Welfare': ['animal', 'wildlife', 'dog', 'cat', 'shelter']
};

const MAX_CHAT_SUGGESTIONS = 6;

// Map common cities to their district and province.
const PLACE_ALIASES = [
  { name: 'Birgunj', aliases: ['birgunj'], district: 'Parsa', province: 'Madhesh' },
  { name: 'Kathmandu', aliases: ['kathmandu'], district: 'Kathmandu', province: 'Bagmati' },
  { name: 'Pokhara', aliases: ['pokhara'], district: 'Kaski', province: 'Gandaki' },
  { name: 'Biratnagar', aliases: ['biratnagar'], district: 'Morang', province: 'Koshi' },
  { name: 'Butwal', aliases: ['butwal'], district: 'Rupandehi', province: 'Lumbini' },
  { name: 'Hetauda', aliases: ['hetauda'], district: 'Makwanpur', province: 'Bagmati' },
  { name: 'Janakpurdham', aliases: ['janakpurdham', 'janakpur'], district: 'Dhanusha', province: 'Madhesh' },
  { name: 'Dhangadhi', aliases: ['dhangadhi'], district: 'Kailali', province: 'Sudurpashchim' },
  { name: 'Nepalgunj', aliases: ['nepalgunj'], district: 'Banke', province: 'Lumbini' },
  { name: 'Birendranagar', aliases: ['birendranagar', 'surkhet'], district: 'Surkhet', province: 'Karnali' },
  { name: 'Bhimdatta', aliases: ['bhimdatta', 'mahendranagar'], district: 'Kanchanpur', province: 'Sudurpashchim' },
  { name: 'Bharatpur', aliases: ['bharatpur'], district: 'Chitwan', province: 'Bagmati' },
  { name: 'Lalitpur', aliases: ['lalitpur', 'patan'], district: 'Lalitpur', province: 'Bagmati' },
  { name: 'Bhaktapur', aliases: ['bhaktapur'], district: 'Bhaktapur', province: 'Bagmati' }
];

const stopWords = new Set([
  'about', 'also', 'available', 'can', 'could', 'current', 'find', 'for', 'from', 'have', 'help',
  'hello', 'hi', 'into', 'like', 'looking', 'near', 'opportunities', 'opportunity', 'please', 'province', 'show',
  'some', 'that', 'the', 'their', 'there', 'this', 'volunteer', 'volunteering', 'want', 'weekend',
  'volunteers', 'weekends', 'with', 'work', 'would', 'your', 'you', 'what', 'where', 'which', 'when',
  'how', 'are', 'is', 'any', 'suggest', 'suggestion'
]);

// Find a known Nepal city mentioned in the user's message.
function mentionedPlace(text) {
  const normalized = text.toLowerCase();
  return PLACE_ALIASES.find((place) => place.aliases.some((alias) => normalized.includes(alias))) || null;
}

// Keep only the latest safe messages for follow-up questions.
function cleanHistory(rawHistory) {
  return Array.isArray(rawHistory)
    ? rawHistory
      .filter((message) => ['user', 'assistant'].includes(message?.role) && typeof message.content === 'string')
      .slice(-6)
      .map((message) => ({ role: message.role, content: message.content.trim().slice(0, 1000) }))
      .filter((message) => message.content)
    : [];
}

// Convert similar words such as cleanup into a platform category.
function mentionedCategory(text) {
  const normalized = text.toLowerCase();
  return Object.entries(CATEGORY_ALIASES)
    .find(([, aliases]) => aliases.some((alias) => normalized.includes(alias)))?.[0] || '';
}

// Decide whether the user needs database results, general advice, or both.
function detectIntent(question, history) {
  // Lowercase text makes word matching work even when users type capital letters.
  const normalized = question.toLowerCase();
  const trimmed = question.trim();
  const historyText = history.map((message) => message.content).join(' ').toLowerCase();
  // Read location and category words before deciding which database query is needed.
  const place = mentionedPlace(normalized);
  const province = Object.keys(NEPAL_DISTRICTS).find((item) => normalized.includes(item.toLowerCase())) || place?.province;
  const district = Object.values(NEPAL_DISTRICTS).flat().find((item) => normalized.includes(item.toLowerCase())) || place?.district;
  const category = mentionedCategory(normalized);
  const greeting = /^(hi|hello|hey|namaste|good\s+(morning|afternoon|evening))(?:\s+(there|assistant|chatbot|volunteer\s+guide))?[!.?]*$/i.test(trimmed);
  const platformOverview = /^(what can you do(?: for me)?|how can you help me|(?:show|explain|tell me about) (?:the )?platform features?|what is volunteer nepal|how does (?:this|the) platform work)[!.?]*$/i.test(trimmed);
  const followUp = /^(what|how|when|where|which|and|also|more|those|that|it|there)\b|\b(what about|tell me more|another one|more details?)\b/i.test(question);
  const priorOpportunityContext = /opportunit|role|position|activities|opportunities shown/.test(historyText);

  // These Boolean values describe the different types of questions we support.
  const personalApplications = /\b(my|our)\s+applications?\b|\bapplication status\b|\bwas i accepted\b|\bpending application\b/i.test(question);
  const organisationLookup = /\b(organisation|organization|ngo|partner)s?\b/i.test(question)
    && /\b(find|show|list|which|registered|verified|near|in|about|available)\b/i.test(question);
  const explicitOpportunityLookup = /\b(find|show|list|recommend|suggest|available|open|nearby|opportunit(?:y|ies)|roles?|positions?|activities|events?|deadline|eligibility|eligible|requirements?|slots?|places?)\b/i.test(question);
  const profileRecommendation = /\b(recommend|suggest|match|best|suitable)\b.*\b(me|my|profile)\b|\b(for me|based on my profile|my recommendations?)\b/i.test(question);
  const skillLookup = /\b(it support|information technology|computer|digital literacy|web design|photography|first aid|teaching|communication|fundraising)\b/i.test(question)
    && /\b(volunteer|volunteering|want|looking|find|help|work|role|opportunity)\b/i.test(question);
  const locationMention = Boolean(province || district || place);
  const locationHelp = locationMention && /\b(help|volunteer|volunteering|work|serve|join|do|support)\b/i.test(question);
  const categoryDetails = Boolean(category) && /\b(details?|information|tell|about|help|join)\b/i.test(question);
  const availabilityLookup = /\b(weekends?|saturdays?|sundays?|remote|online|free time|after work)\b/i.test(question)
    && /\b(volunteer|volunteering|opportunit(?:y|ies)|roles?|work|help|find|recommend|suggest)\b/i.test(question);
  const opportunityLookup = explicitOpportunityLookup || profileRecommendation || skillLookup || locationHelp || locationMention || categoryDetails || availabilityLookup || (followUp && priorOpportunityContext);

  const generalGuidance = /\b(benefits?|prepare|preparing|tips?|choose|choosing|suitable|importance|meaning|skills?|community service|why volunteer|how to volunteer|good volunteer|first time|safety|weekends?|schedule|remote)\b/i.test(question)
    || (/\bhow can i help\b/i.test(question) && Boolean(category));

  // Database mode is used only when live platform facts are required.
  const needsDatabase = opportunityLookup || organisationLookup || personalApplications || greeting || platformOverview;
  return {
    mode: greeting || platformOverview
      ? 'platform'
      : needsDatabase && generalGuidance ? 'mixed' : needsDatabase ? 'database' : 'general',
    greeting,
    platformOverview,
    opportunityLookup,
    profileRecommendation,
    organisationLookup,
    personalApplications,
    category,
    province: province || '',
    district: district || '',
    place,
    followUp
  };
}

// Remove common words and keep useful search words.
function wordTokens(text, excludedLocations = []) {
  const locations = new Set(excludedLocations.filter(Boolean).map((item) => item.toLowerCase()));
  return [...new Set(
    (text.toLowerCase().match(/[a-z]+/g) || [])
      .filter((word) => (word.length > 2 || word === 'it') && !stopWords.has(word) && !locations.has(word))
  )];
}

// Give each opportunity a score and return the best matching records.
function opportunitySuggestions(question, history, opportunities, acceptedCounts, intent, userProfile = null) {
  // A follow-up such as "tell me more" also uses the recent conversation.
  const recentContext = intent.followUp
    ? history.slice(-4).map((message) => message.content).join(' ') + ' ' + question
    : question;
  const normalized = recentContext.toLowerCase();
  const place = intent.place || mentionedPlace(normalized);
  const province = intent.province || Object.keys(NEPAL_DISTRICTS).find((item) => normalized.includes(item.toLowerCase())) || '';
  const district = intent.district || Object.values(NEPAL_DISTRICTS).flat().find((item) => normalized.includes(item.toLowerCase())) || '';
  const category = intent.category || mentionedCategory(normalized);
  const tokens = wordTokens(normalized, [province, district, ...(place?.aliases || [])]);
  const wantsRemote = /\b(remote|home|online)\b/i.test(normalized);
  const wantsWeekend = /\bweekends?\b|\bsaturdays?\b|\bsundays?\b/i.test(normalized);
  const wantsIT = /\b(it support|information technology|computer|digital literacy|technology support|tech support)\b/i.test(normalized);
  // Profile details are used only for a logged-in volunteer asking for personal matches.
  const useProfile = Boolean(intent.profileRecommendation && userProfile?.role === 'volunteer');
  const userInterests = new Set((userProfile?.interests || []).map((item) => String(item).toLowerCase()));
  const userSkills = new Set((userProfile?.skills || []).map((item) => String(item).toLowerCase()));

  // Build searchable text for each record, then add points for every match.
  const ranked = opportunities.map((item) => {
    const searchable = [
      item.title, item.description, item.summary, item.category, item.location, item.district,
      item.province, item.commitment, ...(item.requiredSkills || []), ...(item.interests || [])
    ].join(' ').toLowerCase();
    let score = 0;
    const reasons = [];
    const skillWords = new Set((item.requiredSkills || []).map((skill) => String(skill).toLowerCase()));
    const itRelated = skillWords.has('it') || /\b(computer|digital|technology|tech)\b/i.test(searchable);
    const placeMatch = Boolean(place?.aliases.some((alias) => searchable.includes(alias)));
    if (wantsIT && itRelated) {
      score += 60;
      reasons.push('Matches IT skills');
    }

    if (useProfile) {
      // Interest, skill, and location matches make an opportunity rank higher.
      const interestMatches = [...new Set([item.category, ...(item.interests || [])].map((value) => String(value).toLowerCase()))]
        .filter((value) => userInterests.has(value));
      const skillMatches = (item.requiredSkills || []).filter((value) => userSkills.has(String(value).toLowerCase()));
      if (interestMatches.length) {
        score += Math.min(35, interestMatches.length * 15);
        reasons.push('Matches your interests');
      }
      if (skillMatches.length) {
        score += Math.min(30, skillMatches.length * 15);
        reasons.push('Uses ' + skillMatches.slice(0, 2).join(' and '));
      }
      if (item.remote) {
        score += 12;
        reasons.push('Remote-friendly');
      } else if (userProfile.district && item.district === userProfile.district) {
        score += 18;
        reasons.push('In your district');
      } else if (userProfile.province && item.province === userProfile.province) {
        score += 10;
        reasons.push('In your province');
      }
    }

    if (placeMatch) {
      score += 55;
      reasons.push('Located in ' + place.name);
    } else if (district && item.district === district) {
      score += 45;
      reasons.push('Located in ' + district);
    } else if (province && item.province === province) {
      score += 32;
      reasons.push('Located in ' + province + ' Province');
    }
    if (category && item.category === category) {
      score += 50;
      reasons.push('Matches ' + category.toLowerCase());
    }
    if (wantsRemote && item.remote) {
      score += 25;
      reasons.push('Can be done remotely');
    }
    if (wantsWeekend && /weekend|saturday|sunday/.test(searchable)) {
      score += 18;
      reasons.push('Fits a weekend schedule');
    }

    const searchableWords = new Set(searchable.match(/[a-z]+/g) || []);
    const matchedTokens = tokens.filter((token) => token !== 'it' && searchable.includes(token));
    if (matchedTokens.length) {
      score += Math.min(36, matchedTokens.length * 12);
      reasons.push('Matches ' + matchedTokens.slice(0, 2).join(' and '));
    }

    // Keep the score and reasons beside the original MongoDB record.
    return { item, score, reasons, itRelated, placeMatch };
  }).sort((a, b) => b.score - a.score || new Date(a.item.date) - new Date(b.item.date));

  // Remove records that do not meet the user's exact filters.
  const eligible = ranked.filter(({ item, itRelated, placeMatch }) => {
    const nationwide = item.remote || item.province === 'Nationwide';
    if (place && !placeMatch && !nationwide) return false;
    if (!place && district && item.district !== district && !nationwide) return false;
    if (!place && province && item.province !== province && !nationwide) return false;
    if (category && item.category !== category) return false;
    if (wantsRemote && !item.remote) return false;
    if (wantsIT && !itRelated) return false;
    return true;
  });
  const constrained = Boolean(place || province || district || category || wantsRemote || wantsWeekend || tokens.length);
  const selected = eligible.filter((entry) => entry.score > 0).slice(0, MAX_CHAT_SUGGESTIONS);
  const results = selected.length || constrained ? selected : eligible.slice(0, MAX_CHAT_SUGGESTIONS);

  // Return only safe fields that the chatbot interface needs.
  return results.map(({ item, reasons }) => {
    const accepted = acceptedCounts.get(String(item._id)) || 0;
    return {
      _id: item._id,
      title: item.title,
      category: item.category,
      location: item.remote ? 'Remote / nationwide' : [item.location, item.district, item.province].filter(Boolean).join(', '),
      reason: reasons.slice(0, 2).join(' - ') || 'Currently published',
      summary: item.summary || '',
      description: String(item.description || '').slice(0, 700),
      commitment: item.commitment,
      duration: item.duration || '',
      date: item.date,
      deadline: item.deadline || null,
      requiredSkills: item.requiredSkills || [],
      capacity: item.capacity,
      // Remaining places equals capacity minus accepted applications.
      remainingPlaces: Math.max(0, Number(item.capacity || 0) - accepted),
      organisation: item.organisation ? {
        name: item.organisation.organisationName || item.organisation.name,
        verified: Boolean(item.organisation.verified)
      } : null
    };
  });
}

// Read current opportunities and accepted-place counts from MongoDB.
async function loadOpportunityContext(question, history, intent, user = null) {
  const now = new Date();
  const personalised = Boolean(intent.profileRecommendation && user?.role === 'volunteer');
  // Personal recommendations should not show opportunities already applied for.
  const appliedIds = personalised
    ? await Application.find({ volunteer: user._id }).distinct('opportunity')
    : [];
  // Fetch only published opportunities whose date and deadline are still valid.
  const opportunities = await Opportunity.find({
    status: 'published',
    date: { $gte: now },
    ...(appliedIds.length ? { _id: { $nin: appliedIds } } : {}),
    $or: [{ deadline: { $exists: false } }, { deadline: null }, { deadline: { $gte: now } }]
  })
    .select('title description summary organisation category location district province remote date deadline duration commitment requiredSkills interests capacity')
    .populate('organisation', 'name organisationName verified')
    .sort({ date: 1 })
    .limit(100)
    .lean();

  const ids = opportunities.map((item) => item._id);
  // Group accepted applications by opportunity to calculate remaining places.
  const accepted = ids.length
    ? await Application.aggregate([
      { $match: { opportunity: { $in: ids }, status: 'accepted' } },
      { $group: { _id: '$opportunity', count: { $sum: 1 } } }
    ])
    : [];
  const acceptedCounts = new Map(accepted.map((item) => [String(item._id), item.count]));
  return opportunitySuggestions(question, history, opportunities, acceptedCounts, intent, personalised ? user : null);
}

// Load safe platform totals for the chatbot welcome message.
async function loadPlatformContext(user) {
  const now = new Date();
  const currentFilter = {
    status: 'published',
    date: { $gte: now },
    $or: [{ deadline: { $exists: false } }, { deadline: null }, { deadline: { $gte: now } }]
  };
  const neutralIntent = {
    followUp: false,
    place: null,
    province: '',
    district: '',
    category: ''
  };

  // Promise.all runs these independent database queries at the same time.
  const [currentOpportunityCount, activeOrganisationCount, categories, opportunities] = await Promise.all([
    Opportunity.countDocuments(currentFilter),
    User.countDocuments({ role: 'organisation', active: true }),
    Opportunity.distinct('category', currentFilter),
    loadOpportunityContext('show current opportunities', [], neutralIntent, user)
  ]);

  return {
    platform: {
      userRole: user?.role || 'guest',
      currentOpportunityCount,
      activeOrganisationCount,
      categories: categories.filter(Boolean).sort().slice(0, 10)
    },
    opportunities: opportunities.slice(0, 3)
  };
}

// Search active organizations using words from the user's question.
async function loadOrganisationContext(question) {
  const organisations = await User.find({ role: 'organisation', active: true })
    .select('name organisationName organisationType bio location province district interests verified')
    .sort({ verified: -1, organisationName: 1 })
    .limit(50)
    .lean();

  const ids = organisations.map((item) => item._id);
  const counts = ids.length
    ? await Opportunity.aggregate([
      { $match: { organisation: { $in: ids }, status: 'published', date: { $gte: new Date() } } },
      { $group: { _id: '$organisation', count: { $sum: 1 } } }
    ])
    : [];
  const countMap = new Map(counts.map((item) => [String(item._id), item.count]));
  const tokens = wordTokens(question);
  const ranked = organisations.map((item) => {
    const searchable = [
      item.organisationName, item.name, item.organisationType, item.bio, item.location,
      item.province, item.district, ...(item.interests || [])
    ].join(' ').toLowerCase();
    return { item, score: tokens.filter((token) => searchable.includes(token)).length };
  }).sort((a, b) => b.score - a.score || Number(b.item.verified) - Number(a.item.verified));

  const matched = ranked.filter((entry) => entry.score > 0);
  return (matched.length ? matched : ranked).slice(0, 5).map(({ item }) => ({
    name: item.organisationName || item.name,
    type: item.organisationType || '',
    location: [item.location, item.district, item.province].filter(Boolean).join(', '),
    focusAreas: item.interests || [],
    verified: Boolean(item.verified),
    currentOpportunityCount: countMap.get(String(item._id)) || 0
  }));
}

// Load personal application data only when the logged-in role is allowed.
async function loadApplicationContext(user) {
  if (!user) {
    return { access: 'signed-out', message: 'The user must sign in to view personal application information.', items: [] };
  }

  if (user.role === 'volunteer') {
    const applications = await Application.find({ volunteer: user._id })
      .select('status attendance hours createdAt opportunity')
      .populate('opportunity', 'title date')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    return {
      access: 'volunteer-owner',
      items: applications.map((item) => ({
        opportunity: item.opportunity?.title || 'Unavailable opportunity',
        activityDate: item.opportunity?.date || null,
        applicationStatus: item.status,
        attendance: item.attendance,
        contributedHours: item.hours
      }))
    };
  }

  if (user.role === 'organisation') {
    const opportunityIds = await Opportunity.find({ organisation: user._id }).distinct('_id');
    const summary = opportunityIds.length
      ? await Application.aggregate([
        { $match: { opportunity: { $in: opportunityIds } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
      : [];
    return {
      access: 'organisation-owner',
      items: summary.map((item) => ({ applicationStatus: item._id, count: item.count }))
    };
  }

  return { access: 'admin', message: 'Use the administrator dashboard for account-specific application oversight.', items: [] };
}

// Build safe database context and ask the chatbot for an answer.
router.post('/chat', optionalProtect, async (req, res) => {
  // Clean and limit user input before using it in search or AI prompts.
  const question = String(req.body.message || '').trim();
  if (!question) return res.status(400).json({ message: 'Please enter a question.' });
  if (question.length > 1000) return res.status(400).json({ message: 'Please keep your question under 1,000 characters.' });

  // Intent decides which safe database information should be loaded.
  const history = cleanHistory(req.body.history);
  const intent = detectIntent(question, history);
  const context = {
    mode: intent.mode,
    greeting: intent.greeting,
    platformOverview: intent.platformOverview,
    platform: null,
    opportunities: [],
    organisations: [],
    applications: null,
    databaseUnavailable: false
  };

  try {
    // Add only the information required for this question to the AI context.
    const tasks = [];
    if (intent.greeting || intent.platformOverview) {
      tasks.push(loadPlatformContext(req.user).then((result) => {
        context.platform = result.platform;
        context.opportunities = result.opportunities;
      }));
    }
    if (intent.opportunityLookup) {
      tasks.push(loadOpportunityContext(question, history, intent, req.user).then((items) => { context.opportunities = items; }));
    }
    if (intent.organisationLookup) {
      tasks.push(loadOrganisationContext(question).then((items) => { context.organisations = items; }));
    }
    if (intent.personalApplications) {
      tasks.push(loadApplicationContext(req.user).then((items) => { context.applications = items; }));
    }
    // Run all required database lookups together.
    await Promise.all(tasks);
  } catch (error) {
    // The chatbot can still give general guidance if MongoDB is unavailable.
    context.databaseUnavailable = true;
    console.warn('Chat database context unavailable:', error.message);
  }

  return res.json(await answerQuestion(question, context, history));
});

// Give a newly registered user simple role-based guidance.
router.post('/onboarding', protect, async (req, res) => {
  if (!['volunteer', 'organisation'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Onboarding is available for volunteer and organisation accounts.' });
  }
  return res.json(await generateOnboarding(req.user));
});

// Create a short summary for an opportunity description.
router.post('/summarize', protect, allow('organisation', 'admin'), async (req, res) => {
  const description = String(req.body.description || '').trim();
  if (description.length < 30) return res.status(400).json({ message: 'Add a little more detail before creating a summary.' });
  res.json({ summary: await summarizeDescription(description) });
});

export default router;
