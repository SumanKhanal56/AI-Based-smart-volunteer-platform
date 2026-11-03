// This integration test checks the complete API and MongoDB flow.
import { afterAll, beforeAll, describe, expect, jest, test } from '@jest/globals';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../../../server/src/app.js';
import { closeDatabase, connectDatabase } from '../../../server/src/config/db.js';
import { removeLegacyNotificationUniqueIndex } from '../../../server/src/utils/notificationIndexes.js';
import Application from '../../../server/src/models/Application.js';
import Notification from '../../../server/src/models/Notification.js';
import Opportunity from '../../../server/src/models/Opportunity.js';
import User from '../../../server/src/models/User.js';

let api;
let volunteer;
let organisation;
let opportunity;
let application;

jest.setTimeout(30000);

async function clearTestCollections() {
  await Promise.all([
    Application.deleteMany({}),
    Notification.deleteMany({}),
    Opportunity.deleteMany({}),
    User.deleteMany({})
  ]);
}

beforeAll(async () => {
  process.env.JWT_SECRET = 'integration-test-secret';
  process.env.GEMINI_API_KEY = '';
  // Use the same local credentials as Docker Compose, but a separate test database.
  const mongoUser = encodeURIComponent(process.env.MONGO_ROOT_USERNAME || 'volunteer_admin');
  const mongoPassword = encodeURIComponent(process.env.MONGO_ROOT_PASSWORD || 'volunteer_dev_password');
  const mongoPort = process.env.MONGO_PORT || '27017';
  const testUri = process.env.MONGODB_TEST_URI
    || `mongodb://${mongoUser}:${mongoPassword}@127.0.0.1:${mongoPort}/volunterr_test?authSource=admin`;
  await connectDatabase(testUri);
  await removeLegacyNotificationUniqueIndex();
  await clearTestCollections();
  await Promise.all([User.init(), Application.init(), Notification.init(), Opportunity.init()]);
  api = request(app);
});

afterAll(async () => {
  await clearTestCollections();
  await closeDatabase();
});

