// This script adds sample organizations and opportunities for Nepal's provinces.
import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { closeDatabase, connectDatabase } from './config/db.js';
import User from './models/User.js';
import Opportunity from './models/Opportunity.js';
import Application from './models/Application.js';

const DEADLINE_YEAR = 2026;
const applicationDeadline = (offset) => new Date(Date.UTC(DEADLINE_YEAR, 11, 25 + (offset % 7), 12));
const opportunityDate = (offset) => new Date(Date.UTC(DEADLINE_YEAR + 1, 0, 8 + offset, 12));

const organisations = [
  { name: 'Koshi Green Horizons', province: 'Koshi', district: 'Jhapa', location: 'Birtamod Municipality', category: 'Environment', type: 'Youth club', avatar: '/images/organisations/koshi-green-horizons.png' },
  { name: 'Birat Community Health Alliance', province: 'Koshi', district: 'Morang', location: 'Biratnagar Metropolitan City', category: 'Health', type: 'NGO', avatar: '/images/organisations/birat-community-health-alliance.png' },
  { name: 'Janakpur Learning Foundation', province: 'Madhesh', district: 'Dhanusha', location: 'Janakpurdham Sub-Metropolitan City', category: 'Education', type: 'Non-profit', avatar: '/images/organisations/janakpur-learning-foundation.png' },
  { name: 'Rautahat Relief Initiative', province: 'Madhesh', district: 'Rautahat', location: 'Gaur Municipality', category: 'Disaster Response', type: 'NGO', avatar: '/images/organisations/rautahat-relief-initiative.png' },
  { name: 'Green Steps Nepal', email: 'green@volunterr.test', province: 'Bagmati', district: 'Lalitpur', location: 'Lalitpur Metropolitan City', category: 'Environment', type: 'Youth club', avatar: '/images/organisations/green-steps-nepal.png' },
  { name: 'Nepal GENZ Youth Club', preserveAccount: true, province: 'Bagmati', district: 'Makwanpur', location: 'Hetauda Sub-Metropolitan City', category: 'Other', type: 'Youth club', avatar: '/images/organisations/nepal-genz-youth-club.png' },
  { name: 'Pokhara Lake Guardians', province: 'Gandaki', district: 'Kaski', location: 'Pokhara Metropolitan City', category: 'Environment', type: 'Youth club', avatar: '/images/organisations/pokhara-lake-guardians.png' },
  { name: 'Gorkha Learning Partnership', province: 'Gandaki', district: 'Gorkha', location: 'Gorkha Municipality', category: 'Education', type: 'Non-profit', avatar: '/images/organisations/gorkha-learning-partnership.png' },
  { name: 'Lumbini Green Pathways', province: 'Lumbini', district: 'Rupandehi', location: 'Butwal Sub-Metropolitan City', category: 'Environment', type: 'Youth club', avatar: '/images/organisations/lumbini-green-pathways.png' },
  { name: 'Nepalgunj Health Volunteers', province: 'Lumbini', district: 'Banke', location: 'Nepalgunj Sub-Metropolitan City', category: 'Health', type: 'NGO', avatar: '/images/organisations/nepalgunj-health-volunteers.png' },
  { name: 'Surkhet Green Future', province: 'Karnali', district: 'Surkhet', location: 'Birendranagar Municipality', category: 'Environment', type: 'Youth club', avatar: '/images/organisations/surkhet-green-future.png' },
  { name: 'Jajarkot Resilience Partnership', province: 'Karnali', district: 'Jajarkot', location: 'Bheri Municipality', category: 'Disaster Response', type: 'NGO', avatar: '/images/organisations/jajarkot-resilience-partnership.png' },
  { name: 'Kailali Green Communities', province: 'Sudurpashchim', district: 'Kailali', location: 'Dhangadhi Sub-Metropolitan City', category: 'Environment', type: 'Community group', avatar: '/images/organisations/kailali-green-communities.png' },
  { name: 'Kanchanpur Learning Network', province: 'Sudurpashchim', district: 'Kanchanpur', location: 'Bhimdatta Municipality', category: 'Education', type: 'Non-profit', avatar: '/images/organisations/kanchanpur-learning-network.png' }
];

