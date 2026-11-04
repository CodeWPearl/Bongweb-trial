/*
  Bongweb services: edit this file to change the cards on the page.

  status:
    "show"         card is shown with an enquiry button
    "coming-soon"  card is shown greyed out with a "Coming soon" tag and a "Tell me when" button
    "hide"         card is not shown at all

  Group order and promises come from GROUPS. Card order follows this list.
*/

window.BONGWEB_CONFIG = {
  // WhatsApp number in international format, digits only (no +, spaces or dashes).
  // TODO: replace with the real Bongweb number before launch.
  whatsappNumber: "910000000000",
  // TODO: replace with the real enquiry email.
  email: "hello@bongweb.in",
  // Featured "Digital presence pack" band. Set to false if Suman doesn't confirm it.
  showFeaturedPack: true,
};

window.BONGWEB_GROUPS = [
  { id: "build",   name: "Build",   promise: "Your business online, and working." },
  { id: "brand",   name: "Brand",   promise: "Look like a real, trusted business." },
  { id: "content", name: "Content", promise: "Get seen and remembered, every week." },
  { id: "growth",  name: "Growth",  promise: "Get enquiries, and see the numbers." },
];

window.BONGWEB_SERVICES = [
  // Build
  { group: "build", status: "show",        name: "Business website or landing page",        gets: "A live site on your domain with SSL, content you can edit, and a handover note." },
  { group: "build", status: "show",        name: "Chatbot or WhatsApp agent",               gets: "A bot that answers questions, books slots or captures leads, linked to the tools you use." },
  { group: "build", status: "show",        name: "Web app or SaaS MVP",                     gets: "A working app with login, a database, and a live deploy." },
  { group: "build", status: "show",        name: "Scrapers, dashboards and data tools",     gets: "A tool that collects your data on a schedule and shows it clearly." },
  { group: "build", status: "show",        name: "Shopify, WordPress and no-code sites",    gets: "A store or site on your own platform, so you keep full control." },
  { group: "build", status: "show",        name: "Bug fixing and maintenance",              gets: "A fix with a note on what caused it, or monthly care for your site." },
  { group: "build", status: "coming-soon", name: "Workflow automation (n8n, Make, Zapier)", gets: "Flows linking your CRM, email, forms and sheets, with alerts when something breaks." },
  { group: "build", status: "hide",        name: "Mobile app",                              gets: "An Android or iOS app." },

  // Brand
  { group: "brand", status: "show",        name: "Brand identity and kit",                  gets: "Logo, colours, fonts, usage rules and 6–10 ready templates." },
  { group: "brand", status: "show",        name: "Pitch decks",                             gets: "A 10–15 slide deck with speaker notes, plus a PDF." },
  { group: "brand", status: "show",        name: "Print, packaging, posters and menus",     gets: "Print-ready files plus the editable source." },
  { group: "brand", status: "show",        name: "UI/UX and landing-page design",           gets: "Figma designs for desktop and mobile, with a clickable prototype." },

  // Content
  { group: "content", status: "show",        name: "Social content",                        gets: "A 30-day calendar with 12–30 posts and carousels, captions included." },
  { group: "content", status: "coming-soon", name: "Short-form video and AI video editing",  gets: "3–12 reels a month, 15–60 seconds each, with captions." },
  { group: "content", status: "coming-soon", name: "Copy, blogs and SEO",                   gets: "Website copy, 2–4 blog posts a month, and on-page SEO." },

  // Growth
  { group: "growth", status: "show",        name: "Creator and PR outreach",                gets: "A checked list of 20–50 creators, pitches, and a tracker for results." },
  { group: "growth", status: "show",        name: "Lead gen and cold outreach",             gets: "A target list, messages and follow-ups over email or WhatsApp, with a weekly reply report." },
  { group: "growth", status: "show",        name: "Strategy and reporting",                 gets: "A one-page plan with numbers, then a one-page report every week." },
  { group: "growth", status: "coming-soon", name: "Ad creatives and paid ads",              gets: "5–10 ad variants, a budget with a stop rule, and weekly results." },
];
