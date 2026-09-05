/**
 * ==============================================================================
 * CAMPUS NEXUS — GOOGLE FORM FEEDBACK GENERATOR
 * ==============================================================================
 * 
 * INSTRUCTIONS (Takes 15 seconds):
 * 1. Open https://script.new in your browser (while logged into ishaen.vihaan@gmail.com)
 * 2. Delete any code in the editor, paste this entire file, and click "Save" (Floppy icon)
 * 3. Click "Run" (Play button) at the top. Grant permission if prompted.
 * 4. The script will automatically create the complete Google Form in YOUR Google Drive!
 * 5. Check the Execution Log at the bottom for your live Form URL.
 *    Because YOU ran the script, ONLY YOU have owner access to the responses!
 * ==============================================================================
 */

function createCampusNexusFeedbackForm() {
  // 1. Create the Form in your Google Drive
  var form = FormApp.create('Campus Nexus — Full App & Student Experience Survey');
  
  form.setDescription(
    'RV College of Engineering (RVCE) • Autonomous Institution\n' +
    'Welcome to the official feedback survey for Campus Nexus (Engineering Link Platform).\n\n' +
    'Your feedback directly shapes our platform development, peer matching algorithms, and project evaluation workflows. ' +
    'Please take 2-3 minutes to share your honest experience across all core modules.\n\n' +
    '* All responses are strictly confidential and reviewed only by the platform administrator (Ishaen Bethur).'
  );
  
  // Collect email address automatically (or respondent can provide it)
  form.setCollectEmail(true);
  form.setAllowResponseEdits(true);
  form.setLimitOneResponsePerUser(false);

  // ----------------------------------------------------------------------------
  // SECTION 1: Student Demographics & Academic Profile
  // ----------------------------------------------------------------------------
  form.addSectionHeaderItem()
      .setTitle('Section 1: Student Demographics & Profile')
      .setHelpText('Tell us a little about your academic branch and year.');

  // Student Name
  form.addTextItem()
      .setTitle('Full Name')
      .setHelpText('Enter your full registered name (optional if you wish to remain anonymous)')
      .setRequired(false);

  // USN
  form.addTextItem()
      .setTitle('University Seat Number (USN)')
      .setHelpText('e.g., 1RV25CS088 or 1RV24EC042')
      .setRequired(false);

  // Department / Branch
  var branchItem = form.addListItem();
  branchItem.setTitle('Department / Engineering Branch')
      .setHelpText('Select your primary engineering department at RVCE')
      .setRequired(true)
      .setChoiceValues([
        'Computer Science and Engineering (CSE)',
        'Artificial Intelligence and Machine Learning (AI/AIML)',
        'Cyber Security (CY)',
        'Data Science (DS)',
        'Electronics and Communication Engineering (ECE)',
        'Electrical and Electronics Engineering (EEE)',
        'Mechanical Engineering (ME)',
        'Civil Engineering (CV)',
        'Biotechnology (BT)',
        'Chemical Engineering (CH)',
        'Electronics and Telecommunication Engineering (ETE)',
        'Industrial Engineering and Management (IEM)',
        'Aerospace Engineering (AS/ASE)'
      ]);

  // Academic Year / Cohort
  var yearItem = form.addMultipleChoiceItem();
  yearItem.setTitle('Academic Year of Study')
      .setHelpText('Select your current enrolled academic year')
      .setRequired(true)
      .setChoiceValues([
        '1st Year (2026 Batch - 1st & 2nd Semester)',
        '2nd Year (2025 Batch - 3rd & 4th Semester)',
        '3rd Year (2024 Batch - 5th & 6th Semester)',
        '4th Year (2023 Batch - 7th & 8th Semester)'
      ]);

  // ----------------------------------------------------------------------------
  // SECTION 2: Overall Platform Satisfaction
  // ----------------------------------------------------------------------------
  form.addSectionHeaderItem()
      .setTitle('Section 2: Overall Satisfaction & Recommendation')
      .setHelpText('Your high-level impressions of using Campus Nexus.');

  // Overall satisfaction (1 to 5)
  var overallScale = form.addScaleItem();
  overallScale.setTitle('Overall Satisfaction with Campus Nexus')
      .setHelpText('How would you rate your overall experience with the platform?')
      .setBounds(1, 5)
      .setLabels('1 - Highly Dissatisfied', '5 - Highly Satisfied')
      .setRequired(true);

  // Net Promoter Score (1 to 10)
  var npsScale = form.addScaleItem();
  npsScale.setTitle('Likelihood to Recommend')
      .setHelpText('How likely are you to recommend Campus Nexus to your fellow RVCE peers? (10 = Extremely Likely)')
      .setBounds(1, 10)
      .setLabels('1 - Not at all likely', '10 - Extremely likely')
      .setRequired(true);

  // Primary Device Used
  var deviceItem = form.addMultipleChoiceItem();
  deviceItem.setTitle('Primary Device Used to Access Campus Nexus')
      .setRequired(true)
      .setChoiceValues([
        'Laptop / Desktop Computer',
        'Mobile Phone (Chrome/Safari browser)',
        'Tablet / iPad'
      ]);

  // ----------------------------------------------------------------------------
  // SECTION 3: Feature-by-Feature Evaluation
  // ----------------------------------------------------------------------------
  form.addSectionHeaderItem()
      .setTitle('Section 3: Feature-by-Feature Evaluation')
      .setHelpText('Rate each of the core platform modules on a scale from 1 (Poor) to 5 (Excellent).');

  // 1. Discovery
  form.addScaleItem()
      .setTitle('1. Student Discovery & Search')
      .setHelpText('Finding peers by branch, year of study, technical skills, and viewing verified student profiles.')
      .setBounds(1, 5)
      .setLabels('1 - Poor', '5 - Excellent')
      .setRequired(true);

  // 2. Team Building & Cluster Themes
  form.addScaleItem()
      .setTitle('2. Team Formation & Multidisciplinary Cluster Themes')
      .setHelpText('Creating inter-branch teams, invite codes, multidisciplinary balance, and cluster theme assignment.')
      .setBounds(1, 5)
      .setLabels('1 - Poor', '5 - Excellent')
      .setRequired(true);

  // 3. Real-Time Chat
  form.addScaleItem()
      .setTitle('3. Real-Time Peer & Team Messaging')
      .setHelpText('Direct peer-to-peer chats, team group conversations, instant notification dots, and communication.')
      .setBounds(1, 5)
      .setLabels('1 - Poor', '5 - Excellent')
      .setRequired(true);

  // 4. Notifications
  form.addScaleItem()
      .setTitle('4. Notifications & Academic Announcements')
      .setHelpText('Delivery of department and cohort-targeted notices, file attachments, and email dispatch.')
      .setBounds(1, 5)
      .setLabels('1 - Poor', '5 - Excellent')
      .setRequired(true);

  // 5. Project Dashboard & Marks
  form.addScaleItem()
      .setTitle('5. Project Dashboard & Evaluation Phase Tracking')
      .setHelpText('Viewing project milestones, phase submission details, and mentor mark entries.')
      .setBounds(1, 5)
      .setLabels('1 - Poor', '5 - Excellent')
      .setRequired(true);

  // ----------------------------------------------------------------------------
  // SECTION 4: Platform Performance & Usability
  // ----------------------------------------------------------------------------
  form.addSectionHeaderItem()
      .setTitle('Section 4: Performance, Design & Bug Reporting')
      .setHelpText('Help us optimize the technical performance and user interface.');

  // UI Design Cleanliness
  form.addScaleItem()
      .setTitle('User Interface (UI) & Visual Experience')
      .setHelpText('Cleanliness of layout, dark/light mode, mobile responsiveness, and ease of navigation.')
      .setBounds(1, 5)
      .setLabels('1 - Cluttered / Difficult', '5 - Modern & Intuitive')
      .setRequired(true);

  // App Speed
  form.addMultipleChoiceItem()
      .setTitle('App Loading Speed & Responsiveness')
      .setRequired(true)
      .setChoiceValues([
        'Lightning Fast (instant response)',
        'Good & Smooth (acceptable load times)',
        'Noticeable delays on some actions',
        'Laggy / Needs performance optimization'
      ]);

  // Bugs Encountered
  form.addParagraphTextItem()
      .setTitle('Bugs or Glitches Encountered')
      .setHelpText('Did you encounter any error messages, broken links, or visual glitches? If yes, please describe what happened.')
      .setRequired(false);

  // ----------------------------------------------------------------------------
  // SECTION 5: Qualitative Insights & Future Requests
  // ----------------------------------------------------------------------------
  form.addSectionHeaderItem()
      .setTitle('Section 5: Feature Requests & Suggestions')
      .setHelpText('Your direct input drives the next major update of Campus Nexus.');

  // Best Feature
  form.addParagraphTextItem()
      .setTitle('What feature do you like the most in Campus Nexus?')
      .setHelpText('Which part of the platform was most helpful or impressed you the most?')
      .setRequired(false);

  // Future Improvements
  form.addParagraphTextItem()
      .setTitle('What new features or improvements would you like to see?')
      .setHelpText('e.g., automated team file submission, mentor scheduling calendar, GitHub integration, etc.')
      .setRequired(false);

  // Message for Developer & Admin
  form.addParagraphTextItem()
      .setTitle('Message for the Developer & Administration')
      .setHelpText('Any parting thoughts, praise, or message for Ishaen Bethur and the department coordinators?')
      .setRequired(false);

  // ----------------------------------------------------------------------------
  // FINALIZE & LOG URLS
  // ----------------------------------------------------------------------------
  var publishedUrl = form.getPublishedUrl();
  var editUrl = form.getEditUrl();

  Logger.log('====================================================');
  Logger.log('🎉 CAMPUS NEXUS FEEDBACK FORM CREATED SUCCESSFULLY!');
  Logger.log('====================================================');
  Logger.log('PUBLIC STUDENT FORM URL (Share this or put in app):');
  Logger.log(publishedUrl);
  Logger.log('----------------------------------------------------');
  Logger.log('ADMIN EDIT & RESPONSES URL (Only you have access):');
  Logger.log(editUrl);
  Logger.log('====================================================');

  return {
    publishedUrl: publishedUrl,
    editUrl: editUrl
  };
}
