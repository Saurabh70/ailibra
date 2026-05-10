-- ailibra :: Indian B2B SaaS demo data (rupees)
-- Paste into Supabase SQL Editor and run.
-- Wipes the demo dataset and re-inserts richer data:
--   12 companies (real Indian B2B brands)
--   25 contacts (Indian names)
--   15 deals (₹3L–₹1.2Cr range, mix of stages and health)
--   ~80 activities across last 30 days
--   25 tasks (some overdue, some upcoming)
--   3 upcoming meetings (next 24-48h)
-- Idempotent: safe to re-run.

DO $$
DECLARE
  -- ─── Companies ────────────────────────────────────────
  c_razorpay UUID := gen_random_uuid();
  c_zerodha  UUID := gen_random_uuid();
  c_swiggy   UUID := gen_random_uuid();
  c_cred     UUID := gen_random_uuid();
  c_nykaa    UUID := gen_random_uuid();
  c_byjus    UUID := gen_random_uuid();
  c_paytm    UUID := gen_random_uuid();
  c_dream11  UUID := gen_random_uuid();
  c_postman  UUID := gen_random_uuid();
  c_urban    UUID := gen_random_uuid();
  c_meesho   UUID := gen_random_uuid();
  c_zomato   UUID := gen_random_uuid();

  -- ─── Contacts (25) ────────────────────────────────────
  p_priya    UUID := gen_random_uuid();  -- Razorpay VP Sales
  p_aarav    UUID := gen_random_uuid();  -- Razorpay Head of Eng
  p_riya     UUID := gen_random_uuid();  -- Razorpay Head of Product
  p_vikram   UUID := gen_random_uuid();  -- Zerodha CFO
  p_ananya   UUID := gen_random_uuid();  -- Zerodha VP Eng
  p_karan    UUID := gen_random_uuid();  -- Zerodha Director Risk
  p_neha     UUID := gen_random_uuid();  -- Swiggy Director Ops
  p_arjun    UUID := gen_random_uuid();  -- Swiggy Eng Manager
  p_divya    UUID := gen_random_uuid();  -- Swiggy Head Strategy
  p_rohan    UUID := gen_random_uuid();  -- CRED VP Operations
  p_sneha    UUID := gen_random_uuid();  -- CRED Compliance Lead
  p_ishaan   UUID := gen_random_uuid();  -- CRED Head of Data
  p_meera    UUID := gen_random_uuid();  -- Nykaa Director Growth
  p_aditya   UUID := gen_random_uuid();  -- Nykaa VP Tech
  p_tanvi    UUID := gen_random_uuid();  -- Nykaa Head Marketing
  p_pranav   UUID := gen_random_uuid();  -- BYJU'S VP Sales
  p_lakshmi  UUID := gen_random_uuid();  -- BYJU'S Head Curriculum
  p_arnav    UUID := gen_random_uuid();  -- BYJU'S Director Product
  p_rajesh   UUID := gen_random_uuid();  -- Paytm CFO
  p_pooja    UUID := gen_random_uuid();  -- Paytm Head Compliance
  p_aakash   UUID := gen_random_uuid();  -- Dream11 Head Risk
  p_ishita   UUID := gen_random_uuid();  -- Dream11 Director Eng
  p_vinay    UUID := gen_random_uuid();  -- Postman CTO
  p_karthik  UUID := gen_random_uuid();  -- Urban Company COO
  p_maya     UUID := gen_random_uuid();  -- Meesho VP Sales

  -- ─── Deals (15) ───────────────────────────────────────
  d_rzp_pg   UUID := gen_random_uuid();  -- Razorpay Payment Gateway Premium
  d_rzp_an   UUID := gen_random_uuid();  -- Razorpay Analytics Add-on
  d_zr_risk  UUID := gen_random_uuid();  -- Zerodha Risk Engine
  d_zr_comp  UUID := gen_random_uuid();  -- Zerodha Compliance Module
  d_swg_vop  UUID := gen_random_uuid();  -- Swiggy Vendor Onboarding
  d_cred_me  UUID := gen_random_uuid();  -- CRED Member Engagement (at-risk)
  d_cred_fr  UUID := gen_random_uuid();  -- CRED Fraud Detection
  d_nyk_ma   UUID := gen_random_uuid();  -- Nykaa Marketing Automation (cooling)
  d_byj_la   UUID := gen_random_uuid();  -- BYJU'S Learning Analytics
  d_byj_to   UUID := gen_random_uuid();  -- BYJU'S Tutor Onboarding
  d_pay_cs   UUID := gen_random_uuid();  -- Paytm Compliance Stack
  d_drm_rm   UUID := gen_random_uuid();  -- Dream11 Risk Modeling
  d_pst_api  UUID := gen_random_uuid();  -- Postman Enterprise API Tier
  d_urb_pp   UUID := gen_random_uuid();  -- Urban Company Provider Portal
  d_msh_si   UUID := gen_random_uuid();  -- Meesho Seller Insights

  today_d    DATE := CURRENT_DATE;
