import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

// Real, topic-relevant stock photos, downloaded once and served as local
// static assets (public/images/seed) rather than hotlinked — the source
// service (loremflickr) does not reliably return the same photo for the
// same URL over time, so hotlinking would let images silently drift.
const LOCAL_IMAGES: Record<number, string> = {
  726: "analytics-dashboard",
  301: "coding-laptop",
  720: "computer-keyboard",
  703: "coworking-office",
  732: "hackathon-coding",
  736: "laptop-coffee",
  722: "laptop-desk",
  704: "laptop-typing",
  739: "macbook-desk",
  710: "meeting-laptop",
  749: "networking-server",
  721: "office-building",
  701: "office-team",
  731: "office-workspace",
  717: "programmer-desk",
  304: "server-datacenter",
  306: "smartphone-app",
  702: "startup-office",
  747: "teamwork-office",
  504: "uxdesign",
  745: "website-screen",
  714: "whiteboard-brainstorm",
};

const img = (keywords: string, lock: number) => {
  const name = LOCAL_IMAGES[lock];
  if (!name) throw new Error(`No local image mapped for lock ${lock} (${keywords})`);
  return `/images/seed/${name}.jpg`;
};

// Real human headshots (pravatar's fixed photo set) for user/testimonial avatars.
const avatar = (imgNum: number) => `https://i.pravatar.cc/200?img=${imgNum}`;

