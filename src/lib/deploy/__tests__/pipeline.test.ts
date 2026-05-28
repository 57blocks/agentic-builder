import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/pipeline/push-kickoff-repo", () => ({
  readKickoffRepoMetadata: vi.fn(),
  pushGeneratedCodeToKickoffRepo: vi.fn(),
}));
vi.mock("@/lib/pipeline/kickoff-infra", () => ({
  readKickoffInfraMetadata: vi.fn(),
  internalDatabaseUrlFrom: vi.fn(),
  internalRedisUrlFrom: vi.fn(),
  persistComposeOnInfra: vi.fn(),
}));
vi.mock("../dokploy", () => ({
  createDokployProject: vi.fn(),
  createDokployCompose: vi.fn(),
  createDokployDomain: vi.fn(),
  updateDokployCompose: vi.fn(),
  deployDokployCompose: vi.fn(),
  pollDeployStatus: vi.fn(),
  getDokployCompose: vi.fn(),
}));
vi.mock("../job-manager", () => ({
  emitStep: vi.fn(),
  completeJob: vi.fn(),
  failJob: vi.fn(),
}));

import { readKickoffRepoMetadata, pushGeneratedCodeToKickoffRepo } from "@/lib/pipeline/push-kickoff-repo";
import {
  readKickoffInfraMetadata,
  internalDatabaseUrlFrom,
  internalRedisUrlFrom,
  persistComposeOnInfra,
} from "@/lib/pipeline/kickoff-infra";
import { createDokployProject, createDokployCompose, createDokployDomain, updateDokployCompose, deployDokployCompose, pollDeployStatus, getDokployCompose } from "../dokploy";
import { emitStep, completeJob, failJob } from "../job-manager";
import { runDeployPipeline } from "../pipeline";