const opportunityPlans = {
  'Koshi Green Horizons': [
    { title: 'Monsoon Flood Evacuation Route Mapping', category: 'Disaster Response', description: 'Walk pre-approved routes with ward representatives to record flood-prone crossings, safe assembly points, shelters, and access barriers before the monsoon. Volunteers receive a safety briefing and use a simple mobile mapping form.', summary: 'Map safer evacuation routes and community shelters before monsoon flooding begins.', skills: ['Mapping', 'Data entry'], image: '/images/opportunities/flood-route-mapping.jpg', duration: '4 hours', commitment: 'Short-term' },
    { title: 'Mechi Riverbank Cleanup', category: 'Environment', description: 'Remove and sort plastic waste from an identified stretch of the Mechi riverbank using gloves, collection sacks, and guidance supplied by the cleanup coordinator.', summary: 'Clean and sort waste along a monitored section of the Mechi riverbank.', skills: ['Teamwork', 'Outdoor work'], image: '/images/opportunities/bagmati-riverbank.jpg', duration: '4 hours', commitment: 'One-time' },
    { title: 'Community Sapling Fundraising Campaign', category: 'Fundraising', description: 'Help prepare donation messages, contact local businesses, record pledged support, and staff a transparent fundraising stall for native saplings. Volunteers do not handle money alone.', summary: 'Raise and record community support for native saplings and follow-up care.', skills: ['Communication', 'Fundraising'], image: '/images/opportunities/tree-mapping.jpg', duration: '2 weekends', commitment: 'Short-term' }
  ],
  'Birat Community Health Alliance': [
    { title: 'Free Blood Pressure Screening Support', category: 'Health', description: 'Welcome residents, manage appointment tokens, explain the screening flow, and help qualified health workers maintain anonymous attendance records at a free screening day.', summary: 'Help qualified health workers run an orderly free blood pressure screening day.', skills: ['Communication', 'Organisation'], image: '/images/opportunities/health-awareness.jpg', duration: '6 hours', commitment: 'One-time' },
    { title: 'Emergency First Aid Drill Assistant', category: 'Disaster Response', description: 'Prepare practice materials, guide participants between stations, and support certified trainers during a flood and earthquake first aid drill. No medical procedures are performed by volunteers.', summary: 'Support certified trainers during a practical community emergency first aid drill.', skills: ['First aid', 'Teamwork'], image: '/images/opportunities/relief-kit-packing.jpg', duration: '5 hours', commitment: 'One-time' },
    { title: 'Essential Medicine Fund Campaign', category: 'Fundraising', description: 'Create approved campaign posts, contact community donors, issue receipt records with staff, and report progress for a fund supplying essential medicines to low-income patients.', summary: 'Support a transparent campaign for essential medicines for low-income patients.', skills: ['Fundraising', 'Social media'], image: '/images/opportunities/medicine-fundraising.jpg', duration: '3 weeks', commitment: 'Short-term' }
  ],
  'Janakpur Learning Foundation': [
    { title: 'Girls School Supply Distribution', category: 'Education', description: 'Sort learning kits, check distribution lists, prepare class bundles, and help school staff distribute notebooks and stationery fairly to participating students.', summary: 'Prepare and distribute school-supply kits with teachers and local coordinators.', skills: ['Organisation', 'Teamwork'], image: '/images/opportunities/learning-materials.jpg', duration: '5 hours', commitment: 'One-time' },
    { title: 'Adult Digital Literacy Class Assistant', category: 'Education', description: 'Help adult learners practise Nepali typing, email, online safety, and government service websites using guided lesson cards and supervised computers.', summary: 'Help adult learners practise useful, safe everyday digital skills.', skills: ['IT', 'Communication'], image: '/images/opportunities/digital-help-desk.jpg', duration: '3 hours weekly', commitment: 'Short-term' },
    { title: 'Community Meal Service Volunteer', category: 'Social Work', description: 'Pack balanced meals, arrange a respectful collection queue, assist older and disabled visitors, and record anonymous meal totals with the community kitchen team.', summary: 'Help a community kitchen prepare and distribute meals respectfully and safely.', skills: ['Teamwork', 'Community service'], image: '/images/opportunities/community-meal-service.jpg', duration: '4 hours', commitment: 'One-time' }
  ],
  'Rautahat Relief Initiative': [
    { title: 'Flood Relief Kit Packing and Inventory', category: 'Disaster Response', description: 'Check expiry dates, sort hygiene and food supplies, pack waterproof family kits, and update inventory sheets so response teams can distribute aid quickly after floods.', summary: 'Pack and record waterproof family relief kits for rapid flood response.', skills: ['Organisation', 'Inventory'], image: '/images/opportunities/relief-kit-packing.jpg', duration: '6 hours', commitment: 'One-time' },
    { title: 'Temporary Shelter Setup Drill', category: 'Disaster Response', description: 'Work with trained coordinators to practise marking safe ground, assembling demonstration shelter sections, arranging water points, and checking accessibility routes.', summary: 'Practise safe and accessible temporary shelter setup with trained responders.', skills: ['Teamwork', 'Outdoor work'], image: '/images/opportunities/shelter-setup.jpg', duration: '5 hours', commitment: 'One-time' },
    { title: 'Flood Recovery Fundraising Campaign', category: 'Fundraising', description: 'Help verify beneficiary stories, prepare bilingual campaign updates, contact approved donors, and maintain a public expense tracker under staff supervision.', summary: 'Help run a transparent campaign supporting verified flood-affected households.', skills: ['Fundraising', 'Writing'], image: '/images/opportunities/flood-fundraising.jpg', duration: '4 weeks', commitment: 'Short-term' }
  ],
  'Green Steps Nepal': [
    { title: 'Bagmati River Cleanup and Waste Audit', category: 'Environment', description: 'Collect litter with protective equipment, separate recyclable materials, weigh each waste category, and record results for the local river waste audit.', summary: 'Clean the Bagmati riverbank and document the types of waste collected.', skills: ['Teamwork', 'Data entry'], image: '/images/opportunities/bagmati-riverbank.jpg', duration: '4 hours', commitment: 'One-time' },
    { title: 'Urban Heat and Tree Mapping Walk', category: 'Environment', description: 'Use a guided mobile form to record street shade, surface temperature, tree condition, and possible planting locations along approved walking routes in Lalitpur.', summary: 'Map shade and tree conditions to identify urban heat reduction priorities.', skills: ['Mapping', 'Photography'], image: '/images/opportunities/tree-mapping.jpg', duration: '3 hours', commitment: 'Short-term' },
    { title: 'School Waste-Sorting Workshop Assistant', category: 'Education', description: 'Prepare labelled sample bins, guide small student groups through sorting exercises, and help teachers record questions and learning outcomes.', summary: 'Help students learn practical household waste sorting through guided activities.', skills: ['Teaching', 'Communication'], image: '/images/opportunities/learning-materials.jpg', duration: '3 hours', commitment: 'One-time' }
  ],
  'Nepal GENZ Youth Club': [
    { title: 'IT Support Technician', category: 'Other', description: 'Help with basic computer setup, software installation, troubleshooting, website support, and teaching community members to use digital tools safely.', summary: 'Provide practical IT support and safe digital guidance for community programs.', skills: ['IT', 'Problem solving'], image: '/images/opportunities/learning-materials.jpg', duration: 'Weekends', commitment: 'Short-term' },
    { title: 'Youth Mental Health Awareness Event', category: 'Health', description: 'Support licensed facilitators by arranging materials, managing registration, sharing approved referral information, and guiding participants to private support desks.', summary: 'Help licensed facilitators deliver a safe youth mental health awareness event.', skills: ['Communication', 'Event support'], image: '/images/opportunities/health-awareness.jpg', duration: '5 hours', commitment: 'One-time' },
    { title: 'Senior Citizen Digital Help Desk', category: 'Social Work', description: 'Patiently help older residents adjust phone accessibility settings, recognise scam messages, use video calls, and access everyday digital services.', summary: 'Help older residents use phones and online services more safely and confidently.', skills: ['IT', 'Patience'], image: '/images/opportunities/digital-help-desk.jpg', duration: '3 hours weekly', commitment: 'Short-term' }
  ],
  'Pokhara Lake Guardians': [
    { title: 'Phewa Lake Shore Cleanup', category: 'Environment', description: 'Collect and separate litter from an approved lakeside section while recording common waste items for the conservation team. Gloves and safety equipment are provided.', summary: 'Clean a monitored section of Phewa Lake shore and record common waste.', skills: ['Teamwork', 'Outdoor work'], image: '/images/opportunities/bagmati-riverbank.jpg', duration: '4 hours', commitment: 'One-time' },
    { title: 'Landslide Preparedness Route Survey', category: 'Disaster Response', description: 'Walk with municipal contacts to photograph blocked drains, unstable slopes, safe footpaths, and emergency vehicle access points using a prepared checklist.', summary: 'Survey access routes and visible landslide risks before heavy monsoon rain.', skills: ['Photography', 'Mapping'], image: '/images/opportunities/flood-route-mapping.jpg', duration: '4 hours', commitment: 'Short-term' },
    { title: 'Lake Conservation Fundraising Walk', category: 'Fundraising', description: 'Register participants, contact approved sponsors, distribute route information, record pledges, and help publish the final fundraising and expense totals.', summary: 'Support a transparent sponsored walk for community lake conservation work.', skills: ['Fundraising', 'Event support'], image: '/images/opportunities/flood-fundraising.jpg', duration: '2 weekends', commitment: 'Short-term' }
  ],
  'Gorkha Learning Partnership': [
    { title: 'Earthquake-Safe School Drill Assistant', category: 'Disaster Response', description: 'Help teachers mark evacuation lanes, time classroom exits, guide assembly-point headcounts, and record observations for trained safety coordinators.', summary: 'Help a school practise and review a safe earthquake evacuation drill.', skills: ['Organisation', 'Communication'], image: '/images/opportunities/relief-kit-packing.jpg', duration: '4 hours', commitment: 'One-time' },
    { title: 'Rural Library Book Drive Coordinator', category: 'Fundraising', description: 'Contact book donors, check age suitability, catalogue accepted titles, package district deliveries, and publish clear donation totals.', summary: 'Coordinate a transparent book drive for rural school and community libraries.', skills: ['Fundraising', 'Organisation'], image: '/images/opportunities/reading-club.jpg', duration: '3 weeks', commitment: 'Short-term' },
    { title: 'After-School Science Activity Facilitator', category: 'Education', description: 'Deliver prepared hands-on activities about water, energy, and simple machines to small student groups under a teacher coordinator.', summary: 'Facilitate safe hands-on science activities using prepared lesson guides.', skills: ['Teaching', 'Communication'], image: '/images/opportunities/learning-materials.jpg', duration: '2 hours weekly', commitment: 'Short-term' }
  ],
  'Lumbini Green Pathways': [
    { title: 'Community Tree Nursery Volunteer', category: 'Environment', description: 'Fill nursery bags, label native seedlings, record watering needs, and prepare healthy saplings for later planting in community spaces.', summary: 'Prepare and care for native seedlings in a supervised community nursery.', skills: ['Gardening', 'Teamwork'], image: '/images/opportunities/tree-mapping.jpg', duration: '4 hours', commitment: 'One-time' },
    { title: 'Wheelchair Access Mapping Walk', category: 'Social Work', description: 'Accompany disability advocates to document ramps, kerbs, entrances, toilets, and route barriers at selected public facilities using a standard checklist.', summary: 'Map accessibility barriers alongside local disability advocates.', skills: ['Mapping', 'Respectful communication'], image: '/images/opportunities/accessibility-mapping.jpg', duration: '4 hours', commitment: 'Short-term' },
    { title: 'Clean Water Awareness Door-to-Door Team', category: 'Health', description: 'Visit assigned households in pairs to share approved information about safe water storage, handwashing, and diarrhoeal disease prevention.', summary: 'Share practical, approved clean-water and hygiene guidance with households.', skills: ['Communication', 'Community outreach'], image: '/images/opportunities/health-awareness.jpg', duration: '5 hours', commitment: 'Short-term' }
  ],
  'Nepalgunj Health Volunteers': [
    { title: 'Blood Donation Camp Registration Volunteer', category: 'Health', description: 'Welcome eligible donors, manage queue tokens, check completed registration forms, provide refreshments, and direct medical questions to qualified staff.', summary: 'Support registration and donor care at a supervised blood donation camp.', skills: ['Organisation', 'Communication'], image: '/images/opportunities/blood-donation-camp.jpg', duration: '6 hours', commitment: 'One-time' },
    { title: 'Heatwave Hydration Point Assistant', category: 'Disaster Response', description: 'Set up shaded water points, refill sealed drinking-water containers, identify visitors needing professional help, and record supply use during high-temperature alerts.', summary: 'Operate supervised community hydration points during severe heat alerts.', skills: ['First aid', 'Teamwork'], image: '/images/opportunities/relief-kit-packing.jpg', duration: '5 hours', commitment: 'Short-term' },
    { title: 'Maternal Health Information Distribution', category: 'Health', description: 'Prepare approved information packs, guide visitors to nurse-led counselling, support a private waiting area, and record anonymous attendance totals.', summary: 'Help health workers distribute reliable maternal health information respectfully.', skills: ['Communication', 'Organisation'], image: '/images/opportunities/health-awareness.jpg', duration: '5 hours', commitment: 'One-time' }
  ],
  'Surkhet Green Future': [
    { title: 'Community Wildfire Awareness Team', category: 'Disaster Response', description: 'Distribute approved prevention guides, mark safe meeting points, help clear demonstration firebreak areas, and direct technical questions to forest officers.', summary: 'Support forest officers with practical community wildfire preparedness outreach.', skills: ['Community outreach', 'Outdoor work'], image: '/images/opportunities/wildfire-preparedness.jpg', duration: '2 days', commitment: 'Short-term' },
    { title: 'Neighbourhood Compost Setup Volunteer', category: 'Environment', description: 'Assemble simple compost bays, label accepted materials, prepare demonstration buckets, and help residents practise balancing dry and wet waste.', summary: 'Help households begin a practical shared composting system.', skills: ['Teamwork', 'Gardening'], image: '/images/opportunities/tree-mapping.jpg', duration: '4 hours', commitment: 'One-time' },
    { title: 'Winter Clothes Fundraising and Sorting', category: 'Fundraising', description: 'Contact approved donors, receive clean winter clothing, sort items by type and size, maintain donation counts, and prepare equitable distribution bundles.', summary: 'Collect, document, and sort winter clothing for remote households.', skills: ['Fundraising', 'Organisation'], image: '/images/opportunities/relief-kit-packing.jpg', duration: '3 weeks', commitment: 'Short-term' }
  ],
  'Jajarkot Resilience Partnership': [
    { title: 'Earthquake Relief Warehouse Volunteer', category: 'Disaster Response', description: 'Inspect donated goods, update stock cards, assemble family relief packages, and stage labelled boxes for authorized distribution teams.', summary: 'Prepare accurately recorded family relief packages in a supervised warehouse.', skills: ['Inventory', 'Teamwork'], image: '/images/opportunities/relief-kit-packing.jpg', duration: '6 hours', commitment: 'Short-term' },
    { title: 'Household Damage Survey Data Assistant', category: 'Disaster Response', description: 'Enter paper survey results, check missing fields, geotag verified household records, and flag inconsistencies for trained assessment staff to review.', summary: 'Help trained teams organise verified post-disaster household assessment data.', skills: ['Data entry', 'Attention to detail'], image: '/images/opportunities/tree-mapping.jpg', duration: '2 weeks', commitment: 'Short-term' },
    { title: 'Family Recovery Support Desk', category: 'Social Work', description: 'Welcome affected families, explain available service pathways from an approved directory, schedule appointments, and protect confidential paperwork.', summary: 'Help disaster-affected families navigate verified recovery services respectfully.', skills: ['Communication', 'Confidentiality'], image: '/images/opportunities/health-awareness.jpg', duration: '3 hours weekly', commitment: 'Short-term' }
  ],
  'Kailali Green Communities': [
    { title: 'Flood-Safe Community Drain Cleanup', category: 'Disaster Response', description: 'Remove surface litter from designated drains, separate sharp waste for trained handlers, and report damaged covers or blocked culverts before monsoon rain.', summary: 'Clear designated drainage routes and report hazards before monsoon flooding.', skills: ['Teamwork', 'Outdoor work'], image: '/images/opportunities/bagmati-riverbank.jpg', duration: '4 hours', commitment: 'One-time' },
    { title: 'Disability Inclusion Sports Day Assistant', category: 'Social Work', description: 'Set up accessible activity stations, guide participants, manage equipment, and follow instructions from disability-sport facilitators.', summary: 'Support an accessible community sports day led by inclusion specialists.', skills: ['Event support', 'Respectful communication'], image: '/images/opportunities/accessibility-mapping.jpg', duration: '6 hours', commitment: 'One-time' },
    { title: 'School Sanitation Improvement Team', category: 'Health', description: 'Install approved hygiene signs, prepare handwashing demonstrations, check soap and water points, and help students complete a sanitation checklist.', summary: 'Help a school improve practical handwashing and sanitation routines.', skills: ['Teamwork', 'Health awareness'], image: '/images/opportunities/health-awareness.jpg', duration: '5 hours', commitment: 'One-time' }
  ],
  'Kanchanpur Learning Network': [
    { title: 'Mobile Reading Camp Assistant', category: 'Education', description: 'Set up book stations, register borrowed titles, lead prepared reading games, and help children choose age-appropriate Nepali and English books.', summary: 'Bring structured reading activities and book access to an outreach camp.', skills: ['Teaching', 'Communication'], image: '/images/opportunities/reading-club.jpg', duration: '4 hours', commitment: 'Short-term' },
    { title: 'Anti-Trafficking Awareness Street Team', category: 'Social Work', description: 'Share approved awareness materials in assigned public areas, explain verified helpline options, record outreach totals, and refer sensitive questions to trained staff.', summary: 'Share verified trafficking-prevention information and helpline options safely.', skills: ['Community outreach', 'Communication'], image: '/images/opportunities/learning-materials.jpg', duration: '4 hours', commitment: 'Short-term' },
    { title: 'School Scholarship Fundraising Campaign', category: 'Fundraising', description: 'Prepare verified student-need summaries, contact approved donors, maintain pledge and receipt records, and help publish a transparent campaign result.', summary: 'Raise transparent scholarship support for students at risk of leaving school.', skills: ['Fundraising', 'Writing'], image: '/images/opportunities/medicine-fundraising.jpg', duration: '4 weeks', commitment: 'Short-term' }
  ]
};

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function escapeRegex(value) {
  return value.replace(/[|\\{}()[\]^$+*?.-]/g, '\\$&');
}

