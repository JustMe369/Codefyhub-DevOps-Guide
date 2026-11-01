import { z } from "zod";
import { createKnowledgeVisibilityValues } from "./article-schema";

export const knowledgeTemplateSchema = z.object({
  sectionId: z.string().cuid(),
  contentType: z.enum(["WORKFLOW", "FAQ", "ISSUE_SOLUTION", "POLICY"]),
  title: z.string().trim().min(4).max(160).optional(),
  description: z.string().trim().min(20).max(320).optional(),
  visibility: z.enum(createKnowledgeVisibilityValues).default("INTERNAL"),
});

export const knowledgeTemplateBodies = {
  WORKFLOW: "## Objective\n\nState the outcome this workflow must achieve and who should use it.\n\n## Preconditions\n\nList required access, tools, approvals, inputs, and safety checks.\n\n## Procedure\n\n1. Record the starting state and preserve required evidence.\n2. Perform each reviewed action in order.\n3. Stop and escalate if a validation check fails.\n\n## Validation\n\nDefine the observable checks that prove the workflow succeeded.\n\n## Rollback and recovery\n\nDocument how to return to a known-good state and who can authorize recovery actions.\n\n## Ownership and evidence\n\nName the owner, review cadence, and evidence retained for each execution.",
  FAQ: "## Question\n\nWrite the exact question employees ask.\n\n## Answer\n\nProvide the short, verified answer first.\n\n## Details\n\nAdd conditions, exceptions, ownership, and links to authoritative sources.",
  ISSUE_SOLUTION: "## Symptoms\n\nRecord the observable problem and affected service.\n\n## Impact\n\nDescribe users, data, and operations affected.\n\n## Root cause\n\nDocument verified evidence, not assumptions.\n\n## Resolution\n\n1. Preserve evidence.\n2. Apply the reviewed remediation.\n3. Validate service and data integrity.\n\n## Prevention\n\nList monitoring, automation, or policy changes that prevent recurrence.",
  POLICY: "## Policy statement\n\nState the mandatory rule in direct language.\n\n## Scope\n\nDefine teams, systems, and information covered.\n\n## Responsibilities\n\nIdentify owners, approvers, and operators.\n\n## Controls and evidence\n\nDescribe required controls and retained proof.\n\n## Exceptions\n\nDefine the approval and expiry process for exceptions.",
} as const;
