-- Migration 010: Seed starter templates and playbooks.
--
-- templates/playbooks tables were created in 003_content.sql but never
-- populated by any migration — the only way content appeared was
-- through the admin panel, one row at a time. That left both the
-- "/app/templates" and (indirectly, via the admin-authored DB rows)
-- "/app/playbooks" experiences empty for every account. All rows here
-- are premium = FALSE / active = TRUE / published = TRUE, so they're
-- visible to every account regardless of plan — free or paid.
--
-- Depends on: 003_content.sql

BEGIN;

INSERT INTO templates (id, title, category, description, template_text, goal, scenario, premium, active, sort_order) VALUES
  ('tpl_decline_invite', 'Declining a social invitation', 'Social', 'Turn down plans without over-explaining or sounding cold.',
   'Hey! Thanks so much for the invite — I''m not going to be able to make it this time, but I hope it''s a great time. Let''s find another time to catch up soon.',
   'decline gracefully', 'declining invitation', FALSE, TRUE, 10),

  ('tpl_payment_reminder', 'Chasing an overdue invoice', 'Money', 'Ask a client to pay without damaging the relationship.',
   'Hi there — just a quick nudge that invoice #[number] was due on [date] and I haven''t seen payment come through yet. Could you let me know the status when you get a chance?',
   'get paid without burning the relationship', 'payment reminder', FALSE, TRUE, 20),

  ('tpl_dating_rejection', 'Letting someone down after a date', 'Dating', 'Be honest about not wanting a second date without being harsh.',
   'I had a nice time meeting you, but I didn''t feel a romantic connection on my end. Wanted to be upfront rather than leave you wondering — wishing you all the best.',
   'be honest and kind', 'dating rejection', FALSE, TRUE, 30),

  ('tpl_comp_review', 'Asking for a raise', 'Work', 'Open a compensation conversation with your manager.',
   'Do you have 20 minutes this week? I''d like to talk through my compensation given the scope I''ve taken on over the last two quarters — happy to send context ahead of time.',
   'start the conversation', 'compensation review', FALSE, TRUE, 40),

  ('tpl_client_scope_pushback', 'Pushing back on scope creep', 'Work', 'Push back on an out-of-scope client request without sounding difficult.',
   'Happy to take a look at this — flagging that it falls outside what we scoped originally, so it''ll need a small change order before I start. Want me to send one over?',
   'protect scope', 'client request', FALSE, TRUE, 50),

  ('tpl_family_boundary', 'Setting a boundary with family', 'Family', 'Say no to a family request without a blow-up.',
   'I love you and I know this matters to you, but I''m not able to do this one. I want to be honest instead of saying yes and being resentful about it.',
   'hold the line kindly', 'family boundary', FALSE, TRUE, 60),

  ('tpl_roommate_conflict', 'Bringing up a roommate issue', 'Living together', 'Raise a recurring household annoyance before it becomes resentment.',
   'Hey, can we find 10 minutes to talk about the dishes situation? It''s been building up for me and I''d rather sort it out now than let it turn into a bigger thing.',
   'resolve without resentment', 'roommate conflict', FALSE, TRUE, 70),

  ('tpl_apology_followup', 'Apologizing after a mistake', 'Work', 'Own a mistake at work without over-apologizing or being defensive.',
   'I want to own that I missed the deadline on this — that''s on me, not the team. Here''s what I''m doing to fix it and make sure it doesn''t happen again.',
   'own it and move forward', 'work mistake', FALSE, TRUE, 80)
ON CONFLICT (id) DO NOTHING;