function isDemoAccount(email = '') {
  return /(@partners\.volunteernepal\.test|@volunterr\.test)$/i.test(email);
}

async function removeOpportunities(opportunityIds) {
  if (!opportunityIds.length) return;
  await Application.deleteMany({ opportunity: { $in: opportunityIds } });
  await Opportunity.deleteMany({ _id: { $in: opportunityIds } });
}

async function prepareOrganisation(definition) {
  const email = definition.email || (slug(definition.name) + '@partners.volunteernepal.test');
  let organisation = await User.findOne({
    $or: [{ organisationName: definition.name }, { email }]
  }).select('+password');

  const needsProfileInitialization = !organisation || !organisation.province || !organisation.district;

  if (!organisation) {
    organisation = await User.create({
      name: 'Community Coordinator',
      email,
      password: randomBytes(24).toString('hex'),
      role: 'organisation',
      organisationName: definition.name
    });
  }

  if (!definition.preserveAccount || needsProfileInitialization) {
    Object.assign(organisation, {
      name: 'Community Coordinator',
      organisationName: definition.name,
      organisationType: definition.type,
      location: definition.location,
      district: definition.district,
      province: definition.province,
      interests: [...new Set(opportunityPlans[definition.name].map((item) => item.category))],
      bio: definition.name + ' connects volunteers with practical community initiatives across ' + definition.district + ' and nearby areas.',
      verified: true,
      active: true,
      avatar: definition.avatar,
      password: randomBytes(24).toString('hex')
    });
  } else {
    organisation.avatar = definition.avatar;
    organisation.active = true;
  }

  await organisation.save();
  return organisation;
}

