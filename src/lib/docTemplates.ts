export type DocTemplate = {
  key: string;
  label: string;
  icon: string;
  title: string;
  content: string;
};

export const DOC_TEMPLATES: DocTemplate[] = [
  {
    key: "doc", label: "Blank", icon: "📄", title: "Untitled",
    content: "",
  },
  {
    key: "prd", label: "PRD", icon: "📋", title: "PRD: ",
    content:
`# Problem
What problem are we solving and for whom?

# Goals
-

# Non-goals
-

# Requirements
1.

# Success metrics
-

# Open questions
- `,
  },
  {
    key: "sop", label: "SOP", icon: "📐", title: "SOP: ",
    content:
`# Purpose

# When to use this

# Steps
1.
2.
3.

# Owner

# Last reviewed`,
  },
  {
    key: "meeting", label: "Meeting notes", icon: "📝", title: "Meeting: ",
    content:
`**Date:**
**Attendees:**

# Agenda
-

# Notes
-

# Decisions
-

# Action items
- [ ] `,
  },
  {
    key: "api", label: "API docs", icon: "🔌", title: "API: ",
    content:
`# Endpoint
\`METHOD /path\`

# Auth

# Request
\`\`\`json
{}
\`\`\`

# Response
\`\`\`json
{}
\`\`\`

# Errors`,
  },
  {
    key: "onboarding", label: "Onboarding", icon: "🚀", title: "Onboarding: ",
    content:
`# Welcome 👋

# Day 1
-

# Week 1
-

# Tools & access
-

# Who to ask`,
  },
  {
    key: "vision", label: "Vision", icon: "🌟", title: "Vision: ",
    content:
`# Vision

# Mission

# Why now

# What success looks like in 1 year`,
  },
  {
    key: "postmortem", label: "Postmortem", icon: "🔥", title: "Incident postmortem: ",
    content:
`# Summary

# Impact

# Timeline
-

# Root cause

# What went well

# What went wrong

# Action items
- [ ] `,
  },
];

export function templateByKey(key: string): DocTemplate {
  return DOC_TEMPLATES.find((t) => t.key === key) ?? DOC_TEMPLATES[0];
}
