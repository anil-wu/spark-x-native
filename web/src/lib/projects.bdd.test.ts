import "../test/setup";

import { beforeEach, describe, expect, it } from "bun:test";

import {
  createProject,
  deleteProject,
  ensureProjects,
  getProjectsStorageKey,
  readProjects,
} from "@/lib/projects";
import { given, then, when } from "@/test/bdd";

describe("projects storage (BDD)", () => {
  const userKey = "test-user";

  beforeEach(() => {
    window.localStorage.clear();
  });

  it("Given no projects, When ensureProjects runs, Then it seeds a demo project", async () => {
    await given("no local projects exist", async () => {
      expect(readProjects(userKey)).toEqual([]);
    });

    await when("ensureProjects is called", async () => {
      ensureProjects(userKey);
    });

    await then("it creates a seeded demo project in localStorage", async () => {
      const stored = readProjects(userKey);
      expect(stored.length).toBeGreaterThan(0);
      expect(stored[0]?.id).toBe("demo");
      expect(window.localStorage.getItem(getProjectsStorageKey(userKey))).toBeTruthy();
    });

    await when("ensureProjects is called again", async () => {
      ensureProjects(userKey);
    });

    await then("it does not duplicate the seeded project", async () => {
      const stored = readProjects(userKey);
      expect(stored.filter((p) => p.id === "demo")).toHaveLength(1);
    });
  });

  it("Given some projects, When created and deleted, Then the list reflects changes", async () => {
    await given("a seeded baseline exists", async () => {
      ensureProjects(userKey);
    });

    const projectId = await when("a new project is created", async () => {
      const project = createProject(userKey, { name: "My Project" });
      return project.id;
    });

    await then("it is present in the project list", async () => {
      expect(readProjects(userKey).some((p) => p.id === projectId)).toBe(true);
    });

    await when("the project is deleted", async () => {
      deleteProject(userKey, projectId);
    });

    await then("it no longer exists in the list", async () => {
      expect(readProjects(userKey).some((p) => p.id === projectId)).toBe(false);
    });
  });
});
