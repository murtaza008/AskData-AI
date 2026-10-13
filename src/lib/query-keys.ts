/** TanStack Query keys for everything the workspace fetches. */
export const queryKeys = {
  conversations: ["conversations"] as const,
  conversation: (id: string) => ["conversation", id] as const,
  models: ["models"] as const,
  dataSource: ["datasource"] as const,
  pins: ["pins"] as const,
  pinData: (id: string) => ["pin-data", id] as const,
  overview: ["overview"] as const,
  uploads: ["uploads"] as const,
};
