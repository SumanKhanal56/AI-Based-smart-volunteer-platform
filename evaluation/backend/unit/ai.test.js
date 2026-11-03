// This unit test checks AI helper behavior.
import { afterEach, describe, expect, jest, test } from '@jest/globals';
import { answerQuestion, generateOnboarding } from '../../../server/src/utils/ai.js';

const originalApiKey = process.env.GEMINI_API_KEY;
const originalFetch = global.fetch;

afterEach(() => {
  if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = originalApiKey;
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

function context(overrides = {}) {
  return {
    mode: 'general',
    opportunities: [],
    organisations: [],
    applications: null,
    databaseUnavailable: false,
    ...overrides
  };
}

describe('AI assistant', () => {
  test('general volunteering questions receive useful answers without database matches', async () => {
  delete process.env.GEMINI_API_KEY;
  const result = await answerQuestion('What are the benefits of volunteering?', context());
  expect(result.poweredByAI).toBe(false);
  expect(result.suggestions.length).toBe(0);
  expect(result.answer).toMatch(/skills|confidence|connections/i);
});

test('a greeting returns a platform welcome with live summary and useful next steps', async () => {
  process.env.GEMINI_API_KEY = 'should-not-be-needed-for-greetings';
  global.fetch = async () => {
    throw new Error('the greeting should not call the AI provider');
  };
  const opportunity = {
    _id: 'opportunity-welcome',
    title: 'Community Digital Support',
    category: 'Education',
    location: 'Kathmandu, Bagmati'
  };
  const result = await answerQuestion('hi', context({
    mode: 'platform',
    greeting: true,
    platform: {
      userRole: 'volunteer',
      currentOpportunityCount: 42,
      activeOrganisationCount: 14,
      categories: ['Education', 'Health', 'Disaster Response']
    },
    opportunities: [opportunity]
  }));

  expect(result.poweredByAI).toBe(false);
  expect(result.mode).toBe('platform');
  expect(result.answer).toMatch(/Namaste|Welcome to Volunteer Nepal/i);
  expect(result.answer).toMatch(/42 published opportunities/i);
  expect(result.answer).toMatch(/14 active organisations/i);
  expect(result.answer).toMatch(/profile|recommendations|apply/i);
  expect(result.suggestions[0].title).toBe(opportunity.title);
});

test('database questions keep verified opportunity suggestions', async () => {
  delete process.env.GEMINI_API_KEY;
  const opportunity = {
    _id: 'opportunity-1',
    title: 'Kathmandu River Cleanup',
    category: 'Environment',
    location: 'Kathmandu, Bagmati',
    remainingPlaces: 8
  };
  const result = await answerQuestion(
    'Show environmental opportunities in Kathmandu',
    context({ mode: 'database', opportunities: [opportunity] })
  );
  expect(result.suggestions.length).toBe(1);
  expect(result.suggestions[0].title).toBe(opportunity.title);
  expect(result.answer).toMatch(/current database match/i);
});

test('mixed questions combine guidance with matching records', async () => {
  delete process.env.GEMINI_API_KEY;
  const result = await answerQuestion(
    'How can I help with environmental volunteering in Kathmandu?',
    context({
      mode: 'mixed',
      opportunities: [{ _id: 'opportunity-2', title: 'Tree Care Day', category: 'Environment' }]
    })
  );
  expect(result.answer).toMatch(/environmental volunteering/i);
  expect(result.answer).toMatch(/current database match/i);
});

test('no matching result is stated clearly while still giving guidance', async () => {
  delete process.env.GEMINI_API_KEY;
  const result = await answerQuestion(
    'How can I prepare for animal volunteering in Mustang?',
    context({ mode: 'mixed' })
  );
  expect(result.answer).toMatch(/could not find a currently published database record/i);
  expect(result.answer).toMatch(/volunteering|prepare|organiser/i);
});

test('permission-filtered personal context never invents application data', async () => {
  delete process.env.GEMINI_API_KEY;
  const result = await answerQuestion(
    'What is my application status?',
    context({
      mode: 'database',
      applications: {
        access: 'signed-out',
        message: 'The user must sign in to view personal application information.',
        items: []
      }
    })
  );
  expect(result.answer).toMatch(/sign in/i);
  expect(result.answer).not.toMatch(/accepted|declined|pending/i);
});

test('recent history helps make a follow-up answer relevant', async () => {
  delete process.env.GEMINI_API_KEY;
  const result = await answerQuestion(
    'How should I prepare for it?',
    context({ mode: 'general' }),
    [
      { role: 'user', content: 'I am considering my first environmental cleanup.' },
      { role: 'assistant', content: 'Environmental volunteering can include community cleanups.' }
    ]
  );
  expect(result.answer).toMatch(/environmental|protective|safety/i);
});

test('AI provider failures return a friendly fallback instead of crashing', async () => {
  process.env.GEMINI_API_KEY = 'test-key';
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  global.fetch = async () => {
    throw new Error('simulated provider failure');
  };
  const result = await answerQuestion('How do I choose a suitable volunteer activity?', context());
  expect(result.poweredByAI).toBe(false);
  expect(result.answer).toMatch(/choose|cause|skills|commitment/i);
});

test('onboarding gives different next steps to volunteers and organisations without requiring AI', async () => {
  delete process.env.GEMINI_API_KEY;
  const volunteer = await generateOnboarding({ name: 'Aarav', role: 'volunteer' });
  const organisation = await generateOnboarding({ name: 'Maya', organisationName: 'Green Nepal', role: 'organisation' });

  expect(volunteer.welcome).toMatch(/Aarav|welcome/i);
  expect(volunteer.guidance).toMatch(/discover|matches|apply/i);
  expect(volunteer.nextSteps.length).toBe(3);
  expect(volunteer.nextSteps[1].title).toMatch(/browse/i);

  expect(organisation.welcome).toMatch(/Green Nepal|welcome/i);
  expect(organisation.guidance).toMatch(/publish|applications/i);
  expect(organisation.nextSteps.length).toBe(3);
  expect(organisation.nextSteps[1].title).toMatch(/post/i);
});
});