const ENV = {
  GITHUB_TOKEN: "gh-token",
  DOKPLOY_URL: "https://dokploy.example.com",
  DOKPLOY_TOKEN: "dk-token",
  DOKPLOY_DOMAIN: "apps.example.com",
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
  vi.mocked(readKickoffInfraMetadata).mockResolvedValue({
    dokployProjectId: "kickoff-proj",
    dokployEnvironmentId: "kickoff-env",
    appName: "my-app",
    savedAt: new Date().toISOString(),
    services: [
      {
        kind: "postgres",
        id: "pg-1",
        appName: "my-app-pg",
        publicUrl: "postgresql://app:pw@public:5432/my_app",
        internalUrl: "postgresql://app:pw@my-app-pg:5432/my_app",
        externalPort: 5432,
      },
    ],
  });
  vi.mocked(internalDatabaseUrlFrom).mockReturnValue(
    "postgresql://app:pw@my-app-pg:5432/my_app",
  );
  vi.mocked(internalRedisUrlFrom).mockReturnValue(null);
  vi.mocked(createDokployProject).mockResolvedValue({ projectId: "proj-1", environmentId: "env-1" });
  vi.mocked(createDokployCompose).mockResolvedValue({ composeId: "comp-1", appName: "my-app-abc" });
  vi.mocked(createDokployDomain).mockResolvedValue(undefined);
  vi.mocked(updateDokployCompose).mockResolvedValue(undefined);
  vi.mocked(deployDokployCompose).mockResolvedValue(undefined);
  vi.mocked(pollDeployStatus).mockResolvedValue("https://app.example.com");
  // Default: kickoff-infra has no compose yet → first-time path (create + save).
  vi.mocked(persistComposeOnInfra).mockResolvedValue({
    dokployProjectId: "kickoff-proj",
    dokployEnvironmentId: "kickoff-env",
    appName: "my-app",
    savedAt: new Date().toISOString(),
    services: [],
    compose: {
      composeId: "comp-1",
      appName: "my-app-abc",
      appHost: "my-app-abc.apps.example.com",
      savedAt: new Date().toISOString(),
    },
  });
  vi.mocked(getDokployCompose).mockResolvedValue(null);
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

  it("calls failJob when infra metadata is missing", async () => {
    vi.mocked(readKickoffInfraMetadata).mockResolvedValue(null);
    vi.mocked(internalDatabaseUrlFrom).mockReturnValue(null);
    vi.mocked(internalRedisUrlFrom).mockReturnValue(null);

    await runDeployPipeline({
      jobId: "job-1",
      appName: "my-app",
      generatedCodePath: "generated-code",
      projectRoot: "/project",
      env: ENV,
    });

    expect(emitStep).toHaveBeenCalledWith("job-1", expect.objectContaining({ step: "create-database", status: "error" }));
    expect(failJob).toHaveBeenCalledWith("job-1");
    expect(createDokployProject).not.toHaveBeenCalled();
  });

  it("first deploy: creates compose, attaches domain, persists onto infra", async () => {
    await runDeployPipeline({
      jobId: "job-1",
      appName: "my-app",
      generatedCodePath: "generated-code",
      projectRoot: "/project",
      env: ENV,
    });
    expect(createDokployCompose).toHaveBeenCalledTimes(1);
    expect(createDokployDomain).toHaveBeenCalledTimes(1);
    expect(persistComposeOnInfra).toHaveBeenCalledWith("/project", {
      composeId: "comp-1",
      appName: "my-app-abc",
      appHost: "my-app-abc.apps.example.com",
    });
  });

  it("subsequent deploy: reuses compose from infraMeta, skips create+domain", async () => {
    vi.mocked(readKickoffInfraMetadata).mockResolvedValue({
      dokployProjectId: "kickoff-proj",
      dokployEnvironmentId: "kickoff-env",
      appName: "my-app",
      savedAt: new Date().toISOString(),
      services: [
        {
          kind: "postgres",
          id: "pg-1",
          appName: "my-app-pg",
          publicUrl: "postgresql://app:pw@public:5432/my_app",
          internalUrl: "postgresql://app:pw@my-app-pg:5432/my_app",
          externalPort: 5432,
        },
      ],
      compose: {
        composeId: "comp-existing",
        appName: "my-app-existing",
        appHost: "my-app-existing.apps.example.com",
        savedAt: new Date().toISOString(),
      },
    });
    vi.mocked(getDokployCompose).mockResolvedValue({
      composeId: "comp-existing",
      appName: "my-app-existing",
    });

    await runDeployPipeline({
      jobId: "job-1",
      appName: "my-app",
      generatedCodePath: "generated-code",
      projectRoot: "/project",
      env: ENV,
    });

    expect(createDokployProject).not.toHaveBeenCalled();
    expect(createDokployCompose).not.toHaveBeenCalled();
    expect(createDokployDomain).not.toHaveBeenCalled();
    expect(persistComposeOnInfra).not.toHaveBeenCalled();
    expect(updateDokployCompose).toHaveBeenCalledWith(
      expect.objectContaining({ composeId: "comp-existing" }),
    );
    expect(deployDokployCompose).toHaveBeenCalledWith(
      expect.objectContaining({ composeId: "comp-existing" }),
    );
  });

  it("stale infraMeta.compose: composeId gone from Dokploy → recreate + repersist", async () => {
    vi.mocked(readKickoffInfraMetadata).mockResolvedValue({
      dokployProjectId: "kickoff-proj",
      dokployEnvironmentId: "kickoff-env",
      appName: "my-app",
      savedAt: new Date().toISOString(),
      services: [
        {
          kind: "postgres",
          id: "pg-1",
          appName: "my-app-pg",
          publicUrl: "postgresql://app:pw@public:5432/my_app",
          internalUrl: "postgresql://app:pw@my-app-pg:5432/my_app",
          externalPort: 5432,
        },
      ],
      compose: {
        composeId: "comp-deleted",
        appName: "my-app-old",
        savedAt: new Date().toISOString(),
      },
    });
    vi.mocked(getDokployCompose).mockResolvedValue(null); // Dokploy 404

    await runDeployPipeline({
      jobId: "job-1",
      appName: "my-app",
      generatedCodePath: "generated-code",
      projectRoot: "/project",
      env: ENV,
    });

    expect(createDokployCompose).toHaveBeenCalledTimes(1);
    expect(persistComposeOnInfra).toHaveBeenCalledWith(
      "/project",
      expect.objectContaining({ composeId: "comp-1" }),
    );
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
