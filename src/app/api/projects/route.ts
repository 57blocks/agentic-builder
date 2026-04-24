import { NextRequest, NextResponse } from "next/server";
import { getProjects, createProject } from "@/lib/project-store";

/** GET /api/projects — list all projects */
export async function GET() {
  return NextResponse.json({ projects: getProjects() });
}

/** POST /api/projects — create a new project */
export async function POST(req: NextRequest) {
  try {
    const { name } = (await req.json()) as { name?: string };

    if (!name || !name.trim()) {
      return NextResponse.json(
        { message: "Project name is required." },
        { status: 400 },
      );
    }

    const project = createProject(name);
    return NextResponse.json({ project }, { status: 201 });
  } catch {
    return NextResponse.json(
      { message: "Internal server error." },
      { status: 500 },
    );
  }
}
