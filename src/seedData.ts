/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Template, Playbook, BlogPost, Testimonial } from './types';

export const SEED_TEMPLATES: Template[] = [
  {
    id: 't_dating_rejection',
    title: 'Polite Romantic Rejection',
    scenario: 'breakup',
    category: 'Relationship / Dating',
    draft: 'Hey so sorry but I have been super stressed and busy at work and my dog is having health issues so I can\'t really date right now. You are literally perfect and amazing and I hope we can still be friends though because you are awesome!!',
    goal: 'Be honest but kind'
  },
  {
    id: 't_invoice_reminder',
    title: 'Urgent Past-Due Payment Ask',
    scenario: 'client-money',
    category: 'Freelance & Business',
    draft: 'Hi sorry to bug you again, I know you are so busy! Just checking in on invoice 42 to see if there is any chance you got a free second to look at it? No rush at all, sorry to be a nuisance!',
    goal: 'Ask for money / payment'
  },
  {
    id: 't_workplace_boundary',
    title: 'Workload Pushback',
    scenario: 'workplace',
    category: 'Professional Work',
    draft: 'I am so sorry but my plates are overflowing and I am literally working 12 hours a day and drowning. Can you please give this assignment to someone else or push the deadline back because I am going to lose my mind.',
    goal: 'Set a boundary'
  },
  {
    id: 't_apology_deadline',
    title: 'Missed Deadline Accountability',
    scenario: 'apology',
    category: 'Professional Work',
    draft: 'I am so incredibly sorry for missing the deadline! I had a massive headache and my internet went out, and my alarm didn\'t go off. I feel so unprofessional and terrible, please don\'t hate me! I will finish it right now!',
    goal: 'Apologize sincerely'
  },
  {
    id: 't_remote_work',
    title: 'Asking to Work Remotely',
    scenario: 'remote-work',
    category: 'Professional Work',
    draft: 'Hi, I really hate the office and traffic. Can I just work from home permanently? Everyone else does it sometimes and I would be way happier.',
    goal: 'Frame as a productivity and focus benefit'
  },
  {
    id: 't_out_of_scope',
    title: 'Out of Scope Freelance Task',
    scenario: 'client-money',
    category: 'Freelance & Business',
    draft: 'Hi, that extra page you want isn\'t in our contract but I guess I can do it for free if you really need it, just don\'t make it a habit.',
    goal: 'Politely decline or request additional compensation'
  },
  {
    id: 't_decline_social',
    title: 'Declining a Social Event',
    scenario: 'boundaries',
    category: 'Personal & Social',
    draft: 'Hey, I am so sorry but I have had such a long week and I am extremely tired and my social battery is dead. I\'m just going to stay home and watch Netflix. Sorry to flake!',
    goal: 'Set a firm personal boundary without overexplaining'
  },
  {
    id: 't_salary_raise',
    title: 'Asking for a Pay Raise',
    scenario: 'negotiation',
    category: 'Professional Work',
    draft: 'Hey, I was hoping we could talk about my salary. I\'ve been working really hard and everything is super expensive now with inflation, so I really need more money.',
    goal: 'State value-based achievements confidently'
  },
  {
    id: 't_roommate_rent',
    title: 'Addressing Roommate Late Rent',
    scenario: 'boundaries',
    category: 'Personal & Social',
    draft: 'Hey, sorry to bother you but is there any way you could pay your share of the rent soon? The landlord is going to get mad at me. Sorry to bring it up!',
    goal: 'Firm and direct request for financial obligation'
  },
  {
    id: 't_meeting_cancel',
    title: 'Canceling a Meeting Last Minute',
    scenario: 'schedule',
    category: 'Professional Work',
    draft: 'Hi, so sorry for the super last minute cancellation but something urgent came up and I can\'t make our 2 PM call today. I\'m really sorry to waste your time!',
    goal: 'Professional, respectful rescheduling without apologizing excessively'
  },
  {
    id: 't_job_feedback',
    title: 'Asking for Feedback on Job Application',
    scenario: 'inquiry',
    category: 'Professional Work',
    draft: 'Hi, I applied for the role last month and haven\'t heard back. Did you guys choose someone else? Just let me know so I can stop waiting.',
    goal: 'Confident and constructive follow-up'
  },
  {
    id: 't_friend_money',
    title: 'Friend Borrowed Money Reminder',
    scenario: 'friendship-money',
    category: 'Personal & Social',
    draft: 'Hey! Sorry to ask but remember that $50 you borrowed for dinner last month? No rush at all but if you have a second could you Venmo me? Sorry to be annoying!',
    goal: 'Straightforward reminder without guilt or apologies'
  },
  {
    id: 't_unpaid_gig',
    title: 'Saying No to Unpaid Gig',
    scenario: 'boundaries',
    category: 'Freelance & Business',
    draft: 'Thanks for the invitation to speak at your conference! I usually get paid for this but since you don\'t have a budget, I guess I can do it for exposure.',
    goal: 'Professional refusal based on standard speaking fee policy'
  },
  {
    id: 't_late_delivery',
    title: 'Late Delivery Complaint to Vendor',
    scenario: 'confrontation',
    category: 'Freelance & Business',
    draft: 'Hi, our project was supposed to be delivered yesterday and you missed it. This is really bad and now my client is yelling at me. When will you finish it?',
    goal: 'Clear, non-emotional holding of accountability'
  },
  {
    id: 't_job_negotiation',
    title: 'Negotiating a Job Offer',
    scenario: 'negotiation',
    category: 'Professional Work',
    draft: 'Thank you for the offer! The base salary is a bit lower than I wanted, but if you can\'t increase it, I guess I will take it anyway.',
    goal: 'Firm, polite counter-offer highlighting professional value'
  },
  {
    id: 't_decline_project',
    title: 'Declining to Join a New Project',
    scenario: 'boundaries',
    category: 'Professional Work',
    draft: 'Hi! I would love to help but my boss already gave me too much work and I am totally stressed out. I don\'t think I have the brain power for this right now.',
    goal: 'Politely decline while referencing prior professional commitments'
  },
  {
    id: 't_micromanager',
    title: 'Addressing a Micro-Managing Supervisor',
    scenario: 'boundaries',
    category: 'Professional Work',
    draft: 'Hi, you are checking in on me every hour and it is really distracting. I know how to do my job, so please stop hovering over my desk.',
    goal: 'Establish communication preferences and trust professionally'
  },
  {
    id: 't_rate_increase',
    title: 'Raising Rates with Existing Client',
    scenario: 'client-money',
    category: 'Freelance & Business',
    draft: 'Hi, I am so sorry but I have to raise my hourly rates next month because my bills went up. I hope you don\'t mind and can still afford to work with me!',
    goal: 'Objective, confident rate adjustment notification'
  },
  {
    id: 't_second_date_rejection',
    title: 'Rejecting a Second Date',
    scenario: 'breakup',
    category: 'Relationship / Dating',
    draft: 'Hey, thank you for dinner! I had a nice time, but I\'m just super busy with work right now and don\'t really have time to date anyone. Let\'s be friends!',
    goal: 'Kind, direct, and unambiguous boundary'
  },
  {
    id: 't_slow_responder',
    title: 'Slow Responder Follow-up',
    scenario: 'inquiry',
    category: 'Professional Work',
    draft: 'Hi, sorry to double text! Just wanted to see if you got my email from last week? Let me know if you need me to resend it or if you are too busy.',
    goal: 'Direct bump with zero passive-aggressive cushion'
  },
  {
    id: 't_quitting_notice',
    title: 'Quitting a Job notice',
    scenario: 'resignation',
    category: 'Professional Work',
    draft: 'Hi, I am writing to say I am quitting. I found a better job with higher pay. My last day is in two weeks. Thanks for everything I guess.',
    goal: 'Courteous, professional notice of resignation'
  },
  {
    id: 't_unsolicited_advice',
    title: 'Declining Unsolicited Advice',
    scenario: 'boundaries',
    category: 'Personal & Social',
    draft: 'Hey, I appreciate you trying to help, but your advice on my career is really stressing me out. Can you please stop telling me what to do?',
    goal: 'Soft but clear request for support instead of advice'
  },
  {
    id: 't_dispute_review',
    title: 'Disputing Unfair Performance Review',
    scenario: 'confrontation',
    category: 'Professional Work',
    draft: 'Hi, I saw my review and I think it is totally unfair and wrong. I worked harder than anyone else on the team and you just don\'t like me.',
    goal: 'Objective request for a performance metrics review'
  },
  {
    id: 't_extension_request',
    title: 'Asking for an Extension',
    scenario: 'workplace',
    category: 'Professional Work',
    draft: 'Hi, I am so sorry but I totally underestimated how long this report would take and I won\'t have it ready by Friday. Is it okay if I send it next week?',
    goal: 'Timely request with clear delivery timeline adjustment'
  }
];