async function createThreeOpportunities(organisation, definition, sequence) {
  const desiredIds = [];
  const templates = opportunityPlans[definition.name];

  for (let index = 0; index < templates.length; index += 1) {
    const template = templates[index];
    const titleExpression = definition.category === 'Other' && index === 0
      ? /^IT SUPPORT TECHNICIAN$/i
      : new RegExp('^' + escapeRegex(template.title) + '$', 'i');
    let opportunity = await Opportunity.findOne({ organisation: organisation._id, title: titleExpression });

    const scheduleIndex = sequence * 3 + index;
    const date = opportunityDate(scheduleIndex);
    const details = {
      title: template.title,
      description: template.description,
      summary: template.summary,
      organisation: organisation._id,
      category: template.category,
      location: definition.location,
      district: definition.district,
      province: definition.province,
      remote: Boolean(template.remote),
      date,
      deadline: applicationDeadline(scheduleIndex),
      duration: template.duration,
      commitment: template.commitment,
      requiredSkills: template.skills,
      interests: [...new Set([template.category, 'Community'])],
      capacity: 16 + ((sequence + index) % 4) * 4,
      image: template.image,
      status: 'published',
      featured: index === 0
    };

    if (opportunity) Object.assign(opportunity, details);
    else opportunity = new Opportunity(details);
    await opportunity.save();
    desiredIds.push(opportunity._id);
  }

  const extras = await Opportunity.find({
    organisation: organisation._id,
    _id: { $nin: desiredIds }
  }).select('_id');
  await removeOpportunities(extras.map((item) => item._id));
}