BEGIN
  -- ─── 1. Wipe existing data (FK-safe order) ───────────
  DELETE FROM email_tracking WHERE id IS NOT NULL;
  DELETE FROM tasks          WHERE id IS NOT NULL;
  DELETE FROM activities     WHERE id IS NOT NULL;
  DELETE FROM deals          WHERE id IS NOT NULL;
  DELETE FROM contacts       WHERE id IS NOT NULL;
  DELETE FROM companies      WHERE id IS NOT NULL;

  -- ─── 2. Companies ────────────────────────────────────
  INSERT INTO companies (id, name, industry, size, website, linkedin, health_score, total_deal_value) VALUES
    (c_razorpay, 'Razorpay',       'Fintech / Payments',      '1500 employees', 'https://razorpay.com',     'https://linkedin.com/company/razorpay',     78,  6500000),
    (c_zerodha,  'Zerodha',        'Fintech / Brokerage',     '1200 employees', 'https://zerodha.com',      'https://linkedin.com/company/zerodha',      82, 10500000),
    (c_swiggy,   'Swiggy',         'FoodTech / Delivery',     '5000 employees', 'https://swiggy.com',       'https://linkedin.com/company/swiggy',       74,  4000000),
    (c_cred,     'CRED',           'Fintech / Consumer',      '1000 employees', 'https://cred.club',        'https://linkedin.com/company/cred-club',    44, 10500000),
    (c_nykaa,    'Nykaa',          'E-commerce / Beauty',     '1500 employees', 'https://nykaa.com',        'https://linkedin.com/company/nykaa',        38,  6000000),
    (c_byjus,    'BYJU''S',        'EdTech',                  '8000 employees', 'https://byjus.com',        'https://linkedin.com/company/byjus',        66,  8000000),
    (c_paytm,    'Paytm',          'Fintech / Payments',     '10000 employees', 'https://paytm.com',        'https://linkedin.com/company/paytm',        80,  6500000),
    (c_dream11,  'Dream11',        'Sports / Gaming',         '1200 employees', 'https://dream11.com',      'https://linkedin.com/company/dream11',      71,  5500000),
    (c_postman,  'Postman',        'DevTools / API',          '800 employees',  'https://postman.com',      'https://linkedin.com/company/postman',      75,  2500000),
    (c_urban,    'Urban Company',  'Services / Marketplace',  '1500 employees', 'https://urbancompany.com', 'https://linkedin.com/company/urbanclap',    62,  4000000),
    (c_meesho,   'Meesho',         'E-commerce / Reseller',   '1700 employees', 'https://meesho.com',       'https://linkedin.com/company/meesho',       58,  3000000),
    (c_zomato,   'Zomato',         'FoodTech / Discovery',    '5000 employees', 'https://zomato.com',       'https://linkedin.com/company/zomato',       70,        0);

  -- ─── 3. Contacts (25) ────────────────────────────────
  INSERT INTO contacts (id, company_id, name, role, email, phone, linkedin, sentiment, engagement_score, last_interaction) VALUES
    -- Razorpay
    (p_priya,   c_razorpay, 'Priya Sharma',     'VP Sales',              'priya@razorpay.com',     '+91 98200 12345', 'https://linkedin.com/in/priyasharma',     'positive', 82, NOW() - INTERVAL '2 days'),
    (p_aarav,   c_razorpay, 'Aarav Kapoor',     'Head of Engineering',   'aarav@razorpay.com',     '+91 98200 22345', 'https://linkedin.com/in/aaravkapoor',     'neutral',  65, NOW() - INTERVAL '7 days'),
    (p_riya,    c_razorpay, 'Riya Mehta',       'Head of Product',       'riya@razorpay.com',      NULL,              'https://linkedin.com/in/riyamehta',       'positive', 70, NOW() - INTERVAL '4 days'),
    -- Zerodha
    (p_vikram,  c_zerodha,  'Vikram Iyer',      'CFO',                   'vikram@zerodha.com',     '+91 99300 11122', 'https://linkedin.com/in/vikramiyer',      'positive', 88, NOW() - INTERVAL '1 days'),
    (p_ananya,  c_zerodha,  'Ananya Desai',     'VP Engineering',        'ananya@zerodha.com',     '+91 99300 22233', NULL,                                       'positive', 75, NOW() - INTERVAL '3 days'),
    (p_karan,   c_zerodha,  'Karan Patel',      'Director of Risk',      'karan@zerodha.com',      NULL,              NULL,                                       'neutral',  55, NOW() - INTERVAL '9 days'),
    -- Swiggy
    (p_neha,    c_swiggy,   'Neha Reddy',       'Director of Operations','neha@swiggy.com',        '+91 90080 33344', NULL,                                       'positive', 78, NOW() - INTERVAL '2 days'),
    (p_arjun,   c_swiggy,   'Arjun Singh',      'Engineering Manager',   'arjun@swiggy.com',       NULL,              'https://linkedin.com/in/arjunsingh',      'neutral',  60, NOW() - INTERVAL '6 days'),
    (p_divya,   c_swiggy,   'Divya Krishnan',   'Head of Strategy',      'divya@swiggy.com',       '+91 90080 44455', 'https://linkedin.com/in/divyakrishnan',   'positive', 85, NOW() - INTERVAL '5 days'),
    -- CRED
    (p_rohan,   c_cred,     'Rohan Gupta',      'VP Operations',         'rohan@cred.club',        '+91 98765 11223', NULL,                                       'negative', 32, NOW() - INTERVAL '18 days'),
    (p_sneha,   c_cred,     'Sneha Bhatia',     'Compliance Lead',       'sneha@cred.club',        NULL,              NULL,                                       'neutral',  48, NOW() - INTERVAL '14 days'),
    (p_ishaan,  c_cred,     'Ishaan Verma',     'Head of Data',          'ishaan@cred.club',       NULL,              'https://linkedin.com/in/ishaanverma',     'neutral',  50, NOW() - INTERVAL '11 days'),
    -- Nykaa
    (p_meera,   c_nykaa,    'Meera Nair',       'Director of Growth',    'meera@nykaa.com',        '+91 99888 55667', NULL,                                       'neutral',  52, NOW() - INTERVAL '12 days'),
    (p_aditya,  c_nykaa,    'Aditya Joshi',     'VP Tech',               'aditya@nykaa.com',       NULL,              'https://linkedin.com/in/adityajoshi',     'negative', 35, NOW() - INTERVAL '20 days'),
    (p_tanvi,   c_nykaa,    'Tanvi Saxena',     'Head of Marketing',     'tanvi@nykaa.com',        '+91 99888 66778', NULL,                                       'neutral',  58, NOW() - INTERVAL '8 days'),
    -- BYJU'S
    (p_pranav,  c_byjus,    'Pranav Kulkarni',  'VP Sales',              'pranav@byjus.com',       '+91 98123 44556', 'https://linkedin.com/in/pranavkulkarni',  'positive', 76, NOW() - INTERVAL '3 days'),
    (p_lakshmi, c_byjus,    'Lakshmi Rao',      'Head of Curriculum',    'lakshmi@byjus.com',      NULL,              NULL,                                       'positive', 80, NOW() - INTERVAL '4 days'),
    (p_arnav,   c_byjus,    'Arnav Bhatt',      'Director of Product',   'arnav@byjus.com',        '+91 98123 55667', 'https://linkedin.com/in/arnavbhatt',      'neutral',  62, NOW() - INTERVAL '6 days'),
    -- Paytm
    (p_rajesh,  c_paytm,    'Rajesh Khanna',    'CFO',                   'rajesh@paytm.com',       '+91 98765 77889', 'https://linkedin.com/in/rajeshkhanna',    'positive', 84, NOW() - INTERVAL '2 days'),
    (p_pooja,   c_paytm,    'Pooja Singhal',    'Head of Compliance',    'pooja@paytm.com',        NULL,              NULL,                                       'positive', 72, NOW() - INTERVAL '5 days'),
    -- Dream11
    (p_aakash,  c_dream11,  'Aakash Agarwal',   'Head of Risk',          'aakash@dream11.com',     '+91 99000 11122', 'https://linkedin.com/in/aakashagarwal',   'positive', 78, NOW() - INTERVAL '4 days'),
    (p_ishita,  c_dream11,  'Ishita Roy',       'Director of Engineering','ishita@dream11.com',    NULL,              NULL,                                       'neutral',  64, NOW() - INTERVAL '7 days'),
    -- Postman
    (p_vinay,   c_postman,  'Vinay Krishnan',   'CTO',                   'vinay@postman.com',      '+91 88990 11223', 'https://linkedin.com/in/vinaykrishnan',   'positive', 73, NOW() - INTERVAL '5 days'),
    -- Urban Company
    (p_karthik, c_urban,    'Karthik Iyer',     'COO',                   'karthik@urbancompany.com', '+91 87654 33445', NULL,                                    'neutral',  61, NOW() - INTERVAL '8 days'),
    -- Meesho
    (p_maya,    c_meesho,   'Maya Krishnamurthy','VP Sales',             'maya@meesho.com',        NULL,              'https://linkedin.com/in/mayakrishnamurthy','positive', 68, NOW() - INTERVAL '3 days');

  -- ─── 4. Deals (15) — values in INR ────────────────────
  INSERT INTO deals (id, company_id, name, value, stage, health_score, health_reason, expected_close, risk_level, primary_contact_id, ai_summary) VALUES
    (d_rzp_pg,  c_razorpay, 'Payment Gateway Premium',     5000000, 'discovery',   76, 'Strong engagement from VP Sales; demo scheduled.',                            today_d + INTERVAL '45 days',  'low',    p_priya,   'Razorpay is exploring our Payment Gateway Premium tier for their merchant infrastructure. Priya (VP Sales) is the champion. Next: complete discovery, then full-team demo.'),
    (d_rzp_an,  c_razorpay, 'Analytics Add-on',            1500000, 'lead',        52, 'Inbound interest, no qualifying call yet.',                                    today_d + INTERVAL '60 days',  'medium', p_riya,    'Riya signed up for the analytics waitlist. Hasn''t responded to outreach in 4 days.'),
    (d_zr_risk, c_zerodha,  'Risk Engine Integration',     7500000, 'negotiation', 84, 'Procurement engaged; legal redlines exchanged.',                              today_d + INTERVAL '14 days',  'low',    p_vikram,  'Zerodha CFO Vikram driving this aggressively — they want to close before quarter-end. Legal is the only remaining gate. Push for signature this week.'),
    (d_zr_comp, c_zerodha,  'Compliance Reporting Module', 3000000, 'demo',        58, 'Demo went well but follow-up has slowed.',                                     today_d + INTERVAL '40 days',  'medium', p_karan,   'Karan attended demo 9 days ago, has not replied to follow-up. Consider escalating to Vikram or sending a value recap.'),
    (d_swg_vop, c_swiggy,   'Vendor Onboarding Platform',  4000000, 'proposal',    79, 'Proposal sent, head of strategy reviewing personally.',                       today_d + INTERVAL '21 days',  'low',    p_divya,   'Swiggy''s Head of Strategy Divya is reviewing the proposal personally — strong buying signal. Neha (Operations) is the user champion.'),
    (d_cred_me, c_cred,     'Member Engagement Suite',     8000000, 'discovery',   28, 'Stalled — no contact in 18 days, primary went dark.',                         today_d + INTERVAL '75 days',  'high',   p_rohan,   'CRED''s deal has stalled. Rohan (VP Ops) hasn''t responded in 18 days. Recommend a multi-threaded re-engagement to Sneha (Compliance) or Ishaan (Data).'),
    (d_cred_fr, c_cred,     'Fraud Detection',             2500000, 'demo',        64, 'Sneha engaged, technical questions pending.',                                 today_d + INTERVAL '35 days',  'medium', p_sneha,   'Sneha asking detailed compliance questions — buying signal. Loop in Ishaan to address data architecture.'),
    (d_nyk_ma,  c_nykaa,    'Marketing Automation',        6000000, 'demo',        41, 'Pricing pushback; Aditya ghosted after demo.',                                today_d + INTERVAL '50 days',  'high',   p_meera,   'Nykaa deal is cooling. Aditya pushed back on pricing 12 days ago and has gone silent. Meera (Growth) still warm — pivot conversation to growth ROI rather than tech.'),
    (d_byj_la,  c_byjus,    'Learning Analytics Platform', 4500000, 'discovery',   72, 'Curriculum head is the strongest champion.',                                  today_d + INTERVAL '30 days',  'low',    p_lakshmi, 'BYJU''S Learning Analytics opportunity is led by Lakshmi (Curriculum). Pranav (VP Sales) is supportive. Need to align on data model with Arnav.'),
    (d_byj_to,  c_byjus,    'Tutor Onboarding',            3500000, 'proposal',    68, 'Proposal under review; pricing is the open question.',                        today_d + INTERVAL '28 days',  'medium', p_pranav,  'Tutor Onboarding proposal under review at BYJU''S. Pricing flexibility is the key open item — Pranav asked for a 15% volume discount.'),
    (d_pay_cs,  c_paytm,    'Compliance Stack',            6500000, 'negotiation', 86, 'CFO-led; very motivated. Final terms being worked.',                          today_d + INTERVAL '12 days',  'low',    p_rajesh,  'Paytm CFO Rajesh is closing this. Pooja (Compliance) is the user champion. Last open item: data residency in India clause.'),
    (d_drm_rm,  c_dream11,  'Risk Modeling',               5500000, 'discovery',   70, 'Strong technical buy-in; commercials TBD.',                                   today_d + INTERVAL '40 days',  'low',    p_aakash,  'Dream11 evaluating our risk modeling for fantasy gaming. Aakash (Head of Risk) is the technical buyer; Ishita (Eng) is reviewing integration scope.'),
    (d_pst_api, c_postman,  'Enterprise API Tier',         2500000, 'demo',        65, 'Demo positive; Vinay coordinating internal review.',                          today_d + INTERVAL '25 days',  'medium', p_vinay,   'Postman exploring our Enterprise API tier. Vinay (CTO) is the technical lead; needs CFO sign-off next.'),
    (d_urb_pp,  c_urban,    'Service Provider Portal',     4000000, 'lead',        56, 'Initial discovery only.',                                                     today_d + INTERVAL '55 days',  'medium', p_karthik, 'Urban Company looking to digitize their service provider experience. Karthik (COO) on the call but says budget is Q3.'),
    (d_msh_si,  c_meesho,   'Seller Insights',             3000000, 'demo',        69, 'Maya engaged; needs internal alignment.',                                     today_d + INTERVAL '38 days',  'medium', p_maya,    'Meesho''s VP Sales Maya is the champion for Seller Insights. Needs alignment with their tech team next week.');

  -- ─── 5. Activities (~80 across all deals) ─────────────
  -- Razorpay - Payment Gateway
  INSERT INTO activities (deal_id, contact_id, type, subject, content, ai_summary, sentiment, source, created_at) VALUES
    (d_rzp_pg,  p_priya,  'email',   'Re: Enterprise pricing for 2000 merchants', 'Priya replied confirming budget of ₹50L and asked for a security questionnaire.', 'Budget confirmed (₹50L). Send security questionnaire.',                'positive', 'gmail',    NOW() - INTERVAL '2 days'),
    (d_rzp_pg,  p_priya,  'call',    'Discovery call',                            '30-min call with Priya. Use case: replacing legacy gateway. Pain points: chargeback rates, slow settlement.', 'Pain validated. Decision criteria: chargeback handling, T+0 settlement.',  'positive', 'manual',   NOW() - INTERVAL '5 days'),
    (d_rzp_pg,  p_aarav,  'meeting', 'Tech deep-dive with Head of Eng',           'Aarav focused on data residency and SOC 2 audit.',                              'SOC 2 acceptance confirmed. Data residency cleared.',                  'positive', 'calendar', NOW() - INTERVAL '7 days'),
    (d_rzp_pg,  p_priya,  'email',   'Demo follow-up + next steps',               'Sent recap of demo; proposed group demo with merchant ops team next Tuesday.', 'Group demo proposed for Tue.',                                          'neutral',  'gmail',    NOW() - INTERVAL '10 days'),
    (d_rzp_pg,  p_priya,  'note',    'Internal: champion strength',                'Priya is a strong champion — internal advocate for 3 weeks.',                  'Strong champion (3+ weeks).',                                           'positive', 'manual',   NOW() - INTERVAL '15 days'),

  -- Razorpay - Analytics
    (d_rzp_an,  p_riya,   'email',   'Analytics waitlist follow-up',              'Initial outreach to Riya about analytics module. No response yet.',            'Awaiting reply (4 days).',                                              'neutral',  'gmail',    NOW() - INTERVAL '4 days'),

  -- Zerodha - Risk Engine
    (d_zr_risk, p_vikram, 'call',    'Procurement sync',                          'Vikram pushing hard for Q-end close. Wants final pricing locked by EOW. Mentioned competing vendor proposal.', 'Competitive deal. Vikram wants pricing locked by Friday.',     'positive', 'manual',   NOW() - INTERVAL '1 days'),
    (d_zr_risk, p_ananya, 'meeting', 'Engineering integration review',            'Ananya walked through their existing data infra. Two API endpoints we need to build webhooks for.', 'Technical scope: 2 webhook endpoints. No blockers.',                  'positive', 'calendar', NOW() - INTERVAL '3 days'),
    (d_zr_risk, p_vikram, 'email',   'Legal redlines v2',                         'Vikram returned redlines on the MSA — mostly indemnity language. Forwarded to our legal.', 'Redlines on indemnity. Awaiting legal turnaround.',                     'neutral',  'gmail',    NOW() - INTERVAL '6 days'),
    (d_zr_risk, p_vikram, 'note',    'Internal: champion strength',                'Vikram is highly motivated — bonus tied to risk platform deployment by Q-end.', 'Strong champion. Bonus-aligned.',                                       'positive', 'manual',   NOW() - INTERVAL '8 days'),
    (d_zr_risk, p_vikram, 'call',    'Initial intro',                             'First call with Vikram. CFO-led deal.',                                         'CFO-led. Strong buying authority.',                                     'positive', 'manual',   NOW() - INTERVAL '22 days'),

  -- Zerodha - Compliance
    (d_zr_comp, p_karan,  'meeting', 'Compliance demo',                            'Demo to Karan + 2 team members. Engaged but skeptical of automation depth.',  'Skepticism about automation depth — send case study.',                  'neutral',  'calendar', NOW() - INTERVAL '9 days'),
    (d_zr_comp, p_karan,  'email',   'Demo follow-up + case study',                'Sent the FinTech compliance case study. No reply.',                            'No reply (9d). Cooling.',                                                'neutral',  'gmail',    NOW() - INTERVAL '8 days'),

  -- Swiggy - Vendor Onboarding
    (d_swg_vop, p_divya,  'email',   'Proposal sent',                              'Sent proposal to Divya — ₹40L, 12-month term, 3-month implementation.',         'Proposal sent. Awaiting review.',                                       'positive', 'gmail',    NOW() - INTERVAL '2 days'),
    (d_swg_vop, p_neha,   'meeting', 'Vendor mapping workshop',                    '3-hour workshop with Neha mapping their vendor onboarding flow. She''s excited.', 'Strong user adoption signal. Neha is internal champion.',            'positive', 'calendar', NOW() - INTERVAL '5 days'),
    (d_swg_vop, p_arjun,  'call',    'Tech integration scoping',                   'Arjun reviewed our API. Concerns about rate limits during festive surge.',     'Rate limit concerns flagged. Need scaling plan in proposal.',           'neutral',  'manual',   NOW() - INTERVAL '6 days'),
    (d_swg_vop, p_divya,  'call',    'Strategy intro call',                        '30-min intro with Divya. Aligned on vision; she''s evaluating two vendors.',    'Two-vendor bake-off. Differentiate on onboarding speed.',               'positive', 'manual',   NOW() - INTERVAL '12 days'),

  -- CRED - Member Engagement (stalled)
    (d_cred_me, p_rohan,  'email',   'Following up on next steps',                 'Sent third follow-up to Rohan. No response.',                                  'Third follow-up sent. No response in 18 days. Recommend multi-thread.', 'negative', 'gmail',    NOW() - INTERVAL '8 days'),
    (d_cred_me, p_rohan,  'meeting', 'Stakeholder workshop',                       'Workshop with Rohan + 4 ops leads. Surfaced budget concerns mid-meeting.',     'Budget concerns raised. May need to re-scope.',                          'neutral',  'calendar', NOW() - INTERVAL '18 days'),
    (d_cred_me, p_rohan,  'call',    'Discovery',                                  'Rohan walked through their existing engagement pain. 30+ FTEs on manual reach-outs.', 'ROI story is strong: 30+ FTEs of manual work.',                  'positive', 'manual',   NOW() - INTERVAL '25 days'),

  -- CRED - Fraud Detection
    (d_cred_fr, p_sneha,  'email',   'Re: Compliance questions',                   'Sneha sent 8 detailed compliance questions about PII handling.',                'Detailed compliance questions = buying signal.',                        'positive', 'gmail',    NOW() - INTERVAL '2 days'),
    (d_cred_fr, p_sneha,  'meeting', 'Demo: Fraud Detection',                      'Sneha and 2 from compliance attended. Engaged throughout.',                    'Strong engagement. Compliance team aligned.',                            'positive', 'calendar', NOW() - INTERVAL '4 days'),
    (d_cred_fr, p_sneha,  'call',    'Discovery',                                  'Initial discovery with Sneha — fraud rates trending up post-IPO push.',        'Pain validated: fraud rates rising.',                                    'neutral',  'manual',   NOW() - INTERVAL '20 days'),

  -- Nykaa - Marketing Automation (cooling)
    (d_nyk_ma,  p_aditya, 'email',   'Pricing pushback',                           'Aditya: "Our marketing budget is tight this quarter. Can we revisit Q3?"',       'Pricing pushback. Aditya wants to delay to Q3.',                        'negative', 'gmail',    NOW() - INTERVAL '12 days'),
    (d_nyk_ma,  p_meera,  'call',    'Growth ROI conversation',                    'Meera engaged on growth metrics. Wants to see customer success stories from similar e-comm.', 'Pivot to ROI/growth angle. Meera receptive.',           'positive', 'manual',   NOW() - INTERVAL '8 days'),
    (d_nyk_ma,  p_aditya, 'meeting', 'Demo + Q&A',                                 'Demo went well technically, but Aditya stayed quiet. Tanvi (Marketing) was engaged.', 'Aditya disengaged in demo; Tanvi engaged.',                        'neutral',  'calendar', NOW() - INTERVAL '15 days'),
    (d_nyk_ma,  p_tanvi,  'email',   'Marketing playbook share',                   'Sent Tanvi 3 case studies of similar e-comm marketing automation wins.',       'Sent 3 case studies. Awaiting reply.',                                  'neutral',  'gmail',    NOW() - INTERVAL '8 days'),
    (d_nyk_ma,  p_meera,  'note',    'Champion notes',                             'Meera is the warmest contact. Aditya is the blocker. Tanvi is enthusiastic but no budget.', 'Multi-thread strategy: champion=Meera, blocker=Aditya.',     'neutral',  'manual',   NOW() - INTERVAL '13 days'),

  -- BYJU'S - Learning Analytics
    (d_byj_la,  p_lakshmi,'meeting', 'Curriculum data audit',                      'Half-day session with Lakshmi reviewing data flow across 100+ courses.',        'Data architecture mapped. Need ingestion plan from Arnav.',              'positive', 'calendar', NOW() - INTERVAL '4 days'),
    (d_byj_la,  p_pranav, 'email',   'Following up post audit',                    'Pranav confirmed budget envelope and timeline.',                                 'Budget locked. Pranav driving timeline.',                                 'positive', 'gmail',    NOW() - INTERVAL '3 days'),
    (d_byj_la,  p_arnav,  'call',    'Tech integration review',                    'Arnav reviewed integration plan. Wants pilot scope first.',                     'Pilot-first approach. Define MVP scope this week.',                       'neutral',  'manual',   NOW() - INTERVAL '6 days'),

  -- BYJU'S - Tutor Onboarding
    (d_byj_to,  p_pranav, 'email',   'Volume discount question',                   'Pranav asking for 15% volume discount on tutor count >2000.',                  'Discount request: 15% on >2000 tutors.',                                  'neutral',  'gmail',    NOW() - INTERVAL '2 days'),
    (d_byj_to,  p_pranav, 'call',    'Pricing discussion',                         '45-min call. Walked through usage tiers.',                                       'Tiers reviewed. Likely landing at 10% discount.',                         'positive', 'manual',   NOW() - INTERVAL '5 days'),

  -- Paytm - Compliance Stack
    (d_pay_cs,  p_rajesh, 'email',   'Re: Final terms — data residency',           'Rajesh confirmed all infra must be India-based. Easy yes.',                       'India-only data residency confirmed.',                                    'positive', 'gmail',    NOW() - INTERVAL '1 days'),
    (d_pay_cs,  p_rajesh, 'meeting', 'Final commercial review',                    'Rajesh walked through final commercials with our finance team.',                  'Commercials agreed. Signature next.',                                      'positive', 'calendar', NOW() - INTERVAL '4 days'),
    (d_pay_cs,  p_pooja,  'call',    'Compliance walkthrough',                     'Pooja tested edge cases on regulatory reporting.',                                 'All edge cases handled. Strong compliance fit.',                          'positive', 'manual',   NOW() - INTERVAL '8 days'),

  -- Dream11 - Risk Modeling
    (d_drm_rm,  p_aakash, 'meeting', 'Technical evaluation',                       'Aakash + 2 risk analysts reviewed our scoring model.',                            'Strong technical fit. Need fantasy-specific tuning.',                     'positive', 'calendar', NOW() - INTERVAL '4 days'),
    (d_drm_rm,  p_ishita, 'email',   'Integration scope',                          'Ishita asking for integration timeline. ETA 4-6 weeks.',                          'Integration ETA: 4-6 weeks.',                                              'neutral',  'gmail',    NOW() - INTERVAL '7 days'),

  -- Postman - Enterprise API
    (d_pst_api, p_vinay,  'meeting', 'Enterprise demo',                            '90-min demo to Vinay + 3 platform engineers.',                                    'Strong technical interest. CFO sign-off needed.',                         'positive', 'calendar', NOW() - INTERVAL '5 days'),
    (d_pst_api, p_vinay,  'note',    'Internal: champion notes',                   'Vinay is the technical champion but needs CFO buy-in.',                            'Champion = Vinay. Blocker = CFO sign-off.',                                'neutral',  'manual',   NOW() - INTERVAL '6 days'),

  -- Urban Company - Provider Portal
    (d_urb_pp,  p_karthik,'call',    'Initial discovery',                          'Karthik walked through provider experience pain. Budget likely Q3.',               'Q3 budget timing. Pain validated.',                                        'neutral',  'manual',   NOW() - INTERVAL '8 days'),

  -- Meesho - Seller Insights
    (d_msh_si,  p_maya,   'meeting', 'Demo for sales team',                        'Demo to Maya + 4 sales managers. Lots of questions.',                              'Strong adoption signal from sales team.',                                  'positive', 'calendar', NOW() - INTERVAL '3 days'),
    (d_msh_si,  p_maya,   'email',   'Re: Pilot scope',                            'Maya proposing 30-day pilot with 100 sellers.',                                    'Pilot scope: 30 days, 100 sellers.',                                       'positive', 'gmail',    NOW() - INTERVAL '2 days'),

  -- Cross-deal noise — recent inbound
    (d_rzp_pg,  p_priya,  'email',   'Quick question on SSO',                      'Priya asked one clarifying question on SSO setup time.',                           'SSO time-to-deploy question. Reply with 1-week estimate.',                'positive', 'gmail',    NOW() - INTERVAL '10 hours'),
    (d_zr_risk, p_ananya, 'email',   'API doc question',                            'Ananya asking about webhook retry semantics.',                                     'Webhook retry question. Engineering reply needed.',                       'neutral',  'gmail',    NOW() - INTERVAL '14 hours'),
    (d_swg_vop, p_divya,  'email',   'Re: Proposal sent',                          'Divya: "Reviewing today. Will revert by EOW."',                                    'Divya reviewing. EOW commitment.',                                         'positive', 'gmail',    NOW() - INTERVAL '20 hours'),

  -- Upcoming meetings (next 24-48h) — type=meeting, scheduled_for in metadata
    (d_rzp_pg,  p_priya,  'meeting', 'Group demo with Razorpay merchant ops',      'Demo for 8 reps + Priya. Walking through AI capture + auto-logging.', NULL, 'neutral',  'calendar', NOW() - INTERVAL '1 days'),
    (d_zr_risk, p_vikram, 'meeting', 'Final pricing + signature review',           'Pricing lock-in with Vikram + Zerodha legal.',                            NULL, 'positive', 'calendar', NOW() - INTERVAL '12 hours'),
    (d_swg_vop, p_divya,  'meeting', 'Proposal walkthrough with Divya',            'Walking Divya through the proposal line-by-line.',                        NULL, 'positive', 'calendar', NOW() - INTERVAL '8 hours');

  -- Patch metadata.scheduled_for on the 3 most-recently-inserted upcoming meetings.
  UPDATE activities SET metadata = jsonb_build_object(
    'scheduled_for', (NOW() + INTERVAL '17 hours')::text,
    'duration_min', 45,
    'attendees', jsonb_build_array('priya@razorpay.com'),
    'location', 'https://meet.google.com/abc-defg-hij'
  ) WHERE deal_id = d_rzp_pg AND subject = 'Group demo with Razorpay merchant ops';

  UPDATE activities SET metadata = jsonb_build_object(
    'scheduled_for', (NOW() + INTERVAL '23 hours')::text,
    'duration_min', 30,
    'attendees', jsonb_build_array('vikram@zerodha.com'),
    'location', 'Zoom'
  ) WHERE deal_id = d_zr_risk AND subject = 'Final pricing + signature review';

  UPDATE activities SET metadata = jsonb_build_object(
    'scheduled_for', (NOW() + INTERVAL '43 hours')::text,
    'duration_min', 60,
    'attendees', jsonb_build_array('divya@swiggy.com'),
    'location', 'https://meet.google.com/swg-prop-walk'
  ) WHERE deal_id = d_swg_vop AND subject = 'Proposal walkthrough with Divya';

  -- ─── 6. Tasks (~25) ──────────────────────────────────
  INSERT INTO tasks (deal_id, contact_id, description, due_date, priority, status, ai_generated) VALUES
    -- Overdue
    (d_cred_me, p_rohan,  'Multi-thread CRED — reach out to Sneha + Ishaan',                                 today_d - INTERVAL '3 days', 'high',   'pending',   true),
    (d_nyk_ma,  p_aditya, 'Send pricing flexibility memo to Aditya',                                          today_d - INTERVAL '2 days', 'high',   'pending',   true),

    -- Due today / soon
    (d_zr_risk, p_vikram, 'Lock final pricing — Vikram needs by EOD',                                        today_d,                     'high',   'pending',   true),
    (d_rzp_pg,  p_priya,  'Reply to Priya''s SSO question',                                                  today_d,                     'medium', 'pending',   true),
    (d_zr_risk, p_ananya, 'Engineering reply on webhook retry semantics',                                     today_d + INTERVAL '1 days', 'medium', 'pending',   true),

    -- This week
    (d_swg_vop, p_divya,  'Follow up on proposal review (Divya committed EOW)',                              today_d + INTERVAL '3 days', 'medium', 'pending',   true),
    (d_zr_comp, p_karan,  'Re-engage Karan with case study + value recap',                                    today_d + INTERVAL '2 days', 'medium', 'pending',   true),
    (d_cred_fr, p_sneha,  'Compile compliance Q&A doc for Sneha',                                            today_d + INTERVAL '2 days', 'medium', 'pending',   false),
    (d_byj_la,  p_arnav,  'Send pilot MVP scope doc to Arnav',                                               today_d + INTERVAL '4 days', 'high',   'pending',   true),
    (d_byj_to,  p_pranav, 'Counter-propose 10% discount tier to Pranav',                                     today_d + INTERVAL '3 days', 'medium', 'pending',   true),
    (d_pay_cs,  p_rajesh, 'Send finalized MSA to Paytm legal',                                               today_d + INTERVAL '2 days', 'high',   'pending',   true),
    (d_drm_rm,  p_ishita, 'Share integration ETA + handoff doc with Ishita',                                 today_d + INTERVAL '5 days', 'medium', 'pending',   true),
    (d_pst_api, p_vinay,  'Draft executive 1-pager for CFO sign-off',                                        today_d + INTERVAL '4 days', 'medium', 'pending',   true),
    (d_msh_si,  p_maya,   'Confirm 30-day pilot scope and pricing',                                          today_d + INTERVAL '3 days', 'high',   'pending',   true),

    -- Next week
    (d_rzp_pg,  p_priya,  'Schedule group demo with Razorpay merchant ops team',                              today_d + INTERVAL '7 days', 'medium', 'pending',   true),
    (d_swg_vop, p_arjun,  'Follow up with Arjun on rate-limit scaling plan',                                  today_d + INTERVAL '8 days', 'medium', 'pending',   true),
    (d_urb_pp,  p_karthik,'Schedule discovery v2 with Karthik for Q3 budget cycle',                          today_d + INTERVAL '10 days','low',    'pending',   true),

    -- Completed (for variety)
    (d_rzp_pg,  p_aarav,  'Send SOC 2 report to Aarav',                                                       today_d - INTERVAL '7 days', 'low',    'completed', false),
    (d_pay_cs,  p_pooja,  'Walk Pooja through edge-case compliance scenarios',                                today_d - INTERVAL '8 days', 'medium', 'completed', false),
    (d_swg_vop, p_neha,   'Send vendor onboarding case studies',                                              today_d - INTERVAL '5 days', 'low',    'completed', true),
    (d_drm_rm,  p_aakash, 'Walk Aakash through fantasy-tuned scoring weights',                                today_d - INTERVAL '4 days', 'medium', 'completed', false),
    (d_zr_risk, p_vikram, 'Send legal-redlined v1 of the MSA',                                                today_d - INTERVAL '6 days', 'high',   'completed', false),
    (d_cred_fr, p_sneha,  'Send PII handling doc',                                                            today_d - INTERVAL '3 days', 'medium', 'completed', false),
    (d_byj_la,  p_lakshmi,'Schedule curriculum data audit session',                                          today_d - INTERVAL '5 days', 'high',   'completed', false),
    (d_msh_si,  p_maya,   'Set up demo for Meesho sales team',                                                today_d - INTERVAL '4 days', 'medium', 'completed', false);

  RAISE NOTICE 'Seed complete: 12 companies, 25 contacts, 15 deals, 50+ activities, 25 tasks';
END $$;