export const SEED_PLAYBOOKS: Playbook[] = [
  {
    id: 'pb_people_pleasing',
    title: 'Breaking Free from People-Pleasing Language',
    category: 'Interpersonal Psychology',
    tagline: 'Stop auditing your calendar and apologizing for standard human constraints.',
    critique: 'When we feel anxious or guilty, we automatically overexplain why we cannot attend, buy, or help. We detail calendar conflicts. This is a psychological signal of submission, which unintentionally trains the other party to negotiate your excuse.',
    remedy: 'Use the "Hard Boundary Frame." Your calendar fits inside a simple boundary. If you cannot do something, the reason is simply bandwidth or fit, which needs no further sub-excuses.',
    dos: [
      'State constraints cleanly: "I cannot commit to this right now."',
      'Use "No, but thank you for asking!" with total directness.',
      'Accept the micro-awkwardness of silence—do not send a second text.'
    ],
    donts: [
      'Do not list personal medical, family, or task reasons for choosing no.',
      'Never apologize for your lack of time or availability.'
    ],
    example_original: 'Hey sorry! I literally wish I could come but I have 3 exams this week and my sister is visiting from out of town, and then I am super exhausted. If I get free later maybe I can stop by? Sorry to miss it!',
    example_rewritten: 'Hey [Name], thank you so much for the invite! I am unable to make it this week, but I hope you guys have an incredible time. Let us definitely grab a coffee sometime soon.'
  }
];

