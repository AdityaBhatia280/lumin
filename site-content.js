// Site text. Photos, partners, blog posts, email and Instagram live in data/site-data.js (edit them at /admin).
window.LUMEN_CONTENT = {
  heroTag: 'A global, student-led 501(c)(3) nonprofit',
  heroLine: 'Turning UV awareness and sun protection into a natural, lifelong habit, so young people everywhere can safely enjoy the outdoors.',
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
  photoSpots: [
    { key: 'focus-digital', label: 'Home: Focus area 1 (Digital)', page: 'Home' },
    { key: 'focus-community', label: 'Home: Focus area 2 (Community)', page: 'Home' },
    { key: 'focus-network', label: 'Home: Focus area 3 (Chapters & partnerships)', page: 'Home' },
    { key: 'about-hero', label: 'About: Top photo', page: 'About' },
    { key: 'about-approach', label: 'About: Approach photo', page: 'About' },
    { key: 'impact-hero', label: 'Impact: Top photo', page: 'Impact' },
    { key: 'partners-hero', label: 'Partnerships: Top photo', page: 'Partnerships' },
    { key: 'contact-hero', label: 'Contact: Photo', page: 'Contact' }
  ]
};
