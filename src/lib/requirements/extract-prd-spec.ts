import type { PrdRequirementIndex } from "./prd-spec-types";

const RE_AC = /\bAC-\d+\b/gi;
const RE_FR = /\bFR-[A-Z]+\d+\b/gi;
const RE_US = /\bUS-\d+\b/gi;
const RE_IC = /\bIC-\d+\b/gi;
// Route/component IDs used by Chinese-style PRDs (e.g. PAGE-001, CMP-001)
const RE_PAGE = /\bPAGE-\d+\b/gi;
const RE_CMP = /\bCMP-\d+\b/gi;

function uniq(matches: Iterable<string>): string[] {
  return [...new Set([...matches].map((s) => s.toUpperCase()))].sort();
}

/**
 * Heuristic extraction of requirement IDs from PRD Markdown.
 * Does not parse full structure; used for coverage gates only.
 */
export function extractPrdRequirementIndex(prdMarkdown: string): PrdRequirementIndex {
  const text = prdMarkdown ?? "";
  return {
    acceptanceCriteriaIds: uniq(text.match(RE_AC) ?? []),
    featureIds: uniq(text.match(RE_FR) ?? []),
    userStoryIds: uniq(text.match(RE_US) ?? []),
    componentIds: uniq(text.match(RE_IC) ?? []),
    pageIds: uniq(text.match(RE_PAGE) ?? []),
    cmpIds: uniq(text.match(RE_CMP) ?? []),
  };
}

export function mergeRequirementIndex(
  a: PrdRequirementIndex,
  b: PrdRequirementIndex,
): PrdRequirementIndex {
  return {
    acceptanceCriteriaIds: uniq([
      ...a.acceptanceCriteriaIds,
      ...b.acceptanceCriteriaIds,
    ]),
    featureIds: uniq([...a.featureIds, ...b.featureIds]),
    userStoryIds: uniq([...a.userStoryIds, ...b.userStoryIds]),
    componentIds: uniq([...a.componentIds, ...b.componentIds]),
    pageIds: uniq([...(a.pageIds ?? []), ...(b.pageIds ?? [])]),
    cmpIds: uniq([...(a.cmpIds ?? []), ...(b.cmpIds ?? [])]),
  };
}