INSERT INTO playbooks (id, title, slug, category, summary, tagline, critique, remedy, dos, donts, example_original, example_rewritten, premium, published) VALUES
  ('pb_declining_invite', 'How to decline an invitation', 'declining-an-invitation', 'Social',
   'A short, warm no that doesn''t leave the door open to negotiation or guilt.',
   'Warm, brief, final.',
   'Most declines either over-explain (inviting a counter-offer) or go cold (reads as rejection of the person, not just the plan).',
   'State the no early, give one honest reason at most, and offer a genuine alternative only if you mean it.',
   ARRAY['Say no in the first sentence', 'Thank them for the invite', 'Only suggest a raincheck if you''ll actually follow through'],
   ARRAY['Bury the no in a wall of justification', 'Leave it ambiguous ("maybe, we''ll see")', 'Apologize more than once'],
   'omg I''m SO sorry I don''t think I can make it, work has been insane and I''ve just been so tired lately and I really wanted to but...',
   'Thanks for the invite! I can''t make it this time, but I''d love to catch up soon — free next week?',
   FALSE, TRUE),

  ('pb_payment_reminder', 'Chasing overdue payment', 'chasing-overdue-payment', 'Money',
   'Get paid on time without sounding like a collections agency.',
   'Direct, factual, no apology.',
   'Freelancers often soften payment reminders so much the urgency disappears, or go the other way and sound accusatory.',
   'State the facts (invoice number, due date, amount), ask for a status, skip the apology — you did the work.',
   ARRAY['Reference the specific invoice and date', 'Ask a direct question that needs a reply', 'Keep it short'],
   ARRAY['Apologize for asking to be paid', 'Thread multiple asks into one message', 'Wait more than a week between follow-ups'],
   'hey so sorry to bother you about this again, I know things are probably busy, but whenever you get a chance no rush at all...',
   'Hi [name] — invoice #[number] for $[amount] was due [date]. Could you confirm the status?',
   FALSE, TRUE),

  ('pb_dating_rejection', 'Letting someone down after a date', 'dating-rejection', 'Dating',
   'Be honest about no spark without vague-ing it into confusion.',
   'Clear, kind, no ghosting.',
   'Vague lines like "so busy lately!" leave people hanging and checking their phone for weeks.',
   'Say plainly there wasn''t a romantic connection, thank them for their time, and don''t offer friendship unless you mean it.',
   ARRAY['Be clear there won''t be a second date', 'Keep it short and kind', 'Send it within a day or two'],
   ARRAY['Ghost instead of replying', 'Blame "busy schedule" when that''s not the real reason', 'Offer friendship you don''t intend to follow through on'],
   'hey! so sorry been super busy, work is crazy right now, we should hang out again sometime when things calm down...',
   'I enjoyed meeting you, but I didn''t feel a romantic connection on my end. Wanted to be upfront rather than leave you wondering.',
   FALSE, TRUE),

  ('pb_comp_review', 'Asking for a raise', 'asking-for-a-raise', 'Work',
   'Open the conversation without burying the ask in a long justification email.',
   'Ask for the meeting, not the raise, first.',
   'Most people try to make the entire case for a raise inside a single text or Slack message, which reads as either demanding or apologetic.',
   'Ask for time to talk, and bring the case (scope, impact, market data) to that conversation instead.',
   ARRAY['Ask for a dedicated conversation', 'Come with concrete scope/impact examples', 'Pick a low-stress moment, not right before a deadline'],
   ARRAY['Make the ask over chat with no context', 'Compare yourself to a specific coworker', 'Open with an ultimatum'],
   'so I''ve been thinking I probably deserve more money given everything I''ve been doing, can we talk about my salary at some point?',
   'Do you have 20 minutes this week to talk through my compensation given the scope I''ve taken on this year?',
   FALSE, TRUE),

  ('pb_scope_creep', 'Pushing back on scope creep', 'pushing-back-scope-creep', 'Work',
   'Protect the scope of a project without sounding like you''re refusing to help.',
   'Yes, and — not no.',
   'Saying yes to every "quick add" quietly erodes a project''s scope and your margin on it.',
   'Acknowledge the request, name that it''s outside scope, and offer a path (change order, follow-up phase) rather than a flat refusal.',
   ARRAY['Acknowledge the request first', 'Name explicitly that it''s outside the original scope', 'Offer a concrete next step'],
   ARRAY['Just do it silently and eat the cost', 'Say no with no path forward', 'Let scope creep go unaddressed until the invoice'],
   'sure I guess I can throw that in too, no worries, I''ll figure out the extra time somehow',
   'Happy to take a look — this falls outside what we scoped, so it''ll need a quick change order before I start. Want me to send one over?',
   FALSE, TRUE),

  ('pb_family_boundary', 'Setting a boundary with family', 'family-boundary', 'Family',
   'Say no to a family request without triggering a guilt spiral — yours or theirs.',
   'Warmth and the no in the same breath.',
   'Boundary-setting with family often collapses into over-justifying (which invites debate) or goes silent (which reads as punishment).',
   'Lead with warmth, state the no plainly, and resist the urge to justify it more than once.',
   ARRAY['Say the no once, clearly', 'Pair it with genuine warmth', 'Hold the line if they push back'],
   ARRAY['Re-justify the same boundary every time it''s challenged', 'Say yes to avoid the conversation', 'Bring in unrelated grievances'],
   'I mean I guess if it really means that much to you I could try to make it work, I don''t want you to be upset with me...',
   'I love you and I know this matters to you, but I''m not able to do this one.',
   FALSE, TRUE),

  ('pb_roommate_conflict', 'Raising a roommate issue', 'roommate-conflict', 'Living together',
   'Bring up a recurring household annoyance before it turns into resentment.',
   'Name it early, keep it about the pattern.',
   'Small household frictions usually get swallowed for months and then explode over something unrelated.',
   'Raise it as a pattern, not a one-off complaint, and ask for a specific time to talk rather than ambushing them.',
   ARRAY['Ask for a specific time to talk', 'Describe the pattern, not just the latest instance', 'Suggest one concrete fix'],
   ARRAY['Bring it up mid-argument about something else', 'Let it build for months before saying anything', 'Make it about them as a person rather than the behavior'],
   'wow nice of you to finally do the dishes, must be a special occasion',
   'Can we find 10 minutes to talk about the dishes situation? It''s been building up for me and I''d rather sort it out now.',
   FALSE, TRUE),

  ('pb_apology_at_work', 'Apologizing after a work mistake', 'apologizing-work-mistake', 'Work',
   'Own a mistake without over-apologizing or getting defensive.',
   'One clear apology, then the fix.',
   'Over-apologizing reads as fishing for reassurance; under-apologizing reads as not taking it seriously.',
   'State what went wrong, own it in one sentence, then pivot immediately to what you''re doing about it.',
   ARRAY['Say what went wrong plainly', 'Apologize once, not repeatedly', 'Lead with the fix, not the excuse'],
   ARRAY['Explain away the mistake before owning it', 'Apologize five different ways in one message', 'Make it about how bad you feel instead of the impact'],
   'I am SO sorry, I feel terrible, I know I should have caught this, I''ve just had so much going on, I promise it won''t happen again I swear...',
   'I want to own that I missed the deadline on this — that''s on me. Here''s what I''m doing to fix it.',
   FALSE, TRUE)
ON CONFLICT (id) DO NOTHING;

COMMIT;