export const SEED_BLOGS: BlogPost[] = [
  {
    id: 'b_double_text',
    title: 'The Psychological Friction of the Double Text',
    slug: 'psychology-of-double-text',
    excerpt: 'Why sending a text explaining your previous unreplied text ruins relational power, and what to send instead.',
    content: 'When we send a message and wait hours for a reply, anxiety triggers. We feel the urge to send a "cushion text" like *"Sorry if that sounded weird!"* or *"No pressure by the way!"*. Psychologically, this broadcasts low relational power and high anxiety. It forces the recipient to manage your reassurance. If they haven\'t replied, let it sit. The quietest communicator holds the boundaries. If you must bump, wait 72 hours and send a simple, confident, zero-explanation check-in.',
    author: 'Pradeep',
    created_at: '2026-06-25',
    read_time: '4 min'
  },
  {
    id: 'b_overexplaining',
    title: 'How Overexplaining Invites Loophole Negotiations',
    slug: 'how-overexplaining-invites-loopholes',
    excerpt: 'Detailed excuses are a psychological signal of submission. Learn how to say no cleanly.',
    content: 'When you tell a coworker or client: *"I can\'t do this today because I have to take my cat to the vet and my internet is acting up,"* they hear a negotiable excuse. They might reply: *"Oh, can you do it from your phone or right after the vet?"*. If you instead state: *"I cannot take this on today, but I have bandwidth tomorrow afternoon,"* there is zero room to negotiate. Keep excuses out of boundaries.',
    author: 'Pradeep',
    created_at: '2026-06-24',
    read_time: '5 min'
  }
];

export const SEED_TESTIMONIALS: Testimonial[] = [
  {
    id: 'test_1',
    name: 'Sarah Jenkins',
    role: 'Freelance Brand Designer',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    text: 'I used to lose thousands in delayed invoices because I felt too awkward chasing clients. How It Lands gave me a short, polite 2-sentence template. My client paid within 15 minutes of sending it!',
    stars: 5,
    scenarios_resolved: 'Invoicing & boundaries'
  },
  {
    id: 'test_2',
    name: 'Alex Rivera',
    role: 'Software Consultant',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    text: 'Negotiating an out-of-scope creep with my boss was incredibly stressful. The "More Confident" rewrite from this tool kept my boundary entirely polite but highly authoritative.',
    stars: 5,
    scenarios_resolved: 'Salary & pushback'
  }
];

export const SEED_LANDING_EXAMPLES = [
  {
    id: 'ex_1',
    title: 'Dating Connection End',
    draft: 'Hey so sorry but I have been super stressed and busy at work and my dog is having health issues so I can\'t really date right now. You are literally perfect and amazing and I hope we can still be friends though because you are awesome!!',
    rebuilt: 'Hey [Name], I have really valued our time together, but after some reflection, I do not feel we are a romantic match. You are a wonderful person and I wanted to be honest with you. I truly wish you the absolute best.'
  },
  {
    id: 'ex_2',
    title: 'Overdue Invoice Request',
    draft: 'Hi sorry to bug you again, I know you are so busy! Just checking in on invoice 42 to see if there is any chance you got a free second to look at it? No rush at all, sorry to be a nuisance!',
    rebuilt: 'Hi [Name], this is a reminder that invoice #42 ($2,200) is now 10 days past due. Please let me know when I can expect the payment to clear so we can align our accounting records.'
  }
];
