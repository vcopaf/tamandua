import { randomUUID } from "node:crypto";

export type EntityId = string & { readonly __brand: "EntityId" };

export function createId(): EntityId {
  return randomUUID() as EntityId;
}
