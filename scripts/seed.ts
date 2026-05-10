import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Load dotenv only when run as a CLI script (not when imported by Next).
if (process.argv[1]?.endsWith("seed.ts") || process.argv[1]?.endsWith("seed.js")) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("dotenv").config({ path: ".env.local" });
}

function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

// ─── helpers ──────────────────────────────────────────────
const now = new Date();
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
function ago(d: number): string {
  return new Date(now.getTime() - d * DAY).toISOString();
}
function hoursAgo(h: number): string {
  return new Date(now.getTime() - h * HOUR).toISOString();
}
function fromNow(d: number): string {
  return new Date(now.getTime() + d * DAY).toISOString();
}
function dateOnly(iso: string): string {
  return iso.slice(0, 10);
}

// ─── seed function ────────────────────────────────────────
export async function seedDemoData() {
  const sb = getSupabase();
  console.log("⛁  Wiping existing demo data…");
  // FK order — children first.
  for (const table of ["email_tracking", "tasks", "activities", "deals", "contacts", "companies"]) {
    await sb.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
  }

  // ─── 1. Companies (12, all Indian B2B) ─────────────────
  console.log("⛁  Inserting companies…");
  const { data: companies, error: cErr } = await sb
    .from("companies")
    .insert([
      { name: "Razorpay",      industry: "Fintech / Payments",     size: "1500 employees",  website: "https://razorpay.com",     linkedin: "https://linkedin.com/company/razorpay",     health_score: 78, total_deal_value: 6500000 },
      { name: "Zerodha",       industry: "Fintech / Brokerage",    size: "1200 employees",  website: "https://zerodha.com",      linkedin: "https://linkedin.com/company/zerodha",      health_score: 82, total_deal_value: 10500000 },
      { name: "Swiggy",        industry: "FoodTech / Delivery",    size: "5000 employees",  website: "https://swiggy.com",       linkedin: "https://linkedin.com/company/swiggy",       health_score: 74, total_deal_value: 4000000 },
      { name: "CRED",          industry: "Fintech / Consumer",     size: "1000 employees",  website: "https://cred.club",        linkedin: "https://linkedin.com/company/cred-club",    health_score: 44, total_deal_value: 10500000 },
      { name: "Nykaa",         industry: "E-commerce / Beauty",    size: "1500 employees",  website: "https://nykaa.com",        linkedin: "https://linkedin.com/company/nykaa",        health_score: 38, total_deal_value: 6000000 },
      { name: "BYJU'S",        industry: "EdTech",                  size: "8000 employees",  website: "https://byjus.com",        linkedin: "https://linkedin.com/company/byjus",        health_score: 66, total_deal_value: 8000000 },
      { name: "Paytm",         industry: "Fintech / Payments",     size: "10000 employees", website: "https://paytm.com",        linkedin: "https://linkedin.com/company/paytm",        health_score: 80, total_deal_value: 6500000 },
      { name: "Dream11",       industry: "Sports / Gaming",         size: "1200 employees",  website: "https://dream11.com",      linkedin: "https://linkedin.com/company/dream11",      health_score: 71, total_deal_value: 5500000 },
      { name: "Postman",       industry: "DevTools / API",          size: "800 employees",   website: "https://postman.com",      linkedin: "https://linkedin.com/company/postman",      health_score: 75, total_deal_value: 2500000 },
      { name: "Urban Company", industry: "Services / Marketplace",  size: "1500 employees",  website: "https://urbancompany.com", linkedin: "https://linkedin.com/company/urbanclap",    health_score: 62, total_deal_value: 4000000 },
      { name: "Meesho",        industry: "E-commerce / Reseller",   size: "1700 employees",  website: "https://meesho.com",       linkedin: "https://linkedin.com/company/meesho",       health_score: 58, total_deal_value: 3000000 },
      { name: "Zomato",        industry: "FoodTech / Discovery",    size: "5000 employees",  website: "https://zomato.com",       linkedin: "https://linkedin.com/company/zomato",       health_score: 70, total_deal_value: 0 },
    ])
    .select();
  if (cErr || !companies) throw cErr;
  const c = (n: string) => companies.find((x) => x.name === n)!.id as string;

  const cRzp = c("Razorpay"), cZer = c("Zerodha"), cSwg = c("Swiggy"), cCred = c("CRED"),
        cNyk = c("Nykaa"), cByj = c("BYJU'S"), cPay = c("Paytm"), cDrm = c("Dream11"),
        cPst = c("Postman"), cUrb = c("Urban Company"), cMsh = c("Meesho");

  // ─── 2. Contacts (25) ──────────────────────────────────
  console.log("⛁  Inserting contacts…");
  const { data: contacts, error: pErr } = await sb
    .from("contacts")
    .insert([
      // Razorpay
      { company_id: cRzp,  name: "Priya Sharma",      role: "VP Sales",                email: "priya@razorpay.com",         phone: "+91 98200 12345", linkedin: "https://linkedin.com/in/priyasharma",       sentiment: "positive", engagement_score: 82, last_interaction: ago(2) },
      { company_id: cRzp,  name: "Aarav Kapoor",      role: "Head of Engineering",     email: "aarav@razorpay.com",         phone: "+91 98200 22345", linkedin: "https://linkedin.com/in/aaravkapoor",       sentiment: "neutral",  engagement_score: 65, last_interaction: ago(7) },
      { company_id: cRzp,  name: "Riya Mehta",        role: "Head of Product",         email: "riya@razorpay.com",          linkedin: "https://linkedin.com/in/riyamehta",        sentiment: "positive", engagement_score: 70, last_interaction: ago(4) },
      // Zerodha
      { company_id: cZer,  name: "Vikram Iyer",       role: "CFO",                     email: "vikram@zerodha.com",         phone: "+91 99300 11122", linkedin: "https://linkedin.com/in/vikramiyer",        sentiment: "positive", engagement_score: 88, last_interaction: ago(1) },
      { company_id: cZer,  name: "Ananya Desai",      role: "VP Engineering",          email: "ananya@zerodha.com",         phone: "+91 99300 22233", sentiment: "positive", engagement_score: 75, last_interaction: ago(3) },
      { company_id: cZer,  name: "Karan Patel",       role: "Director of Risk",        email: "karan@zerodha.com",          sentiment: "neutral",  engagement_score: 55, last_interaction: ago(9) },
      // Swiggy
      { company_id: cSwg,  name: "Neha Reddy",        role: "Director of Operations",  email: "neha@swiggy.com",            phone: "+91 90080 33344", sentiment: "positive", engagement_score: 78, last_interaction: ago(2) },
      { company_id: cSwg,  name: "Arjun Singh",       role: "Engineering Manager",     email: "arjun@swiggy.com",           linkedin: "https://linkedin.com/in/arjunsingh",        sentiment: "neutral",  engagement_score: 60, last_interaction: ago(6) },
      { company_id: cSwg,  name: "Divya Krishnan",    role: "Head of Strategy",        email: "divya@swiggy.com",           phone: "+91 90080 44455", linkedin: "https://linkedin.com/in/divyakrishnan",     sentiment: "positive", engagement_score: 85, last_interaction: ago(5) },
      // CRED
      { company_id: cCred, name: "Rohan Gupta",       role: "VP Operations",           email: "rohan@cred.club",            phone: "+91 98765 11223", sentiment: "negative", engagement_score: 32, last_interaction: ago(18) },
      { company_id: cCred, name: "Sneha Bhatia",      role: "Compliance Lead",         email: "sneha@cred.club",            sentiment: "neutral",  engagement_score: 48, last_interaction: ago(14) },
      { company_id: cCred, name: "Ishaan Verma",      role: "Head of Data",            email: "ishaan@cred.club",           linkedin: "https://linkedin.com/in/ishaanverma",       sentiment: "neutral",  engagement_score: 50, last_interaction: ago(11) },
      // Nykaa
      { company_id: cNyk,  name: "Meera Nair",        role: "Director of Growth",      email: "meera@nykaa.com",            phone: "+91 99888 55667", sentiment: "neutral",  engagement_score: 52, last_interaction: ago(12) },
      { company_id: cNyk,  name: "Aditya Joshi",      role: "VP Tech",                 email: "aditya@nykaa.com",           linkedin: "https://linkedin.com/in/adityajoshi",       sentiment: "negative", engagement_score: 35, last_interaction: ago(20) },
      { company_id: cNyk,  name: "Tanvi Saxena",      role: "Head of Marketing",       email: "tanvi@nykaa.com",            phone: "+91 99888 66778", sentiment: "neutral",  engagement_score: 58, last_interaction: ago(8) },
      // BYJU'S
      { company_id: cByj,  name: "Pranav Kulkarni",   role: "VP Sales",                email: "pranav@byjus.com",           phone: "+91 98123 44556", linkedin: "https://linkedin.com/in/pranavkulkarni",    sentiment: "positive", engagement_score: 76, last_interaction: ago(3) },
      { company_id: cByj,  name: "Lakshmi Rao",       role: "Head of Curriculum",      email: "lakshmi@byjus.com",          sentiment: "positive", engagement_score: 80, last_interaction: ago(4) },
      { company_id: cByj,  name: "Arnav Bhatt",       role: "Director of Product",     email: "arnav@byjus.com",            phone: "+91 98123 55667", linkedin: "https://linkedin.com/in/arnavbhatt",        sentiment: "neutral",  engagement_score: 62, last_interaction: ago(6) },
      // Paytm
      { company_id: cPay,  name: "Rajesh Khanna",     role: "CFO",                     email: "rajesh@paytm.com",           phone: "+91 98765 77889", linkedin: "https://linkedin.com/in/rajeshkhanna",      sentiment: "positive", engagement_score: 84, last_interaction: ago(2) },
      { company_id: cPay,  name: "Pooja Singhal",     role: "Head of Compliance",      email: "pooja@paytm.com",            sentiment: "positive", engagement_score: 72, last_interaction: ago(5) },
      // Dream11
      { company_id: cDrm,  name: "Aakash Agarwal",    role: "Head of Risk",            email: "aakash@dream11.com",         phone: "+91 99000 11122", linkedin: "https://linkedin.com/in/aakashagarwal",     sentiment: "positive", engagement_score: 78, last_interaction: ago(4) },
      { company_id: cDrm,  name: "Ishita Roy",        role: "Director of Engineering", email: "ishita@dream11.com",         sentiment: "neutral",  engagement_score: 64, last_interaction: ago(7) },
      // Postman
      { company_id: cPst,  name: "Vinay Krishnan",    role: "CTO",                     email: "vinay@postman.com",          phone: "+91 88990 11223", linkedin: "https://linkedin.com/in/vinaykrishnan",     sentiment: "positive", engagement_score: 73, last_interaction: ago(5) },
      // Urban Company
      { company_id: cUrb,  name: "Karthik Iyer",      role: "COO",                     email: "karthik@urbancompany.com",   phone: "+91 87654 33445", sentiment: "neutral",  engagement_score: 61, last_interaction: ago(8) },
      // Meesho
      { company_id: cMsh,  name: "Maya Krishnamurthy",role: "VP Sales",                email: "maya@meesho.com",            linkedin: "https://linkedin.com/in/mayakrishnamurthy",sentiment: "positive", engagement_score: 68, last_interaction: ago(3) },
    ])
    .select();
  if (pErr || !contacts) throw pErr;

  const find = (n: string) => contacts.find((x) => x.name === n)!.id as string;
  const priya = find("Priya Sharma"), aarav = find("Aarav Kapoor"), riya = find("Riya Mehta"),
        vikram = find("Vikram Iyer"), ananya = find("Ananya Desai"), karan = find("Karan Patel"),
        neha = find("Neha Reddy"), arjun = find("Arjun Singh"), divya = find("Divya Krishnan"),
        rohan = find("Rohan Gupta"), sneha = find("Sneha Bhatia"),
        meera = find("Meera Nair"), aditya = find("Aditya Joshi"), tanvi = find("Tanvi Saxena"),
        pranav = find("Pranav Kulkarni"), lakshmi = find("Lakshmi Rao"), arnav = find("Arnav Bhatt"),
        rajesh = find("Rajesh Khanna"), pooja = find("Pooja Singhal"),
        aakash = find("Aakash Agarwal"), ishita = find("Ishita Roy"),
        vinay = find("Vinay Krishnan"), karthik = find("Karthik Iyer"), maya = find("Maya Krishnamurthy");

  // ─── 3. Deals (15, INR) ────────────────────────────────
  console.log("⛁  Inserting deals…");
  const { data: deals, error: dErr } = await sb
    .from("deals")
    .insert([
      { company_id: cRzp,  name: "Payment Gateway Premium",     value: 5000000, stage: "discovery",   health_score: 76, health_reason: "Strong engagement from VP Sales; demo scheduled.",                            expected_close: dateOnly(fromNow(45)), risk_level: "low",    primary_contact_id: priya,   ai_summary: "Razorpay is exploring our Payment Gateway Premium tier for their merchant infrastructure. Priya (VP Sales) is the champion. Next: complete discovery, then full-team demo." },
      { company_id: cRzp,  name: "Analytics Add-on",            value: 1500000, stage: "lead",        health_score: 52, health_reason: "Inbound interest, no qualifying call yet.",                                    expected_close: dateOnly(fromNow(60)), risk_level: "medium", primary_contact_id: riya,    ai_summary: "Riya signed up for the analytics waitlist. Hasn't responded to outreach in 4 days." },
      { company_id: cZer,  name: "Risk Engine Integration",     value: 7500000, stage: "negotiation", health_score: 84, health_reason: "Procurement engaged; legal redlines exchanged.",                              expected_close: dateOnly(fromNow(14)), risk_level: "low",    primary_contact_id: vikram,  ai_summary: "Zerodha CFO Vikram driving this aggressively — they want to close before quarter-end. Legal is the only remaining gate. Push for signature this week." },
      { company_id: cZer,  name: "Compliance Reporting Module", value: 3000000, stage: "demo",        health_score: 58, health_reason: "Demo went well but follow-up has slowed.",                                     expected_close: dateOnly(fromNow(40)), risk_level: "medium", primary_contact_id: karan,   ai_summary: "Karan attended demo 9 days ago, has not replied to follow-up. Consider escalating to Vikram or sending a value recap." },
      { company_id: cSwg,  name: "Vendor Onboarding Platform",  value: 4000000, stage: "proposal",    health_score: 79, health_reason: "Proposal sent, head of strategy reviewing personally.",                       expected_close: dateOnly(fromNow(21)), risk_level: "low",    primary_contact_id: divya,   ai_summary: "Swiggy's Head of Strategy Divya is reviewing the proposal personally — strong buying signal. Neha (Operations) is the user champion." },
      { company_id: cCred, name: "Member Engagement Suite",     value: 8000000, stage: "discovery",   health_score: 28, health_reason: "Stalled — no contact in 18 days, primary went dark.",                         expected_close: dateOnly(fromNow(75)), risk_level: "high",   primary_contact_id: rohan,   ai_summary: "CRED's deal has stalled. Rohan (VP Ops) hasn't responded in 18 days. Recommend a multi-threaded re-engagement to Sneha (Compliance) or Ishaan (Data)." },
      { company_id: cCred, name: "Fraud Detection",             value: 2500000, stage: "demo",        health_score: 64, health_reason: "Sneha engaged, technical questions pending.",                                 expected_close: dateOnly(fromNow(35)), risk_level: "medium", primary_contact_id: sneha,   ai_summary: "Sneha asking detailed compliance questions — buying signal. Loop in Ishaan to address data architecture." },
      { company_id: cNyk,  name: "Marketing Automation",        value: 6000000, stage: "demo",        health_score: 41, health_reason: "Pricing pushback; Aditya ghosted after demo.",                                expected_close: dateOnly(fromNow(50)), risk_level: "high",   primary_contact_id: meera,   ai_summary: "Nykaa deal is cooling. Aditya pushed back on pricing 12 days ago and has gone silent. Meera (Growth) still warm — pivot conversation to growth ROI rather than tech." },
      { company_id: cByj,  name: "Learning Analytics Platform", value: 4500000, stage: "discovery",   health_score: 72, health_reason: "Curriculum head is the strongest champion.",                                  expected_close: dateOnly(fromNow(30)), risk_level: "low",    primary_contact_id: lakshmi, ai_summary: "BYJU'S Learning Analytics opportunity is led by Lakshmi (Curriculum). Pranav (VP Sales) is supportive. Need to align on data model with Arnav." },
      { company_id: cByj,  name: "Tutor Onboarding",            value: 3500000, stage: "proposal",    health_score: 68, health_reason: "Proposal under review; pricing is the open question.",                        expected_close: dateOnly(fromNow(28)), risk_level: "medium", primary_contact_id: pranav,  ai_summary: "Tutor Onboarding proposal under review at BYJU'S. Pricing flexibility is the key open item — Pranav asked for a 15% volume discount." },
      { company_id: cPay,  name: "Compliance Stack",            value: 6500000, stage: "negotiation", health_score: 86, health_reason: "CFO-led; very motivated. Final terms being worked.",                          expected_close: dateOnly(fromNow(12)), risk_level: "low",    primary_contact_id: rajesh,  ai_summary: "Paytm CFO Rajesh is closing this. Pooja (Compliance) is the user champion. Last open item: data residency in India clause." },
      { company_id: cDrm,  name: "Risk Modeling",               value: 5500000, stage: "discovery",   health_score: 70, health_reason: "Strong technical buy-in; commercials TBD.",                                   expected_close: dateOnly(fromNow(40)), risk_level: "low",    primary_contact_id: aakash,  ai_summary: "Dream11 evaluating our risk modeling for fantasy gaming. Aakash (Head of Risk) is the technical buyer; Ishita (Eng) is reviewing integration scope." },
      { company_id: cPst,  name: "Enterprise API Tier",         value: 2500000, stage: "demo",        health_score: 65, health_reason: "Demo positive; Vinay coordinating internal review.",                          expected_close: dateOnly(fromNow(25)), risk_level: "medium", primary_contact_id: vinay,   ai_summary: "Postman exploring our Enterprise API tier. Vinay (CTO) is the technical lead; needs CFO sign-off next." },
      { company_id: cUrb,  name: "Service Provider Portal",     value: 4000000, stage: "lead",        health_score: 56, health_reason: "Initial discovery only.",                                                     expected_close: dateOnly(fromNow(55)), risk_level: "medium", primary_contact_id: karthik, ai_summary: "Urban Company looking to digitize their service provider experience. Karthik (COO) on the call but says budget is Q3." },
      { company_id: cMsh,  name: "Seller Insights",             value: 3000000, stage: "demo",        health_score: 69, health_reason: "Maya engaged; needs internal alignment.",                                     expected_close: dateOnly(fromNow(38)), risk_level: "medium", primary_contact_id: maya,    ai_summary: "Meesho's VP Sales Maya is the champion for Seller Insights. Needs alignment with their tech team next week." },
    ])
    .select();
  if (dErr || !deals) throw dErr;

  const findDeal = (n: string) => deals.find((x) => x.name === n)!.id as string;
  const dRzpPg = findDeal("Payment Gateway Premium"), dRzpAn = findDeal("Analytics Add-on"),
        dZerRisk = findDeal("Risk Engine Integration"), dZerComp = findDeal("Compliance Reporting Module"),
        dSwgVop = findDeal("Vendor Onboarding Platform"),
        dCredMe = findDeal("Member Engagement Suite"), dCredFr = findDeal("Fraud Detection"),
        dNykMa = findDeal("Marketing Automation"),
        dByjLa = findDeal("Learning Analytics Platform"), dByjTo = findDeal("Tutor Onboarding"),
        dPayCs = findDeal("Compliance Stack"),
        dDrmRm = findDeal("Risk Modeling"),
        dPstApi = findDeal("Enterprise API Tier"),
        dUrbPp = findDeal("Service Provider Portal"),
        dMshSi = findDeal("Seller Insights");

  // ─── 4. Activities (~50 across deals) ──────────────────
  console.log("⛁  Inserting activities…");
  const { error: aErr } = await sb.from("activities").insert([
    // Razorpay - Payment Gateway
    { deal_id: dRzpPg, contact_id: priya,  type: "email",   subject: "Re: Enterprise pricing for 2000 merchants", content: "Priya replied confirming budget of ₹50L and asked for a security questionnaire.", ai_summary: "Budget confirmed (₹50L). Send security questionnaire.",       sentiment: "positive", source: "gmail",    created_at: ago(2) },
    { deal_id: dRzpPg, contact_id: priya,  type: "call",    subject: "Discovery call",                            content: "30-min call with Priya. Use case: replacing legacy gateway. Pain points: chargeback rates, slow settlement.", ai_summary: "Pain validated. Decision criteria: chargeback handling, T+0 settlement.", sentiment: "positive", source: "manual",   created_at: ago(5) },
    { deal_id: dRzpPg, contact_id: aarav,  type: "meeting", subject: "Tech deep-dive with Head of Eng",           content: "Aarav focused on data residency and SOC 2 audit.", ai_summary: "SOC 2 acceptance confirmed. Data residency cleared.", sentiment: "positive", source: "calendar", created_at: ago(7) },
    { deal_id: dRzpPg, contact_id: priya,  type: "email",   subject: "Demo follow-up + next steps",               content: "Sent recap of demo; proposed group demo with merchant ops next Tuesday.", ai_summary: "Group demo proposed.", sentiment: "neutral", source: "gmail", created_at: ago(10) },
    { deal_id: dRzpPg, contact_id: priya,  type: "note",    subject: "Internal: champion strength",               content: "Priya is a strong champion — internal advocate for 3 weeks.", ai_summary: "Strong champion (3+ weeks).", sentiment: "positive", source: "manual", created_at: ago(15) },

    // Razorpay - Analytics
    { deal_id: dRzpAn, contact_id: riya,   type: "email", subject: "Analytics waitlist follow-up", content: "Initial outreach to Riya about analytics module. No response yet.", ai_summary: "Awaiting reply (4 days).", sentiment: "neutral", source: "gmail", created_at: ago(4) },

    // Zerodha - Risk
    { deal_id: dZerRisk, contact_id: vikram, type: "call",    subject: "Procurement sync",            content: "Vikram pushing hard for Q-end close. Wants final pricing locked by EOW. Mentioned competing vendor.", ai_summary: "Competitive deal. Pricing lock by Friday.", sentiment: "positive", source: "manual",   created_at: ago(1) },
    { deal_id: dZerRisk, contact_id: ananya, type: "meeting", subject: "Engineering integration review", content: "Ananya walked through their data infra. Two webhook endpoints needed.", ai_summary: "Tech scope: 2 webhooks. No blockers.", sentiment: "positive", source: "calendar", created_at: ago(3) },
    { deal_id: dZerRisk, contact_id: vikram, type: "email",   subject: "Legal redlines v2",            content: "Vikram returned redlines on the MSA — mostly indemnity language.", ai_summary: "Redlines on indemnity.", sentiment: "neutral", source: "gmail", created_at: ago(6) },
    { deal_id: dZerRisk, contact_id: vikram, type: "note",    subject: "Internal: champion strength",  content: "Vikram is highly motivated — bonus tied to risk platform deployment by Q-end.", ai_summary: "Strong champion. Bonus-aligned.", sentiment: "positive", source: "manual", created_at: ago(8) },
    { deal_id: dZerRisk, contact_id: vikram, type: "call",    subject: "Initial intro",                content: "First call with Vikram. CFO-led deal.", ai_summary: "CFO-led. Strong buying authority.", sentiment: "positive", source: "manual", created_at: ago(22) },

    // Zerodha - Compliance
    { deal_id: dZerComp, contact_id: karan, type: "meeting", subject: "Compliance demo",                    content: "Demo to Karan + 2 team members. Engaged but skeptical of automation depth.", ai_summary: "Skepticism — send case study.", sentiment: "neutral", source: "calendar", created_at: ago(9) },
    { deal_id: dZerComp, contact_id: karan, type: "email",   subject: "Demo follow-up + case study",         content: "Sent the FinTech compliance case study. No reply.", ai_summary: "No reply (9d). Cooling.", sentiment: "neutral", source: "gmail", created_at: ago(8) },

    // Swiggy - Vendor Onboarding
    { deal_id: dSwgVop, contact_id: divya, type: "email",   subject: "Proposal sent",                   content: "Sent proposal to Divya — ₹40L, 12-month term, 3-month implementation.", ai_summary: "Proposal sent. Awaiting review.", sentiment: "positive", source: "gmail", created_at: ago(2) },
    { deal_id: dSwgVop, contact_id: neha,  type: "meeting", subject: "Vendor mapping workshop",          content: "3-hour workshop with Neha mapping their vendor flow. She's excited.", ai_summary: "Strong adoption signal. Neha is internal champion.", sentiment: "positive", source: "calendar", created_at: ago(5) },
    { deal_id: dSwgVop, contact_id: arjun, type: "call",    subject: "Tech integration scoping",         content: "Arjun reviewed our API. Concerns about rate limits during festive surge.", ai_summary: "Rate limit concerns flagged.", sentiment: "neutral", source: "manual", created_at: ago(6) },
    { deal_id: dSwgVop, contact_id: divya, type: "call",    subject: "Strategy intro call",              content: "30-min intro with Divya. Aligned on vision; she's evaluating two vendors.", ai_summary: "Two-vendor bake-off. Differentiate on onboarding speed.", sentiment: "positive", source: "manual", created_at: ago(12) },

    // CRED - Member Engagement
    { deal_id: dCredMe, contact_id: rohan, type: "email",   subject: "Following up on next steps",  content: "Sent third follow-up to Rohan. No response.", ai_summary: "Third follow-up. No response 18d. Multi-thread.", sentiment: "negative", source: "gmail", created_at: ago(8) },
    { deal_id: dCredMe, contact_id: rohan, type: "meeting", subject: "Stakeholder workshop",         content: "Workshop with Rohan + 4 ops leads. Surfaced budget concerns mid-meeting.", ai_summary: "Budget concerns raised. May need to re-scope.", sentiment: "neutral", source: "calendar", created_at: ago(18) },
    { deal_id: dCredMe, contact_id: rohan, type: "call",    subject: "Discovery",                    content: "Rohan walked through their existing engagement pain. 30+ FTEs on manual reach-outs.", ai_summary: "ROI story strong: 30+ FTEs of manual work.", sentiment: "positive", source: "manual", created_at: ago(25) },

    // CRED - Fraud Detection
    { deal_id: dCredFr, contact_id: sneha, type: "email",   subject: "Re: Compliance questions", content: "Sneha sent 8 detailed compliance questions about PII handling.", ai_summary: "Detailed compliance Qs = buying signal.", sentiment: "positive", source: "gmail", created_at: ago(2) },
    { deal_id: dCredFr, contact_id: sneha, type: "meeting", subject: "Demo: Fraud Detection",    content: "Sneha and 2 from compliance attended. Engaged throughout.", ai_summary: "Strong engagement. Compliance team aligned.", sentiment: "positive", source: "calendar", created_at: ago(4) },
    { deal_id: dCredFr, contact_id: sneha, type: "call",    subject: "Discovery",                content: "Initial discovery with Sneha — fraud rates trending up post-IPO push.", ai_summary: "Pain validated: fraud rates rising.", sentiment: "neutral", source: "manual", created_at: ago(20) },

    // Nykaa - Marketing Automation
    { deal_id: dNykMa, contact_id: aditya, type: "email",   subject: "Pricing pushback", content: "Aditya: 'Marketing budget is tight this quarter. Can we revisit Q3?'", ai_summary: "Pricing pushback. Wants Q3.", sentiment: "negative", source: "gmail", created_at: ago(12) },
    { deal_id: dNykMa, contact_id: meera,  type: "call",    subject: "Growth ROI conversation", content: "Meera engaged on growth metrics. Wants e-comm case studies.", ai_summary: "Pivot to ROI angle.", sentiment: "positive", source: "manual", created_at: ago(8) },
    { deal_id: dNykMa, contact_id: aditya, type: "meeting", subject: "Demo + Q&A", content: "Demo went well technically, but Aditya stayed quiet. Tanvi (Marketing) was engaged.", ai_summary: "Aditya disengaged; Tanvi engaged.", sentiment: "neutral", source: "calendar", created_at: ago(15) },
    { deal_id: dNykMa, contact_id: tanvi,  type: "email",   subject: "Marketing playbook share", content: "Sent Tanvi 3 case studies of similar e-comm wins.", ai_summary: "3 case studies sent.", sentiment: "neutral", source: "gmail", created_at: ago(8) },
    { deal_id: dNykMa, contact_id: meera,  type: "note",    subject: "Champion notes", content: "Meera warm. Aditya blocker. Tanvi enthusiastic but no budget.", ai_summary: "Multi-thread: champion=Meera, blocker=Aditya.", sentiment: "neutral", source: "manual", created_at: ago(13) },

    // BYJU'S
    { deal_id: dByjLa, contact_id: lakshmi, type: "meeting", subject: "Curriculum data audit",     content: "Half-day session with Lakshmi reviewing data flow across 100+ courses.", ai_summary: "Data architecture mapped.", sentiment: "positive", source: "calendar", created_at: ago(4) },
    { deal_id: dByjLa, contact_id: pranav,  type: "email",   subject: "Following up post audit",  content: "Pranav confirmed budget envelope and timeline.", ai_summary: "Budget locked. Pranav driving.", sentiment: "positive", source: "gmail", created_at: ago(3) },
    { deal_id: dByjLa, contact_id: arnav,   type: "call",    subject: "Tech integration review",  content: "Arnav reviewed integration plan. Wants pilot scope first.", ai_summary: "Pilot-first approach.", sentiment: "neutral", source: "manual", created_at: ago(6) },
    { deal_id: dByjTo, contact_id: pranav,  type: "email",   subject: "Volume discount question", content: "Pranav asking for 15% volume discount on tutor count >2000.", ai_summary: "Discount request: 15%.", sentiment: "neutral", source: "gmail", created_at: ago(2) },
    { deal_id: dByjTo, contact_id: pranav,  type: "call",    subject: "Pricing discussion",       content: "45-min call. Walked through usage tiers.", ai_summary: "Likely landing at 10% discount.", sentiment: "positive", source: "manual", created_at: ago(5) },

    // Paytm
    { deal_id: dPayCs, contact_id: rajesh, type: "email",   subject: "Re: Final terms — data residency", content: "Rajesh confirmed all infra must be India-based.", ai_summary: "India-only data residency.", sentiment: "positive", source: "gmail", created_at: ago(1) },
    { deal_id: dPayCs, contact_id: rajesh, type: "meeting", subject: "Final commercial review",            content: "Rajesh walked through commercials with our finance team.", ai_summary: "Commercials agreed. Sig next.", sentiment: "positive", source: "calendar", created_at: ago(4) },
    { deal_id: dPayCs, contact_id: pooja,  type: "call",    subject: "Compliance walkthrough",             content: "Pooja tested edge cases on regulatory reporting.", ai_summary: "Edge cases handled. Strong fit.", sentiment: "positive", source: "manual", created_at: ago(8) },

    // Dream11
    { deal_id: dDrmRm, contact_id: aakash, type: "meeting", subject: "Technical evaluation", content: "Aakash + 2 risk analysts reviewed our scoring model.", ai_summary: "Strong technical fit. Need fantasy tuning.", sentiment: "positive", source: "calendar", created_at: ago(4) },
    { deal_id: dDrmRm, contact_id: ishita, type: "email",   subject: "Integration scope",    content: "Ishita asking for integration timeline. ETA 4-6 weeks.", ai_summary: "Integration ETA: 4-6 weeks.", sentiment: "neutral", source: "gmail", created_at: ago(7) },

    // Postman
    { deal_id: dPstApi, contact_id: vinay, type: "meeting", subject: "Enterprise demo", content: "90-min demo to Vinay + 3 platform engineers.", ai_summary: "Strong technical interest. CFO sign-off needed.", sentiment: "positive", source: "calendar", created_at: ago(5) },
    { deal_id: dPstApi, contact_id: vinay, type: "note",    subject: "Internal: champion notes", content: "Vinay technical champion but needs CFO buy-in.", ai_summary: "Champion=Vinay. Blocker=CFO.", sentiment: "neutral", source: "manual", created_at: ago(6) },

    // Urban Company
    { deal_id: dUrbPp, contact_id: karthik, type: "call", subject: "Initial discovery", content: "Karthik walked through provider experience pain. Budget likely Q3.", ai_summary: "Q3 budget timing.", sentiment: "neutral", source: "manual", created_at: ago(8) },

    // Meesho
    { deal_id: dMshSi, contact_id: maya, type: "meeting", subject: "Demo for sales team", content: "Demo to Maya + 4 sales managers. Lots of questions.", ai_summary: "Strong adoption signal.", sentiment: "positive", source: "calendar", created_at: ago(3) },
    { deal_id: dMshSi, contact_id: maya, type: "email",   subject: "Re: Pilot scope",     content: "Maya proposing 30-day pilot with 100 sellers.", ai_summary: "Pilot: 30 days, 100 sellers.", sentiment: "positive", source: "gmail", created_at: ago(2) },

    // Recent inbound (under 24h)
    { deal_id: dRzpPg,   contact_id: priya,  type: "email", subject: "Quick question on SSO",       content: "Priya asked one clarifying question on SSO setup time.", ai_summary: "SSO time-to-deploy question.", sentiment: "positive", source: "gmail", created_at: hoursAgo(10) },
    { deal_id: dZerRisk, contact_id: ananya, type: "email", subject: "API doc question",            content: "Ananya asking about webhook retry semantics.", ai_summary: "Webhook retry question.",       sentiment: "neutral",  source: "gmail", created_at: hoursAgo(14) },
    { deal_id: dSwgVop,  contact_id: divya,  type: "email", subject: "Re: Proposal sent",           content: "Divya: 'Reviewing today. Will revert by EOW.'", ai_summary: "Divya reviewing. EOW commitment.", sentiment: "positive", source: "gmail", created_at: hoursAgo(20) },

    // 3 upcoming meetings (next 24-48h) — scheduled_for in metadata
    { deal_id: dRzpPg,   contact_id: priya,  type: "meeting", subject: "Group demo with Razorpay merchant ops", content: "Demo for 8 reps + Priya. Walking through AI capture + auto-logging.", sentiment: "neutral",  source: "calendar", metadata: { scheduled_for: new Date(now.getTime() + 17 * HOUR).toISOString(), duration_min: 45, attendees: ["priya@razorpay.com"], location: "https://meet.google.com/abc-defg-hij" }, created_at: ago(1) },
    { deal_id: dZerRisk, contact_id: vikram, type: "meeting", subject: "Final pricing + signature review",      content: "Pricing lock-in with Vikram + Zerodha legal.",                          sentiment: "positive", source: "calendar", metadata: { scheduled_for: new Date(now.getTime() + 23 * HOUR).toISOString(), duration_min: 30, attendees: ["vikram@zerodha.com"], location: "Zoom" },                                  created_at: hoursAgo(12) },
    { deal_id: dSwgVop,  contact_id: divya,  type: "meeting", subject: "Proposal walkthrough with Divya",       content: "Walking Divya through the proposal line-by-line.",                      sentiment: "positive", source: "calendar", metadata: { scheduled_for: new Date(now.getTime() + 43 * HOUR).toISOString(), duration_min: 60, attendees: ["divya@swiggy.com"], location: "https://meet.google.com/swg-prop-walk" },     created_at: hoursAgo(8) },
  ]);
  if (aErr) throw aErr;

  // ─── 5. Tasks (~25) ────────────────────────────────────
  console.log("⛁  Inserting tasks…");
  const { error: tErr } = await sb.from("tasks").insert([
    // Overdue
    { deal_id: dCredMe,  contact_id: rohan,   description: "Multi-thread CRED — reach out to Sneha + Ishaan",     due_date: dateOnly(ago(3)),     priority: "high",   status: "pending",   ai_generated: true },
    { deal_id: dNykMa,   contact_id: aditya,  description: "Send pricing flexibility memo to Aditya",              due_date: dateOnly(ago(2)),     priority: "high",   status: "pending",   ai_generated: true },
    // Due today / soon
    { deal_id: dZerRisk, contact_id: vikram,  description: "Lock final pricing — Vikram needs by EOD",             due_date: dateOnly(fromNow(0)), priority: "high",   status: "pending",   ai_generated: true },
    { deal_id: dRzpPg,   contact_id: priya,   description: "Reply to Priya's SSO question",                        due_date: dateOnly(fromNow(0)), priority: "medium", status: "pending",   ai_generated: true },
    { deal_id: dZerRisk, contact_id: ananya,  description: "Engineering reply on webhook retry semantics",          due_date: dateOnly(fromNow(1)), priority: "medium", status: "pending",   ai_generated: true },
    // This week
    { deal_id: dSwgVop,  contact_id: divya,   description: "Follow up on proposal review (Divya committed EOW)",   due_date: dateOnly(fromNow(3)), priority: "medium", status: "pending",   ai_generated: true },
    { deal_id: dZerComp, contact_id: karan,   description: "Re-engage Karan with case study + value recap",         due_date: dateOnly(fromNow(2)), priority: "medium", status: "pending",   ai_generated: true },
    { deal_id: dCredFr,  contact_id: sneha,   description: "Compile compliance Q&A doc for Sneha",                  due_date: dateOnly(fromNow(2)), priority: "medium", status: "pending",   ai_generated: false },
    { deal_id: dByjLa,   contact_id: arnav,   description: "Send pilot MVP scope doc to Arnav",                     due_date: dateOnly(fromNow(4)), priority: "high",   status: "pending",   ai_generated: true },
    { deal_id: dByjTo,   contact_id: pranav,  description: "Counter-propose 10% discount tier to Pranav",           due_date: dateOnly(fromNow(3)), priority: "medium", status: "pending",   ai_generated: true },
    { deal_id: dPayCs,   contact_id: rajesh,  description: "Send finalized MSA to Paytm legal",                     due_date: dateOnly(fromNow(2)), priority: "high",   status: "pending",   ai_generated: true },
    { deal_id: dDrmRm,   contact_id: ishita,  description: "Share integration ETA + handoff doc with Ishita",        due_date: dateOnly(fromNow(5)), priority: "medium", status: "pending",   ai_generated: true },
    { deal_id: dPstApi,  contact_id: vinay,   description: "Draft executive 1-pager for CFO sign-off",              due_date: dateOnly(fromNow(4)), priority: "medium", status: "pending",   ai_generated: true },
    { deal_id: dMshSi,   contact_id: maya,    description: "Confirm 30-day pilot scope and pricing",                due_date: dateOnly(fromNow(3)), priority: "high",   status: "pending",   ai_generated: true },
    // Next week
    { deal_id: dRzpPg,   contact_id: priya,   description: "Schedule group demo with Razorpay merchant ops team",   due_date: dateOnly(fromNow(7)), priority: "medium", status: "pending",   ai_generated: true },
    { deal_id: dSwgVop,  contact_id: arjun,   description: "Follow up with Arjun on rate-limit scaling plan",        due_date: dateOnly(fromNow(8)), priority: "medium", status: "pending",   ai_generated: true },
    { deal_id: dUrbPp,   contact_id: karthik, description: "Schedule discovery v2 with Karthik for Q3 budget cycle", due_date: dateOnly(fromNow(10)), priority: "low",  status: "pending",   ai_generated: true },
    // Completed
    { deal_id: dRzpPg,   contact_id: aarav,   description: "Send SOC 2 report to Aarav",                            due_date: dateOnly(ago(7)),     priority: "low",    status: "completed", ai_generated: false },
    { deal_id: dPayCs,   contact_id: pooja,   description: "Walk Pooja through edge-case compliance scenarios",      due_date: dateOnly(ago(8)),     priority: "medium", status: "completed", ai_generated: false },
    { deal_id: dSwgVop,  contact_id: neha,    description: "Send vendor onboarding case studies",                   due_date: dateOnly(ago(5)),     priority: "low",    status: "completed", ai_generated: true },
    { deal_id: dDrmRm,   contact_id: aakash,  description: "Walk Aakash through fantasy-tuned scoring weights",     due_date: dateOnly(ago(4)),     priority: "medium", status: "completed", ai_generated: false },
    { deal_id: dZerRisk, contact_id: vikram,  description: "Send legal-redlined v1 of the MSA",                     due_date: dateOnly(ago(6)),     priority: "high",   status: "completed", ai_generated: false },
    { deal_id: dCredFr,  contact_id: sneha,   description: "Send PII handling doc",                                 due_date: dateOnly(ago(3)),     priority: "medium", status: "completed", ai_generated: false },
    { deal_id: dByjLa,   contact_id: lakshmi, description: "Schedule curriculum data audit session",                due_date: dateOnly(ago(5)),     priority: "high",   status: "completed", ai_generated: false },
    { deal_id: dMshSi,   contact_id: maya,    description: "Set up demo for Meesho sales team",                     due_date: dateOnly(ago(4)),     priority: "medium", status: "completed", ai_generated: false },
  ]);
  if (tErr) throw tErr;

  console.log("✓ Seeded:");
  console.log(`  ${companies.length} companies`);
  console.log(`  ${contacts.length} contacts`);
  console.log(`  ${deals.length} deals`);
  console.log(`  ~50 activities`);
  console.log(`  25 tasks`);
}

// ─── CLI entry ────────────────────────────────────────────
if (process.argv[1]?.endsWith("seed.ts") || process.argv[1]?.endsWith("seed.js")) {
  seedDemoData()
    .then(() => {
      console.log("\n✅ Done.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("\n❌ Seed failed:", err);
      process.exit(1);
    });
}
