# Add a New Skill

Create a new skill in `skills/` following the skills.sh Markdown format.

## Arguments
- $SKILL_NAME: kebab-case name (e.g., "defi-analysis")
- $DESCRIPTION: One-line description of the skill

## Steps

1. Create directory `skills/$SKILL_NAME/`

2. Create `skills/$SKILL_NAME/SKILL.md` with YAML frontmatter:
   - `name`: $SKILL_NAME
   - `description`: $DESCRIPTION
   - `license`: MIT
   - `metadata.author`: OpenScan
   - `metadata.version`: "0.0.1"
   - Body: overview, "When to Apply" section, "Prerequisites" section, "Available Commands" table, "Global Flags" table, "Rules" section pointing to `rules/`

3. Create `skills/$SKILL_NAME/metadata.json`:
   - `version`: "0.0.1"
   - `organization`: "OpenScan"
   - `date`: current month/year
   - `abstract`: brief description
   - `references`: relevant URLs

4. Create `skills/$SKILL_NAME/rules/` directory

5. Add at least one rule file `skills/$SKILL_NAME/rules/{capability}.md`:
   - YAML frontmatter: `title`, `impact` (HIGH/MEDIUM/LOW), `tags`
   - Show command examples in order: basic (no --rpc) → --alchemy-key → explicit --rpc
   - Reference CLI commands by full name (e.g., `openscan algo:tx-history`)

6. Create `skills/$SKILL_NAME/AGENTS.md` — compiled summary with one-line entry per rule:
   ```
   ## Rule Title [IMPACT]
   Brief summary of the rule.
   ```

7. Update `skills/README.md` to list the new skill

8. Remind the user they may also want to:
   - Register the skill in the OpenClaw manifest (`packages/adapters-openclaw/src/index.ts`)
