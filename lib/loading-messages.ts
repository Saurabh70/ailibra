/**
 * Contextual loading messages — rotated through while AI is working.
 * Each surface gets its own pool of 5-8 lines with personality.
 */

export const LOADING = {
  ask: [
    "Pulling your pipeline up…",
    "Reading the room…",
    "Connecting the dots…",
    "Sorting signal from noise…",
    "Working out the angle…",
    "Pulling threads…",
    "Cross-referencing activities…",
    "Picking the pitch…",
  ],
  priorities: [
    "Reading today's signals…",
    "Ranking what matters now…",
    "Checking who's waiting on you…",
    "Combing through the pipeline…",
    "Lining up your day…",
    "Spotting the breaks and pitches…",
  ],
  capture: [
    "Parsing your note…",
    "Matching to existing contacts…",
    "Figuring out the missing pieces…",
    "Lining up the right question…",
    "Reading the context…",
  ],
  deal_summary: [
    "Studying the deal…",
    "Reading recent activity…",
    "Spotting the next move…",
    "Drafting your read…",
    "Picking the headline…",
  ],
  relationship: [
    "Mapping the relationship…",
    "Reading recent exchanges…",
    "Sizing them up…",
    "Calling the strength…",
  ],
  email_draft: [
    "Pulling deal context…",
    "Picking the right tone…",
    "Composing the draft…",
    "Tightening the ask…",
  ],
  pipeline_list: [
    "Pulling deals…",
    "Sorting by health…",
    "At-risk deals first…",
  ],
  people_list: [
    "Loading your contacts…",
    "Grouping by company…",
  ],
  default: [
    "Loading…",
    "Working on it…",
  ],
} as const;
