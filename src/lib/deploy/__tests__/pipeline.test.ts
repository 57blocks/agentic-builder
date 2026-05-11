import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/pipeline/push-kickoff-repo", () => ({
  readKickoffRepoMetadata: vi.fn(),
  pushGeneratedCodeToKickoffRepo: vi.fn(),
}));
vi.mock("../database", () => ({
  createAppDatabase: vi.fn(),
}));
vi.mock("../dokploy", () => ({
  createDokployProject: vi.fn(),
  createDokployCompose: vi.fn(),
  updateDokployCompose: vi.fn(),
  deployDokployCompose: vi.fn(),
  pollDeployStatus: vi.fn(),
}));
vi.mock("../job-manager", () => ({
  emitStep: vi.fn(),
  completeJob: vi.fn(),
  failJob: vi.fn(),
}));

import { readKickoffRepoMetadata, pushGeneratedCodeToKickoffRepo } from "@/lib/pipeline/push-kickoff-repo";
import { createAppDatabase } from "../database";
import { createDokployProject, createDokployCompose, updateDokployCompose, deployDokployCompose, pollDeployStatus } from "../dokploy";
import { emitStep, completeJob, failJob } from "../job-manager";
import { runDeployPipeline } from "../pipeline";

const ENV = {
  GITHUB_TOKEN: "gh-token",
  DOKPLOY_URL: "https://dokploy.example.com",
  DOKPLOY_TOKEN: "dk-token",
  SHARED_PG_CONNECTION_STRING: "postgresql://user:pass@host:5432/postgres",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(readKickoffRepoMetadata).mockResolvedValue({
    cloneUrl: "https://github.com/owner/app.git",
    htmlUrl: "https://github.com/owner/app",
    name: "app",
    savedAt: new Date().toISOString(),
  });
  vi.mocked(pushGeneratedCodeToKickoffRepo).mockResolvedValue({ ok: true, message: "Pushed" });
  vi.mocked(createAppDatabase).mockResolvedValue("postgresql://user:pass@host:5432/my_app");
  vi.mocked(createDokployProject).mockResolvedValue("proj-1");
  vi.mocked(createDokployCompose).mockResolvedValue("comp-1");
  vi.mocked(updateDokployCompose).mockResolvedValue(undefined);
  vi.mocked(deployDokployCompose).mockResolvedValue(undefined);
  vi.mocked(pollDeployStatus).mockResolvedValue("https://app.example.com");
});

describe("runDeployPipeline", () => {
  it("runs all steps and calls completeJob on success", async () => {
    await runDeployPipeline({
      jobId: "job-1",
      appName: "my-app",
      generatedCodePath: "generated-code",
      projectRoot: "/project",
      env: ENV,
    });

    expect(emitStep).toHaveBeenCalledWith("job-1", expect.objectContaining({ step: "verify-repo", status: "done" }));
    expect(emitStep).toHaveBeenCalledWith("job-1", expect.objectContaining({ step: "git-push", status: "done" }));
    expect(emitStep).toHaveBeenCalledWith("job-1", expect.objectContaining({ step: "create-database", status: "done" }));
    expect(emitStep).toHaveBeenCalledWith("job-1", expect.objectContaining({ step: "create-dokploy", status: "done" }));
    expect(emitStep).toHaveBeenCalledWith("job-1", expect.objectContaining({ step: "trigger-deploy", status: "done" }));
    expect(completeJob).toHaveBeenCalledWith("job-1", "https://app.example.com", "https://github.com/owner/app");
  });

  it("calls failJob and emits error step when verify-repo fails", async () => {
    vi.mocked(readKickoffRepoMetadata).mockResolvedValue(null);

    await runDeployPipeline({
      jobId: "job-1",
      appName: "my-app",
      generatedCodePath: "generated-code",
      projectRoot: "/project",
      env: ENV,
    });

    expect(emitStep).toHaveBeenCalledWith("job-1", expect.objectContaining({ step: "verify-repo", status: "error" }));
    expect(failJob).toHaveBeenCalledWith("job-1");
    expect(pushGeneratedCodeToKickoffRepo).not.toHaveBeenCalled();
  });

  it("calls failJob when git push fails", async () => {
    vi.mocked(pushGeneratedCodeToKickoffRepo).mockResolvedValue({ ok: false, message: "Push failed" });

    await runDeployPipeline({
      jobId: "job-1",
      appName: "my-app",
      generatedCodePath: "generated-code",
      projectRoot: "/project",
      env: ENV,
    });

    expect(emitStep).toHaveBeenCalledWith("job-1", expect.objectContaining({ step: "git-push", status: "error" }));
    expect(failJob).toHaveBeenCalledWith("job-1");
  });
});
