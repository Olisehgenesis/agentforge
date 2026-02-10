import { NextResponse } from "next/server";
import { getAllSkills, getSkillsForTemplate, getSkillsByCategory } from "@/lib/skills/registry";

/**
 * GET /api/skills
 * Query params:
 *   - template: filter by template ID (e.g. "forex", "payment")
 *   - category: filter by category (e.g. "oracle", "mento")
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const template = url.searchParams.get("template");
    const category = url.searchParams.get("category");

    let skills;

    if (template) {
      skills = getSkillsForTemplate(template);
    } else if (category) {
      skills = getSkillsByCategory(category as Parameters<typeof getSkillsByCategory>[0]);
    } else {
      skills = getAllSkills();
    }

    return NextResponse.json({
      skills: skills.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        category: s.category,
        commandTag: s.commandTag,
        params: s.params,
        examples: s.examples,
        requiresWallet: s.requiresWallet,
        mutatesState: s.mutatesState,
      })),
      count: skills.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch skills" },
      { status: 500 }
    );
  }
}

