// This script adds the main sample data to MongoDB.
import 'dotenv/config';
import { fileURLToPath } from 'node:url';
import { closeDatabase, connectDatabase } from '../config/db.js';
import User from '../models/User.js';
import Opportunity from '../models/Opportunity.js';
import Application from '../models/Application.js';

const futureDate = (days) => new Date(Date.now() + days * 86_400_000);

export async function seedDatabase() {
  if (!User.db.readyState) await connectDatabase();
  await Promise.all([Application.deleteMany({}), Opportunity.deleteMany({}), User.deleteMany({})]);

  const [volunteer, organisation, secondOrganisation] = await User.create([
    { name: 'Aarav Shrestha', email: 'volunteer@volunterr.test', password: 'password123', role: 'volunteer', location: 'Kathmandu Metropolitan City', district: 'Kathmandu', province: 'Bagmati', bio: 'Student and community volunteer interested in practical local action.', interests: ['Environment', 'Education', 'Community'], skills: ['Teaching', 'Photography', 'First aid'] },
    { name: 'Maya Gurung', email: 'organisation@volunterr.test', password: 'password123', role: 'organisation', organisationName: 'Himalayan Community Action', organisationType: 'Non-profit', avatar: '/images/organisations/himalayan-community-action.png', location: 'Kathmandu Metropolitan City', district: 'Kathmandu', province: 'Bagmati', phone: '+977 9800000001', interests: ['Education', 'Health', 'Disaster Response'], bio: 'A local non-profit helping communities lead practical environmental and education projects.', verified: true },
    { name: 'Nirmala Rai', email: 'green@volunterr.test', password: 'password123', role: 'organisation', organisationName: 'Green Steps Nepal', organisationType: 'Youth club', avatar: '/images/organisations/green-steps-nepal.png', location: 'Lalitpur Metropolitan City', district: 'Lalitpur', province: 'Bagmati', phone: '+977 9800000002', interests: ['Environment', 'Community'], bio: 'Youth-led environmental action across the Kathmandu Valley.', verified: true },
    { name: 'Platform Admin', email: 'admin@volunterr.test', password: 'password123', role: 'admin', location: 'Kathmandu', verified: true }
  ]);

  const opportunities = await Opportunity.create([
    { title: 'Restore the Bagmati Riverbank', description: 'Join a welcoming team for a hands-on clean-up and native planting morning beside the Bagmati. Volunteers will collect and sort litter, prepare planting areas, and help restore a healthier shared riverside. Gloves, drinking water, and a short safety briefing are provided. Wear comfortable closed shoes and bring sun protection.', summary: 'Spend a morning cleaning the Bagmati riverbank and planting native greenery with a friendly, equipped local team.', organisation: secondOrganisation._id, category: 'Environment', location: 'Lalitpur', district: 'Lalitpur', province: 'Bagmati', image: '/images/opportunities/bagmati-riverbank.jpg', date: futureDate(12), deadline: futureDate(9), duration: '4 hours', commitment: 'One-time', requiredSkills: ['Teamwork'], interests: ['Environment', 'Community'], capacity: 35, featured: true },
    { title: 'Weekend Reading Club Mentor', description: 'Help children aged eight to twelve build confidence in reading English and Nepali stories. Mentors work in small groups using activity cards supplied by our education coordinator. You do not need to be a qualified teacher—patience, curiosity, and a reliable Saturday morning commitment are most important.', summary: 'Mentor a small group of children through fun Saturday reading sessions and help build their confidence with stories.', organisation: organisation._id, category: 'Education', location: 'Kathmandu', district: 'Kathmandu', province: 'Bagmati', image: '/images/opportunities/reading-club.jpg', date: futureDate(8), endDate: futureDate(50), deadline: futureDate(6), duration: '2 hours weekly', commitment: 'Short-term', requiredSkills: ['Teaching', 'Communication'], interests: ['Education', 'Children'], capacity: 12, featured: true },
    { title: 'Community Health Awareness Day', description: 'Support nurses and community health workers during a free awareness day. Volunteers will welcome visitors, guide queues, distribute reliable health information, and help record anonymous participation figures. A briefing is provided before the event. People with first aid or health communication experience are especially welcome.', summary: 'Help local health workers welcome visitors and share reliable information at a free community health awareness event.', organisation: organisation._id, category: 'Health', location: 'Bhaktapur', district: 'Bhaktapur', province: 'Bagmati', image: '/images/opportunities/health-awareness.jpg', date: futureDate(19), deadline: futureDate(15), duration: '6 hours', commitment: 'One-time', requiredSkills: ['First aid', 'Communication'], interests: ['Health', 'Community'], capacity: 20, featured: true },
    { title: 'Design Learning Materials from Home', description: 'Turn simple lesson notes into colourful, easy-to-use worksheets for rural learning centres. Volunteers can work remotely and choose tasks that fit their schedule. Our team supplies content, templates, and feedback. Skills in illustration, graphic design, clear writing, or document layout are useful.', summary: 'Design clear and colourful worksheets remotely for rural learning centres, with templates and feedback supplied.', organisation: organisation._id, category: 'Education', location: 'Nepal', district: 'Nationwide', province: 'Nationwide', remote: true, image: '/images/opportunities/learning-materials.jpg', date: futureDate(5), endDate: futureDate(65), deadline: futureDate(30), duration: 'Flexible', commitment: 'Flexible', requiredSkills: ['Design', 'Writing'], interests: ['Education', 'Technology'], capacity: 15 },
    { title: 'Urban Tree Mapping Walk', description: 'Join an easy guided walk to map street trees and identify areas that need more shade. Volunteers use a simple mobile form to record species, condition, and location. Training is given at the meeting point, so no previous mapping or plant knowledge is required.', summary: 'Take a guided walk through Patan to map street trees and reveal where the neighbourhood needs more shade.', organisation: secondOrganisation._id, category: 'Environment', location: 'Patan', district: 'Lalitpur', province: 'Bagmati', image: '/images/opportunities/tree-mapping.jpg', date: futureDate(25), deadline: futureDate(21), duration: '3 hours', commitment: 'One-time', requiredSkills: ['Photography'], interests: ['Environment', 'Technology'], capacity: 25 },
    { title: 'Emergency Relief Kit Packing', description: 'Help prepare clearly labelled emergency supply kits so they are ready for rapid distribution during floods and landslides. The work includes checking lists, sorting shelf-stable items, packing boxes, and recording totals. Volunteers receive lifting and warehouse safety guidance.', summary: 'Sort, check, and pack emergency supply kits so local teams can respond quickly during floods and landslides.', organisation: organisation._id, category: 'Disaster Response', location: 'Kirtipur', district: 'Kathmandu', province: 'Bagmati', image: '/images/opportunities/relief-kit-packing.jpg', date: futureDate(15), deadline: futureDate(12), duration: '5 hours', commitment: 'One-time', requiredSkills: ['Organisation', 'Teamwork'], interests: ['Disaster Response', 'Community'], capacity: 40 },
    { title: 'Shelter Photography Volunteer', description: 'Photograph rescued dogs and cats in a calm, positive way to help their adoption profiles stand out. You will work alongside an animal handler and receive guidance on safe interaction. Bring a camera or a phone with a good camera and share edited images within three days.', summary: 'Create warm adoption photos for rescued dogs and cats while working safely alongside an experienced animal handler.', organisation: secondOrganisation._id, category: 'Animal Welfare', location: 'Tokha', district: 'Kathmandu', province: 'Bagmati', image: '/images/opportunities/shelter-photography.jpg', date: futureDate(22), deadline: futureDate(18), duration: '3 hours', commitment: 'One-time', requiredSkills: ['Photography'], interests: ['Animal Welfare'], capacity: 6 }
  ]);

  await Application.create([
    { opportunity: opportunities[0]._id, volunteer: volunteer._id, message: 'I care about cleaner shared spaces and would be glad to join.', status: 'accepted' },
    { opportunity: opportunities[1]._id, volunteer: volunteer._id, message: 'I have tutoring experience and enjoy working with younger students.', status: 'pending' }
  ]);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedDatabase()
    .then(() => {
      console.log('MongoDB seed complete. Demo accounts use password: password123');
      console.log('Volunteer: volunteer@volunterr.test');
      console.log('Organisation: organisation@volunterr.test');
      console.log('Admin: admin@volunterr.test');
    })
    .catch((error) => { console.error(error); process.exitCode = 1; })
    .finally(closeDatabase);
}
