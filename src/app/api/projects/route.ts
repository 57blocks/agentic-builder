import { NextRequest, NextResponse } from "next/server";
import { getProjects, createProject } from "@/lib/project-store";
import { resolveUserId } from "@/lib/session";

/** GET /api/projects — list projects the current user is a member of */
export async function GET(req: NextRequest) {
  try {
    const userId = await resolveUserId(req);
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const projects = await getProjects(userId);
    return NextResponse.json({ projects });
  } catch (err) {
    console.error("[api/projects] GET error:", err);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}

/** POST /api/projects — create a new project owned by the current user */
export async function POST(req: NextRequest) {
  try {
    const userId = await resolveUserId(req);
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { name, id: clientId, codeOutputDir } = (await req.json()) as {
      name?: string;
      id?: string;
      codeOutputDir?: string;
    };

    if (!name || !name.trim()) {
      return NextResponse.json(
        { message: "Project name is required." },
        { status: 400 },
      );
    }

    if (!codeOutputDir || !codeOutputDir.trim()) {
      return NextResponse.json(
        { message: "Project directory is required." },
        { status: 400 },
      );
    }

    const project = await createProject(name, codeOutputDir.trim(), clientId, userId);
    return NextResponse.json({ project }, { status: 201 });
  } catch (err) {
    console.error("[api/projects] POST error:", err);
    return NextResponse.json(
      { message: "Internal server error." },
      { status: 500 },
    );
  }
}
