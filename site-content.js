// Site text. Photos, partners, blog posts, email and Instagram live in data/site-data.js (edit them at /admin).
window.LUMEN_CONTENT = {
  heroLine: 'A global, student-led 501(c)(3) nonprofit turning sun safety into a lifelong habit.',
  oneLiner: 'Project Lumin is a student-led public health initiative protecting youth from the cumulative dangers of UV radiation through digital tools, hands-on community outreach, and a growing network of chapters and partners.',
  mission: 'Empowering young people to safely enjoy the outdoors by turning UV awareness and sun protection into a natural, lifelong daily habit.',
  approach: 'Rather than telling kids to stay indoors, Project Lumin makes sun safety accessible, interactive, and routine, so communities have everything they need to stay protected under the sun.',
  audience: ['Children', 'Students', 'Youth athletes', 'Parents', 'Educators', 'Summer camps', 'Outdoor community organizations'],
  focusAreas: [
    {
      id: 'digital', number: '01', title: 'Digital ecosystem & social media',
      name: 'Sun Safety at Your Fingertips',
      blurb: 'Easy-to-use tools, short videos, and daily reminders that make protecting your skin simple to understand and hard to forget.',
      short: 'Tools, trackers, and content that make UV safety accessible anywhere.',
      text: 'Everything we build, publish, and manage online to meet young people where they already spend their time.',
      points: [
        ['Website', 'Our central platform for sun-safety guides, project updates, and educational resources for youth, parents, and educators.'],
        ['UV tools & trackers', 'Interactive UV-tracker interfaces that show real-time UV index levels and when to seek shade or reapply.'],
        ['Social media & content', 'Short-form videos, infographics, and daily reminders on Instagram and beyond.'],
        ['Apps & interactive features', 'Web and mobile experiences that gamify sun-safe habits and make UV science effortless.']
      ]
    },
    {
      id: 'community', number: '02', title: 'Community outreach & events',
      name: 'Showing Up Where Kids Play',
      blurb: 'We bring free sunscreen, color-changing UV wristbands, and hands-on lessons to parks, schools, camps, and sports events.',
      short: 'Booths, free sunscreen, UV wristbands, and hands-on workshops.',
      text: 'Our physical presence in the community: going outside, meeting people face to face, and putting sun protection directly into their hands.',
      points: [
        ['Live events & booths', 'Interactive booths at local festivals, youth sports tournaments, parks, and school events.'],
        ['Gear & resource distribution', 'Free sunscreen, sun-safety kits, and UV-revealing wristbands that change color when UV rays are strong.'],
        ['Workshops', 'Hands-on, age-appropriate demonstrations at schools, camps, and outdoor programs that teach the science of UV on the spot.']
      ]
    },
    {
      id: 'network', number: '03', title: 'Chapters & partnerships',
      name: 'A Movement Led by Students',
      blurb: 'Students and partner organizations carry Project Lumin into their own schools and cities, so sun safety keeps spreading.',
      short: 'Student chapters and partner organizations that scale the movement.',
      text: 'Turning Project Lumin from a local initiative into a widespread movement through student leadership and collaboration.',
      points: [
        ['Project Lumin chapters', 'Student-led chapters across schools, cities, and regions that run outreach and events in their own communities.'],
        ['Organizational partnerships', 'Youth sports leagues, health organizations, dermatology clinics, nonprofits, and school districts that co-host events and sponsor drives.'],
        ['Toolkit sharing', 'Ready-to-use digital and physical toolkits so any chapter or partner can bring Project Lumin to their area.']
      ]
    }
  ],
  // Every place a photo appears. Pick a specific photo for any of these at /admin, or leave it on "Random".
  teamStory: {
    title: 'What inspired us to build Project Lumin',
    text: [
      'We saw kids spend whole summers outside with no sunscreen and no idea how strong the sun was, and no one was teaching them in a way they cared about. Nothing like Project Lumin existed, so we built it to redefine the standard of sun safety.'
    ]
  },
  // Application forms on the Get Involved page. Submissions appear in the admin under "Applications".
  // Field types: text, email, tel, url, number, date, textarea, select (needs options).
  applications: [
    {
      id: 'network', title: 'Add Your School or Community to Our Network', icon: '🌎',
      short: 'Join our network of schools and communities and get sun-safety resources for your students.',
      intro: 'Schools and communities in our network receive sun-safety resources, invitations to events, and the chance to work with Project Lumin. Tell us about yours.',
      fields: [
        {name: 'school', label: 'School or community name', type: 'text', required: true},
        {name: 'kind', label: 'Type', type: 'select', required: true, options: ['School', 'College or university', 'Community group', 'Summer camp', 'Youth program', 'Other']},
        {name: 'location', label: 'City and state (or country)', type: 'text', required: true},
        {name: 'name', label: 'Your name', type: 'text', required: true},
        {name: 'email', label: 'Email', type: 'email', required: true},
        {name: 'role', label: 'Your role', type: 'text', required: true},
        {name: 'size', label: 'About how many students or members?', type: 'select', options: ['Under 50', '50 to 200', '200 to 1,000', 'Over 1,000']},
        {name: 'photo', label: 'Link to a photo of your school or community (optional)', type: 'url'},
        {name: 'notes', label: 'Anything else we should know?', type: 'textarea'}
      ]
    },
    {
      id: 'partner', title: 'Partner With Us', icon: '🤝',
      short: 'Organizations, businesses and nonprofits: co-host events, sponsor supplies or share resources.',
      intro: 'We partner with organizations of every size, from youth sports leagues and health organizations to nonprofits and school districts. Tell us about your organization and how you would like to work together.',
      fields: [
        {name: 'organization', label: 'Organization name', type: 'text', required: true},
        {name: 'website', label: 'Website', type: 'url'},
        {name: 'name', label: 'Contact name', type: 'text', required: true},
        {name: 'email', label: 'Email', type: 'email', required: true},
        {name: 'phone', label: 'Phone', type: 'tel'},
        {name: 'orgType', label: 'Type of organization', type: 'select', required: true, options: ['Nonprofit', 'School or district', 'Youth sports league', 'Healthcare or dermatology', 'Business', 'Student organization', 'Other']},
        {name: 'how', label: 'How would you like to partner?', type: 'select', required: true, options: ['Co-host an event', 'Sponsor sunscreen or supplies', 'Share resources or expertise', 'Cross-promote each other', 'Something else']},
        {name: 'details', label: 'Tell us more', type: 'textarea', required: true}
      ]
    },
    {
      id: 'ambassador', title: 'Become an Ambassador', icon: '⭐',
      short: 'Represent Project Lumin online and at school, and lead peer-to-peer sun-safety education.',
      intro: 'Ambassadors represent Project Lumin, spread awareness on campus and online, and help lead sun-safety education among their peers.',
      fields: [
        {name: 'name', label: 'Your full name', type: 'text', required: true},
        {name: 'email', label: 'Email', type: 'email', required: true},
        {name: 'phone', label: 'Phone', type: 'tel'},
        {name: 'school', label: 'School', type: 'text', required: true},
        {name: 'grade', label: 'Grade', type: 'select', required: true, options: ['6th', '7th', '8th', '9th', '10th', '11th', '12th', 'College']},
        {name: 'location', label: 'City and state (or country)', type: 'text', required: true},
        {name: 'social', label: 'Social media handle (optional)', type: 'text'},
        {name: 'why', label: 'Why do you want to be a Project Lumin ambassador?', type: 'textarea', required: true},
        {name: 'ideas', label: 'What would you do as an ambassador?', type: 'textarea'},
        {name: 'time', label: 'How much time could you give each month?', type: 'select', options: ['1 to 2 hours', '3 to 5 hours', '6 to 10 hours', 'More than 10 hours']}
      ]
    },
    {
      id: 'volunteer', title: 'Volunteer at an Event', icon: '🙋',
      short: 'Help at outreach booths, service days, kit-building sessions, or with design and social media.',
      intro: 'Volunteers make every Project Lumin event happen. Sign up and we will let you know about upcoming outreach booths, service days and work sessions.',
      fields: [
        {name: 'name', label: 'Your full name', type: 'text', required: true},
        {name: 'email', label: 'Email', type: 'email', required: true},
        {name: 'phone', label: 'Phone', type: 'tel'},
        {name: 'school', label: 'School (if you are a student)', type: 'text'},
        {name: 'grade', label: 'Grade', type: 'select', options: ['6th', '7th', '8th', '9th', '10th', '11th', '12th', 'College', 'Not a student']},
        {name: 'interest', label: 'What would you like to help with?', type: 'select', required: true, options: ['Outreach booths', 'Donation and service days', 'Making kits', 'Design and social media', 'Anything that is needed']},
        {name: 'availability', label: 'When are you usually available?', type: 'textarea'},
        {name: 'hours', label: 'Do you need volunteer hours verified?', type: 'select', options: ['Yes', 'No']}
      ]
    },
    {
      id: 'visit', title: 'Request a Visit or Booth', icon: '☀️',
      short: 'Invite Project Lumin to your classroom, camp, sports event or community event.',
      intro: 'We bring sun-safety presentations, hands-on activities, free sunscreen and UV wristbands to schools, camps, sports events and community gatherings.',
      fields: [
        {name: 'name', label: 'Contact name', type: 'text', required: true},
        {name: 'email', label: 'Email', type: 'email', required: true},
        {name: 'phone', label: 'Phone', type: 'tel'},
        {name: 'organization', label: 'School, organization or event name', type: 'text', required: true},
        {name: 'kind', label: 'What kind of visit?', type: 'select', required: true, options: ['Classroom presentation', 'Summer camp', 'Sports event', 'Community event or festival', 'Other']},
        {name: 'date', label: 'Preferred date', type: 'date'},
        {name: 'location', label: 'Location (city and venue)', type: 'text', required: true},
        {name: 'audience', label: 'Expected number of people', type: 'select', options: ['Under 25', '25 to 100', '100 to 500', 'Over 500']},
        {name: 'details', label: 'What are you hoping for?', type: 'textarea', required: true}
      ]
    }
  ],
  photoSpots: [
    { key: 'focus-digital', label: 'Home: Focus area 1 (Digital)', page: 'Home' },
    { key: 'focus-community', label: 'Home: Focus area 2 (Community)', page: 'Home' },
    { key: 'focus-network', label: 'Home: Focus area 3 (Chapters & partnerships)', page: 'Home' },
    { key: 'about-hero', label: 'About: Top photo', page: 'About' },
    { key: 'about-approach', label: 'About: Approach photo', page: 'About' },
    { key: 'impact-hero', label: 'Impact: Top photo', page: 'Impact' },
    { key: 'partners-hero', label: 'Partnerships: Top photo', page: 'Partnerships' },
    { key: 'contact-hero', label: 'Contact: Photo', page: 'Contact' },
    { key: 'team-hero', label: 'Our Team: Inspiration photo', page: 'Our Team' }
  ]
};
