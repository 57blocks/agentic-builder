import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  readSharedS3Config,
  deriveS3Prefix,
  buildS3EnvVars,
  provisionAppS3,
} from "../s3";

const S3_ENV_KEYS = [
  "BLUEPRINT_S3_BUCKET",
  "BLUEPRINT_S3_ACCESS_KEY_ID",
  "BLUEPRINT_S3_SECRET_ACCESS_KEY",
  "BLUEPRINT_S3_REGION",
  "BLUEPRINT_S3_ENDPOINT",
  "BLUEPRINT_S3_FORCE_PATH_STYLE",
] as const;

describe("deriveS3Prefix", () => {
  it("slugifies and appends a trailing slash", () => {
    expect(deriveS3Prefix("My Cool App")).toBe("my-cool-app/");
  });
  it("collapses non-alphanumerics and trims dashes", () => {
    expect(deriveS3Prefix("--Foo__Bar!!--")).toBe("foo-bar/");
  });
  it("falls back to 'app' for an empty slug", () => {
    expect(deriveS3Prefix("!!!")).toBe("app/");
  });
});

describe("buildS3EnvVars", () => {
  it("emits the core AWS keys without optional ones by default", () => {
    const env = buildS3EnvVars(
      {
        bucket: "shared",
        region: "eu-west-1",
        accessKeyId: "AKIA",
        secretAccessKey: "secret",
        forcePathStyle: false,
      },
      "app-x/",
    );
    expect(env).toEqual({
      AWS_REGION: "eu-west-1",
      AWS_ACCESS_KEY_ID: "AKIA",
      AWS_SECRET_ACCESS_KEY: "secret",
      AWS_S3_BUCKET: "shared",
      AWS_S3_PREFIX: "app-x/",
    });
  });
  it("includes endpoint + path-style when set", () => {
    const env = buildS3EnvVars(
      {
        bucket: "shared",
        region: "us-east-1",
        accessKeyId: "k",
        secretAccessKey: "s",
        endpoint: "https://minio.local",
        forcePathStyle: true,
      },
      "p/",
    );
    expect(env.AWS_S3_ENDPOINT).toBe("https://minio.local");
    expect(env.AWS_S3_FORCE_PATH_STYLE).toBe("true");
  });
});

describe("readSharedS3Config", () => {
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => {
    for (const k of S3_ENV_KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });
  afterEach(() => {
    for (const k of S3_ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it("returns null when no bucket is configured", () => {
    expect(readSharedS3Config()).toBeNull();
  });

  it("throws when bucket is set but credentials are missing", () => {
    process.env.BLUEPRINT_S3_BUCKET = "shared";
    expect(() => readSharedS3Config()).toThrow(/credentials|ACCESS_KEY/i);
  });

  it("reads a complete config with defaults", () => {
    process.env.BLUEPRINT_S3_BUCKET = "shared";
    process.env.BLUEPRINT_S3_ACCESS_KEY_ID = "AKIA";
    process.env.BLUEPRINT_S3_SECRET_ACCESS_KEY = "secret";
    const cfg = readSharedS3Config();
    expect(cfg).toEqual({
      bucket: "shared",
      region: "us-east-1",
      accessKeyId: "AKIA",
      secretAccessKey: "secret",
      endpoint: undefined,
      forcePathStyle: false,
    });
  });

  it("honours forcePathStyle truthy strings", () => {
    process.env.BLUEPRINT_S3_BUCKET = "shared";
    process.env.BLUEPRINT_S3_ACCESS_KEY_ID = "AKIA";
    process.env.BLUEPRINT_S3_SECRET_ACCESS_KEY = "secret";
    process.env.BLUEPRINT_S3_FORCE_PATH_STYLE = "1";
    expect(readSharedS3Config()?.forcePathStyle).toBe(true);
  });
});

describe("provisionAppS3", () => {
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => {
    for (const k of S3_ENV_KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });
  afterEach(() => {
    for (const k of S3_ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it("returns an InfraServiceInfo scoped to the app folder", () => {
    process.env.BLUEPRINT_S3_BUCKET = "shared-test";
    process.env.BLUEPRINT_S3_ACCESS_KEY_ID = "AKIA";
    process.env.BLUEPRINT_S3_SECRET_ACCESS_KEY = "secret";
    const info = provisionAppS3({ appName: "Photo Wall" });
    expect(info.kind).toBe("s3");
    expect(info.appName).toBe("shared-test");
    expect(info.id).toBe("photo-wall/");
    expect(info.publicUrl).toBe("s3://shared-test/photo-wall/");
    expect(info.externalPort).toBe(0);
    expect(info.env?.AWS_S3_BUCKET).toBe("shared-test");
    expect(info.env?.AWS_S3_PREFIX).toBe("photo-wall/");
  });

  it("throws when S3 is not configured", () => {
    expect(() => provisionAppS3({ appName: "x" })).toThrow(/not configured/i);
  });
});