export async function seedProvinceData() {
  await connectDatabase();

  const retainedNames = new Set(organisations.map((item) => item.name));
  const currentOrganisations = await User.find({ role: 'organisation' }).select('email organisationName');
  const unplannedRealAccounts = currentOrganisations.filter((item) => !isDemoAccount(item.email) && !retainedNames.has(item.organisationName));
  if (unplannedRealAccounts.length) throw new Error('Cleanup stopped because an unplanned real organisation account exists.');

  const excessDemoAccounts = currentOrganisations.filter((item) => isDemoAccount(item.email) && !retainedNames.has(item.organisationName));
  const excessIds = excessDemoAccounts.map((item) => item._id);
  const excessOpportunities = await Opportunity.find({ organisation: { $in: excessIds } }).select('_id');
  await removeOpportunities(excessOpportunities.map((item) => item._id));
  await User.deleteMany({ _id: { $in: excessIds } });

  for (let sequence = 0; sequence < organisations.length; sequence += 1) {
    const definition = organisations[sequence];
    const organisation = await prepareOrganisation(definition);
    await createThreeOpportunities(organisation, definition, sequence);
  }

  const countsByProvince = await User.aggregate([
    { $match: { role: 'organisation', active: true } },
    { $group: { _id: '$province', count: { $sum: 1 } } }
  ]);
  const opportunityCounts = await Opportunity.aggregate([
    { $match: { status: 'published' } },
    { $group: { _id: '$organisation', count: { $sum: 1 } } }
  ]);

  if (countsByProvince.length !== 7 || countsByProvince.some((item) => item.count !== 2)) {
    throw new Error('Province count verification failed.');
  }
  if (opportunityCounts.length !== 14 || opportunityCounts.some((item) => item.count !== 3)) {
    throw new Error('Opportunity count verification failed.');
  }

  console.log('Curated provincial data ready: 14 organisations and 42 opportunities.');
}

seedProvinceData()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(closeDatabase);
