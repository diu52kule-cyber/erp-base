-- 0050_comment_reactions.sql
-- C10: Reactions on comments

CREATE TABLE IF NOT EXISTS comment_reactions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  comment_id uuid NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji      text NOT NULL CHECK (emoji IN ('👍', '✅', '👀', '❤️', '🎉')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (comment_id, user_id, emoji)
);

ALTER TABLE comment_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members" ON comment_reactions
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment ON comment_reactions(comment_id);