async function main() {
  console.log("Seeding database...");

  // --- Users ---
  const adminPassword = await bcrypt.hash("Admin123!", 10);
  const editorPassword = await bcrypt.hash("Editor123!", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@mawuwebs.com" },
    update: {},
    create: {
      name: "Ama Mensah",
      email: "admin@mawuwebs.com",
      passwordHash: adminPassword,
      role: "ADMIN",
      image: avatar(26),
    },
  });

  const editor = await prisma.user.upsert({
    where: { email: "editor@mawuwebs.com" },
    update: {},
    create: {
      name: "Kwame Asante",
      email: "editor@mawuwebs.com",
      passwordHash: editorPassword,
      role: "EDITOR",
      image: avatar(18),
    },
  });

  // --- Site Settings ---
  await prisma.siteSettings.upsert({
    where: { id: "main" },
    update: {},
    create: {
      id: "main",
      siteName: "Mawuwebs Solutions",
      tagline: "IT Solutions & Digital Services",
      contactEmail: "hello@mawuwebs.com",
      phone: "+1 (555) 123-4567",
      address: "123 Innovation Drive, Suite 400, Tech City, TC 10101",
      mapEmbedUrl:
        "https://www.google.com/maps?q=123+Innovation+Drive%2C+Suite+400%2C+Tech+City%2C+TC+10101&output=embed",
      footerText:
        "IT support, infrastructure, security and software for growing businesses.",
      heroHeadline: "IT Solutions That Keep Your Business Running and Growing",
      heroSubheading:
        "From websites and apps to networks, security and everyday IT support, we look after the technology so you can focus on your business.",
      heroCtaPrimaryText: "Start a Project",
      heroCtaPrimaryUrl: "/start-a-project",
      heroCtaSecondaryText: "View Our Work",
      heroCtaSecondaryUrl: "/portfolio",
      heroImage: img("analytics,dashboard", 726),
      metrics: JSON.stringify([
        { label: "Projects Delivered", value: "120+" },
        { label: "Happy Clients", value: "85+" },
        { label: "Years of Experience", value: "8+" },
        { label: "Team Experts", value: "24" },
      ]),
      newsletterEnabled: true,
    },
  });

  // --- Social Links ---
  const socials = [
    { platform: "LinkedIn", url: "https://linkedin.com/company/mawuwebs", order: 1 },
    { platform: "Twitter", url: "https://twitter.com/mawuwebs", order: 2 },
    { platform: "GitHub", url: "https://github.com/mawuwebs", order: 3 },
    { platform: "Instagram", url: "https://instagram.com/mawuwebs", order: 4 },
  ];
  for (const s of socials) {
    const existing = await prisma.socialLink.findFirst({ where: { platform: s.platform } });
    if (!existing) await prisma.socialLink.create({ data: s });
  }

  // --- Categories ---
  const postCategoryNames = ["Web Development", "Design", "Business", "Technology"];
  const postCategories: Record<string, { id: string }> = {};
  for (const name of postCategoryNames) {
    const slug = slugify(name);
    postCategories[name] = await prisma.category.upsert({
      where: { slug },
      update: {},
      create: { name, slug, type: "POST" },
    });
  }

  const projectCategoryNames = ["Web App", "E-Commerce", "Branding", "Mobile App"];
  const projectCategories: Record<string, { id: string }> = {};
  for (const name of projectCategoryNames) {
    const slug = slugify(name);
    projectCategories[name] = await prisma.category.upsert({
      where: { slug },
      update: {},
      create: { name, slug, type: "PROJECT" },
    });
  }

  // --- Tags ---
  const tagNames = ["Next.js", "React", "UI/UX", "SEO", "Performance", "Startups", "Cloud", "API"];
  const tags: Record<string, { id: string }> = {};
  for (const name of tagNames) {
    const slug = slugify(name);
    tags[name] = await prisma.tag.upsert({
      where: { slug },
      update: {},
      create: { name, slug },
    });
  }

  // --- Services ---
  const services = [
    {
      title: "Web Development",
      icon: "Code2",
      description: "Fast, scalable, and secure websites and web applications built on modern frameworks.",
      content: `<p>We build custom websites and web applications engineered for performance, scalability, and long-term maintainability. From marketing sites to complex internal tools, our engineering team uses modern frameworks like Next.js and React to deliver experiences that load fast and rank well.</p><h3>What's included</h3><ul><li>Custom front-end and back-end development</li><li>API design and third-party integrations</li><li>Performance optimization and Core Web Vitals tuning</li><li>Ongoing maintenance and support plans</li></ul>`,
      featured: true,
      order: 4,
      image: img("coding,laptop", 301),
    },
    {
      title: "UI/UX Design",
      icon: "Palette",
      description: "Human-centered design that turns visitors into loyal customers.",
      content: `<p>Great design is invisible — it just works. Our design team researches your users, maps their journeys, and crafts interfaces that are intuitive, accessible, and on-brand.</p><h3>What's included</h3><ul><li>User research and journey mapping</li><li>Wireframing and interactive prototypes</li><li>Design systems and component libraries</li><li>Usability testing</li></ul>`,
      featured: false,
      order: 6,
      image: img("uxdesign", 504),
    },
    {
      title: "E-Commerce Solutions",
      icon: "ShoppingCart",
      description: "Conversion-focused online stores that turn browsers into buyers.",
      content: `<p>We build e-commerce experiences that make it effortless to buy — from product discovery to checkout. Whether you need a headless storefront or a full platform migration, we've got you covered.</p><h3>What's included</h3><ul><li>Custom storefronts on modern headless commerce platforms</li><li>Payment gateway and inventory integrations</li><li>Cart and checkout optimization</li><li>Analytics and conversion tracking</li></ul>`,
      featured: false,
      order: 7,
      image: img("laptop,typing", 704),
    },
    {
      title: "Cloud & DevOps",
      icon: "Cloud",
      description: "Reliable infrastructure and deployment pipelines that scale with you.",
      content: `<p>We design cloud infrastructure that scales automatically and deploys safely. Our DevOps practices reduce downtime and let your team ship with confidence.</p><h3>What's included</h3><ul><li>Cloud architecture and infrastructure as code</li><li>CI/CD pipeline setup</li><li>Monitoring, logging, and alerting</li><li>Security hardening and audits</li></ul>`,
      featured: true,
      order: 9,
      image: img("networking,server", 749),
    },
    {
      title: "SEO & Digital Marketing",
      icon: "TrendingUp",
      description: "Data-driven strategies that increase organic traffic and qualified leads.",
      content: `<p>Being built well isn't enough — you need to be found. We combine technical SEO with content strategy to help your site climb search rankings and convert more visitors.</p><h3>What's included</h3><ul><li>Technical SEO audits</li><li>Keyword and content strategy</li><li>Local SEO and Google Business optimization</li><li>Monthly performance reporting</li></ul>`,
      featured: false,
      order: 10,
      image: img("analytics,dashboard", 726),
    },
    {
      title: "Mobile App Development",
      icon: "Smartphone",
      description: "Native-quality mobile apps for iOS and Android from a single codebase.",
      content: `<p>We build cross-platform mobile applications that feel native, perform beautifully, and ship faster than separate iOS/Android codebases.</p><h3>What's included</h3><ul><li>Cross-platform app development</li><li>App Store and Play Store deployment</li><li>Push notifications and offline support</li><li>Ongoing feature development</li></ul>`,
      featured: false,
      order: 11,
      image: img("smartphone,app", 306),
    },
    {
      title: "IT Support & Managed Services",
      icon: "Headset",
      description: "Responsive help desk and proactive care so your people can keep working.",
      content: `<p>When a laptop dies or email stops working, work stops. We give your team a number to call and someone who picks up, and we look after your systems before things break.</p><h3>What's included</h3><ul><li>Help desk and remote support for staff</li><li>On-site visits when a problem needs hands</li><li>User accounts, email and software administration</li><li>Monitoring, updates and patching</li><li>Monthly plans or pay-as-you-go support</li></ul>`,
      featured: true,
      order: 1,
      image: "/images/seed/laptop-desk.jpg",
    },
    {
      title: "Networking & Infrastructure",
      icon: "Network",
      description: "Reliable wired and Wi-Fi networks, servers and structured cabling, designed and installed.",
      content: `<p>A good network is invisible. A bad one costs hours every week. We plan, install and maintain networks that stay fast and stay up.</p><h3>What's included</h3><ul><li>Office LAN and Wi-Fi design and installation</li><li>Structured cabling and server rooms</li><li>Routers, switches, firewalls and access points</li><li>Internet failover and VPN for remote staff</li><li>Network audits and troubleshooting</li></ul>`,
      featured: true,
      order: 2,
      image: "/images/seed/networking-server.jpg",
    },
    {
      title: "Cybersecurity",
      icon: "ShieldCheck",
      description: "Practical protection for your devices, accounts and data, without the jargon.",
      content: `<p>Most attacks succeed through simple gaps: weak passwords, unpatched software, an email that looked real. We close those gaps and help your team spot the rest.</p><h3>What's included</h3><ul><li>Security assessments and risk reviews</li><li>Endpoint protection, firewalls and email filtering</li><li>Multi-factor authentication and access control</li><li>Staff awareness training</li><li>Incident response and recovery help</li></ul>`,
      featured: true,
      order: 3,
      image: "/images/seed/server-datacenter.jpg",
    },
    {
      title: "Hardware & Equipment",
      icon: "Laptop",
      description: "Advice, supply and setup for computers, printers and business equipment.",
      content: `<p>Buying the wrong equipment is expensive. We recommend what your team actually needs, supply it, and set it up so it works from day one.</p><h3>What's included</h3><ul><li>Laptops, desktops, monitors and peripherals</li><li>Printers, scanners and point-of-sale hardware</li><li>Installation, configuration and data migration</li><li>Warranty handling and repairs</li><li>Equipment refresh planning</li></ul>`,
      featured: true,
      order: 5,
      image: "/images/seed/computer-keyboard.jpg",
    },
    {
      title: "Backup & Disaster Recovery",
      icon: "HardDrive",
      description: "Make sure one failure, theft or mistake never costs you your data.",
      content: `<p>Backups only matter on the day you need them. We set them up properly, test that they restore, and plan how your business carries on if something goes wrong.</p><h3>What's included</h3><ul><li>Automated on-site and cloud backups</li><li>Restore testing so you know it works</li><li>Business continuity and recovery planning</li><li>Data migration between systems</li><li>Ransomware recovery support</li></ul>`,
      featured: false,
      order: 8,
      image: "/images/seed/office-workspace.jpg",
    },
    {
      title: "IT Consulting & Training",
      icon: "Briefcase",
      description: "Independent advice on technology decisions, plus training that makes it stick.",
      content: `<p>Not sure what to buy, build or switch to? We give honest, vendor-neutral advice, then help your team get comfortable with the tools you choose.</p><h3>What's included</h3><ul><li>IT strategy and technology roadmaps</li><li>Software and vendor selection</li><li>Cost and licence reviews</li><li>Staff training and documentation</li><li>Project management for IT rollouts</li></ul>`,
      featured: false,
      order: 12,
      image: "/images/seed/meeting-laptop.jpg",
    },
  ];

  for (const s of services) {
    const slug = slugify(s.title);
    await prisma.service.upsert({
      where: { slug },
      update: {},
      create: {
        title: s.title,
        slug,
        description: s.description,
        content: s.content,
        icon: s.icon,
        featuredImage: s.image,
        status: "PUBLISHED",
        featured: s.featured,
        order: s.order,
        metaTitle: `${s.title} | Mawuwebs Solutions`,
        metaDescription: s.description,
        metaKeywords: `${s.title}, Mawuwebs, digital solutions`,
        publishedAt: new Date(),
      },
    });
  }

  // --- Projects ---
  const projects = [
    {
      title: "Fintech Dashboard Platform",
      description: "A real-time analytics dashboard for a Series B fintech startup.",
      client: "Nimbus Pay",
      category: "Web App",
      tags: ["Next.js", "React", "API"],
      featured: true,
      image: img("analytics,dashboard", 726),
      gallery: [img("networking,server", 749), img("meeting,laptop", 710), img("coding,laptop", 301)],
    },
    {
      title: "Artisan Coffee E-Commerce",
      description: "A headless storefront that grew online revenue by 3x in six months.",
      client: "Roast & Co.",
      category: "E-Commerce",
      tags: ["Next.js", "SEO", "Performance"],
      featured: true,
      image: img("macbook,desk", 739),
      gallery: [img("laptop,coffee", 736), img("coworking,office", 703), img("startup,office", 702)],
    },
    {
      title: "HealthTrack Mobile App",
      description: "A cross-platform wellness app with over 50,000 downloads.",
      client: "HealthTrack Inc.",
      category: "Mobile App",
      tags: ["React", "API", "Cloud"],
      featured: true,
      image: img("uxdesign", 504),
      gallery: [img("laptop,typing", 704), img("computer,keyboard", 720), img("hackathon,coding", 732)],
    },
    {
      title: "Nova Real Estate Portal",
      description: "A property listing platform with advanced search and virtual tours.",
      client: "Nova Realty",
      category: "Web App",
      tags: ["Next.js", "UI/UX"],
      featured: false,
      image: img("office,building", 721),
      gallery: [
        img("coworking,office", 703),
        img("office,workspace", 731),
        img("teamwork,office", 747),
      ],
    },
    {
      title: "Brightpath Learning LMS",
      description: "A learning management system serving 20,000+ students.",
      client: "Brightpath Education",
      category: "Web App",
      tags: ["React", "Cloud", "API"],
      featured: false,
      image: img("laptop,typing", 704),
      gallery: [
        img("coding,laptop", 301),
        img("whiteboard,brainstorm", 714),
        img("uxdesign", 504),
      ],
    },
    {
      title: "Vertex Logistics SaaS",
      description: "A route optimization SaaS platform for logistics companies.",
      client: "Vertex Freight",
      category: "Web App",
      tags: ["Next.js", "Startups", "Performance"],
      featured: false,
      image: img("networking,server", 749),
      gallery: [img("server,datacenter", 304), img("computer,keyboard", 720), img("office,team", 701)],
    },
    {
      title: "Solstice Skincare Rebrand",
      description: "A full brand identity and e-commerce relaunch for a DTC skincare line.",
      client: "Solstice Skincare",
      category: "Branding",
      tags: ["UI/UX", "SEO"],
      featured: false,
      image: img("laptop,coffee", 736),
      gallery: [img("startup,office", 702), img("whiteboard,brainstorm", 714), img("computer,keyboard", 720)],
    },
  ];

  for (const [i, p] of projects.entries()) {
    const slug = slugify(p.title);
    await prisma.project.upsert({
      where: { slug },
      update: {},
      create: {
        title: p.title,
        slug,
        description: p.description,
        content: `<p>${p.description}</p><p>Our team partnered with ${p.client} to design and build a solution from the ground up, focused on measurable business outcomes. The result: a faster, more reliable product that scales with the company's growth.</p><h3>The Challenge</h3><p>${p.client} needed a modern platform that could keep pace with rapid user growth while remaining easy for their internal team to maintain.</p><h3>The Solution</h3><p>We delivered a custom build using a modern, scalable stack — with careful attention to performance, accessibility, and long-term maintainability.</p><h3>The Results</h3><ul><li>Significant improvement in page load performance</li><li>Increased user engagement and conversion</li><li>A maintainable codebase the client's team can build on</li></ul>`,
        featuredImage: p.image,
        gallery: JSON.stringify(p.gallery),
        client: p.client,
        projectUrl: "https://example.com",
        status: "PUBLISHED",
        featured: p.featured,
        order: i,
        categoryId: projectCategories[p.category].id,
        tags: { connect: p.tags.map((t) => ({ id: tags[t].id })) },
        metaTitle: `${p.title} | Mawuwebs Solutions Portfolio`,
        metaDescription: p.description,
        metaKeywords: `${p.title}, ${p.category}, portfolio`,
        publishedAt: new Date(),
      },
    });
  }

  // --- Blog Posts ---
  const posts = [
    {
      title: "5 Signs Your Website Needs a Redesign in 2026",
      excerpt: "Slow load times and dated design aren't just cosmetic issues — they cost you customers. Here's how to know when it's time.",
      category: "Web Development",
      tags: ["Performance", "SEO"],
      featured: true,
      image: img("macbook,desk", 739),
    },
    {
      title: "Why We Chose Next.js for Every Client Project",
      excerpt: "A look at the technical and business reasons Next.js has become our default framework for client work.",
      category: "Technology",
      tags: ["Next.js", "React"],
      featured: false,
      image: img("coding,laptop", 301),
    },
    {
      title: "The Real Cost of a Slow Website",
      excerpt: "Every second of load time impacts conversion. We break down the data and what to do about it.",
      category: "Business",
      tags: ["Performance", "SEO"],
      featured: false,
      image: img("analytics,dashboard", 726),
    },
    {
      title: "Designing for Trust: UX Patterns That Build Credibility",
      excerpt: "How thoughtful UX decisions signal professionalism and increase conversions for B2B companies.",
      category: "Design",
      tags: ["UI/UX"],
      featured: false,
      image: img("laptop,typing", 704),
    },
    {
      title: "A Founder's Guide to Choosing a Web Development Partner",
      excerpt: "What to look for — and what to avoid — when hiring an agency to build your product.",
      category: "Business",
      tags: ["Startups"],
      featured: false,
      image: img("meeting,laptop", 710),
    },
    {
      title: "Cloud Infrastructure 101 for Non-Technical Founders",
      excerpt: "A plain-English introduction to cloud hosting, scaling, and what actually matters for your business.",
      category: "Technology",
      tags: ["Cloud", "API"],
      featured: false,
      image: img("server,datacenter", 304),
    },
  ];

  for (const [i, p] of posts.entries()) {
    const slug = slugify(p.title);
    const publishedAt = new Date(Date.now() - i * 6 * 24 * 60 * 60 * 1000);
    await prisma.post.upsert({
      where: { slug },
      update: {},
      create: {
        title: p.title,
        slug,
        excerpt: p.excerpt,
        content: `<p>${p.excerpt}</p><h2>Introduction</h2><p>In today's competitive digital landscape, businesses can't afford to overlook the details that separate good products from great ones. This article breaks down what we've learned from years of hands-on client work.</p><h2>Key Takeaways</h2><ul><li>Start with user needs, not assumptions</li><li>Measure what matters — and act on it</li><li>Invest in a foundation that scales</li></ul><h2>Conclusion</h2><p>Whether you're a founder, marketer, or product lead, these principles apply. If you'd like help applying them to your own project, <a href="/contact">get in touch</a> with our team.</p>`,
        featuredImage: p.image,
        status: "PUBLISHED",
        featured: p.featured,
        authorId: i % 2 === 0 ? admin.id : editor.id,
        categoryId: postCategories[p.category].id,
        tags: { connect: p.tags.map((t) => ({ id: tags[t].id })) },
        metaTitle: p.title,
        metaDescription: p.excerpt,
        metaKeywords: `${p.category}, ${p.tags.join(", ")}`,
        publishedAt,
      },
    });
  }

  // --- Testimonials ---
  const testimonials = [
    { name: "Sarah Chen", role: "CEO", company: "Nimbus Pay", content: "Mawuwebs transformed our product from a clunky MVP into a platform our users love. Their team felt like an extension of ours.", avatar: avatar(44) },
    { name: "James Okafor", role: "Founder", company: "Roast & Co.", content: "Our online revenue tripled within six months of launch. The attention to detail and speed of delivery was unmatched.", avatar: avatar(13) },
    { name: "Priya Nair", role: "Head of Product", company: "HealthTrack Inc.", content: "They didn't just build what we asked for — they challenged our assumptions and made the product better.", avatar: avatar(32) },
    { name: "Daniel Kim", role: "COO", company: "Vertex Freight", content: "Professional, responsive, and genuinely invested in our success. I recommend them to every founder I know.", avatar: avatar(65) },
    { name: "Elena Rossi", role: "Marketing Director", company: "Solstice Skincare", content: "The rebrand exceeded expectations. Our conversion rate improved dramatically after launch.", avatar: avatar(5) },
    { name: "Marcus Webb", role: "Founder", company: "Brightpath Education", content: "Reliable, communicative, and technically excellent. They delivered exactly on time and on budget.", avatar: avatar(33) },
  ];

  for (const [i, t] of testimonials.entries()) {
    const existing = await prisma.testimonial.findFirst({ where: { name: t.name, company: t.company } });
    if (!existing) {
      await prisma.testimonial.create({
        data: {
          name: t.name,
          role: t.role,
          company: t.company,
          avatar: t.avatar,
          content: t.content,
          rating: 5,
          status: "PUBLISHED",
          order: i,
        },
      });
    }
  }

  // --- FAQs ---
  const faqs = [
    { q: "How long does a typical project take?", a: "Most websites take 4–8 weeks from kickoff to launch, depending on scope. Larger platforms or apps can take 3–6 months. We'll give you a detailed timeline during our initial consultation.", category: "Process" },
    { q: "What is your pricing model?", a: "We offer both fixed-price project quotes and monthly retainers, depending on your needs. After a discovery call, we'll provide a detailed proposal with transparent pricing.", category: "Pricing" },
    { q: "Do you offer ongoing support after launch?", a: "Yes. We offer flexible maintenance and support plans to keep your site secure, fast, and up to date after launch.", category: "Support" },
    { q: "What technologies do you work with?", a: "We specialize in modern web technologies including Next.js, React, TypeScript, and cloud infrastructure like AWS and Vercel. We choose the right stack for your specific needs.", category: "Process" },
    { q: "Do you only build websites?", a: "No. Websites and apps are one part of what we do. We also provide IT support, networking, cybersecurity, hardware supply and setup, backup and recovery, cloud services and IT consulting.", category: "General" },
    { q: "Can you look after our IT on an ongoing basis?", a: "Yes. We offer managed IT support on a monthly plan or pay-as-you-go, covering help desk, updates, monitoring and on-site visits when needed.", category: "Support" },
    { q: "Do you supply and install equipment?", a: "Yes. We can recommend, supply and set up computers, printers, networking gear and other business equipment, and handle warranty and repairs.", category: "General" },
    { q: "Can you help with an existing website, or only new builds?", a: "Both. We regularly redesign, optimize, and extend existing websites and applications, in addition to building new ones from scratch.", category: "General" },
    { q: "Do you offer a free consultation?", a: "Yes, we offer a free 30-minute discovery call to understand your goals and determine if we're a good fit for your project.", category: "General" },
    { q: "How do you handle project communication?", a: "You'll have a dedicated project lead and regular check-ins via your preferred tools — Slack, email, or video calls — plus access to a shared project tracker.", category: "Process" },
    { q: "What if I need changes after the project is delivered?", a: "Minor revisions are included in our standard process. For larger changes after delivery, we offer hourly support or a retainer package.", category: "Support" },
  ];

  for (const [i, f] of faqs.entries()) {
    const existing = await prisma.faq.findFirst({ where: { question: f.q } });
    if (!existing) {
      await prisma.faq.create({
        data: { question: f.q, answer: f.a, category: f.category, status: "PUBLISHED", order: i },
      });
    }
  }

  // --- Pages ---
  const pages = [
    {
      title: "About Us",
      slug: "about",
      content: `<p>Mawuwebs Solutions was founded on a simple belief: businesses deserve digital experiences that are as ambitious as they are. What started as a small team of engineers and designers has grown into a full-service digital partner trusted by startups and established companies alike.</p><h2>Our Story</h2><p>We started Mawuwebs Solutions because we saw too many businesses settle for websites that looked fine but didn't perform — slow, hard to update, and disconnected from real business goals. We set out to build a studio that combines technical excellence with genuine partnership.</p><h2>Our Approach</h2><p>We believe great digital products come from the intersection of strategy, design, and engineering. Every project starts with understanding your business goals, not just your feature list. From there, we design and build solutions that are fast, accessible, and built to last.</p><h2>Our Values</h2><ul><li><strong>Craftsmanship:</strong> We sweat the details others skip.</li><li><strong>Transparency:</strong> Clear communication, honest timelines, no surprises.</li><li><strong>Partnership:</strong> We succeed when you succeed.</li></ul>`,
    },
    {
      title: "Privacy Policy",
      slug: "privacy-policy",
      content: `<p>Last updated: January 2026</p><p>Mawuwebs Solutions ("we", "our", "us") respects your privacy. This Privacy Policy explains how we collect, use, and protect information when you visit our website or use our services.</p><h2>Information We Collect</h2><p>We may collect personal information you provide directly, such as your name, email address, and phone number when you submit a contact form or subscribe to our newsletter.</p><h2>How We Use Information</h2><p>We use collected information to respond to inquiries, provide our services, and improve our website. We do not sell your personal information to third parties.</p><h2>Cookies</h2><p>Our website may use cookies to improve user experience and analyze site traffic. You can control cookie preferences through your browser settings.</p><h2>Data Security</h2><p>We implement reasonable security measures to protect your information from unauthorized access, disclosure, or misuse.</p><h2>Contact Us</h2><p>If you have questions about this Privacy Policy, please contact us at hello@mawuwebs.com.</p>`,
    },
    {
      title: "Terms of Service",
      slug: "terms-of-service",
      content: `<p>Last updated: January 2026</p><p>These Terms of Service govern your use of the Mawuwebs Solutions website and services. By accessing our website, you agree to these terms.</p><h2>Use of Services</h2><p>Our services are provided for lawful business purposes. You agree not to misuse our website or services in any way that could harm Mawuwebs Solutions or other users.</p><h2>Intellectual Property</h2><p>All content on this website, including text, graphics, and logos, is the property of Mawuwebs Solutions unless otherwise stated, and is protected by applicable intellectual property laws.</p><h2>Limitation of Liability</h2><p>Mawuwebs Solutions is not liable for any indirect, incidental, or consequential damages arising from your use of our website or services.</p><h2>Changes to Terms</h2><p>We may update these Terms of Service from time to time. Continued use of our website constitutes acceptance of any changes.</p><h2>Contact Us</h2><p>Questions about these terms can be directed to hello@mawuwebs.com.</p>`,
    },
  ];

  for (const p of pages) {
    await prisma.page.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        title: p.title,
        slug: p.slug,
        content: p.content,
        status: "PUBLISHED",
        metaTitle: `${p.title} | Mawuwebs Solutions`,
        metaDescription: `${p.title} for Mawuwebs Solutions.`,
        publishedAt: new Date(),
      },
    });
  }

  // --- Contact Submissions ---
  const submissions = [
    { name: "Grace Adjei", email: "grace@brightleaf.co", subject: "New website inquiry", message: "Hi, we're looking to redesign our company website and would love a quote.", status: "NEW" as const },
    { name: "Tom Richards", email: "tom@richardsventures.com", subject: "E-commerce platform", message: "Interested in discussing an e-commerce build for our new product line.", status: "READ" as const },
    { name: "Lena Fischer", email: "lena@fischerlaw.com", subject: "Website maintenance", message: "We need ongoing support for our existing site. Can we set up a call?", status: "RESPONDED" as const },
  ];

  for (const s of submissions) {
    const existing = await prisma.contactSubmission.findFirst({ where: { email: s.email } });
    if (!existing) await prisma.contactSubmission.create({ data: s });
  }

  // --- Newsletter Subscribers ---
  for (const email of ["subscriber1@example.com", "subscriber2@example.com"]) {
    await prisma.newsletterSubscriber.upsert({
      where: { email },
      update: {},
      create: { email },
    });
  }

  console.log("Seed complete.");
  console.log("Admin login: admin@mawuwebs.com / Admin123!");
  console.log("Editor login: editor@mawuwebs.com / Editor123!");
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
