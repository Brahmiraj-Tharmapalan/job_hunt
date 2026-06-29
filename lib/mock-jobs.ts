/**
 * Sample job postings used to develop and demo the sort pipeline before a real
 * scraper (Apify / a jobs API) is wired in. These mimic the shape a scraper
 * would return, so `runSync` can treat them exactly like real results: the only
 * thing that changes later is where this array comes from.
 *
 * The mix is deliberate — some carry seniority words in the title (to exercise
 * blocked-word filtering), some sit in countries outside the supported list (to
 * exercise country filtering), and the experience cues in the descriptions span
 * intern → 10+ years (to exercise the Gemini experience-band check). A few omit
 * any years at all, since real postings often do.
 */
export type MockJob = {
  external_id: string;
  title: string;
  company: string;
  location: string;
  /** Full country name OR a city/short-name the aliases resolve (e.g. "Dubai"). */
  country: string;
  url: string;
  apply_url: string;
  description: string;
};

export const MOCK_JOBS: MockJob[] = [
  {
    external_id: "mock-001",
    title: "Frontend Developer",
    company: "Northwind Labs",
    location: "Singapore",
    country: "Singapore",
    url: "https://example.com/jobs/mock-001",
    apply_url: "https://example.com/jobs/mock-001/apply",
    description:
      "Build customer-facing dashboards in React, Next.js and TypeScript. 2+ years of experience with modern frontend tooling. You'll work with Tailwind and our design system.",
  },
  {
    external_id: "mock-002",
    title: "Full Stack Engineer",
    company: "Harbour Digital",
    location: "Dubai, UAE",
    country: "Dubai",
    url: "https://example.com/jobs/mock-002",
    apply_url: "https://example.com/jobs/mock-002/apply",
    description:
      "Node.js + React across the stack, Postgres, AWS. Around 3 years of experience. Ship features end to end with a small product team.",
  },
  {
    external_id: "mock-003",
    title: "Senior Software Engineer",
    company: "Atlas Systems",
    location: "Berlin, Germany",
    country: "Germany",
    url: "https://example.com/jobs/mock-003",
    apply_url: "https://example.com/jobs/mock-003/apply",
    description:
      "Lead backend services in Python and Go. 7+ years of experience required. Mentor juniors and own architecture decisions.",
  },
  {
    external_id: "mock-004",
    title: "React Developer",
    company: "Lumen Interactive",
    location: "Lisbon, Portugal",
    country: "Portugal",
    url: "https://example.com/jobs/mock-004",
    apply_url: "https://example.com/jobs/mock-004/apply",
    description:
      "Join our web team building SaaS UIs with React, Redux Toolkit and TypeScript. Minimum 2 years of experience. Fluent English; Portuguese is a plus.",
  },
  {
    external_id: "mock-005",
    title: "QA Automation Engineer",
    company: "Veritas Quality",
    location: "Toronto, Canada",
    country: "Canada",
    url: "https://example.com/jobs/mock-005",
    apply_url: "https://example.com/jobs/mock-005/apply",
    description:
      "Own automated test suites with Playwright and Jest. 3-5 years of experience in test automation. CI/CD with GitHub Actions.",
  },
  {
    external_id: "mock-006",
    title: "Software Engineer",
    company: "Quokka Pay",
    location: "Sydney, Australia",
    country: "Australia",
    url: "https://example.com/jobs/mock-006",
    apply_url: "https://example.com/jobs/mock-006/apply",
    description:
      "Backend services for payments. TypeScript, Node.js, Postgres. We hire across levels; this opening suits someone with roughly 1-3 years of experience.",
  },
  {
    external_id: "mock-007",
    title: "Lead Frontend Engineer",
    company: "Orbital Media",
    location: "Amsterdam, Netherlands",
    country: "Netherlands",
    url: "https://example.com/jobs/mock-007",
    apply_url: "https://example.com/jobs/mock-007/apply",
    description:
      "Set frontend direction for a 12-person team. React, Next.js. 8+ years of experience. Hands-on but mostly technical leadership.",
  },
  {
    external_id: "mock-008",
    title: "Junior Web Developer",
    company: "Pixelwave",
    location: "Kuala Lumpur, Malaysia",
    country: "Malaysia",
    url: "https://example.com/jobs/mock-008",
    apply_url: "https://example.com/jobs/mock-008/apply",
    description:
      "Entry-level role. HTML, CSS, JavaScript and some React. 0-1 years of experience; recent grads welcome. Great mentorship.",
  },
  {
    external_id: "mock-009",
    title: "Software Developer (Backend)",
    company: "Karachi Tech Co",
    location: "Karachi, Pakistan",
    country: "Pakistan",
    url: "https://example.com/jobs/mock-009",
    apply_url: "https://example.com/jobs/mock-009/apply",
    description:
      "Node.js and MongoDB backend. 2+ years of experience. (Included to show a job in an unsupported country being filtered out.)",
  },
  {
    external_id: "mock-010",
    title: "Frontend Engineer",
    company: "Helvetia Soft",
    location: "Zurich, Switzerland",
    country: "Switzerland",
    url: "https://example.com/jobs/mock-010",
    apply_url: "https://example.com/jobs/mock-010/apply",
    description:
      "React + TypeScript product team. 3 years of experience preferred. German is helpful but not required; team works in English.",
  },
  {
    external_id: "mock-011",
    title: "DevOps Engineer",
    company: "Cloudreach NZ",
    location: "Auckland, New Zealand",
    country: "New Zealand",
    url: "https://example.com/jobs/mock-011",
    apply_url: "https://example.com/jobs/mock-011/apply",
    description:
      "AWS, Docker, CI/CD pipelines, Terraform. 4 years of experience in infrastructure. On-call rotation shared across the team.",
  },
  {
    external_id: "mock-012",
    title: "Principal Engineer",
    company: "Monolith Bank",
    location: "London, UK",
    country: "London",
    url: "https://example.com/jobs/mock-012",
    apply_url: "https://example.com/jobs/mock-012/apply",
    description:
      "Define engineering standards bank-wide. 12+ years of experience. Java, microservices. (High seniority — expect blocked-word + experience filtering.)",
  },
  {
    external_id: "mock-013",
    title: "Full Stack Developer",
    company: "Maple & Co",
    location: "Tel Aviv, Israel",
    country: "Israel",
    url: "https://example.com/jobs/mock-013",
    apply_url: "https://example.com/jobs/mock-013/apply",
    description:
      "React/Node. 2-4 years of experience. (Another unsupported-country example for the country filter.)",
  },
  {
    external_id: "mock-014",
    title: "Web Developer",
    company: "Colombo Cloud",
    location: "Colombo, Sri Lanka",
    country: "Sri Lanka",
    url: "https://example.com/jobs/mock-014",
    apply_url: "https://example.com/jobs/mock-014/apply",
    description:
      "React and Next.js front end for a fintech product. 2+ years of experience. TypeScript and Tailwind a plus.",
  },
  {
    external_id: "mock-015",
    title: "Software Engineer, Frontend",
    company: "Sakura Systems",
    location: "Tokyo, Japan",
    country: "Japan",
    url: "https://example.com/jobs/mock-015",
    apply_url: "https://example.com/jobs/mock-015/apply",
    description:
      "React/TypeScript role on a global product. Business-level Japanese required. Around 3 years of experience.",
  },
  {
    external_id: "mock-016",
    title: "Frontend Developer",
    company: "Riyadh Digital",
    location: "Riyadh, Saudi Arabia",
    country: "Riyadh",
    url: "https://example.com/jobs/mock-016",
    apply_url: "https://example.com/jobs/mock-016/apply",
    description:
      "Vue and React work for government digital services. Experience level not specified. Arabic preferred.",
  },
  {
    external_id: "mock-017",
    title: "Associate Software Engineer",
    company: "Dublin Data",
    location: "Dublin, Ireland",
    country: "Ireland",
    url: "https://example.com/jobs/mock-017",
    apply_url: "https://example.com/jobs/mock-017/apply",
    description:
      "Graduate-friendly role. TypeScript, React, some Python. 1-2 years of experience. Strong mentorship and clear growth path.",
  },
  {
    external_id: "mock-018",
    title: "Full Stack Developer",
    company: "Iberia Web",
    location: "Madrid, Spain",
    country: "Spain",
    url: "https://example.com/jobs/mock-018",
    apply_url: "https://example.com/jobs/mock-018/apply",
    description:
      "React + Django. 3 years of experience. Conversational Spanish needed for daily standups.",
  },
  {
    external_id: "mock-019",
    title: "Senior React Developer",
    company: "Fjord Labs",
    location: "Oslo, Norway",
    country: "Norway",
    url: "https://example.com/jobs/mock-019",
    apply_url: "https://example.com/jobs/mock-019/apply",
    description:
      "React, Next.js, TypeScript. 6+ years of experience. (Senior title to show blocked-word filtering.)",
  },
  {
    external_id: "mock-020",
    title: "Software Engineer",
    company: "Doha Tech",
    location: "Doha, Qatar",
    country: "Doha",
    url: "https://example.com/jobs/mock-020",
    apply_url: "https://example.com/jobs/mock-020/apply",
    description:
      "Node.js and React for a logistics platform. 2-3 years of experience. Relocation and visa sponsorship available.",
  },
];
