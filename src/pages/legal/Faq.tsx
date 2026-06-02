import LegalShell from "@/components/LegalShell";

const items = [
  {
    q: "What is Scholarship Searcher?",
    a: "Scholarship Searcher is Australia's most comprehensive search platform for scholarships, selective entry programs, gifted and talented pathways, and accelerated learning opportunities. We cover over 10,000 schools across Independent, Catholic, and Government sectors.",
  },
  {
    q: "Is Scholarship Searcher free?",
    a: "You can browse and filter opportunities for free. Viewing full opportunity details is available with a limited number of free views. After that, you can create an account and subscribe for unlimited access.",
  },
  {
    q: "What is Scholarship Navigator?",
    a: "Scholarship Navigator is our premium AI-powered companion that helps students assess their readiness, discover matched opportunities, build preparation plans, and guide them through the application process. It is available as a separate subscription.",
  },
  {
    q: "How accurate is the information?",
    a: "We work hard to keep our data accurate and up to date. However, scholarship details, deadlines, and eligibility criteria are set by individual schools and may change without notice. We always recommend confirming details directly with the school before applying.",
  },
  {
    q: "What age groups does this cover?",
    a: "Scholarship Searcher covers opportunities for students from primary school through to Year 12, across all Australian states and territories.",
  },
  {
    q: "How do I prepare for a scholarship exam?",
    a: "Spectrum Tuition offers exam preparation courses, practice tests, and mock exams designed specifically for scholarship and selective entry tests. Visit www.spectrumtuition.com for details.",
  },
  {
    q: "Can I save opportunities to review later?",
    a: "Yes. Once you create a free account, you can save and shortlist opportunities to revisit at any time.",
  },
  {
    q: "I found incorrect information about a school. How do I report it?",
    a: "Please contact us at enquiries@spectrumtuition.com and we will review and update the listing promptly.",
  },
];

const Faq = () => (
  <LegalShell title="Frequently Asked Questions" subtitle="Answers to the questions families ask us most.">
    {items.map((it) => (
      <div key={it.q}>
        <h3>{it.q}</h3>
        <p>{it.a}</p>
      </div>
    ))}
  </LegalShell>
);

export default Faq;
