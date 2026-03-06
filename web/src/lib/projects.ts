export type Project = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  coverImage?: string;
};

const STORAGE_PREFIX = "sparkx.projects.v1";

const nowIso = () => new Date().toISOString();

const generateId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
};

export const getProjectsStorageKey = (userKey: string) =>
  `${STORAGE_PREFIX}:${userKey}`;

export const createSeedProjects = (): Project[] => {
  const createdAt = nowIso();
  return [
    {
      id: "demo",
      name: "Demo Project",
      description:
        "A starter project to explore the editor, tools, and workflow. You can rename or delete it anytime.",
      createdAt,
      updatedAt: createdAt,
      coverImage: "/revamp/cover1.jpg",
    },
  ];
};

export const readProjects = (userKey: string): Project[] => {
  if (typeof window === "undefined") return [];
  const key = getProjectsStorageKey(userKey);

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(Boolean) as Project[];
  } catch (error) {
    console.warn("Failed to read projects from localStorage:", error);
    return [];
  }
};

export const writeProjects = (userKey: string, projects: Project[]) => {
  if (typeof window === "undefined") return;
  const key = getProjectsStorageKey(userKey);

  try {
    window.localStorage.setItem(key, JSON.stringify(projects));
  } catch (error) {
    console.warn("Failed to write projects to localStorage:", error);
  }
};

export const ensureProjects = (userKey: string): Project[] => {
  const existing = readProjects(userKey);
  if (existing.length > 0) return existing;

  const seeded = createSeedProjects();
  writeProjects(userKey, seeded);
  return seeded;
};

export const createProject = (
  userKey: string,
  input?: Partial<Pick<Project, "name" | "description" | "coverImage">>,
): Project => {
  const timestamp = nowIso();
  const project: Project = {
    id: generateId(),
    name: input?.name?.trim() || "Untitled Project",
    description: input?.description?.trim() || "",
    createdAt: timestamp,
    updatedAt: timestamp,
    coverImage: input?.coverImage,
  };

  const next = [project, ...readProjects(userKey)];
  writeProjects(userKey, next);
  return project;
};

export const updateProject = (
  userKey: string,
  projectId: string,
  updates: Partial<Pick<Project, "name" | "description" | "coverImage">>,
): Project | null => {
  const projects = readProjects(userKey);
  const index = projects.findIndex((p) => p.id === projectId);
  if (index === -1) return null;

  const current = projects[index]!;
  const nextProject: Project = {
    ...current,
    name: updates.name?.trim() ?? current.name,
    description: updates.description?.trim() ?? current.description,
    coverImage: updates.coverImage ?? current.coverImage,
    updatedAt: nowIso(),
  };

  const next = [...projects];
  next[index] = nextProject;
  writeProjects(userKey, next);
  return nextProject;
};

export const deleteProject = (userKey: string, projectId: string) => {
  const next = readProjects(userKey).filter((p) => p.id !== projectId);
  writeProjects(userKey, next);
};