describe('Critical frontend → Express API → MongoDB flow', () => {
  test('registration stores volunteer and organisation accounts', async () => {
    const volunteerResponse = await api.post('/api/auth/register').send({
      name: 'Sita Karki', email: 'sita@example.com', password: 'secure123', confirmPassword: 'secure123', role: 'volunteer',
      province: 'Gandaki', district: 'Kaski', location: 'Pokhara Metropolitan City',
      interests: ['Environment', 'Education'], skills: ['Teaching', 'Teamwork']
    });
    expect(volunteerResponse.status).toBe(201);
    expect(volunteerResponse.body.user.role).toBe('volunteer');
    expect(volunteerResponse.body.user.district).toBe('Kaski');
    expect(volunteerResponse.body.user.skills).toEqual(['Teaching', 'Teamwork']);
    expect(volunteerResponse.body.token).toBeTruthy();

    const organisationResponse = await api.post('/api/auth/register').send({
      name: 'Ramesh Thapa', email: 'ramesh@example.com', password: 'secure123', confirmPassword: 'secure123',
      role: 'organisation', organisationName: 'Pokhara Community Network', organisationType: 'Community group',
      province: 'Gandaki', district: 'Kaski', location: 'Pokhara Metropolitan City', phone: '+977 9800000003',
      bio: 'A community network connecting local volunteers with practical projects.', interests: ['Environment', 'Community']
    });
    expect(organisationResponse.status).toBe(201);
    expect(organisationResponse.body.user.organisationName).toBe('Pokhara Community Network');
    expect(organisationResponse.body.user.organisationType).toBe('Community group');

    const mismatchResponse = await api.post('/api/auth/register').send({
      name: 'Password Test', email: 'password-test@example.com', password: 'secure123', confirmPassword: 'different123',
      role: 'volunteer', province: 'Gandaki', district: 'Kaski', location: 'Pokhara',
      interests: ['Environment'], skills: ['Teamwork']
    });
    expect(mismatchResponse.status).toBe(400);
    expect(mismatchResponse.body.message).toBe('Passwords do not match.');
    volunteer = volunteerResponse.body;
    organisation = organisationResponse.body;
  });

  test('login validates MongoDB credentials and returns JWT sessions', async () => {
    const response = await api.post('/api/auth/login').send({ email: 'sita@example.com', password: 'secure123' });
    expect(response.status).toBe(200);
    expect(response.body.user.name).toBe('Sita Karki');
    expect(response.body.token).toBeTruthy();
    const protectedResponse = await api.get('/api/auth/me').set('Authorization', `Bearer ${response.body.token}`);
    expect(protectedResponse.status).toBe(200);
    expect(protectedResponse.body.user.email).toBe('sita@example.com');
  });


  test('password recovery verifies a one-time code and stores only hashes', async () => {
    const genericResponse = await api.post('/api/auth/forgot-password').send({ email: 'missing@example.com' });
    expect(genericResponse.status).toBe(200);
    expect(genericResponse.body.message).toBe('If an account exists with this email, a password reset code has been sent.');
    expect(genericResponse.body.otp).toBe(undefined);

    const resetUser = await User.findOne({ email: 'sita@example.com' }).select(
      '+password +passwordResetOtpHash +passwordResetOtpExpiresAt +passwordResetOtpAttempts +passwordResetOtpSentAt'
    );
    const previousPasswordHash = resetUser.password;
    resetUser.passwordResetOtpHash = await bcrypt.hash('654321', 12);
    resetUser.passwordResetOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    resetUser.passwordResetOtpAttempts = 0;
    resetUser.passwordResetOtpSentAt = new Date();
    await resetUser.save({ validateModifiedOnly: true });

    const verifyResponse = await api.post('/api/auth/forgot-password/verify').send({
      email: 'sita@example.com',
      otp: '654321'
    });
    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.body.resetToken).toBeTruthy();
    expect(verifyResponse.body.otp).toBe(undefined);

    const verifiedUser = await User.findOne({ email: 'sita@example.com' }).select(
      '+password +passwordResetOtpHash +passwordResetTokenHash +passwordResetTokenExpiresAt'
    );
    expect(verifiedUser.password).toBe(previousPasswordHash);
    expect(verifiedUser.passwordResetOtpHash).toBe(undefined);
    expect(verifiedUser.passwordResetTokenHash).not.toBe(verifyResponse.body.resetToken);

    const reusedOtp = await api.post('/api/auth/forgot-password/verify').send({
      email: 'sita@example.com',
      otp: '654321'
    });
    expect(reusedOtp.status).toBe(400);

    const mismatchResponse = await api.post('/api/auth/forgot-password/reset').send({
      email: 'sita@example.com',
      resetToken: verifyResponse.body.resetToken,
      password: 'newSecure123',
      confirmPassword: 'different123'
    });
    expect(mismatchResponse.status).toBe(400);

    const resetResponse = await api.post('/api/auth/forgot-password/reset').send({
      email: 'sita@example.com',
      resetToken: verifyResponse.body.resetToken,
      password: 'newSecure123',
      confirmPassword: 'newSecure123'
    });
    expect(resetResponse.status).toBe(200);
    expect(resetResponse.body.message).toBe('Password reset successfully. You can now sign in.');

    const storedUser = await User.findOne({ email: 'sita@example.com' }).select(
      '+password +passwordResetTokenHash +passwordResetTokenExpiresAt'
    );
    expect(storedUser.password).not.toBe('newSecure123');
    expect(await storedUser.comparePassword('newSecure123')).toBe(true);
    expect(storedUser.passwordResetTokenHash).toBe(undefined);

    const reusedToken = await api.post('/api/auth/forgot-password/reset').send({
      email: 'sita@example.com',
      resetToken: verifyResponse.body.resetToken,
      password: 'anotherPassword123',
      confirmPassword: 'anotherPassword123'
    });
    expect(reusedToken.status).toBe(400);

    const loginResponse = await api.post('/api/auth/login').send({ email: 'sita@example.com', password: 'newSecure123' });
    expect(loginResponse.status).toBe(200);
  });
  test('public organisation directory reads registered partners from MongoDB', async () => {
    const response = await api.get('/api/organisations?verified=false');
    expect(response.status).toBe(200);
    expect(response.body.organisations.length).toBe(1);
    expect(response.body.organisations[0].organisationName).toBe('Pokhara Community Network');
    const locationResponse = await api.get('/api/organisations?province=Gandaki&district=Kaski');
    expect(locationResponse.status).toBe(200);
    expect(locationResponse.body.organisations.length).toBe(1);
  });

  test('organisation creates and public API lists an opportunity', async () => {
    const createResponse = await api
      .post('/api/opportunities')
      .set('Authorization', `Bearer ${organisation.token}`)
      .send({
        title: 'Pokhara Lakeside Cleanup',
        description: 'Work with local residents to collect and sort litter around the lakeside while learning safe waste-handling practices.',
        category: 'Environment', location: 'Pokhara Metropolitan City', district: 'Kaski', province: 'Gandaki',
        date: '2030-05-12T03:15:00.000Z', deadline: '2030-05-10T12:15:00.000Z',
        commitment: 'One-time', capacity: 25, requiredSkills: ['Teamwork'], interests: ['Environment', 'Community'],
        image: '/images/opportunities/bagmati-riverbank.jpg'
      });
    expect(createResponse.status).toBe(201);
    expect(createResponse.body.opportunity.province).toBe('Gandaki');
    expect(createResponse.body.opportunity.district).toBe('Kaski');
    expect(createResponse.body.opportunity.image).toBe('/images/opportunities/bagmati-riverbank.jpg');
    opportunity = createResponse.body.opportunity;

    const listResponse = await api.get('/api/opportunities?category=Environment&province=Gandaki&district=Kaski');
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.total).toBe(1);
    expect(listResponse.body.opportunities[0].title).toBe('Pokhara Lakeside Cleanup');

    const detailResponse = await api.get(`/api/opportunities/${opportunity._id}`);
    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body.opportunity.organisation.organisationName).toBe('Pokhara Community Network');

    const organisationRoles = await api.get(`/api/opportunities?organisation=${organisation.user._id}`);
    expect(organisationRoles.status).toBe(200);
    expect(organisationRoles.body.total).toBe(1);
  });

  test('organisation edits, drafts, publishes, and validates an opportunity', async () => {
    const invalidDeadline = await api
      .patch(`/api/opportunities/${opportunity._id}`)
      .set('Authorization', `Bearer ${organisation.token}`)
      .send({ deadline: '2030-05-13T12:15:00.000Z' });
    expect(invalidDeadline.status).toBe(400);
    expect(invalidDeadline.body.message).toMatch(/deadline must be before/i);

    const draftResponse = await api
      .patch(`/api/opportunities/${opportunity._id}`)
      .set('Authorization', `Bearer ${organisation.token}`)
      .send({ status: 'draft', capacity: 30, duration: '5 hours' });
    expect(draftResponse.status).toBe(200);
    expect(draftResponse.body.opportunity.status).toBe('draft');
    expect(draftResponse.body.opportunity.capacity).toBe(30);

    const hiddenList = await api.get('/api/opportunities?category=Environment&province=Gandaki');
    expect(hiddenList.body.total).toBe(0);

    const publishResponse = await api
      .patch(`/api/opportunities/${opportunity._id}`)
      .set('Authorization', `Bearer ${organisation.token}`)
      .send({ status: 'published', deadline: '2030-05-10T12:15:00.000Z' });
    expect(publishResponse.status).toBe(200);
    expect(publishResponse.body.opportunity.status).toBe('published');
  });
  test('volunteer applies and organisation manages the application', async () => {
    const applyResponse = await api
      .post(`/api/applications/${opportunity._id}`)
      .set('Authorization', `Bearer ${volunteer.token}`)
      .send({ message: 'I live nearby and would be happy to help.' });
    expect(applyResponse.status).toBe(201);
    expect(applyResponse.body.application.status).toBe('pending');
    application = applyResponse.body.application;

    const organizationNotification = await Notification.findOne({ recipient: organisation.user._id, type: 'application' });
    expect(organizationNotification).toBeTruthy();
    expect(organizationNotification.read).toBe(false);
    expect(organizationNotification.message).toMatch(/Sita Karki.*Pokhara Lakeside Cleanup/i);

    const organizationNotificationList = await api.get('/api/notifications').set('Authorization', `Bearer ${organisation.token}`);
    expect(organizationNotificationList.status).toBe(200);
    expect(organizationNotificationList.body.unreadCount).toBe(1);

    const duplicateResponse = await api
      .post(`/api/applications/${opportunity._id}`)
      .set('Authorization', `Bearer ${volunteer.token}`)
      .send({ message: 'A duplicate application.' });
    expect(duplicateResponse.status).toBe(409);

    const volunteerList = await api.get('/api/applications/mine/list').set('Authorization', `Bearer ${volunteer.token}`);
    expect(volunteerList.status).toBe(200);
    expect(volunteerList.body.applications[0].opportunity.title).toBe('Pokhara Lakeside Cleanup');

    const acceptResponse = await api
      .patch(`/api/applications/${application._id}/status`)
      .set('Authorization', `Bearer ${organisation.token}`)
      .send({ status: 'accepted' });
    expect(acceptResponse.status).toBe(200);
    expect(acceptResponse.body.application.status).toBe('accepted');

    const statusNotification = await Notification.findOne({ recipient: volunteer.user._id, type: 'status', title: 'Application status updated' });
    expect(statusNotification).toBeTruthy();
    expect(statusNotification.message).toMatch(/accepted/i);

    const attendanceResponse = await api
      .patch(`/api/applications/${application._id}/attendance`)
      .set('Authorization', `Bearer ${organisation.token}`)
      .send({ attendance: 'present', hours: 4 });
    expect(attendanceResponse.status).toBe(200);
    expect(attendanceResponse.body.application.hours).toBe(4);

    const attendanceNotification = await Notification.findOne({ recipient: volunteer.user._id, title: 'Volunteer hours recorded' });
    expect(attendanceNotification).toBeTruthy();
    expect(attendanceNotification.message).toMatch(/4 volunteer hours/i);

    const volunteerNotificationList = await api.get('/api/notifications').set('Authorization', `Bearer ${volunteer.token}`);
    expect(volunteerNotificationList.status).toBe(200);
    expect(volunteerNotificationList.body.unreadCount).toBe(3);

    const markReadResponse = await api
      .patch(`/api/notifications/${attendanceNotification._id}/read`)
      .set('Authorization', `Bearer ${volunteer.token}`);
    expect(markReadResponse.status).toBe(200);
    expect(markReadResponse.body.notification.read).toBe(true);
  });

  test('recommendations use completed history and exclude previous applications', async () => {
    const createResponse = await api
      .post('/api/opportunities')
      .set('Authorization', `Bearer ${organisation.token}`)
      .send({
        title: 'Gandaki Community Recycling Drive',
        description: 'Help residents sort reusable materials and record recycling totals during a guided community collection day.',
        category: 'Environment', location: 'Waling Municipality', district: 'Syangja', province: 'Gandaki',
        date: '2030-06-12T03:15:00.000Z', deadline: '2030-06-10T12:15:00.000Z',
        commitment: 'One-time', capacity: 20, requiredSkills: ['Teamwork'], interests: ['Environment', 'Community']
      });
    expect(createResponse.status).toBe(201);

    const response = await api.get('/api/opportunities/recommended').set('Authorization', `Bearer ${volunteer.token}`);
    expect(response.status).toBe(200);
    expect(response.body.profileSignals.completedActivities).toBe(1);
    expect(response.body.profileSignals.excludedApplications).toBe(1);
    expect(response.body.opportunities.some((item) => item._id === opportunity._id)).toBe(false);
    const match = response.body.opportunities.find((item) => item._id === createResponse.body.opportunity._id);
    expect(match).toBeTruthy();
    expect(match.matchReasons.some((reason) => /completed environment work/i.test(reason))).toBeTruthy();
  });
  test('chatbot searches live MongoDB opportunities', async () => {
    const response = await api.post('/api/ai/chat').send({ message: 'Find an environment opportunity in Gandaki Province' });
    expect(response.status).toBe(200);
    expect(response.body.suggestions.length >= 1).toBeTruthy();
    expect(response.body.suggestions.some((item) => item.title === 'Pokhara Lakeside Cleanup')).toBeTruthy();
    // The answer should clearly state that live database matches were found.
    expect(response.body.answer).toMatch(/current database match/i);
  });
});


